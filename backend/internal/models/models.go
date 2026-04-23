package models

import "time"

type User struct {
	ID              int64     `db:"id" json:"id"`
	GitHubID        int64     `db:"github_id" json:"github_id"`
	Login           string    `db:"login" json:"login"`
	Name            string    `db:"name" json:"name"`
	AvatarURL       string    `db:"avatar_url" json:"avatar_url"`
	Bio             string    `db:"bio" json:"bio"`
	Location        string    `db:"location" json:"location"`
	GitHubToken     string    `db:"github_token" json:"-"`
	ImpactScore     int       `db:"impact_score" json:"impact_score"`
	CurrentStreak   int       `db:"current_streak" json:"current_streak"`
	LongestStreak   int       `db:"longest_streak" json:"longest_streak"`
	LastSyncedAt    *time.Time `db:"last_synced_at" json:"last_synced_at"`
	EmailDigestOpt  bool      `db:"email_digest_opt" json:"email_digest_opt"`
	Email           string    `db:"email" json:"email"`
	IsPublic        bool      `db:"is_public" json:"is_public"`
	CreatedAt       time.Time `db:"created_at" json:"created_at"`
	UpdatedAt       time.Time `db:"updated_at" json:"updated_at"`
}

type PullRequest struct {
	ID             int64     `db:"id" json:"id"`
	UserID         int64     `db:"user_id" json:"user_id"`
	GitHubPRID     int64     `db:"github_pr_id" json:"github_pr_id"`
	RepoOwner      string    `db:"repo_owner" json:"repo_owner"`
	RepoName       string    `db:"repo_name" json:"repo_name"`
	RepoFullName   string    `db:"repo_full_name" json:"repo_full_name"`
	Title          string    `db:"title" json:"title"`
	Number         int       `db:"number" json:"number"`
	State          string    `db:"state" json:"state"`
	Additions      int       `db:"additions" json:"additions"`
	Deletions      int       `db:"deletions" json:"deletions"`
	ReviewCount    int       `db:"review_count" json:"review_count"`
	MergedAt       *time.Time `db:"merged_at" json:"merged_at"`
	CreatedAt      time.Time `db:"created_at" json:"created_at"`
	HTMLURL        string    `db:"html_url" json:"html_url"`
}

type Review struct {
	ID             int64     `db:"id" json:"id"`
	UserID         int64     `db:"user_id" json:"user_id"`
	GitHubReviewID int64     `db:"github_review_id" json:"github_review_id"`
	RepoFullName   string    `db:"repo_full_name" json:"repo_full_name"`
	PRNumber       int       `db:"pr_number" json:"pr_number"`
	PRTitle        string    `db:"pr_title" json:"pr_title"`
	State          string    `db:"state" json:"state"`
	SubmittedAt    time.Time `db:"submitted_at" json:"submitted_at"`
	TimeToReview   *int64    `db:"time_to_review" json:"time_to_review"` // seconds from PR creation
}

type RepoStats struct {
	ID               int64     `db:"id" json:"id"`
	UserID           int64     `db:"user_id" json:"user_id"`
	RepoFullName     string    `db:"repo_full_name" json:"repo_full_name"`
	PRCount          int       `db:"pr_count" json:"pr_count"`
	ReviewCount      int       `db:"review_count" json:"review_count"`
	TotalAdditions   int       `db:"total_additions" json:"total_additions"`
	TotalDeletions   int       `db:"total_deletions" json:"total_deletions"`
	FirstContrib     *time.Time `db:"first_contrib" json:"first_contrib"`
	LastContrib      *time.Time `db:"last_contrib" json:"last_contrib"`
	UpdatedAt        time.Time `db:"updated_at" json:"updated_at"`
}

type StreakDay struct {
	ID        int64     `db:"id" json:"id"`
	UserID    int64     `db:"user_id" json:"user_id"`
	Day       time.Time `db:"day" json:"day"`
	HasPR     bool      `db:"has_pr" json:"has_pr"`
	HasReview bool      `db:"has_review" json:"has_review"`
	HasCommit bool      `db:"has_commit" json:"has_commit"`
}

