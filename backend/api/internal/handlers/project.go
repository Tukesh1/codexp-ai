package handlers

import (
	"net/http"
	"strings"

	"github.com/Tukesh1/codexp-ai/backend/api/internal/models"
	"github.com/Tukesh1/codexp-ai/backend/api/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ProjectHandler struct {
	projectService  *services.ProjectService
	githubService   *services.GitHubService
	jobService      *services.JobService
	settingsService *services.SettingsService
}

func NewProjectHandler(
	projectService *services.ProjectService,
	githubService *services.GitHubService,
	jobService *services.JobService,
	settingsService *services.SettingsService,
) *ProjectHandler {
	return &ProjectHandler{
		projectService:  projectService,
		githubService:   githubService,
		jobService:      jobService,
		settingsService: settingsService,
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
		req.ForceReAnalysis = false
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

	if !h.settingsService.HasAPIKey(userUUID) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "API key required. Add an OpenAI or Gemini key in Settings before analyzing.",
			"code":  "api_key_required",
		})
		return
	}

	err = h.projectService.UpdateProjectStatus(projectID, "analyzing")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update project status"})
		return
	}

	repoURL := ""
	if project.RepoURL != nil {
		repoURL = *project.RepoURL
	}

	jobData := map[string]interface{}{
		"repo_url":         repoURL,
		"force_reanalysis": req.ForceReAnalysis,
		"user_id":          userUUID.String(),
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
	c.JSON(http.StatusOK, gin.H{"message": "Webhook received"})
}

func (h *ProjectHandler) GetProjectSummary(c *gin.Context) {
	userUUID, projectID, ok := h.parseIDs(c)
	if !ok {
		return
	}

	summary, err := h.projectService.GetProjectSummary(userUUID, projectID)
	if err != nil {
		h.writeProjectError(c, err)
		return
	}
	c.JSON(http.StatusOK, summary)
}

func (h *ProjectHandler) GetProjectFiles(c *gin.Context) {
	userUUID, projectID, ok := h.parseIDs(c)
	if !ok {
		return
	}

	files, err := h.projectService.GetProjectFiles(userUUID, projectID)
	if err != nil {
		h.writeProjectError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"files": files})
}

func (h *ProjectHandler) SearchCode(c *gin.Context) {
	userUUID, projectID, ok := h.parseIDs(c)
	if !ok {
		return
	}

	q := c.Query("q")
	if q == "" {
		q = c.Query("query")
	}

	results, err := h.projectService.SearchCode(userUUID, projectID, q)
	if err != nil {
		h.writeProjectError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"results": results})
}

func (h *ProjectHandler) AskQuestion(c *gin.Context) {
	userUUID, projectID, ok := h.parseIDs(c)
	if !ok {
		return
	}

	var req models.AskQuestionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.projectService.AskQuestion(userUUID, projectID, req.Question)
	if err != nil {
		status := http.StatusInternalServerError
		if strings.Contains(err.Error(), "api key") {
			status = http.StatusBadRequest
		}
		if err.Error() == "project not found" {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *ProjectHandler) GetDependencyDiagram(c *gin.Context) {
	userUUID, projectID, ok := h.parseIDs(c)
	if !ok {
		return
	}

	diagram, err := h.projectService.GetDependencyDiagram(userUUID, projectID)
	if err != nil {
		h.writeProjectError(c, err)
		return
	}
	c.JSON(http.StatusOK, diagram)
}

func (h *ProjectHandler) GetGeneratedDocs(c *gin.Context) {
	userUUID, projectID, ok := h.parseIDs(c)
	if !ok {
		return
	}

	docs, err := h.projectService.GetGeneratedDocs(userUUID, projectID)
	if err != nil {
		h.writeProjectError(c, err)
		return
	}
	c.JSON(http.StatusOK, docs)
}

func (h *ProjectHandler) GenerateDocs(c *gin.Context) {
	userUUID, projectID, ok := h.parseIDs(c)
	if !ok {
		return
	}

	var req models.GenerateDocsRequest
	_ = c.ShouldBindJSON(&req)

	docs, err := h.projectService.GenerateDocs(userUUID, projectID, req.Force)
	if err != nil {
		status := http.StatusInternalServerError
		if strings.Contains(err.Error(), "api key") {
			status = http.StatusBadRequest
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, docs)
}

func (h *ProjectHandler) GetFileContent(c *gin.Context) {
	userUUID, projectID, ok := h.parseIDs(c)
	if !ok {
		return
	}
	path := c.Query("path")
	if path == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "path query parameter is required"})
		return
	}
	file, err := h.projectService.GetFileContent(userUUID, projectID, path)
	if err != nil {
		if err.Error() == "file not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		h.writeProjectError(c, err)
		return
	}
	c.JSON(http.StatusOK, file)
}

func (h *ProjectHandler) GetChatHistory(c *gin.Context) {
	userUUID, projectID, ok := h.parseIDs(c)
	if !ok {
		return
	}
	messages, err := h.projectService.GetChatHistory(userUUID, projectID, 80)
	if err != nil {
		h.writeProjectError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"messages": messages})
}

func (h *ProjectHandler) GetProjectInsights(c *gin.Context) {
	userUUID, projectID, ok := h.parseIDs(c)
	if !ok {
		return
	}
	// Default: local insights only (fast, no GitHub rate limit burn).
	// Pass ?github=1 to include all GitHub sections in one shot.
	includeGitHub := c.Query("github") == "1" || c.Query("github") == "true"
	insights, err := h.projectService.GetProjectInsights(userUUID, projectID, includeGitHub)
	if err != nil {
		h.writeProjectError(c, err)
		return
	}
	c.JSON(http.StatusOK, insights)
}

func (h *ProjectHandler) RefreshGitHubSection(c *gin.Context) {
	userUUID, projectID, ok := h.parseIDs(c)
	if !ok {
		return
	}
	section := c.Param("section")
	result, err := h.projectService.RefreshGitHubSection(userUUID, projectID, section)
	if err != nil {
		status := http.StatusInternalServerError
		if strings.Contains(err.Error(), "unknown section") {
			status = http.StatusBadRequest
		}
		if err.Error() == "project not found" {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *ProjectHandler) parseIDs(c *gin.Context) (uuid.UUID, uuid.UUID, bool) {
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

func (h *ProjectHandler) writeProjectError(c *gin.Context, err error) {
	if err.Error() == "project not found" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}
	c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
}
