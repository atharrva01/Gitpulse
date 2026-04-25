package handlers

import (
	"context"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gitpulse/backend/internal/db"
	syncer "github.com/gitpulse/backend/internal/sync"
)

type DashboardHandler struct {
	store  *db.Store
	worker *syncer.Worker
}

func NewDashboardHandler(store *db.Store, worker *syncer.Worker) *DashboardHandler {
	return &DashboardHandler{store: store, worker: worker}
}

func (h *DashboardHandler) Stats(c *gin.Context) {
	stats, err := h.store.GetDashboardStats(c.Request.Context(), userID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, stats)
}

func (h *DashboardHandler) RepoBreakdown(c *gin.Context) {
	repos, err := h.store.GetRepoBreakdown(c.Request.Context(), userID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, repos)
}

func (h *DashboardHandler) ReviewLatency(c *gin.Context) {
	latency, err := h.store.GetReviewLatency(c.Request.Context(), userID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, latency)
}

func (h *DashboardHandler) Sync(c *gin.Context) {
	uid := userID(c)
	user, err := h.store.GetUserByID(c.Request.Context(), uid)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	// ?full=true forces a complete historical re-sync
	incremental := c.Query("full") != "true"

	go func() {
		if err := h.worker.SyncUser(context.Background(), user, incremental); err != nil {
			log.Printf("background sync for %s: %v", user.Login, err)
		}
	}()

	c.JSON(http.StatusAccepted, gin.H{"message": "sync started", "full": !incremental})
}

func (h *DashboardHandler) Velocity(c *gin.Context) {
	months, err := h.store.GetMonthlyVelocity(c.Request.Context(), userID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, months)
}

func (h *DashboardHandler) Heatmap(c *gin.Context) {
	days, err := h.store.GetHeatmapDays(c.Request.Context(), userID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, days)
}

func (h *DashboardHandler) UpdateSettings(c *gin.Context) {
	var body struct {
		EmailDigest *bool `json:"email_digest_opt"`
		IsPublic    *bool `json:"is_public"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	uid := userID(c)
	ctx := c.Request.Context()
	if body.EmailDigest != nil {
		if err := h.store.UpdateEmailDigest(ctx, uid, *body.EmailDigest); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}
	if body.IsPublic != nil {
		if err := h.store.UpdatePublicProfile(ctx, uid, *body.IsPublic); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{"message": "settings updated"})
}
