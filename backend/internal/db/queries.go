package db

import (
	"context"
	"time"

	"github.com/gitpulse/backend/internal/models"
	"github.com/jmoiron/sqlx"
)

type Store struct {
	db *sqlx.DB
}

func NewStore(db *sqlx.DB) *Store {
	return &Store{db: db}
}

func (s *Store) UpsertUser(ctx context.Context, u *models.User) error {
	query := `
		INSERT INTO users (github_id, login, name, avatar_url, bio, location, github_token, email, updated_at)
		VALUES (:github_id, :login, :name, :avatar_url, :bio, :location, :github_token, :email, NOW())
		ON CONFLICT (github_id) DO UPDATE SET
			login = EXCLUDED.login,
			name = EXCLUDED.name,
			avatar_url = EXCLUDED.avatar_url,
			bio = EXCLUDED.bio,
			location = EXCLUDED.location,
			github_token = EXCLUDED.github_token,
			email = EXCLUDED.email,
			updated_at = NOW()
		RETURNING id, created_at, updated_at, impact_score, current_streak, longest_streak, last_synced_at, email_digest_opt, is_public`
	rows, err := s.db.NamedQueryContext(ctx, query, u)
	if err != nil {
		return err
	}
	defer rows.Close()
	if rows.Next() {
		return rows.StructScan(u)
	}
	return rows.Err()
}

func (s *Store) GetUserByID(ctx context.Context, id int64) (*models.User, error) {
	var u models.User
	err := s.db.GetContext(ctx, &u, `SELECT * FROM users WHERE id = $1`, id)
	return &u, err
}

func (s *Store) GetUserByLogin(ctx context.Context, login string) (*models.User, error) {
	var u models.User
	err := s.db.GetContext(ctx, &u, `SELECT * FROM users WHERE login = $1`, login)
	return &u, err
}

func (s *Store) UpdateSyncStatus(ctx context.Context, userID int64) error {
	_, err := s.db.ExecContext(ctx,
		`UPDATE users SET last_synced_at = NOW(), updated_at = NOW() WHERE id = $1`, userID)
	return err
}

func (s *Store) UpdateScores(ctx context.Context, userID int64, impact, current, longest int) error {
	_, err := s.db.ExecContext(ctx,
		`UPDATE users SET impact_score=$1, current_streak=$2, longest_streak=$3, updated_at=NOW() WHERE id=$4`,
		impact, current, longest, userID)
	return err
}

func (s *Store) UpsertPR(ctx context.Context, pr *models.PullRequest) error {
	query := `
		INSERT INTO pull_requests
			(user_id, github_pr_id, repo_owner, repo_name, repo_full_name, title, number, state, additions, deletions, review_count, merged_at, created_at, html_url)
		VALUES
			(:user_id, :github_pr_id, :repo_owner, :repo_name, :repo_full_name, :title, :number, :state, :additions, :deletions, :review_count, :merged_at, :created_at, :html_url)
		ON CONFLICT (user_id, github_pr_id) DO UPDATE SET
			title = EXCLUDED.title,
			additions = EXCLUDED.additions,
			deletions = EXCLUDED.deletions,
			review_count = EXCLUDED.review_count,
			merged_at = EXCLUDED.merged_at`
	_, err := s.db.NamedExecContext(ctx, query, pr)
	return err
}

func (s *Store) UpsertReview(ctx context.Context, r *models.Review) error {
	query := `
		INSERT INTO reviews
			(user_id, github_review_id, repo_full_name, pr_number, pr_title, state, submitted_at, time_to_review)
		VALUES
			(:user_id, :github_review_id, :repo_full_name, :pr_number, :pr_title, :state, :submitted_at, :time_to_review)
		ON CONFLICT (user_id, github_review_id) DO NOTHING`
	_, err := s.db.NamedExecContext(ctx, query, r)
	return err
}

func (s *Store) UpsertRepoStats(ctx context.Context, rs *models.RepoStats) error {
	query := `
		INSERT INTO repo_stats
			(user_id, repo_full_name, pr_count, review_count, total_additions, total_deletions, first_contrib, last_contrib, updated_at)
		VALUES
			(:user_id, :repo_full_name, :pr_count, :review_count, :total_additions, :total_deletions, :first_contrib, :last_contrib, NOW())
		ON CONFLICT (user_id, repo_full_name) DO UPDATE SET
			pr_count = EXCLUDED.pr_count,
			review_count = EXCLUDED.review_count,
			total_additions = EXCLUDED.total_additions,
			total_deletions = EXCLUDED.total_deletions,
			first_contrib = EXCLUDED.first_contrib,
			last_contrib = EXCLUDED.last_contrib,
			updated_at = NOW()`
	_, err := s.db.NamedExecContext(ctx, query, rs)
	return err
}

