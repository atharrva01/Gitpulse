package handlers

import (
	"context"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/gitpulse/backend/internal/db"
	syncer "github.com/gitpulse/backend/internal/sync"
)

const maxFreeWatchedRepos = 3

type MaintainerHandler struct {
	store  *db.Store
	worker *syncer.MaintainerWorker
}

func NewMaintainerHandler(store *db.Store, worker *syncer.MaintainerWorker) *MaintainerHandler {
	return &MaintainerHandler{store: store, worker: worker}
}

func (h *MaintainerHandler) ListWatched(c *gin.Context) {
	repos, err := h.store.GetWatchedRepos(c.Request.Context(), userID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, repos)
}

func (h *MaintainerHandler) AddWatched(c *gin.Context) {
	var body struct {
		Repo string `json:"repo" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "repo is required"})
		return
	}

	parts := strings.SplitN(body.Repo, "/", 2)
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" || len(body.Repo) > 255 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "repo must be in owner/repo format"})
		return
	}

	ctx := c.Request.Context()
	uid := userID(c)

	count, err := h.store.CountWatchedRepos(ctx, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if count >= maxFreeWatchedRepos {
		c.JSON(http.StatusForbidden, gin.H{"error": "free tier limited to 3 watched repos"})
		return
	}

	wr, err := h.store.AddWatchedRepo(ctx, uid, body.Repo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if user, err := h.store.GetUserByID(ctx, uid); err != nil {
		log.Printf("AddWatched: get user %d: %v", uid, err)
	} else {
		go func() {
			_ = h.worker.SyncRepo(context.Background(), user, wr)
		}()
	}

	c.JSON(http.StatusCreated, wr)
}

func (h *MaintainerHandler) RemoveWatched(c *gin.Context) {
	repo := c.Param("repo")
	if err := h.store.RemoveWatchedRepo(c.Request.Context(), userID(c), repo); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "removed"})
}

func (h *MaintainerHandler) GetDashboard(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	ctx := c.Request.Context()
	uid := userID(c)

	wr, err := h.store.GetWatchedRepoByID(ctx, id, uid)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "repo not found"})
		return
	}

	dash, err := h.store.GetMaintainerDashboard(ctx, wr.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, dash)
}

func (h *MaintainerHandler) RefreshRepo(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	ctx := c.Request.Context()
	uid := userID(c)

	wr, err := h.store.GetWatchedRepoByID(ctx, id, uid)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "repo not found"})
		return
	}
	user, err := h.store.GetUserByID(ctx, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "user not found"})
		return
	}

	go func() {
		_ = h.worker.SyncRepo(context.Background(), user, wr)
	}()

	c.JSON(http.StatusAccepted, gin.H{"message": "refresh started"})
}
