package handlers

import (
	"net/http"

	"github.com/Tukesh1/codexp-ai/backend/api/internal/models"
	"github.com/Tukesh1/codexp-ai/backend/api/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ProjectHandler struct {
	projectService *services.ProjectService
	githubService  *services.GitHubService
	jobService     *services.JobService
}

func NewProjectHandler(projectService *services.ProjectService, githubService *services.GitHubService, jobService *services.JobService) *ProjectHandler {
	return &ProjectHandler{
		projectService: projectService,
		githubService:  githubService,
		jobService:     jobService,
	}
}

func (h *ProjectHandler) CreateProject(c *gin.Context) {
	userID, _ := c.Get("userID")
	userUUID, err := uuid.Parse(userID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var req models.CreateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	project, err := h.projectService.CreateProject(userUUID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create project"})
		return
	}

	c.JSON(http.StatusCreated, project)
}

func (h *ProjectHandler) GetProject(c *gin.Context) {
	userID, _ := c.Get("userID")
	userUUID, err := uuid.Parse(userID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	projectID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	project, err := h.projectService.GetProject(userUUID, projectID)
	if err != nil {
		if err.Error() == "project not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get project"})
		return
	}

	c.JSON(http.StatusOK, project)
}

func (h *ProjectHandler) ListProjects(c *gin.Context) {
	userID, _ := c.Get("userID")
	userUUID, err := uuid.Parse(userID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	projects, err := h.projectService.ListProjects(userUUID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list projects"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"projects": projects})
}

func (h *ProjectHandler) DeleteProject(c *gin.Context) {
	userID, _ := c.Get("userID")
	userUUID, err := uuid.Parse(userID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	projectID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	err = h.projectService.DeleteProject(userUUID, projectID)
	if err != nil {
		if err.Error() == "project not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete project"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Project deleted successfully"})
}

func (h *ProjectHandler) AnalyzeProject(c *gin.Context) {
	userID, _ := c.Get("userID")
	userUUID, err := uuid.Parse(userID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	projectID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	var req models.AnalyzeProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// If no body provided, use defaults
		req.ForceReAnalysis = false
	}

	// Verify project exists and user owns it
	project, err := h.projectService.GetProject(userUUID, projectID)
	if err != nil {
		if err.Error() == "project not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get project"})
		return
	}

	// Update project status to analyzing
	err = h.projectService.UpdateProjectStatus(projectID, "analyzing")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update project status"})
		return
	}

	// Queue analysis job
	jobData := map[string]interface{}{
		"repo_url":         project.RepoURL,
		"force_reanalysis": req.ForceReAnalysis,
	}

	job, err := h.jobService.QueueJob("repository_analysis", projectID, jobData)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to queue analysis job"})
		return
	}

	c.JSON(http.StatusAccepted, gin.H{
		"message": "Analysis started",
		"job_id":  job.ID,
		"status":  job.Status,
	})
}

func (h *ProjectHandler) GetAnalysisStatus(c *gin.Context) {
	projectID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	jobs, err := h.jobService.GetProjectJobs(projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get job status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"jobs": jobs})
}

func (h *ProjectHandler) GitHubWebhook(c *gin.Context) {
	// TODO: Implement GitHub webhook handling for repository updates
	c.JSON(http.StatusOK, gin.H{"message": "Webhook received"})
}

// Placeholder handlers for future implementation
func (h *ProjectHandler) GetProjectSummary(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (h *ProjectHandler) GetProjectFiles(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (h *ProjectHandler) SearchCode(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (h *ProjectHandler) AskQuestion(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (h *ProjectHandler) GetDependencyDiagram(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (h *ProjectHandler) GetGeneratedDocs(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}
