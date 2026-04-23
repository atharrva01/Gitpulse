package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"os"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/gitpulse/backend/internal/auth"
	"github.com/gitpulse/backend/internal/db"
	"github.com/gitpulse/backend/internal/models"
	syncer "github.com/gitpulse/backend/internal/sync"
)

var (
	oauthStates = sync.Map{}
)

type AuthHandler struct {
	store  *db.Store
	worker *syncer.Worker
}

func NewAuthHandler(store *db.Store, worker *syncer.Worker) *AuthHandler {
	return &AuthHandler{store: store, worker: worker}
}

func (h *AuthHandler) Login(c *gin.Context) {
	cfg := auth.OAuthConfig()
	state := randomState()
	oauthStates.Store(state, true)
	c.Redirect(http.StatusTemporaryRedirect, auth.AuthURL(cfg, state))
}

func (h *AuthHandler) Callback(c *gin.Context) {
	state := c.Query("state")
	if _, ok := oauthStates.LoadAndDelete(state); !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid oauth state"})
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

	// Kick off background sync
	isFirstSync := user.LastSyncedAt == nil
	go func() {
		ctx := c.Request.Context()
		_ = h.worker.SyncUser(ctx, user, !isFirstSync)
	}()

	jwt, err := auth.IssueJWT(user.ID, user.Login)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to issue token"})
		return
	}

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}
	c.Redirect(http.StatusTemporaryRedirect, frontendURL+"/auth/callback?token="+jwt)
}

func (h *AuthHandler) Me(c *gin.Context) {
	user, err := h.store.GetUserByID(c.Request.Context(), userID(c))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	c.JSON(http.StatusOK, user)
}

func randomState() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}
