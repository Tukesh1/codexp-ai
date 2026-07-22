package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// User represents an authenticated platform user.
type User struct {
	ID          uuid.UUID `json:"id"`
	ClerkID     string    `json:"clerk_id"`
	Email       string    `json:"email"`
	DisplayName string    `json:"display_name,omitempty"`
	Plan        string    `json:"plan"`
	AIProvider  string    `json:"ai_provider,omitempty"`
	AIModel     string    `json:"ai_model,omitempty"`
	HasAPIKey   bool      `json:"has_api_key"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// UserSettings is the public settings response (API key masked).
type UserSettings struct {
	Email              string `json:"email"`
	Plan               string `json:"plan"`
	AIProvider         string `json:"ai_provider"`
	AIModel            string `json:"ai_model"`
	HasAPIKey          bool   `json:"has_api_key"`
	HasOpenAIKey       bool   `json:"has_openai_key"`
	HasGeminiKey       bool   `json:"has_gemini_key"`
	HasGitHubToken     bool   `json:"has_github_token"`
	APIKeyPreview      string `json:"api_key_preview,omitempty"`
	OpenAIKeyPreview   string `json:"openai_key_preview,omitempty"`
	GeminiKeyPreview   string `json:"gemini_key_preview,omitempty"`
	GitHubTokenPreview string `json:"github_token_preview,omitempty"`
}

// UpdateSettingsRequest updates user AI settings.
type UpdateSettingsRequest struct {
	AIProvider   *string `json:"ai_provider"`
	OpenAIAPIKey *string `json:"openai_api_key"`
	GeminiAPIKey *string `json:"gemini_api_key"`
	GitHubToken  *string `json:"github_token"`
	AIModel      *string `json:"ai_model"`
	ClearAPIKey  bool    `json:"clear_api_key"`
	ClearOpenAI  bool    `json:"clear_openai_key"`
	ClearGemini  bool    `json:"clear_gemini_key"`
	ClearGitHub  bool    `json:"clear_github_token"`
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
	Question string            `json:"question" binding:"required"`
	Context  *AskCodeContext   `json:"context,omitempty"`
	Files    []AskCodeContext  `json:"files,omitempty"`
	Lens     string            `json:"lens,omitempty"`
}

// AskCodeContext is an optional selected code snippet from the file viewer.
type AskCodeContext struct {
	Path      string `json:"path"`
	Code      string `json:"code"`
	Language  string `json:"language,omitempty"`
	StartLine int    `json:"start_line,omitempty"`
	EndLine   int    `json:"end_line,omitempty"`
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

// SignupRequest creates a new email/password account.
type SignupRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	Name     string `json:"name"`
}

// LoginRequest authenticates with email/password.
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// AuthResponse returns a JWT and user after signup/login.
type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
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

// ----- Readiness -----

// ReadinessResponse shows project analysis readiness.
type ReadinessResponse struct {
	FileCount         int           `json:"file_count"`
	FunctionCount     int           `json:"function_count"`
	ClassCount        int           `json:"class_count"`
	EmbeddingCount    int           `json:"embedding_count"`
	EmbeddedFunctions int           `json:"embedded_functions"`
	EmbeddedClasses   int           `json:"embedded_classes"`
	HasOverview       bool          `json:"has_overview"`
	HasDiagram        bool          `json:"has_diagram"`
	HasDocs           bool          `json:"has_docs"`
	CoveragePct       float64       `json:"coverage_pct"`
	DeadEndFiles      []DeadEndFile `json:"dead_end_files,omitempty"`
	VendorPaths       []string      `json:"vendor_paths"`
	Score             int           `json:"score"`
	Label             string        `json:"label"`
}

// DeadEndFile is a file with no detected symbols.
type DeadEndFile struct {
	FileID    uuid.UUID `json:"file_id"`
	Path      string    `json:"path"`
	SizeBytes int       `json:"size_bytes,omitempty"`
	Language  string    `json:"language,omitempty"`
	Reason    string    `json:"reason"`
}

// ----- Concepts -----

// ConceptsResponse contains clustered code concepts.
type ConceptsResponse struct {
	Clusters []ConceptCluster `json:"clusters"`
	Cached   bool             `json:"cached"`
}

// ConceptCluster groups related symbols.
type ConceptCluster struct {
	ID      string       `json:"id"`
	Name    string       `json:"name"`
	Symbols []SymbolInfo `json:"symbols"`
	Size    int          `json:"size"`
}

// SymbolInfo describes a function or class.
type SymbolInfo struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Path      string    `json:"path"`
	Kind      string    `json:"kind"`
	Signature string    `json:"signature,omitempty"`
	StartLine *int      `json:"start_line,omitempty"`
}

// ----- Symbol Graph -----

// SymbolGraphResponse shows symbol relationships.
type SymbolGraphResponse struct {
	Symbol  SymbolInfo  `json:"symbol"`
	Callers []SymbolRef `json:"callers,omitempty"`
	Callees []SymbolRef `json:"callees,omitempty"`
	Related []SymbolInfo `json:"related,omitempty"`
}

// SymbolRef is a reference to another symbol.
type SymbolRef struct {
	Name   string `json:"name,omitempty"`
	Path   string `json:"path,omitempty"`
	Kind   string `json:"kind,omitempty"`
	Line   *int   `json:"line,omitempty"`
	URL    string `json:"url,omitempty"`
	Source string `json:"source"` // database, github, regex
}

// ----- Dead Ends -----

// DeadEndsResponse lists potentially unused or generated code.
type DeadEndsResponse struct {
	Files           []DeadEndFile    `json:"files"`
	TinyFileFolders []TinyFileFolder `json:"tiny_file_folders,omitempty"`
}

// TinyFileFolder is a folder with many small files.
type TinyFileFolder struct {
	Folder    string `json:"folder"`
	FileCount int    `json:"file_count"`
	AvgSize   int    `json:"avg_size"`
}

// ----- Changes -----

// ChangesResponse shows symbol changes since last snapshot.
type ChangesResponse struct {
	Added       []string   `json:"added,omitempty"`
	Removed     []string   `json:"removed,omitempty"`
	Message     string     `json:"message,omitempty"`
	Baseline    bool       `json:"baseline,omitempty"`
	Cached      bool       `json:"cached,omitempty"`
	GeneratedAt *time.Time `json:"generated_at,omitempty"`
}

// ----- Quiz -----

// QuizAttempt stores a quiz and user answers.
type QuizAttempt struct {
	ID        uuid.UUID       `json:"id"`
	ProjectID uuid.UUID       `json:"project_id"`
	UserID    uuid.UUID       `json:"user_id"`
	Quiz      json.RawMessage `json:"quiz"`
	Answers   json.RawMessage `json:"answers,omitempty"`
	Score     *int            `json:"score,omitempty"`
	CreatedAt time.Time       `json:"created_at"`
}

// SubmitQuizRequest submits answers for grading.
type SubmitQuizRequest struct {
	Answers []int `json:"answers" binding:"required"`
}

// QuizResult is the graded quiz result.
type QuizResult struct {
	AttemptID uuid.UUID        `json:"attempt_id"`
	Score     int              `json:"score"`
	Correct   int              `json:"correct"`
	Total     int              `json:"total"`
	Results   []QuestionResult `json:"results"`
}

// QuestionResult shows per-question grading.
type QuestionResult struct {
	Question       string `json:"question"`
	UserAnswer     int    `json:"user_answer"`
	CorrectAnswer  int    `json:"correct_answer"`
	IsCorrect      bool   `json:"is_correct"`
	Explanation    string `json:"explanation"`
	CorrectOption  string `json:"correct_option"`
	SelectedOption string `json:"selected_option"`
}

// ----- Notes -----

// Note represents a user annotation on code.
type Note struct {
	ID         uuid.UUID `json:"id"`
	ProjectID  uuid.UUID `json:"project_id"`
	UserID     uuid.UUID `json:"user_id"`
	Path       string    `json:"path"`
	StartLine  *int      `json:"start_line,omitempty"`
	EndLine    *int      `json:"end_line,omitempty"`
	SymbolName *string   `json:"symbol_name,omitempty"`
	Content    string    `json:"content"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// CreateNoteRequest creates a new note.
type CreateNoteRequest struct {
	Path       string  `json:"path" binding:"required"`
	Content    string  `json:"content" binding:"required"`
	StartLine  *int    `json:"start_line,omitempty"`
	EndLine    *int    `json:"end_line,omitempty"`
	SymbolName *string `json:"symbol_name,omitempty"`
}

// UpdateNoteRequest updates an existing note.
type UpdateNoteRequest struct {
	Content string `json:"content" binding:"required"`
}
