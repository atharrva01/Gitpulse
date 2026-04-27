package email

import (
	"context"
	"fmt"
	"html"
	"log"
	"os"
	"strings"
	"time"

	resend "github.com/resend/resend-go/v2"

	"github.com/gitpulse/backend/internal/db"
	"github.com/gitpulse/backend/internal/handlers"
	"github.com/gitpulse/backend/internal/models"
)

type DigestSender struct {
	store  *db.Store
	client *resend.Client
	from   string
	appURL string
}

func NewDigestSender(store *db.Store) *DigestSender {
	apiKey := os.Getenv("RESEND_API_KEY")
	from := os.Getenv("EMAIL_FROM")
	if from == "" {
		from = "GitPulse <digest@gitpulse.dev>"
	}
	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		appURL = "http://localhost:5173"
	}
	return &DigestSender{
		store:  store,
		client: resend.NewClient(apiKey),
		from:   from,
		appURL: appURL,
	}
}

func (d *DigestSender) SendWeeklyDigests(ctx context.Context) {
	if os.Getenv("RESEND_API_KEY") == "" {
		log.Println("email digest: RESEND_API_KEY not set, skipping")
		return
	}

	users, err := d.store.GetWeeklyDigestUsers(ctx)
	if err != nil {
		log.Printf("email digest: get users: %v", err)
		return
	}

	log.Printf("email digest: sending to %d users", len(users))
	for _, u := range users {
		if u.Email == "" {
			continue
		}

		prs, err := d.store.GetPRsLastWeek(ctx, u.ID)
		if err != nil {
			log.Printf("email digest: get prs for %s: %v", u.Login, err)
			continue
		}

		subject := fmt.Sprintf("Your GitPulse weekly — %s", time.Now().Format("Jan 2"))
		unsubToken := handlers.UnsubscribeTokenFor(u.Login)
		html := d.buildHTML(u.Login, u.Name, u.ImpactScore, u.CurrentStreak, prs, unsubToken)

		params := &resend.SendEmailRequest{
			From:    d.from,
			To:      []string{u.Email},
			Subject: subject,
			Html:    html,
		}
		if _, err := d.client.Emails.Send(params); err != nil {
			log.Printf("email digest: send to %s: %v", u.Login, err)
		}
	}
}

func (d *DigestSender) buildHTML(login, name string, score, streak int, prs []models.PullRequest, unsubToken string) string {
	displayName := name
	if displayName == "" {
		displayName = login
	}

	streakMsg := "Keep your streak alive — contribute today."
	if streak >= 7 {
		streakMsg = fmt.Sprintf("You're on a 🔥 %d-day streak. Don't break it now.", streak)
	} else if streak == 0 {
		streakMsg = "Your streak reset. Start a new one today."
	}

	prRows := ""
	if len(prs) == 0 {
		prRows = `<p style="margin:0;color:#8b949e;font-size:14px">No PRs merged last week. Time to ship something! 🚀</p>`
	} else {
		var sb strings.Builder
		for _, pr := range prs {
			sb.WriteString(fmt.Sprintf(
				`<div style="padding:10px 0;border-bottom:1px solid #30363d">
          <a href="%s" style="color:#58a6ff;text-decoration:none;font-size:14px;font-weight:500">%s</a>
          <p style="margin:2px 0 0;color:#8b949e;font-size:12px;font-family:monospace">%s</p>
        </div>`,
				html.EscapeString(pr.HTMLURL), html.EscapeString(pr.Title), html.EscapeString(pr.RepoFullName),
			))
		}
		prRows = sb.String()
	}

	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d1117;font-family:system-ui,sans-serif;color:#e6edf3">
  <div style="max-width:520px;margin:32px auto;padding:32px;background:#161b22;border:1px solid #30363d;border-radius:12px">

    <div style="text-align:center;margin-bottom:24px">
      <span style="font-size:24px;font-weight:700;color:#fff">⚡ GitPulse</span>
      <p style="margin:4px 0 0;color:#8b949e;font-size:14px">Weekly digest for %s</p>
    </div>

    <div style="display:flex;gap:12px;margin-bottom:20px">
      <div style="flex:1;background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:16px;text-align:center">
        <p style="margin:0 0 4px;color:#8b949e;font-size:12px;text-transform:uppercase;letter-spacing:1px">Impact Score</p>
        <p style="margin:0;font-size:36px;font-weight:900;color:#fff">%d</p>
      </div>
      <div style="flex:1;background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:16px;text-align:center">
        <p style="margin:0 0 4px;color:#8b949e;font-size:12px;text-transform:uppercase;letter-spacing:1px">🔥 Streak</p>
        <p style="margin:0;font-size:36px;font-weight:900;color:#fff">%dd</p>
      </div>
    </div>

    <div style="background:#1f2937;border:1px solid #374151;border-radius:8px;padding:16px;margin-bottom:20px">
      <p style="margin:0;font-size:14px;color:#d1d5db">%s</p>
    </div>

    <div style="margin-bottom:24px">
      <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#fff">PRs merged last week</p>
      %s
    </div>

    <div style="text-align:center;margin-top:24px">
      <a href="%s/dashboard" style="background:#10b981;color:#000;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block">
        View Dashboard →
      </a>
    </div>

    <p style="text-align:center;margin-top:24px;font-size:12px;color:#484f58">
      <a href="%s/unsubscribe?login=%s&token=%s" style="color:#484f58">Unsubscribe</a> · GitPulse
    </p>
  </div>
</body>
</html>`,
		displayName, score, streak, streakMsg, prRows, d.appURL, d.appURL, login, unsubToken)
}
