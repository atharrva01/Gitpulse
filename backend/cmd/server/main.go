package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/robfig/cron/v3"
	"github.com/rs/cors"

	"github.com/gitpulse/backend/internal/db"
	"github.com/gitpulse/backend/internal/email"
	"github.com/gitpulse/backend/internal/handlers"
	syncer "github.com/gitpulse/backend/internal/sync"
)

func main() {
	_ = godotenv.Load()

	if os.Getenv("JWT_SECRET") == "" {
		log.Fatal("JWT_SECRET environment variable is not set")
	}

	database, err := db.New()
	if err != nil {
		log.Fatalf("connect db: %v", err)
	}

	store := db.NewStore(database)
	worker := syncer.NewWorker(store)
	maintWorker := syncer.NewMaintainerWorker(store)
	digestSender := email.NewDigestSender(store)

	authH := handlers.NewAuthHandler(store, worker)
	dashH := handlers.NewDashboardHandler(store, worker)
	pubH := handlers.NewPublicHandler(store)
	wrappedH := handlers.NewWrappedHandler(store)
	maintH := handlers.NewMaintainerHandler(store, maintWorker)

	r := gin.Default()

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}
	corsHandler := cors.New(cors.Options{
		AllowedOrigins:   []string{frontendURL},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
	})
	r.Use(func(c *gin.Context) {
		corsHandler.HandlerFunc(c.Writer, c.Request)
		c.Next()
	})

	// Auth
	r.GET("/auth/github", authH.Login)
	r.GET("/auth/github/callback", authH.Callback)
	r.GET("/auth/token", authH.ExchangeToken)

	// Protected
	api := r.Group("/api")
	api.Use(handlers.AuthMiddleware())
	{
		api.GET("/me", authH.Me)
		api.GET("/dashboard", dashH.Stats)
		api.GET("/repos", dashH.RepoBreakdown)
		api.GET("/review-latency", dashH.ReviewLatency)
		api.POST("/sync", dashH.Sync)
		api.PATCH("/settings", dashH.UpdateSettings)

		api.GET("/wrapped", wrappedH.Get)

		api.GET("/maintainer/repos", maintH.ListWatched)
		api.POST("/maintainer/repos", maintH.AddWatched)
		api.DELETE("/maintainer/repos/:repo", maintH.RemoveWatched)
		api.GET("/maintainer/repos/:id/dashboard", maintH.GetDashboard)
		api.POST("/maintainer/repos/:id/refresh", maintH.RefreshRepo)
	}

	// Public
	r.GET("/u/:login", pubH.Profile)
	r.GET("/u/:login/wrapped", wrappedH.GetPublic)
	r.GET("/badge/:login", pubH.Badge)
	r.GET("/health", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) })

	// Serve React SPA — must come after all API/auth routes
	frontendDist := os.Getenv("FRONTEND_DIST")
	if frontendDist == "" {
		frontendDist = "./frontend/dist"
	}
	r.Static("/assets", frontendDist+"/assets")
	r.StaticFile("/favicon.ico", frontendDist+"/favicon.ico")
	r.NoRoute(func(c *gin.Context) {
		c.File(frontendDist + "/index.html")
	})

	cr := cron.New()

	// Daily user sync at 3am — semaphore limits concurrent syncs to 5
	cr.AddFunc("0 3 * * *", func() {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Hour)
		defer cancel()
		users, err := store.GetUsersForSync(ctx)
		if err != nil {
			log.Printf("cron sync: get users: %v", err)
			return
		}
		log.Printf("cron sync: syncing %d users", len(users))
		sem := make(chan struct{}, 5)
		var wg sync.WaitGroup
		for i := range users {
			u := users[i]
			sem <- struct{}{}
			wg.Add(1)
			go func() {
				defer wg.Done()
				defer func() { <-sem }()
				if err := worker.SyncUser(ctx, &u, true); err != nil {
					log.Printf("cron sync user %s: %v", u.Login, err)
				}
			}()
		}
		wg.Wait()
	})

	// Weekly email digest: Mondays at 8am UTC
	cr.AddFunc("0 8 * * 1", func() {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
		defer cancel()
		digestSender.SendWeeklyDigests(ctx)
	})

	cr.Start()

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
	cr.Stop()
	log.Println("server shut down")
}
