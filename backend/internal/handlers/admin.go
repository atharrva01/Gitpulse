package handlers

import (
	"crypto/subtle"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/gitpulse/backend/internal/db"
)

type AdminHandler struct {
	store *db.Store
}

func NewAdminHandler(store *db.Store) *AdminHandler {
	return &AdminHandler{store: store}
}

func AdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		secret := os.Getenv("ADMIN_SECRET")
		if secret == "" || subtle.ConstantTimeCompare([]byte(c.GetHeader("X-Admin-Secret")), []byte(secret)) != 1 {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}
		c.Next()
	}
}

func (h *AdminHandler) ListUsers(c *gin.Context) {
	users, err := h.store.ListAllUsers(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"total": len(users),
		"users": users,
	})
}
