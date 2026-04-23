package handlers

import (
	"fmt"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/gitpulse/backend/internal/db"
)

type PublicHandler struct {
	store *db.Store
}

func NewPublicHandler(store *db.Store) *PublicHandler {
	return &PublicHandler{store: store}
}

func (h *PublicHandler) Profile(c *gin.Context) {
	login := c.Param("login")
	user, err := h.store.GetUserByLogin(c.Request.Context(), login)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	if !user.IsPublic {
		c.JSON(http.StatusForbidden, gin.H{"error": "profile is private"})
		return
	}
	stats, err := h.store.GetDashboardStats(c.Request.Context(), user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, stats)
}

func (h *PublicHandler) Badge(c *gin.Context) {
	login := c.Param("login")
	user, err := h.store.GetUserByLogin(c.Request.Context(), login)
	if err != nil {
		c.Header("Content-Type", "image/svg+xml")
		c.String(http.StatusOK, errorBadgeSVG())
		return
	}

	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		appURL = "https://gitpulse.dev"
	}

	svg := fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" width="220" height="20">
  <linearGradient id="s" x2="0" y2="100%%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
  <clipPath id="r"><rect width="220" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="120" height="20" fill="#555"/>
    <rect x="120" width="50" height="20" fill="#4c1"/>
    <rect x="170" width="50" height="20" fill="#e05d44"/>
    <rect width="220" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="60" y="15" fill="#010101" fill-opacity=".3">GitPulse Score</text>
    <text x="60" y="14">GitPulse Score</text>
    <text x="145" y="15" fill="#010101" fill-opacity=".3">%d</text>
    <text x="145" y="14">%d</text>
    <text x="195" y="15" fill="#010101" fill-opacity=".3">🔥%d</text>
    <text x="195" y="14">🔥%d</text>
  </g>
</svg>`, user.ImpactScore, user.ImpactScore, user.CurrentStreak, user.CurrentStreak)

	c.Header("Content-Type", "image/svg+xml")
	c.Header("Cache-Control", "no-cache, max-age=0")
	c.Header("Access-Control-Allow-Origin", "*")
	c.String(http.StatusOK, svg)
}

func errorBadgeSVG() string {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="20">
  <rect width="140" height="20" rx="3" fill="#555"/>
  <text x="70" y="14" fill="#fff" text-anchor="middle" font-family="DejaVu Sans" font-size="11">GitPulse: not found</text>
</svg>`
}
