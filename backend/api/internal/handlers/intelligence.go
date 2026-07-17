package handlers

import (
	"net/http"
	"strings"

	"github.com/Tukesh1/codexp-ai/backend/api/internal/models"
	"github.com/Tukesh1/codexp-ai/backend/api/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// IntelligenceHandler handles intelligence feature endpoints.
type IntelligenceHandler struct {
	projectService *services.ProjectService
}

// NewIntelligenceHandler creates a new IntelligenceHandler.
func NewIntelligenceHandler(projectService *services.ProjectService) *IntelligenceHandler {
	return &IntelligenceHandler{projectService: projectService}
}

// ----- Notes -----

// ListNotes returns notes for a project, optionally filtered by path.
func (h *IntelligenceHandler) ListNotes(c *gin.Context) {
	userUUID, projectID, ok := h.parseIDs(c)
	if !ok {
		return
	}

	path := c.Query("path")
	notes, err := h.projectService.ListNotes(userUUID, projectID, path)
	if err != nil {
		h.writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"notes": notes})
}

// CreateNote creates a new note.
func (h *IntelligenceHandler) CreateNote(c *gin.Context) {
	userUUID, projectID, ok := h.parseIDs(c)
	if !ok {
		return
	}

	var req models.CreateNoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	note, err := h.projectService.CreateNote(userUUID, projectID, &req)
	if err != nil {
		h.writeError(c, err)
		return
	}
	c.JSON(http.StatusCreated, note)
}

// UpdateNote updates an existing note.
func (h *IntelligenceHandler) UpdateNote(c *gin.Context) {
	userUUID, projectID, ok := h.parseIDs(c)
	if !ok {
		return
	}

	noteID, err := uuid.Parse(c.Param("noteId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid note ID"})
		return
	}

	var req models.UpdateNoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	note, err := h.projectService.UpdateNote(userUUID, projectID, noteID, &req)
	if err != nil {
		h.writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, note)
}

// DeleteNote deletes a note.
func (h *IntelligenceHandler) DeleteNote(c *gin.Context) {
	userUUID, projectID, ok := h.parseIDs(c)
	if !ok {
		return
	}

	noteID, err := uuid.Parse(c.Param("noteId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid note ID"})
		return
	}

	if err := h.projectService.DeleteNote(userUUID, projectID, noteID); err != nil {
		h.writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Note deleted successfully"})
}

// ----- Readiness -----

// GetReadiness returns project analysis readiness metrics.
func (h *IntelligenceHandler) GetReadiness(c *gin.Context) {
	userUUID, projectID, ok := h.parseIDs(c)
	if !ok {
		return
	}

	readiness, err := h.projectService.GetReadiness(userUUID, projectID)
	if err != nil {
		h.writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, readiness)
}

// ----- Concepts -----

// GetConcepts returns clustered code concepts.
func (h *IntelligenceHandler) GetConcepts(c *gin.Context) {
	userUUID, projectID, ok := h.parseIDs(c)
	if !ok {
		return
	}

	concepts, err := h.projectService.GetConcepts(userUUID, projectID)
	if err != nil {
		h.writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, concepts)
}

// ----- Symbol Graph -----

// GetSymbolGraph returns callers, callees, and related symbols.
func (h *IntelligenceHandler) GetSymbolGraph(c *gin.Context) {
	userUUID, projectID, ok := h.parseIDs(c)
	if !ok {
		return
	}

	name := c.Query("name")
	path := c.Query("path")

	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name query parameter is required"})
		return
	}

	graph, err := h.projectService.GetSymbolGraph(userUUID, projectID, name, path)
	if err != nil {
		h.writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, graph)
}

// ----- Dead Ends -----

// GetDeadEnds returns files with no symbols or vendor-like patterns.
func (h *IntelligenceHandler) GetDeadEnds(c *gin.Context) {
	userUUID, projectID, ok := h.parseIDs(c)
	if !ok {
		return
	}

	deadEnds, err := h.projectService.GetDeadEnds(userUUID, projectID)
	if err != nil {
		h.writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, deadEnds)
}

// ----- Changes -----

// GetChanges returns symbol changes since last snapshot.
func (h *IntelligenceHandler) GetChanges(c *gin.Context) {
	userUUID, projectID, ok := h.parseIDs(c)
	if !ok {
		return
	}

	changes, err := h.projectService.GetChanges(userUUID, projectID)
	if err != nil {
		h.writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, changes)
}

// ----- Quiz -----

// GenerateQuiz generates a new quiz for the project.
func (h *IntelligenceHandler) GenerateQuiz(c *gin.Context) {
	userUUID, projectID, ok := h.parseIDs(c)
	if !ok {
		return
	}

	quiz, err := h.projectService.GenerateQuiz(userUUID, projectID)
	if err != nil {
		status := http.StatusInternalServerError
		if strings.Contains(err.Error(), "api key") {
			status = http.StatusBadRequest
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, quiz)
}

// SubmitQuiz grades a quiz attempt.
func (h *IntelligenceHandler) SubmitQuiz(c *gin.Context) {
	userUUID, projectID, ok := h.parseIDs(c)
	if !ok {
		return
	}

	attemptID, err := uuid.Parse(c.Param("attemptId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid attempt ID"})
		return
	}

	var req models.SubmitQuizRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.projectService.SubmitQuiz(userUUID, projectID, attemptID, &req)
	if err != nil {
		h.writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// GetLatestQuiz returns the most recent quiz attempt.
func (h *IntelligenceHandler) GetLatestQuiz(c *gin.Context) {
	userUUID, projectID, ok := h.parseIDs(c)
	if !ok {
		return
	}

	quiz, err := h.projectService.GetLatestQuiz(userUUID, projectID)
	if err != nil {
		if strings.Contains(err.Error(), "no quiz attempts") {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		h.writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, quiz)
}

// ----- Helpers -----

func (h *IntelligenceHandler) parseIDs(c *gin.Context) (uuid.UUID, uuid.UUID, bool) {
	userID, _ := c.Get("userID")
	userUUID, err := uuid.Parse(userID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return uuid.Nil, uuid.Nil, false
	}
	projectID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return uuid.Nil, uuid.Nil, false
	}
	return userUUID, projectID, true
}

func (h *IntelligenceHandler) writeError(c *gin.Context, err error) {
	msg := err.Error()
	status := http.StatusInternalServerError

	if strings.Contains(msg, "not found") {
		status = http.StatusNotFound
	} else if strings.Contains(msg, "not authorized") {
		status = http.StatusForbidden
	} else if strings.Contains(msg, "api key") {
		status = http.StatusBadRequest
	}

	c.JSON(status, gin.H{"error": msg})
}
