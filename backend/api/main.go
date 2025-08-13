package main

import (
	"log"
	"os"

	"github.com/Tukesh1/codexp-ai/backend/api/internal/config"
	"github.com/Tukesh1/codexp-ai/backend/api/internal/database"
	"github.com/Tukesh1/codexp-ai/backend/api/internal/handlers"
	"github.com/Tukesh1/codexp-ai/backend/api/internal/middleware"
	"github.com/Tukesh1/codexp-ai/backend/api/internal/services"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Initialize configuration
	cfg := config.Load()

	// Initialize database
	db, err := database.Initialize(cfg.DatabaseURL)
	if err != nil {
		log.Fatal("Failed to initialize database:", err)
	}
	defer db.Close()

	// Initialize Redis
	redis := database.InitializeRedis(cfg.RedisURL)
	defer redis.Close()

	// Initialize services
	authService := services.NewAuthService(cfg.JWTSecret, cfg.ClerkSecretKey)
	projectService := services.NewProjectService(db, redis)
	githubService := services.NewGitHubService(cfg.GitHubAppID, cfg.GitHubPrivateKey)
	jobService := services.NewJobService(redis)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService)
	projectHandler := handlers.NewProjectHandler(projectService, githubService, jobService)
	healthHandler := handlers.NewHealthHandler(db, redis)

	// Setup Gin router
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.Default()

	// CORS configuration
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = []string{"http://localhost:3000", "https://*.vercel.app"}
	corsConfig.AllowCredentials = true
	corsConfig.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization"}
	router.Use(cors.New(corsConfig))

	// Health check
	router.GET("/health", healthHandler.Health)

	// API routes
	api := router.Group("/api/v1")
	{
		// Auth routes
		auth := api.Group("/auth")
		{
			auth.POST("/webhook", authHandler.ClerkWebhook)
			auth.GET("/me", middleware.AuthMiddleware(authService), authHandler.GetMe)
		}

		// Protected routes
		protected := api.Group("/")
		protected.Use(middleware.AuthMiddleware(authService))
		{
			// Projects
			projects := protected.Group("/projects")
			{
				projects.GET("", projectHandler.ListProjects)
				projects.POST("", projectHandler.CreateProject)
				projects.GET("/:id", projectHandler.GetProject)
				projects.DELETE("/:id", projectHandler.DeleteProject)
				projects.POST("/:id/analyze", projectHandler.AnalyzeProject)
				projects.GET("/:id/status", projectHandler.GetAnalysisStatus)
				projects.POST("/:id/webhook", projectHandler.GitHubWebhook)
			}

			// Analysis endpoints (will be implemented in later phases)
			analysis := protected.Group("/projects/:id")
			{
				analysis.GET("/summary", projectHandler.GetProjectSummary)
				analysis.GET("/files", projectHandler.GetProjectFiles)
				analysis.GET("/search", projectHandler.SearchCode)
				analysis.POST("/ask", projectHandler.AskQuestion)
			}

			// Export endpoints (will be implemented in later phases)
			export := protected.Group("/projects/:id")
			{
				export.GET("/diagram", projectHandler.GetDependencyDiagram)
				export.GET("/docs", projectHandler.GetGeneratedDocs)
			}
		}
	}

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting server on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
