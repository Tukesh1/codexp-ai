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
	authService := services.NewAuthService(db, cfg.JWTSecret, cfg.ClerkSecretKey)
	settingsService := services.NewSettingsService(db)
	aiClient := services.NewAIClient(cfg.AIServiceURL)
	projectService := services.NewProjectService(db, redis, aiClient, settingsService, cfg.GitHubToken)
	githubService := services.NewGitHubService(cfg.GitHubAppID, cfg.GitHubPrivateKey)
	jobService := services.NewJobService(db, redis)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService)
	settingsHandler := handlers.NewSettingsHandler(settingsService)
	projectHandler := handlers.NewProjectHandler(projectService, githubService, jobService, settingsService)
	intelligenceHandler := handlers.NewIntelligenceHandler(projectService)
	healthHandler := handlers.NewHealthHandler(db, redis)

	// Setup Gin router
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.Default()

	// CORS configuration
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = []string{
		"http://localhost:3000",
		"http://localhost:3001",
		"http://localhost:3002",
		"https://*.vercel.app",
	}
	corsConfig.AllowCredentials = true
	corsConfig.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization"}
	router.Use(cors.New(corsConfig))

	// Health check
	router.GET("/health", healthHandler.Health)

	// Root — avoid bare "404 page not found" in the browser
	router.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"name":    "CodeExp AI API",
			"status":  "ok",
			"health":  "/health",
			"docs":    "Use /api/v1/* with a Bearer token",
			"web_app": "http://localhost:3000",
		})
	})

	// API routes
	api := router.Group("/api/v1")
	{
		// Auth routes
		auth := api.Group("/auth")
		{
			auth.POST("/dev-login", authHandler.DevLogin)
			auth.POST("/webhook", authHandler.ClerkWebhook)
			auth.GET("/me", middleware.AuthMiddleware(authService), authHandler.GetMe)
		}

		// Protected routes
		protected := api.Group("/")
		protected.Use(middleware.AuthMiddleware(authService))
		{
			// Settings (API keys)
			protected.GET("/settings", settingsHandler.GetSettings)
			protected.PUT("/settings", settingsHandler.UpdateSettings)

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

			analysis := protected.Group("/projects/:id")
			{
				analysis.GET("/summary", projectHandler.GetProjectSummary)
				analysis.GET("/insights", projectHandler.GetProjectInsights)
				analysis.GET("/insights/github/:section", projectHandler.RefreshGitHubSection)
				analysis.GET("/files", projectHandler.GetProjectFiles)
				analysis.GET("/files/content", projectHandler.GetFileContent)
				analysis.GET("/search", projectHandler.SearchCode)
				analysis.POST("/ask", projectHandler.AskQuestion)
				analysis.GET("/chat", projectHandler.GetChatHistory)
				analysis.GET("/diagram", projectHandler.GetDependencyDiagram)
				analysis.GET("/docs", projectHandler.GetGeneratedDocs)
				analysis.POST("/docs", projectHandler.GenerateDocs)

				// Intelligence features
				analysis.GET("/readiness", intelligenceHandler.GetReadiness)
				analysis.GET("/concepts", intelligenceHandler.GetConcepts)
				analysis.GET("/dead-ends", intelligenceHandler.GetDeadEnds)
				analysis.GET("/changes", intelligenceHandler.GetChanges)
				analysis.GET("/graph", intelligenceHandler.GetSymbolGraph)

				// Notes
				analysis.GET("/notes", intelligenceHandler.ListNotes)
				analysis.POST("/notes", intelligenceHandler.CreateNote)
				analysis.PUT("/notes/:noteId", intelligenceHandler.UpdateNote)
				analysis.DELETE("/notes/:noteId", intelligenceHandler.DeleteNote)

				// Quiz
				analysis.POST("/quiz/generate", intelligenceHandler.GenerateQuiz)
				analysis.POST("/quiz/:attemptId/submit", intelligenceHandler.SubmitQuiz)
				analysis.GET("/quiz/latest", intelligenceHandler.GetLatestQuiz)
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
