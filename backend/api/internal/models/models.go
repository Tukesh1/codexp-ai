package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// User represents an authenticated platform user.
type User struct {
	ID         uuid.UUID `json:"id"`
	ClerkID    string    `json:"clerk_id"`
	Email      string    `json:"email"`
	Plan       string    `json:"plan"`
	AIProvider string    `json:"ai_provider,omitempty"`
	AIModel    string    `json:"ai_model,omitempty"`
	HasAPIKey  bool      `json:"has_api_key"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// UserSettings is the public settings response (API key masked).
type UserSettings struct {
	Email             string `json:"email"`
	Plan              string `json:"plan"`
	AIProvider        string `json:"ai_provider"`
	AIModel           string `json:"ai_model"`
	HasAPIKey         bool   `json:"has_api_key"`
	HasOpenAIKey      bool   `json:"has_openai_key"`
	HasGeminiKey      bool   `json:"has_gemini_key"`
	APIKeyPreview     string `json:"api_key_preview,omitempty"`
	OpenAIKeyPreview  string `json:"openai_key_preview,omitempty"`
	GeminiKeyPreview  string `json:"gemini_key_preview,omitempty"`
}

// UpdateSettingsRequest updates user AI settings.
type UpdateSettingsRequest struct {
	AIProvider   *string `json:"ai_provider"`
	OpenAIAPIKey *string `json:"openai_api_key"`
	GeminiAPIKey *string `json:"gemini_api_key"`
	AIModel      *string `json:"ai_model"`
	ClearAPIKey  bool    `json:"clear_api_key"`
	ClearOpenAI  bool    `json:"clear_openai_key"`
	ClearGemini  bool    `json:"clear_gemini_key"`
}

// Project is a repository being analyzed.
type Project struct {
	ID           uuid.UUID       `json:"id"`
	UserID       uuid.UUID       `json:"user_id"`
	Name         string          `json:"name"`
	RepoURL      *string         `json:"repo_url,omitempty"`
	GitHubRepoID *int64          `json:"github_repo_id,omitempty"`
	Status       string          `json:"status"`
	Settings     json.RawMessage `json:"settings,omitempty"`
	CreatedAt    time.Time       `json:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at"`
}

// CreateProjectRequest is the payload for creating a project.
type CreateProjectRequest struct {
	Name    string `json:"name" binding:"required"`
	RepoURL string `json:"repo_url" binding:"required"`
}

// AnalyzeProjectRequest controls analysis behavior.
type AnalyzeProjectRequest struct {
	ForceReAnalysis bool `json:"force_reanalysis"`
}

// Job tracks background analysis work.
type Job struct {
	ID           uuid.UUID  `json:"id"`
	ProjectID    *uuid.UUID `json:"project_id,omitempty"`
	Type         string     `json:"type"`
	Status       string     `json:"status"`
	Progress     int        `json:"progress"`
	ErrorMessage *string    `json:"error_message,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// FileRecord is a source file in a project.
type FileRecord struct {
	ID           uuid.UUID  `json:"id"`
	ProjectID    uuid.UUID  `json:"project_id"`
	Path         string     `json:"path"`
	ContentHash  *string    `json:"content_hash,omitempty"`
	Language     *string    `json:"language,omitempty"`
	SizeBytes    *int       `json:"size_bytes,omitempty"`
	LastAnalyzed *time.Time `json:"last_analyzed,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
}

// AskQuestionRequest is the RAG Q&A payload.
type AskQuestionRequest struct {
	Question string `json:"question" binding:"required"`
}

// AskQuestionResponse is the RAG Q&A result.
type AskQuestionResponse struct {
	Answer   string                   `json:"answer"`
	Sources  []map[string]interface{} `json:"sources,omitempty"`
	Question string                   `json:"question"`
}

// GenerateDocsRequest triggers on-demand AI documentation.
type GenerateDocsRequest struct {
	Force bool `json:"force"`
}

// DevLoginRequest creates/returns a JWT for local development.
type DevLoginRequest struct {
	Email string `json:"email" binding:"required,email"`
	Name  string `json:"name"`
}

// DevLoginResponse returns a development auth token.
type DevLoginResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

// ProjectSummary aggregates analysis results.
type ProjectSummary struct {
	ProjectID      uuid.UUID      `json:"project_id"`
	Status         string         `json:"status"`
	FileCount      int            `json:"file_count"`
	FunctionCount  int            `json:"function_count"`
	ClassCount     int            `json:"class_count"`
	Languages      map[string]int `json:"languages"`
	Summary        *string        `json:"summary,omitempty"`
	Overview       *string        `json:"overview,omitempty"`
	LastAnalysisAt *time.Time     `json:"last_analysis_at,omitempty"`
}
