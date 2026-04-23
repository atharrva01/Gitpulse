package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gitpulse/backend/internal/db"
)

type WrappedHandler struct {
	store *db.Store
}

func NewWrappedHandler(store *db.Store) *WrappedHandler {
	return &WrappedHandler{store: store}
}

func (h *WrappedHandler) Get(c *gin.Context) {
	yearStr := c.DefaultQuery("year", strconv.Itoa(time.Now().Year()-1))
	year, err := strconv.Atoi(yearStr)
	if err != nil || year < 2008 || year > time.Now().Year() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid year"})
		return
	}
	ws, err := h.store.GetWrappedStats(c.Request.Context(), userID(c), year)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, ws)
}

func (h *WrappedHandler) GetPublic(c *gin.Context) {
	login := c.Param("login")
	yearStr := c.DefaultQuery("year", strconv.Itoa(time.Now().Year()-1))
	year, err := strconv.Atoi(yearStr)
	if err != nil || year < 2008 || year > time.Now().Year() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid year"})
		return
	}
	user, err := h.store.GetUserByLogin(c.Request.Context(), login)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	if !user.IsPublic {
		c.JSON(http.StatusForbidden, gin.H{"error": "profile is private"})
		return
	}
	ws, err := h.store.GetWrappedStats(c.Request.Context(), user.ID, year)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, ws)
}
