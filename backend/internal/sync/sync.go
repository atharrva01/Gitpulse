package sync

import (
	"context"
	"log"
	"math"
	"sort"
	"time"

	"github.com/gitpulse/backend/internal/db"
	ghclient "github.com/gitpulse/backend/internal/github"
	"github.com/gitpulse/backend/internal/models"
)

type Worker struct {
	store *db.Store
}

func NewWorker(store *db.Store) *Worker {
	return &Worker{store: store}
}

func (w *Worker) SyncUser(ctx context.Context, user *models.User, incremental bool) error {
	client := ghclient.New(user.GitHubToken)

	if err := w.syncPRs(ctx, client, user, incremental); err != nil {
		log.Printf("sync PRs for %s: %v", user.Login, err)
		return err
	}
	if err := w.syncReviews(ctx, client, user); err != nil {
		log.Printf("sync reviews for %s: %v", user.Login, err)
	}
	if err := w.syncCommitDays(ctx, client, user, incremental); err != nil {
		log.Printf("sync commit days for %s: %v", user.Login, err)
	}
	if err := w.rebuildRepoStats(ctx, user.ID); err != nil {
		log.Printf("rebuild repo stats for %s: %v", user.Login, err)
	}
	if err := w.store.RebuildStreakDays(ctx, user.ID); err != nil {
		log.Printf("rebuild streak days for %s: %v", user.Login, err)
	}
	if err := w.rebuildScores(ctx, user.ID); err != nil {
		log.Printf("rebuild scores for %s: %v", user.Login, err)
	}

	return w.store.UpdateSyncStatus(ctx, user.ID)
}

func (w *Worker) syncPRs(ctx context.Context, client *ghclient.Client, user *models.User, incremental bool) error {
	cutoff := time.Time{}
	if incremental {
		cutoff = time.Now().AddDate(0, 0, -90)
	}
	cursor := ""
	for {
		res, err := client.FetchMergedPRs(ctx, user.Login, cursor)
		if err != nil {
			return err
		}
		done := false
		for _, node := range res.PRs {
			if incremental && node.MergedAt != nil && node.MergedAt.Before(cutoff) {
				done = true
				break
			}
			pr := &models.PullRequest{
				UserID:       user.ID,
				GitHubPRID:   node.DatabaseID,
				RepoOwner:    node.Repository.Owner.Login,
				RepoName:     node.Repository.Name,
				RepoFullName: node.Repository.NameWithOwner,
				Title:        node.Title,
				Number:       node.Number,
				State:        "merged",
				Additions:    node.Additions,
				Deletions:    node.Deletions,
				ReviewCount:  node.Reviews.TotalCount,
				MergedAt:     node.MergedAt,
				CreatedAt:    node.CreatedAt,
				HTMLURL:      node.HTMLURL,
			}
			if err := w.store.UpsertPR(ctx, pr); err != nil {
				log.Printf("upsert PR %d: %v", node.DatabaseID, err)
			}
		}
		if done || !res.HasNext {
			break
		}
		cursor = res.Cursor
	}
	return nil
}

func (w *Worker) syncReviews(ctx context.Context, client *ghclient.Client, user *models.User) error {
	cursor := ""
	for {
		reviews, hasNext, next, err := client.FetchReviews(ctx, user.Login, cursor)
		if err != nil {
			return err
		}
		for _, node := range reviews {
			if node.DatabaseID == 0 {
				continue
			}
			var timeToReview *int64
			diff := int64(node.SubmittedAt.Sub(node.PullRequest.CreatedAt).Seconds())
			if diff > 0 {
				timeToReview = &diff
			}
			r := &models.Review{
				UserID:         user.ID,
				GitHubReviewID: node.DatabaseID,
				RepoFullName:   node.PullRequest.Repository.NameWithOwner,
				PRNumber:       node.PullRequest.Number,
				PRTitle:        node.PullRequest.Title,
				State:          node.State,
				SubmittedAt:    node.SubmittedAt,
				TimeToReview:   timeToReview,
			}
			if err := w.store.UpsertReview(ctx, r); err != nil {
				log.Printf("upsert review %d: %v", node.DatabaseID, err)
			}
		}
		if !hasNext {
			break
		}
		cursor = next
	}
	return nil
}

