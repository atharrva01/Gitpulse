package handlers

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gitpulse/backend/internal/db"
)

type PublicHandler struct {
	store *db.Store

	statsMu      sync.Mutex
	statsCache   *db.PlatformStats
	statsCachedAt time.Time
}

func NewPublicHandler(store *db.Store) *PublicHandler {
	return &PublicHandler{store: store}
}

func (h *PublicHandler) Leaderboard(c *gin.Context) {
	entries, err := h.store.GetLeaderboard(c.Request.Context(), 50)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, entries)
}

func (h *PublicHandler) Profile(c *gin.Context) {
	login := c.Param("login")
	user, err := h.store.GetUserByLogin(c.Request.Context(), login)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	if !user.IsPublic {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	stats, err := h.store.GetDashboardStats(c.Request.Context(), user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, stats)
}

func (h *PublicHandler) PublicHeatmap(c *gin.Context) {
	login := c.Param("login")
	user, err := h.store.GetUserByLogin(c.Request.Context(), login)
	if err != nil || !user.IsPublic {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	days, err := h.store.GetHeatmapDays(c.Request.Context(), user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, days)
}

func (h *PublicHandler) PublicVelocity(c *gin.Context) {
	login := c.Param("login")
	user, err := h.store.GetUserByLogin(c.Request.Context(), login)
	if err != nil || !user.IsPublic {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	months, err := h.store.GetMonthlyVelocity(c.Request.Context(), user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, months)
}

func (h *PublicHandler) PlatformStats(c *gin.Context) {
	h.statsMu.Lock()
	if h.statsCache != nil && time.Since(h.statsCachedAt) < time.Hour {
		cached := h.statsCache
		h.statsMu.Unlock()
		c.JSON(http.StatusOK, cached)
		return
	}
	h.statsMu.Unlock()

	stats, err := h.store.GetPlatformStats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	h.statsMu.Lock()
	h.statsCache = stats
	h.statsCachedAt = time.Now()
	h.statsMu.Unlock()

	c.JSON(http.StatusOK, stats)
}

func unsubscribeToken(login string) string {
	secret := os.Getenv("JWT_SECRET")
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(login + ":unsubscribe"))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

func UnsubscribeTokenFor(login string) string { return unsubscribeToken(login) }

func (h *PublicHandler) Unsubscribe(c *gin.Context) {
	login := c.Query("login")
	token := c.Query("token")

	if login == "" || token == "" {
		c.Data(http.StatusBadRequest, "text/html; charset=utf-8", unsubHTML("Invalid link.", false))
		return
	}

	expected := unsubscribeToken(login)
	if subtle.ConstantTimeCompare([]byte(token), []byte(expected)) != 1 {
		c.Data(http.StatusBadRequest, "text/html; charset=utf-8", unsubHTML("Invalid or expired link.", false))
		return
	}

	user, err := h.store.GetUserByLogin(c.Request.Context(), login)
	if err != nil {
		c.Data(http.StatusNotFound, "text/html; charset=utf-8", unsubHTML("User not found.", false))
		return
	}

	if err := h.store.UpdateEmailDigest(c.Request.Context(), user.ID, false); err != nil {
		c.Data(http.StatusInternalServerError, "text/html; charset=utf-8", unsubHTML("Something went wrong.", false))
		return
	}

	c.Data(http.StatusOK, "text/html; charset=utf-8", unsubHTML(fmt.Sprintf("@%s has been unsubscribed from weekly digests.", login), true))
}

func unsubHTML(msg string, success bool) []byte {
	color := "#f87171"
	if success {
		color = "#34d399"
	}
	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		appURL = "http://localhost:5173"
	}
	return []byte(fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Unsubscribe — GitPulse</title></head>
<body style="margin:0;padding:0;background:#060a06;font-family:system-ui,sans-serif;color:#e6edf3;display:flex;align-items:center;justify-content:center;min-height:100vh">
  <div style="max-width:400px;width:90%%;text-align:center;padding:40px 24px">
    <div style="font-size:28px;font-weight:900;color:#fff;margin-bottom:8px">Git<span style="color:#34d399">Pulse</span></div>
    <p style="color:%s;margin:24px 0 16px;font-size:16px">%s</p>
    <a href="%s" style="color:#34d399;font-size:13px;text-decoration:none">← Back to GitPulse</a>
  </div>
</body>
</html>`, color, msg, appURL))
}

func badgeTierLabel(score int) string {
	switch {
	case score >= 950:
		return "OSS LEGEND 👑"
	case score >= 800:
		return "OSS CHAMPION 🏆"
	case score >= 600:
		return "CORE DEV 🧠"
	case score >= 450:
		return "BUILDER 🚀"
	case score >= 250:
		return "CONTRIBUTOR 🔨"
	case score >= 100:
		return "NEWCOMER ⚡"
	default:
		return "GETTING STARTED 🌱"
	}
}

func (h *PublicHandler) Badge(c *gin.Context) {
	login := c.Param("login")
	user, err := h.store.GetUserByLogin(c.Request.Context(), login)
	if err != nil {
		c.Header("Content-Type", "image/svg+xml")
		c.String(http.StatusOK, errorBadgeSVG())
		return
	}

	barWidth := int(float64(user.ImpactScore) / 1000.0 * 288)
	if barWidth > 288 {
		barWidth = 288
	}
	tier := badgeTierLabel(user.ImpactScore)

	svg := fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="88" viewBox="0 0 320 88">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="320" y2="88" gradientUnits="userSpaceOnUse">
      <stop offset="0%%" stop-color="#060a06"/>
      <stop offset="100%%" stop-color="#0b1a0e"/>
    </linearGradient>
    <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%%" stop-color="#10b981"/>
      <stop offset="100%%" stop-color="#06b6d4"/>
    </linearGradient>
    <linearGradient id="logo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%%" stop-color="#34d399"/>
      <stop offset="100%%" stop-color="#06b6d4"/>
    </linearGradient>
  </defs>
  <clipPath id="clip"><rect width="320" height="88" rx="10"/></clipPath>
  <g clip-path="url(#clip)">
    <rect width="320" height="88" fill="url(#bg)"/>
    <circle cx="280" cy="44" r="60" fill="#10b981" fill-opacity="0.04"/>
    <rect width="320" height="88" rx="10" fill="none" stroke="#10b981" stroke-opacity="0.18" stroke-width="1.5"/>
    <line x1="116" y1="10" x2="116" y2="70" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/>
    <line x1="216" y1="10" x2="216" y2="70" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/>
    <rect x="14" y="15" width="22" height="22" rx="5" fill="url(#logo)"/>
    <text x="25" y="30" font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="11" fill="#000000" text-anchor="middle">G</text>
    <text x="42" y="25" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="11" fill="#ffffff">Git</text>
    <text x="62" y="25" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="11" fill="#34d399">Pulse</text>
    <text x="42" y="37" font-family="Arial,Helvetica,sans-serif" font-size="7.5" fill="#ffffff" fill-opacity="0.28" letter-spacing="1.2">IMPACT SCORE</text>
    <text x="166" y="52" font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="30" fill="#34d399" text-anchor="middle">%d</text>
    <text x="166" y="63" font-family="Arial,Helvetica,sans-serif" font-size="7" fill="#ffffff" fill-opacity="0.22" text-anchor="middle" letter-spacing="1">/1000</text>
    <text x="306" y="28" font-family="Arial,Helvetica,sans-serif" font-size="7.5" fill="#34d399" fill-opacity="0.7" text-anchor="end" letter-spacing="0.8">%s</text>
    <text x="306" y="42" font-family="Arial,Helvetica,sans-serif" font-size="9" fill="#ffffff" fill-opacity="0.4" text-anchor="end">&#x1F525; %d day streak</text>
    <rect x="16" y="73" width="288" height="4" rx="2" fill="#ffffff" fill-opacity="0.05"/>
    <rect x="16" y="73" width="%d" height="4" rx="2" fill="url(#bar)"/>
  </g>
</svg>`, user.ImpactScore, tier, user.CurrentStreak, barWidth)

	c.Header("Content-Type", "image/svg+xml")
	c.Header("Cache-Control", "no-cache, max-age=0")
	c.Header("Access-Control-Allow-Origin", "*")
	c.String(http.StatusOK, svg)
}

func errorBadgeSVG() string {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="36" viewBox="0 0 200 36">
  <rect width="200" height="36" rx="8" fill="#060a06" stroke="#10b981" stroke-opacity="0.2" stroke-width="1"/>
  <text x="100" y="22" fill="#34d399" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" font-weight="700">GitPulse: not found</text>
</svg>`
}