type WatchedRepo struct {
	ID           int64     `db:"id" json:"id"`
	UserID       int64     `db:"user_id" json:"user_id"`
	RepoFullName string    `db:"repo_full_name" json:"repo_full_name"`
	AddedAt      time.Time `db:"added_at" json:"added_at"`
}

type RepoContributor struct {
	ID             int64      `db:"id" json:"id"`
	WatchedRepoID  int64      `db:"watched_repo_id" json:"watched_repo_id"`
	Login          string     `db:"login" json:"login"`
	AvatarURL      string     `db:"avatar_url" json:"avatar_url"`
	PRCount30d     int        `db:"pr_count_30d" json:"pr_count_30d"`
	PRCount90d     int        `db:"pr_count_90d" json:"pr_count_90d"`
	LastPRAt       *time.Time `db:"last_pr_at" json:"last_pr_at"`
	FirstPRAt      *time.Time `db:"first_pr_at" json:"first_pr_at"`
	IsStale        bool       `db:"is_stale" json:"is_stale"`
}

type StalePR struct {
	ID             int64     `db:"id" json:"id"`
	WatchedRepoID  int64     `db:"watched_repo_id" json:"watched_repo_id"`
	GitHubPRID     int64     `db:"github_pr_id" json:"github_pr_id"`
	Number         int       `db:"number" json:"number"`
	Title          string    `db:"title" json:"title"`
	AuthorLogin    string    `db:"author_login" json:"author_login"`
	HTMLURL        string    `db:"html_url" json:"html_url"`
	OpenedAt       time.Time `db:"opened_at" json:"opened_at"`
	DaysOpen       int       `db:"days_open" json:"days_open"`
}

type MaintainerDashboard struct {
	Repo         WatchedRepo       `json:"repo"`
	Contributors []RepoContributor `json:"contributors"`
	StalePRs     []StalePR         `json:"stale_prs"`
	TotalOpen    int               `json:"total_open_prs"`
}

type WrappedStats struct {
	Year            int            `json:"year"`
	Login           string         `json:"login"`
	Name            string         `json:"name"`
	AvatarURL       string         `json:"avatar_url"`
	ImpactScore     int            `json:"impact_score"`
	TotalPRs        int            `json:"total_prs"`
	TotalReviews    int            `json:"total_reviews"`
	TotalAdditions  int            `json:"total_additions"`
	TotalDeletions  int            `json:"total_deletions"`
	UniqueRepos     int            `json:"unique_repos"`
	LongestStreak   int            `json:"longest_streak"`
	TopRepo         string         `json:"top_repo"`
	TopRepoPRs      int            `json:"top_repo_prs"`
	MostActiveMonth string         `json:"most_active_month"`
	MostActivePRs   int            `json:"most_active_month_prs"`
	MonthlyActivity []MonthlyCount `json:"monthly_activity"`
	FirstPRTitle    string         `json:"first_pr_title"`
	FirstPRRepo     string         `json:"first_pr_repo"`
	LastPRTitle     string         `json:"last_pr_title"`
	LastPRRepo      string         `json:"last_pr_repo"`
}

type MonthlyCount struct {
	Month string `json:"month"`
	Count int    `json:"count"`
}

type DashboardStats struct {
	User             *User        `json:"user"`
	TotalMergedPRs   int          `json:"total_merged_prs"`
	TotalAdditions   int          `json:"total_additions"`
	TotalDeletions   int          `json:"total_deletions"`
	UniqueRepos      int          `json:"unique_repos"`
	RecentPRs        []PullRequest `json:"recent_prs"`
	TopRepos         []RepoStats  `json:"top_repos"`
	ImpactScore      int          `json:"impact_score"`
	CurrentStreak    int          `json:"current_streak"`
	LongestStreak    int          `json:"longest_streak"`
	SyncStatus       string       `json:"sync_status"`
}