func (s *Store) UpsertStreakDay(ctx context.Context, userID int64, day time.Time, hasPR, hasReview bool) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO streak_days (user_id, day, has_pr, has_review)
		VALUES ($1, $2::date, $3, $4)
		ON CONFLICT (user_id, day) DO UPDATE SET
			has_pr = streak_days.has_pr OR EXCLUDED.has_pr,
			has_review = streak_days.has_review OR EXCLUDED.has_review`,
		userID, day, hasPR, hasReview)
	return err
}

func (s *Store) GetDashboardStats(ctx context.Context, userID int64) (*models.DashboardStats, error) {
	user, err := s.GetUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	var stats struct {
		TotalMergedPRs int `db:"total_merged_prs"`
		TotalAdditions int `db:"total_additions"`
		TotalDeletions int `db:"total_deletions"`
		UniqueRepos    int `db:"unique_repos"`
	}
	err = s.db.GetContext(ctx, &stats, `
		SELECT
			COUNT(*) AS total_merged_prs,
			COALESCE(SUM(additions), 0) AS total_additions,
			COALESCE(SUM(deletions), 0) AS total_deletions,
			COUNT(DISTINCT repo_full_name) AS unique_repos
		FROM pull_requests WHERE user_id = $1 AND state = 'merged'`, userID)
	if err != nil {
		return nil, err
	}

	var recentPRs []models.PullRequest
	err = s.db.SelectContext(ctx, &recentPRs, `
		SELECT * FROM pull_requests WHERE user_id = $1 AND state = 'merged'
		ORDER BY merged_at DESC NULLS LAST LIMIT 10`, userID)
	if err != nil {
		return nil, err
	}

	var topRepos []models.RepoStats
	err = s.db.SelectContext(ctx, &topRepos, `
		SELECT * FROM repo_stats WHERE user_id = $1
		ORDER BY pr_count DESC LIMIT 5`, userID)
	if err != nil {
		return nil, err
	}

	syncStatus := "never"
	if user.LastSyncedAt != nil {
		if time.Since(*user.LastSyncedAt) < 5*time.Minute {
			syncStatus = "fresh"
		} else {
			syncStatus = "synced"
		}
	}

	return &models.DashboardStats{
		User:           user,
		TotalMergedPRs: stats.TotalMergedPRs,
		TotalAdditions: stats.TotalAdditions,
		TotalDeletions: stats.TotalDeletions,
		UniqueRepos:    stats.UniqueRepos,
		RecentPRs:      recentPRs,
		TopRepos:       topRepos,
		ImpactScore:    user.ImpactScore,
		CurrentStreak:  user.CurrentStreak,
		LongestStreak:  user.LongestStreak,
		SyncStatus:     syncStatus,
	}, nil
}

func (s *Store) GetRepoBreakdown(ctx context.Context, userID int64) ([]models.RepoStats, error) {
	var repos []models.RepoStats
	err := s.db.SelectContext(ctx, &repos, `
		SELECT * FROM repo_stats WHERE user_id = $1
		ORDER BY pr_count DESC`, userID)
	return repos, err
}

func (s *Store) GetReviewLatency(ctx context.Context, userID int64) (map[string]float64, error) {
	var rows []struct {
		TimeToReview int64 `db:"time_to_review"`
	}
	err := s.db.SelectContext(ctx, &rows, `
		SELECT time_to_review FROM reviews
		WHERE user_id = $1 AND time_to_review IS NOT NULL
		ORDER BY time_to_review`, userID)
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return map[string]float64{"median": 0, "p75": 0, "p95": 0, "count": 0}, nil
	}
	vals := make([]float64, len(rows))
	for i, r := range rows {
		vals[i] = float64(r.TimeToReview)
	}
	return map[string]float64{
		"median": percentile(vals, 0.5),
		"p75":    percentile(vals, 0.75),
		"p95":    percentile(vals, 0.95),
		"count":  float64(len(vals)),
	}, nil
}

func (s *Store) GetHeatmapDays(ctx context.Context, userID int64) ([]models.HeatmapDay, error) {
	var days []models.HeatmapDay
	err := s.db.SelectContext(ctx, &days, `
		SELECT day, has_pr, has_review, has_commit
		FROM streak_days
		WHERE user_id = $1 AND day >= NOW() - INTERVAL '54 weeks'
		ORDER BY day ASC`, userID)
	return days, err
}

func (s *Store) GetAllStreakDays(ctx context.Context, userID int64) ([]models.StreakDay, error) {
	var days []models.StreakDay
	// Only days with a commit or merged PR count toward streak — reviews excluded
	err := s.db.SelectContext(ctx, &days, `
		SELECT * FROM streak_days
		WHERE user_id = $1 AND (has_commit = true OR has_pr = true)
		ORDER BY day DESC`, userID)
	return days, err
}

func (s *Store) UpsertCommitDay(ctx context.Context, userID int64, day time.Time) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO streak_days (user_id, day, has_pr, has_review, has_commit)
		VALUES ($1, $2::date, false, false, true)
		ON CONFLICT (user_id, day) DO UPDATE SET has_commit = true`,
		userID, day)
	return err
}

