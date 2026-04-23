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
