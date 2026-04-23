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

// SyncUser performs a full or incremental sync for a user.
// incremental = true: fetch last 90 days only (faster)
// incremental = false: fetch all history
func (w *Worker) SyncUser(ctx context.Context, user *models.User, incremental bool) error {
	client := ghclient.New(user.GitHubToken)

	if err := w.syncPRs(ctx, client, user, incremental); err != nil {
		log.Printf("sync PRs for %s: %v", user.Login, err)
		return err
	}
	if err := w.syncReviews(ctx, client, user); err != nil {
		log.Printf("sync reviews for %s: %v", user.Login, err)
	}

	if err := w.rebuildRepoStats(ctx, user.ID); err != nil {
		log.Printf("rebuild repo stats for %s: %v", user.Login, err)
	}
	if err := w.store.RebuildStreakDays(ctx, user.ID); err != nil {
		log.Printf("rebuild streak days for %s: %v", user.Login, err)
	}
	if err := w.rebuildStreaks(ctx, user); err != nil {
		log.Printf("rebuild streaks for %s: %v", user.Login, err)
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

func (w *Worker) rebuildRepoStats(ctx context.Context, userID int64) error {
	return w.store.RebuildRepoStats(ctx, userID)
}

func (w *Worker) rebuildStreaks(ctx context.Context, user *models.User) error {
	days, err := w.store.GetAllStreakDays(ctx, user.ID)
	if err != nil {
		return err
	}

	// Build set of active days
	daySet := make(map[string]bool)
	for _, d := range days {
		daySet[d.Day.Format("2006-01-02")] = true
	}

	if len(daySet) == 0 {
		return w.store.UpdateScores(ctx, user.ID, 0, 0, 0)
	}

	// Sort days descending
	sorted := make([]string, 0, len(daySet))
	for d := range daySet {
		sorted = append(sorted, d)
	}
	sort.Sort(sort.Reverse(sort.StringSlice(sorted)))

	today := time.Now().UTC().Format("2006-01-02")
	yesterday := time.Now().UTC().AddDate(0, 0, -1).Format("2006-01-02")

	current := 0
	if daySet[today] || daySet[yesterday] {
		prev := sorted[0]
		current = 1
		for i := 1; i < len(sorted); i++ {
			prevT, _ := time.Parse("2006-01-02", prev)
			currT, _ := time.Parse("2006-01-02", sorted[i])
			if prevT.Sub(currT) == 24*time.Hour {
				current++
				prev = sorted[i]
			} else {
				break
			}
		}
	}

	// Compute longest streak
	longest := 0
	run := 1
	for i := 1; i < len(sorted); i++ {
		prevT, _ := time.Parse("2006-01-02", sorted[i-1])
		currT, _ := time.Parse("2006-01-02", sorted[i])
		if prevT.Sub(currT) == 24*time.Hour {
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

	impact := computeImpactScore(user, days)
	return w.store.UpdateScores(ctx, user.ID, impact, current, longest)
}

// Impact Score formula (0-1000):
//   - Merged PRs × 5, capped at 400
//   - Lines changed: log(additions+deletions+1) × 20, capped at 200
//   - Reviews × 8, capped at 200
//   - Current streak × 2, capped at 100
//   - Unique repos × 5, capped at 100
func computeImpactScore(user *models.User, days []models.StreakDay) int {
	// These will be computed properly after full sync; placeholder uses user fields
	// In a real call we'd pass aggregates, but streak days give us a proxy
	prDays := 0
	reviewDays := 0
	for _, d := range days {
		if d.HasPR {
			prDays++
		}
		if d.HasReview {
			reviewDays++
		}
	}
	score := 0
	score += min(prDays*5, 400)
	score += min(int(math.Log(float64(prDays+reviewDays+1))*20), 200)
	score += min(reviewDays*8, 200)
	score += min(user.CurrentStreak*2, 100)
	return min(score, 1000)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