func (w *Worker) syncCommitDays(ctx context.Context, client *ghclient.Client, user *models.User, incremental bool) error {
	now := time.Now().UTC()

	// Build year windows to fetch. GitHub limits contributionsCollection to 1 year per call.
	type window struct{ from, to time.Time }
	var windows []window

	if incremental {
		windows = append(windows, window{now.AddDate(0, 0, -90), now})
	} else {
		// Go back to 2019 — covers the vast majority of contributors' active history
		startYear := 2019
		if now.Year() < startYear {
			startYear = now.Year()
		}
		for y := startYear; y <= now.Year(); y++ {
			from := time.Date(y, 1, 1, 0, 0, 0, 0, time.UTC)
			to := time.Date(y, 12, 31, 23, 59, 59, 0, time.UTC)
			if to.After(now) {
				to = now
			}
			windows = append(windows, window{from, to})
		}
	}

	for _, win := range windows {
		days, err := client.FetchCommitDays(ctx, user.Login, win.from, win.to)
		if err != nil {
			return err
		}
		for _, d := range days {
			t, err := time.Parse("2006-01-02", d)
			if err != nil {
				continue
			}
			if err := w.store.UpsertCommitDay(ctx, user.ID, t); err != nil {
				log.Printf("upsert commit day %s for %s: %v", d, user.Login, err)
			}
		}
	}
	return nil
}

func (w *Worker) rebuildRepoStats(ctx context.Context, userID int64) error {
	return w.store.RebuildRepoStats(ctx, userID)
}

func (w *Worker) rebuildScores(ctx context.Context, userID int64) error {
	// Fetch all streak days
	days, err := w.store.GetAllStreakDays(ctx, userID)
	if err != nil {
		return err
	}

	// Fetch real aggregates for impact score
	agg, err := w.store.GetScoreAggregates(ctx, userID)
	if err != nil {
		return err
	}

	current, longest := computeStreaks(days)
	impact := computeImpactScore(agg, current)
	return w.store.UpdateScores(ctx, userID, impact, current, longest)
}

// computeStreaks returns (currentStreak, longestStreak) from streak day records.
// A streak breaks if there is no active day on today OR yesterday (grace period).
// Uses string date comparison to avoid any timezone/DST edge cases.
func computeStreaks(days []models.StreakDay) (current, longest int) {
	if len(days) == 0 {
		return 0, 0
	}

	daySet := make(map[string]bool, len(days))
	for _, d := range days {
		daySet[d.Day.UTC().Format("2006-01-02")] = true
	}

	sorted := make([]string, 0, len(daySet))
	for d := range daySet {
		sorted = append(sorted, d)
	}
	sort.Sort(sort.Reverse(sort.StringSlice(sorted)))

	today := time.Now().UTC().Format("2006-01-02")
	yesterday := addDays(today, -1)

	// Current streak: walk back from today/yesterday
	current = 0
	if daySet[today] || daySet[yesterday] {
		anchor := today
		if !daySet[today] {
			anchor = yesterday
		}
		for {
			if !daySet[anchor] {
				break
			}
			current++
			anchor = addDays(anchor, -1)
		}
	}

	// Longest streak: single pass over sorted unique days
	longest = 0
	run := 1
	for i := 1; i < len(sorted); i++ {
		if addDays(sorted[i], 1) == sorted[i-1] { // consecutive
			run++
		} else {
			if run > longest {
				longest = run
			}
			run = 1
		}
	}
	if run > longest {
		longest = run
	}
	if current > longest {
		longest = current
	}
	return current, longest
}

// addDays adds n days to a "2006-01-02" date string and returns a new one.
func addDays(date string, n int) string {
	t, _ := time.Parse("2006-01-02", date)
	return t.AddDate(0, 0, n).Format("2006-01-02")
}

// Impact Score (0–1000):
//   400 — merged PRs × 5
//   200 — log(lines_changed+1) × 20
//   200 — reviews × 8
//   100 — current streak × 2
//   100 — unique repos × 5
func computeImpactScore(agg db.ScoreAggregates, currentStreak int) int {
	score := 0
	score += min(agg.TotalPRs*5, 400)
	score += min(int(math.Log(float64(agg.TotalAdditions+agg.TotalDeletions+1))*20), 200)
	score += min(agg.TotalReviews*8, 200)
	score += min(currentStreak*2, 100)
	score += min(agg.UniqueRepos*5, 100)
	return min(score, 1000)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
