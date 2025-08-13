package handlers

import (
	"net/http"

	"github.com/Tukesh1/codexp-ai/backend/api/internal/services"
	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authService *services.AuthService
}

func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

// ClerkWebhook handles Clerk webhook events for user management
func (h *AuthHandler) ClerkWebhook(c *gin.Context) {
	// TODO: Implement Clerk webhook handling
	// This will handle user creation, updates, deletions from Clerk

	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON payload"})
		return
	}

	// Validate webhook signature
	signature := c.GetHeader("svix-signature")
	body, _ := c.GetRawData()

	if err := h.authService.ValidateClerkWebhook(body, signature); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid webhook signature"})
		return
	}

	// Process webhook event
	eventType, exists := payload["type"].(string)
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing event type"})
		return
	}

	switch eventType {
	case "user.created":
		// Handle user creation
		// Extract user data and create user in database
	case "user.updated":
		// Handle user updates
	case "user.deleted":
		// Handle user deletion
	default:
		// Unknown event type, log and continue
	}

	c.JSON(http.StatusOK, gin.H{"message": "Webhook processed successfully"})
}

// GetMe returns current user information
func (h *AuthHandler) GetMe(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// TODO: Fetch user from database
	// For now, return basic info
	c.JSON(http.StatusOK, gin.H{
		"user_id": userID,
		"message": "User authenticated successfully",
	})
}
