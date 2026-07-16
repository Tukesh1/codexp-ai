package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// User represents an authenticated platform user.
type User struct {
	ID        uuid.UUID `json:"id"`
	ClerkID   string    `json:"clerk_id"`
	Email     string    `json:"email"`
	Plan      string    `json:"plan"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
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

// FunctionEntity is an extracted function.
type FunctionEntity struct {
	ID        uuid.UUID `json:"id"`
	FileID    uuid.UUID `json:"file_id"`
	Name      string    `json:"name"`
	Signature *string   `json:"signature,omitempty"`
	Summary   *string   `json:"summary,omitempty"`
	StartLine *int      `json:"start_line,omitempty"`
	EndLine   *int      `json:"end_line,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

// ClassEntity is an extracted class.
type ClassEntity struct {
	ID        uuid.UUID `json:"id"`
	FileID    uuid.UUID `json:"file_id"`
	Name      string    `json:"name"`
	Summary   *string   `json:"summary,omitempty"`
	StartLine *int      `json:"start_line,omitempty"`
	EndLine   *int      `json:"end_line,omitempty"`
	CreatedAt time.Time `json:"created_at"`
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
	ProjectID          uuid.UUID      `json:"project_id"`
	Status             string         `json:"status"`
	FileCount          int            `json:"file_count"`
	FunctionCount      int            `json:"function_count"`
	ClassCount         int            `json:"class_count"`
	Languages          map[string]int `json:"languages"`
	Summary            *string        `json:"summary,omitempty"`
	LastAnalysisAt     *time.Time     `json:"last_analysis_at,omitempty"`
}
