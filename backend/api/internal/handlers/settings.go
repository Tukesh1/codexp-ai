package handlers

import (
	"net/http"

	"github.com/Tukesh1/codexp-ai/backend/api/internal/models"
	"github.com/Tukesh1/codexp-ai/backend/api/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type SettingsHandler struct {
	settingsService *services.SettingsService
}

func NewSettingsHandler(settingsService *services.SettingsService) *SettingsHandler {
	return &SettingsHandler{settingsService: settingsService}
}

func (h *SettingsHandler) GetSettings(c *gin.Context) {
	userUUID, ok := parseUserID(c)
	if !ok {
		return
	}
	settings, err := h.settingsService.GetSettings(userUUID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, settings)
}

func (h *SettingsHandler) UpdateSettings(c *gin.Context) {
	userUUID, ok := parseUserID(c)
	if !ok {
		return
	}
	var req models.UpdateSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	settings, err := h.settingsService.UpdateSettings(userUUID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, settings)
}

func parseUserID(c *gin.Context) (uuid.UUID, bool) {
	userID, _ := c.Get("userID")
	userUUID, err := uuid.Parse(userID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return uuid.Nil, false
	}
	return userUUID, true
}
