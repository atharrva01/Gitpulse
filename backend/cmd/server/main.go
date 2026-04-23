package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/robfig/cron/v3"
	"github.com/rs/cors"

	"github.com/gitpulse/backend/internal/db"
	"github.com/gitpulse/backend/internal/handlers"
	syncer "github.com/gitpulse/backend/internal/sync"
)

func main() {
	_ = godotenv.Load()

	database, err := db.New()
	if err != nil {
		log.Fatalf("connect db: %v", err)
	}

	store := db.NewStore(database)
	worker := syncer.NewWorker(store)

	authH := handlers.NewAuthHandler(store, worker)
	dashH := handlers.NewDashboardHandler(store, worker)
	pubH := handlers.NewPublicHandler(store)

	r := gin.Default()

	// CORS
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}
	corsHandler := cors.New(cors.Options{
		AllowedOrigins:   []string{frontendURL},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
	})
	r.Use(func(c *gin.Context) {
		corsHandler.HandlerFunc(c.Writer, c.Request)
		c.Next()
	})

	// Auth routes
	r.GET("/auth/github", authH.Login)
	r.GET("/auth/github/callback", authH.Callback)

	// Protected routes
	api := r.Group("/api")
	api.Use(handlers.AuthMiddleware())
	{
		api.GET("/me", authH.Me)
		api.GET("/dashboard", dashH.Stats)
		api.GET("/repos", dashH.RepoBreakdown)
		api.GET("/review-latency", dashH.ReviewLatency)
		api.POST("/sync", dashH.Sync)
		api.PATCH("/settings", dashH.UpdateSettings)
	}

	// Public routes (no auth)
	r.GET("/u/:login", pubH.Profile)
	r.GET("/badge/:login", pubH.Badge)
	r.GET("/health", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) })

	// Background cron: daily sync of all users, staggered
	c := cron.New()
	c.AddFunc("0 3 * * *", func() {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Hour)
		defer cancel()
		users, err := store.GetUsersForSync(ctx)
		if err != nil {
			log.Printf("cron sync: get users: %v", err)
			return
		}
		log.Printf("cron sync: syncing %d users", len(users))
		for i := range users {
			time.Sleep(time.Second) // stagger to avoid rate limit spikes
			u := users[i]
			go func() {
				if err := worker.SyncUser(ctx, &u, true); err != nil {
					log.Printf("cron sync user %s: %v", u.Login, err)
				}
			}()
		}
	})
	c.Start()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	srv := &http.Server{Addr: ":" + port, Handler: r}

	go func() {
		log.Printf("server listening on :%s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	srv.Shutdown(ctx)
	c.Stop()
	log.Println("server shut down")
}
