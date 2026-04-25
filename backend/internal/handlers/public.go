package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gitpulse/backend/internal/db"
)

type PublicHandler struct {
	store *db.Store
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
    <!-- Background -->
    <rect width="320" height="88" fill="url(#bg)"/>
    <!-- Subtle right glow -->
    <circle cx="280" cy="44" r="60" fill="#10b981" fill-opacity="0.04"/>
    <!-- Border -->
    <rect width="320" height="88" rx="10" fill="none" stroke="#10b981" stroke-opacity="0.18" stroke-width="1.5"/>
    <!-- Divider lines -->
    <line x1="116" y1="10" x2="116" y2="70" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/>
    <line x1="216" y1="10" x2="216" y2="70" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/>
    <!-- Logo box -->
    <rect x="14" y="15" width="22" height="22" rx="5" fill="url(#logo)"/>
    <text x="25" y="30" font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="11" fill="#000000" text-anchor="middle">G</text>
    <!-- GitPulse text -->
    <text x="42" y="25" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="11" fill="#ffffff">Git</text>
    <text x="62" y="25" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="11" fill="#34d399">Pulse</text>
    <text x="42" y="37" font-family="Arial,Helvetica,sans-serif" font-size="7.5" fill="#ffffff" fill-opacity="0.28" letter-spacing="1.2">IMPACT SCORE</text>
    <!-- Score (center) -->
    <text x="166" y="52" font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="30" fill="#34d399" text-anchor="middle">%d</text>
    <text x="166" y="63" font-family="Arial,Helvetica,sans-serif" font-size="7" fill="#ffffff" fill-opacity="0.22" text-anchor="middle" letter-spacing="1">/1000</text>
    <!-- Right: tier + streak -->
    <text x="306" y="28" font-family="Arial,Helvetica,sans-serif" font-size="7.5" fill="#34d399" fill-opacity="0.7" text-anchor="end" letter-spacing="0.8">%s</text>
    <text x="306" y="42" font-family="Arial,Helvetica,sans-serif" font-size="9" fill="#ffffff" fill-opacity="0.4" text-anchor="end">&#x1F525; %d day streak</text>
    <!-- Progress bar track -->
    <rect x="16" y="73" width="288" height="4" rx="2" fill="#ffffff" fill-opacity="0.05"/>
    <!-- Progress bar fill -->
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
