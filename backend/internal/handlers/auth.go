package handlers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gitpulse/backend/internal/auth"
	"github.com/gitpulse/backend/internal/db"
	"github.com/gitpulse/backend/internal/models"
	syncer "github.com/gitpulse/backend/internal/sync"
)

var (
	oauthStates   sync.Map // state → time.Time (created at)
	pendingTokens sync.Map // one-time code → jwt string
)

type AuthHandler struct {
	store  *db.Store
	worker *syncer.Worker
}

func NewAuthHandler(store *db.Store, worker *syncer.Worker) *AuthHandler {
	return &AuthHandler{store: store, worker: worker}
}

func (h *AuthHandler) Login(c *gin.Context) {
	state, err := randomState()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate state"})
		return
	}
	cfg := auth.OAuthConfig()
	oauthStates.Store(state, time.Now())
	c.Redirect(http.StatusTemporaryRedirect, auth.AuthURL(cfg, state))
}

func (h *AuthHandler) Callback(c *gin.Context) {
	state := c.Query("state")
	val, ok := oauthStates.LoadAndDelete(state)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid oauth state"})
		return
	}
	if time.Since(val.(time.Time)) > 10*time.Minute {
		c.JSON(http.StatusBadRequest, gin.H{"error": "oauth state expired"})
		return
	}

	code := c.Query("code")
	cfg := auth.OAuthConfig()
	token, err := auth.ExchangeCode(c.Request.Context(), cfg, code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to exchange code"})
		return
	}

	ghUser, err := auth.FetchGitHubUser(c.Request.Context(), token.AccessToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch GitHub user"})
		return
	}

	user := &models.User{
		GitHubID:  ghUser.ID,
		Login:     ghUser.Login,
		Name:      ghUser.Name,
		AvatarURL: ghUser.AvatarURL,
		Bio:       ghUser.Bio,
		Location:  ghUser.Location,
		Email:     ghUser.Email,
		GitHubToken: token.AccessToken,
	}

	if err := h.store.UpsertUser(c.Request.Context(), user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save user"})
		return
	}

	// Kick off background sync with a fresh context — request context is cancelled on redirect
	isFirstSync := user.LastSyncedAt == nil
	go func() {
		if err := h.worker.SyncUser(context.Background(), user, !isFirstSync); err != nil {
			log.Printf("background sync for %s: %v", user.Login, err)
		}
	}()

	jwt, err := auth.IssueJWT(user.ID, user.Login)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to issue token"})
		return
	}

	// Use a short-lived one-time code so the JWT never appears in a URL
	loginCode, err := randomState()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate code"})
		return
	}
	pendingTokens.Store(loginCode, jwt)
	go func() {
		time.Sleep(60 * time.Second)
		pendingTokens.Delete(loginCode)
	}()

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}
	c.Redirect(http.StatusTemporaryRedirect, frontendURL+"/auth/callback?code="+loginCode)
}

// ExchangeToken exchanges a short-lived one-time code for a JWT.
func (h *AuthHandler) ExchangeToken(c *gin.Context) {
	code := c.Query("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing code"})
		return
	}
	val, ok := pendingTokens.LoadAndDelete(code)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired code"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": val.(string)})
}

func (h *AuthHandler) Me(c *gin.Context) {
	user, err := h.store.GetUserByID(c.Request.Context(), userID(c))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	c.JSON(http.StatusOK, user)
}

func PurgeExpiredOAuthStates() {
	oauthStates.Range(func(k, v any) bool {
		if time.Since(v.(time.Time)) > 10*time.Minute {
			oauthStates.Delete(k)
		}
		return true
	})
}

func randomState() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
