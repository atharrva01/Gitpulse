package db

import (
	"context"
	"time"

	"github.com/gitpulse/backend/internal/models"
)

func (s *Store) GetWrappedStats(ctx context.Context, userID int64, year int) (*models.WrappedStats, error) {
	start := time.Date(year, 1, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(year+1, 1, 1, 0, 0, 0, 0, time.UTC)

	user, err := s.GetUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	ws := &models.WrappedStats{
		Year:        year,
		Login:       user.Login,
		Name:        user.Name,
		AvatarURL:   user.AvatarURL,
		ImpactScore: user.ImpactScore,
	}

	// Totals
	var totals struct {
		TotalPRs       int `db:"total_prs"`
		TotalAdditions int `db:"total_additions"`
		TotalDeletions int `db:"total_deletions"`
		UniqueRepos    int `db:"unique_repos"`
	}
	err = s.db.GetContext(ctx, &totals, `
		SELECT COUNT(*) AS total_prs,
		       COALESCE(SUM(additions),0) AS total_additions,
		       COALESCE(SUM(deletions),0) AS total_deletions,
		       COUNT(DISTINCT repo_full_name) AS unique_repos
		FROM pull_requests
		WHERE user_id=$1 AND state='merged' AND merged_at >= $2 AND merged_at < $3`,
		userID, start, end)
	if err != nil {
		return nil, err
	}
	ws.TotalPRs = totals.TotalPRs
	ws.TotalAdditions = totals.TotalAdditions
	ws.TotalDeletions = totals.TotalDeletions
	ws.UniqueRepos = totals.UniqueRepos

	// Reviews count
	err = s.db.GetContext(ctx, &ws.TotalReviews, `
		SELECT COUNT(*) FROM reviews WHERE user_id=$1 AND submitted_at >= $2 AND submitted_at < $3`,
		userID, start, end)
	if err != nil {
		ws.TotalReviews = 0
	}

	// Top repo
	var topRepo struct {
		RepoFullName string `db:"repo_full_name"`
		PRCount      int    `db:"pr_count"`
	}
	err = s.db.GetContext(ctx, &topRepo, `
		SELECT repo_full_name, COUNT(*) AS pr_count
		FROM pull_requests
		WHERE user_id=$1 AND state='merged' AND merged_at >= $2 AND merged_at < $3
		GROUP BY repo_full_name ORDER BY pr_count DESC LIMIT 1`,
		userID, start, end)
	if err == nil {
		ws.TopRepo = topRepo.RepoFullName
		ws.TopRepoPRs = topRepo.PRCount
	}

	// Monthly activity
	var monthly []struct {
		Month string `db:"month"`
		Count int    `db:"cnt"`
	}
	err = s.db.SelectContext(ctx, &monthly, `
		SELECT TO_CHAR(merged_at, 'Mon') AS month,
		       TO_CHAR(merged_at, 'MM') AS month_num,
		       COUNT(*) AS cnt
		FROM pull_requests
		WHERE user_id=$1 AND state='merged' AND merged_at >= $2 AND merged_at < $3
		GROUP BY TO_CHAR(merged_at, 'Mon'), TO_CHAR(merged_at, 'MM')
		ORDER BY TO_CHAR(merged_at, 'MM')`,
		userID, start, end)
	if err == nil {
		allMonths := []string{"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"}
		monthMap := make(map[string]int)
		for _, m := range monthly {
			monthMap[m.Month] = m.Count
		}
		ws.MonthlyActivity = make([]models.MonthlyCount, 12)
		for i, m := range allMonths {
			ws.MonthlyActivity[i] = models.MonthlyCount{Month: m, Count: monthMap[m]}
		}
		// Find peak month
		best := 0
		for _, m := range monthly {
			if m.Count > best {
				best = m.Count
				ws.MostActiveMonth = m.Month
				ws.MostActivePRs = m.Count
			}
		}
	}

	// Longest streak in the year
	var streakDays []struct {
		Day time.Time `db:"day"`
	}
	err = s.db.SelectContext(ctx, &streakDays, `
		SELECT day FROM streak_days
		WHERE user_id=$1 AND day >= $2 AND day < $3
		ORDER BY day`, userID, start, end)
	if err == nil && len(streakDays) > 0 {
		longest := 1
		run := 1
		for i := 1; i < len(streakDays); i++ {
			if streakDays[i].Day.Sub(streakDays[i-1].Day) == 24*time.Hour {
				run++
				if run > longest {
					longest = run
				}
			} else {
				run = 1
			}
		}
		ws.LongestStreak = longest
	}

	// First and last PR
	var firstPR struct {
		Title        string `db:"title"`
		RepoFullName string `db:"repo_full_name"`
	}
	if err := s.db.GetContext(ctx, &firstPR, `
		SELECT title, repo_full_name FROM pull_requests
		WHERE user_id=$1 AND state='merged' AND merged_at >= $2 AND merged_at < $3
		ORDER BY merged_at ASC LIMIT 1`, userID, start, end); err == nil {
		ws.FirstPRTitle = firstPR.Title
		ws.FirstPRRepo = firstPR.RepoFullName
	}
	var lastPR struct {
		Title        string `db:"title"`
		RepoFullName string `db:"repo_full_name"`
	}
	if err := s.db.GetContext(ctx, &lastPR, `
		SELECT title, repo_full_name FROM pull_requests
		WHERE user_id=$1 AND state='merged' AND merged_at >= $2 AND merged_at < $3
		ORDER BY merged_at DESC LIMIT 1`, userID, start, end); err == nil {
		ws.LastPRTitle = lastPR.Title
		ws.LastPRRepo = lastPR.RepoFullName
	}

	return ws, nil
}
