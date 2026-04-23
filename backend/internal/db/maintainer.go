package db

import (
	"context"

	"github.com/gitpulse/backend/internal/models"
)

func (s *Store) GetWatchedRepos(ctx context.Context, userID int64) ([]models.WatchedRepo, error) {
	var repos []models.WatchedRepo
	err := s.db.SelectContext(ctx, &repos,
		`SELECT * FROM watched_repos WHERE user_id=$1 ORDER BY added_at DESC`, userID)
	return repos, err
}

func (s *Store) CountWatchedRepos(ctx context.Context, userID int64) (int, error) {
	var n int
	err := s.db.GetContext(ctx, &n, `SELECT COUNT(*) FROM watched_repos WHERE user_id=$1`, userID)
	return n, err
}

func (s *Store) AddWatchedRepo(ctx context.Context, userID int64, repo string) (*models.WatchedRepo, error) {
	var wr models.WatchedRepo
	err := s.db.GetContext(ctx, &wr, `
		INSERT INTO watched_repos (user_id, repo_full_name)
		VALUES ($1, $2)
		ON CONFLICT (user_id, repo_full_name) DO UPDATE SET added_at = watched_repos.added_at
		RETURNING *`, userID, repo)
	return &wr, err
}

func (s *Store) RemoveWatchedRepo(ctx context.Context, userID int64, repo string) error {
	_, err := s.db.ExecContext(ctx,
		`DELETE FROM watched_repos WHERE user_id=$1 AND repo_full_name=$2`, userID, repo)
	return err
}

func (s *Store) GetWatchedRepoByID(ctx context.Context, id int64, userID int64) (*models.WatchedRepo, error) {
	var wr models.WatchedRepo
	err := s.db.GetContext(ctx, &wr,
		`SELECT * FROM watched_repos WHERE id=$1 AND user_id=$2`, id, userID)
	return &wr, err
}

func (s *Store) GetWatchedRepoByName(ctx context.Context, userID int64, repo string) (*models.WatchedRepo, error) {
	var wr models.WatchedRepo
	err := s.db.GetContext(ctx, &wr,
		`SELECT * FROM watched_repos WHERE user_id=$1 AND repo_full_name=$2`, userID, repo)
	return &wr, err
}

func (s *Store) UpsertRepoContributor(ctx context.Context, c *models.RepoContributor) error {
	_, err := s.db.NamedExecContext(ctx, `
		INSERT INTO repo_contributors
			(watched_repo_id, login, avatar_url, pr_count_30d, pr_count_90d, last_pr_at, first_pr_at, is_stale, updated_at)
		VALUES
			(:watched_repo_id, :login, :avatar_url, :pr_count_30d, :pr_count_90d, :last_pr_at, :first_pr_at, :is_stale, NOW())
		ON CONFLICT (watched_repo_id, login) DO UPDATE SET
			avatar_url = EXCLUDED.avatar_url,
			pr_count_30d = EXCLUDED.pr_count_30d,
			pr_count_90d = EXCLUDED.pr_count_90d,
			last_pr_at = EXCLUDED.last_pr_at,
			first_pr_at = EXCLUDED.first_pr_at,
			is_stale = EXCLUDED.is_stale,
			updated_at = NOW()`, c)
	return err
}

func (s *Store) UpsertStalePR(ctx context.Context, p *models.StalePR) error {
	_, err := s.db.NamedExecContext(ctx, `
		INSERT INTO stale_prs
			(watched_repo_id, github_pr_id, number, title, author_login, html_url, opened_at, days_open, updated_at)
		VALUES
			(:watched_repo_id, :github_pr_id, :number, :title, :author_login, :html_url, :opened_at, :days_open, NOW())
		ON CONFLICT (watched_repo_id, github_pr_id) DO UPDATE SET
			days_open = EXCLUDED.days_open,
			updated_at = NOW()`, p)
	return err
}

func (s *Store) DeleteStalePRsForRepo(ctx context.Context, watchedRepoID int64) error {
	_, err := s.db.ExecContext(ctx,
		`DELETE FROM stale_prs WHERE watched_repo_id=$1`, watchedRepoID)
	return err
}

func (s *Store) GetMaintainerDashboard(ctx context.Context, watchedRepoID int64) (*models.MaintainerDashboard, error) {
	var wr models.WatchedRepo
	if err := s.db.GetContext(ctx, &wr, `SELECT * FROM watched_repos WHERE id=$1`, watchedRepoID); err != nil {
		return nil, err
	}

	var contributors []models.RepoContributor
	_ = s.db.SelectContext(ctx, &contributors,
		`SELECT * FROM repo_contributors WHERE watched_repo_id=$1 ORDER BY pr_count_30d DESC`, watchedRepoID)

	var stalePRs []models.StalePR
	_ = s.db.SelectContext(ctx, &stalePRs,
		`SELECT * FROM stale_prs WHERE watched_repo_id=$1 ORDER BY days_open DESC`, watchedRepoID)

	var totalOpen int
	_ = s.db.GetContext(ctx, &totalOpen,
		`SELECT COUNT(*) FROM stale_prs WHERE watched_repo_id=$1`, watchedRepoID)

	return &models.MaintainerDashboard{
		Repo:         wr,
		Contributors: contributors,
		StalePRs:     stalePRs,
		TotalOpen:    totalOpen,
	}, nil
}