func (s *Store) GetUsersForSync(ctx context.Context) ([]models.User, error) {
	var users []models.User
	err := s.db.SelectContext(ctx, &users, `
		SELECT * FROM users WHERE last_synced_at IS NULL OR last_synced_at < NOW() - INTERVAL '24 hours'
		LIMIT 100`)
	return users, err
}

func (s *Store) UpdateEmailDigest(ctx context.Context, userID int64, opt bool) error {
	_, err := s.db.ExecContext(ctx,
		`UPDATE users SET email_digest_opt = $1, updated_at = NOW() WHERE id = $2`, opt, userID)
	return err
}

func (s *Store) UpdatePublicProfile(ctx context.Context, userID int64, isPublic bool) error {
	_, err := s.db.ExecContext(ctx,
		`UPDATE users SET is_public = $1, updated_at = NOW() WHERE id = $2`, isPublic, userID)
	return err
}

type ScoreAggregates struct {
	TotalPRs       int
	TotalReviews   int
	TotalAdditions int
	TotalDeletions int
	UniqueRepos    int
}

func (s *Store) GetScoreAggregates(ctx context.Context, userID int64) (ScoreAggregates, error) {
	var agg ScoreAggregates
	row := s.db.QueryRowContext(ctx, `
		SELECT COUNT(*),
		       COALESCE(SUM(additions),0),
		       COALESCE(SUM(deletions),0),
		       COUNT(DISTINCT repo_full_name)
		FROM pull_requests WHERE user_id=$1 AND state='merged'`, userID)
	if err := row.Scan(&agg.TotalPRs, &agg.TotalAdditions, &agg.TotalDeletions, &agg.UniqueRepos); err != nil {
		return agg, err
	}
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM reviews WHERE user_id=$1`, userID).
		Scan(&agg.TotalReviews); err != nil {
		return agg, err
	}
	return agg, nil
}

func (s *Store) RebuildRepoStats(ctx context.Context, userID int64) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO repo_stats (user_id, repo_full_name, pr_count, review_count, total_additions, total_deletions, first_contrib, last_contrib, updated_at)
		SELECT
			user_id,
			repo_full_name,
			COUNT(*) AS pr_count,
			0 AS review_count,
			COALESCE(SUM(additions), 0) AS total_additions,
			COALESCE(SUM(deletions), 0) AS total_deletions,
			MIN(merged_at) AS first_contrib,
			MAX(merged_at) AS last_contrib,
			NOW()
		FROM pull_requests
		WHERE user_id = $1 AND state = 'merged'
		GROUP BY user_id, repo_full_name
		ON CONFLICT (user_id, repo_full_name) DO UPDATE SET
			pr_count = EXCLUDED.pr_count,
			total_additions = EXCLUDED.total_additions,
			total_deletions = EXCLUDED.total_deletions,
			first_contrib = EXCLUDED.first_contrib,
			last_contrib = EXCLUDED.last_contrib,
			updated_at = NOW()`, userID)
	if err != nil {
		return err
	}
	// Update review_count from reviews table
	_, err = s.db.ExecContext(ctx, `
		UPDATE repo_stats rs SET review_count = rv.cnt
		FROM (
			SELECT repo_full_name, COUNT(*) AS cnt
			FROM reviews WHERE user_id = $1
			GROUP BY repo_full_name
		) rv
		WHERE rs.user_id = $1 AND rs.repo_full_name = rv.repo_full_name`, userID)
	return err
}

