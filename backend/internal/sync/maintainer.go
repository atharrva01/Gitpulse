package sync

import (
	"context"
	"log"
	"strings"
	"time"

	"github.com/gitpulse/backend/internal/db"
	ghclient "github.com/gitpulse/backend/internal/github"
	"github.com/gitpulse/backend/internal/models"
)

type MaintainerWorker struct {
	store *db.Store
}

func NewMaintainerWorker(store *db.Store) *MaintainerWorker {
	return &MaintainerWorker{store: store}
}

func (w *MaintainerWorker) SyncRepo(ctx context.Context, user *models.User, wr *models.WatchedRepo) error {
	return w.SyncRepoWithToken(ctx, user.GitHubToken, wr)
}

func (w *MaintainerWorker) SyncRepoWithToken(ctx context.Context, token string, wr *models.WatchedRepo) error {
	parts := strings.SplitN(wr.RepoFullName, "/", 2)
	if len(parts) != 2 {
		return nil
	}
	owner, name := parts[0], parts[1]
	client := ghclient.New(token)

	if err := w.syncOpenPRs(ctx, client, wr, owner, name); err != nil {
		log.Printf("sync open PRs for %s: %v", wr.RepoFullName, err)
	}
	if err := w.syncContributors(ctx, client, wr, owner, name); err != nil {
		log.Printf("sync contributors for %s: %v", wr.RepoFullName, err)
	}
	return nil
}

func (w *MaintainerWorker) syncOpenPRs(ctx context.Context, client *ghclient.Client, wr *models.WatchedRepo, owner, name string) error {
	if err := w.store.DeleteStalePRsForRepo(ctx, wr.ID); err != nil {
		return err
	}
	cursor := ""
	now := time.Now()
	for {
		nodes, hasNext, next, err := client.FetchOpenPRs(ctx, owner, name, cursor)
		if err != nil {
			return err
		}
		for _, pr := range nodes {
			daysOpen := int(now.Sub(pr.CreatedAt).Hours() / 24)
			sp := &models.StalePR{
				WatchedRepoID: wr.ID,
				GitHubPRID:    pr.DatabaseID,
				Number:        pr.Number,
				Title:         pr.Title,
				AuthorLogin:   pr.Author.Login,
				HTMLURL:       pr.HTMLURL,
				OpenedAt:      pr.CreatedAt,
				DaysOpen:      daysOpen,
			}
			if err := w.store.UpsertStalePR(ctx, sp); err != nil {
				log.Printf("upsert stale PR %d: %v", pr.DatabaseID, err)
			}
		}
		if !hasNext {
			break
		}
		cursor = next
	}
	return nil
}

func (w *MaintainerWorker) syncContributors(ctx context.Context, client *ghclient.Client, wr *models.WatchedRepo, owner, name string) error {
	prs, err := client.FetchRecentMergedPRs(ctx, owner, name)
	if err != nil {
		return err
	}

	now := time.Now()
	cutoff30 := now.AddDate(0, 0, -30)
	cutoff90 := now.AddDate(0, 0, -90)

	type contribData struct {
		avatarURL  string
		count30    int
		count90    int
		lastPR     *time.Time
		firstPR    *time.Time
	}
	contribs := make(map[string]*contribData)

	for _, pr := range prs {
		login := pr.Author.Login
		if login == "" {
			continue
		}
		cd, ok := contribs[login]
		if !ok {
			cd = &contribData{avatarURL: pr.Author.AvatarURL}
			contribs[login] = cd
		}
		t := pr.MergedAt
		if cd.lastPR == nil || t.After(*cd.lastPR) {
			cd.lastPR = &t
		}
		if cd.firstPR == nil || t.Before(*cd.firstPR) {
			cd.firstPR = &t
		}
		if t.After(cutoff30) {
			cd.count30++
		}
		if t.After(cutoff90) {
			cd.count90++
		}
	}

	for login, cd := range contribs {
		staleDays := 30
		if cd.lastPR != nil {
			staleDays = int(now.Sub(*cd.lastPR).Hours() / 24)
		}
		c := &models.RepoContributor{
			WatchedRepoID: wr.ID,
			Login:         login,
			AvatarURL:     cd.avatarURL,
			PRCount30d:    cd.count30,
			PRCount90d:    cd.count90,
			LastPRAt:      cd.lastPR,
			FirstPRAt:     cd.firstPR,
			IsStale:       staleDays > 30,
		}
		if err := w.store.UpsertRepoContributor(ctx, c); err != nil {
			log.Printf("upsert contributor %s: %v", login, err)
		}
	}
	return nil
}