func (s *Store) RebuildStreakDays(ctx context.Context, userID int64) error {
	// GROUP BY deduplicates multiple PRs/reviews on the same day before the upsert,
	// preventing the "ON CONFLICT DO UPDATE cannot affect row a second time" error.
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO streak_days (user_id, day, has_pr, has_review)
		SELECT user_id, merged_at::date AS day, true, false
		FROM pull_requests
		WHERE user_id = $1 AND merged_at IS NOT NULL AND state = 'merged'
		GROUP BY user_id, merged_at::date
		ON CONFLICT (user_id, day) DO UPDATE SET has_pr = true`, userID)
	if err != nil {
		return err
	}
	_, err = s.db.ExecContext(ctx, `
		INSERT INTO streak_days (user_id, day, has_pr, has_review)
		SELECT user_id, submitted_at::date AS day, false, true
		FROM reviews
		WHERE user_id = $1
		GROUP BY user_id, submitted_at::date
		ON CONFLICT (user_id, day) DO UPDATE SET has_review = true`, userID)
	return err
}

func (s *Store) GetWeeklyDigestUsers(ctx context.Context) ([]models.User, error) {
	var users []models.User
	err := s.db.SelectContext(ctx, &users, `
		SELECT * FROM users WHERE email_digest_opt = true AND email != ''`)
	return users, err
}

func (s *Store) GetPRsLastWeek(ctx context.Context, userID int64) ([]models.PullRequest, error) {
	var prs []models.PullRequest
	err := s.db.SelectContext(ctx, &prs, `
		SELECT * FROM pull_requests WHERE user_id = $1 AND state = 'merged'
		AND merged_at >= NOW() - INTERVAL '7 days'
		ORDER BY merged_at DESC`, userID)
	return prs, err
}

type PlatformStats struct {
	TotalUsers    int `db:"total_users"    json:"total_users"`
	TotalPRs      int `db:"total_prs"      json:"total_prs"`
	HighestStreak int `db:"highest_streak" json:"highest_streak"`
}

func (s *Store) GetMonthlyVelocity(ctx context.Context, userID int64) ([]models.MonthlyCount, error) {
	var rows []models.MonthlyCount
	err := s.db.SelectContext(ctx, &rows, `
		WITH months AS (
			SELECT DATE_TRUNC('month', NOW() - (i || ' months')::INTERVAL) AS month
			FROM generate_series(0, 12) AS gs(i)
		)
		SELECT TO_CHAR(m.month, 'Mon ''YY') AS month,
		       COALESCE(COUNT(p.id), 0)     AS count
		FROM months m
		LEFT JOIN pull_requests p
			ON DATE_TRUNC('month', p.merged_at) = m.month
			AND p.user_id = $1 AND p.state = 'merged'
		GROUP BY m.month
		ORDER BY m.month ASC`, userID)
	return rows, err
}

func (s *Store) GetPlatformStats(ctx context.Context) (*PlatformStats, error) {
	var stats PlatformStats
	err := s.db.GetContext(ctx, &stats, `
		SELECT
			(SELECT COUNT(*) FROM users)                              AS total_users,
			(SELECT COUNT(*) FROM pull_requests WHERE state='merged') AS total_prs,
			(SELECT COALESCE(MAX(longest_streak),0) FROM users)       AS highest_streak`)
	return &stats, err
}

type LeaderboardEntry struct {
	Login         string `db:"login"          json:"login"`
	Name          string `db:"name"           json:"name"`
	AvatarURL     string `db:"avatar_url"     json:"avatar_url"`
	ImpactScore   int    `db:"impact_score"   json:"impact_score"`
	CurrentStreak int    `db:"current_streak" json:"current_streak"`
	LongestStreak int    `db:"longest_streak" json:"longest_streak"`
	TotalPRs      int    `db:"total_prs"      json:"total_prs"`
}

func (s *Store) GetLeaderboard(ctx context.Context, limit int) ([]LeaderboardEntry, error) {
	var entries []LeaderboardEntry
	err := s.db.SelectContext(ctx, &entries, `
		SELECT u.login, u.name, u.avatar_url, u.impact_score, u.current_streak, u.longest_streak,
		       COALESCE(p.total_prs, 0) AS total_prs
		FROM users u
		LEFT JOIN (
			SELECT user_id, COUNT(*) AS total_prs
			FROM pull_requests WHERE state = 'merged'
			GROUP BY user_id
		) p ON p.user_id = u.id
		WHERE u.is_public = true
		ORDER BY u.impact_score DESC
		LIMIT $1`, limit)
	return entries, err
}

func (s *Store) ListAllUsers(ctx context.Context) ([]models.User, error) {
	var users []models.User
	err := s.db.SelectContext(ctx, &users, `
		SELECT id, login, name, avatar_url, email, impact_score, current_streak,
		       longest_streak, is_public, email_digest_opt, last_synced_at, created_at
		FROM users ORDER BY created_at DESC`)
	return users, err
}

func percentile(sorted []float64, p float64) float64 {
	if len(sorted) == 0 {
		return 0
	}
	idx := p * float64(len(sorted)-1)
	lo := int(idx)
	hi := lo + 1
	if hi >= len(sorted) {
		return sorted[lo]
	}
	frac := idx - float64(lo)
	return sorted[lo]*(1-frac) + sorted[hi]*frac
}
