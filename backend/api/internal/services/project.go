package services

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/Tukesh1/codexp-ai/backend/api/internal/models"
	"github.com/go-redis/redis/v8"
	"github.com/google/uuid"
)

type ProjectService struct {
	db          *sql.DB
	redis       *redis.Client
	aiClient    *AIClient
	settings    *SettingsService
	githubToken string
}

func NewProjectService(db *sql.DB, redis *redis.Client, aiClient *AIClient, settings *SettingsService, githubToken string) *ProjectService {
	return &ProjectService{
		db:          db,
		redis:       redis,
		aiClient:    aiClient,
		settings:    settings,
		githubToken: strings.TrimSpace(githubToken),
	}
}

func (s *ProjectService) CreateProject(userID uuid.UUID, req *models.CreateProjectRequest) (*models.Project, error) {
	project := &models.Project{
		ID:      uuid.New(),
		UserID:  userID,
		Name:    req.Name,
		RepoURL: &req.RepoURL,
		Status:  "pending",
	}

	query := `
		INSERT INTO projects (id, user_id, name, repo_url, status, settings)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING created_at, updated_at
	`

	err := s.db.QueryRow(query,
		project.ID,
		project.UserID,
		project.Name,
		project.RepoURL,
		project.Status,
		"{}",
	).Scan(&project.CreatedAt, &project.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create project: %w", err)
	}

	return project, nil
}

func (s *ProjectService) GetProject(userID, projectID uuid.UUID) (*models.Project, error) {
	project := &models.Project{}
	query := `
		SELECT id, user_id, name, repo_url, github_repo_id, status, settings, created_at, updated_at
		FROM projects
		WHERE id = $1 AND user_id = $2
	`

	err := s.db.QueryRow(query, projectID, userID).Scan(
		&project.ID,
		&project.UserID,
		&project.Name,
		&project.RepoURL,
		&project.GitHubRepoID,
		&project.Status,
		&project.Settings,
		&project.CreatedAt,
		&project.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("project not found")
		}
		return nil, fmt.Errorf("failed to get project: %w", err)
	}

	return project, nil
}

func (s *ProjectService) ListProjects(userID uuid.UUID) ([]*models.Project, error) {
	query := `
		SELECT id, user_id, name, repo_url, github_repo_id, status, settings, created_at, updated_at
		FROM projects
		WHERE user_id = $1
		ORDER BY created_at DESC
	`

	rows, err := s.db.Query(query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to list projects: %w", err)
	}
	defer rows.Close()

	projects := make([]*models.Project, 0)
	for rows.Next() {
		project := &models.Project{}
		err := rows.Scan(
			&project.ID,
			&project.UserID,
			&project.Name,
			&project.RepoURL,
			&project.GitHubRepoID,
			&project.Status,
			&project.Settings,
			&project.CreatedAt,
			&project.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan project: %w", err)
		}
		projects = append(projects, project)
	}

	return projects, nil
}

func (s *ProjectService) DeleteProject(userID, projectID uuid.UUID) error {
	query := `DELETE FROM projects WHERE id = $1 AND user_id = $2`
	result, err := s.db.Exec(query, projectID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete project: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("project not found")
	}

	return nil
}

func (s *ProjectService) UpdateProjectStatus(projectID uuid.UUID, status string) error {
	query := `
		UPDATE projects 
		SET status = $1, updated_at = CURRENT_TIMESTAMP 
		WHERE id = $2
	`
	_, err := s.db.Exec(query, status, projectID)
	if err != nil {
		return fmt.Errorf("failed to update project status: %w", err)
	}
	return nil
}

func (s *ProjectService) GetProjectSummary(userID, projectID uuid.UUID) (*models.ProjectSummary, error) {
	project, err := s.GetProject(userID, projectID)
	if err != nil {
		return nil, err
	}

	summary := &models.ProjectSummary{
		ProjectID: project.ID,
		Status:    project.Status,
		Languages: map[string]int{},
	}

	_ = s.db.QueryRow(`SELECT COUNT(*) FROM files WHERE project_id = $1`, projectID).Scan(&summary.FileCount)
	_ = s.db.QueryRow(`
		SELECT COUNT(*) FROM functions f
		JOIN files fl ON fl.id = f.file_id
		WHERE fl.project_id = $1
	`, projectID).Scan(&summary.FunctionCount)
	_ = s.db.QueryRow(`
		SELECT COUNT(*) FROM classes c
		JOIN files fl ON fl.id = c.file_id
		WHERE fl.project_id = $1
	`, projectID).Scan(&summary.ClassCount)

	rows, err := s.db.Query(`
		SELECT COALESCE(language, 'unknown'), COUNT(*)
		FROM files WHERE project_id = $1
		GROUP BY language
	`, projectID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var lang string
			var count int
			if err := rows.Scan(&lang, &count); err == nil {
				summary.Languages[lang] = count
			}
		}
	}

	// Prefer AI-generated overview
	var overviewJSON []byte
	var overviewAt time.Time
	if err := s.db.QueryRow(`
		SELECT results, created_at FROM analyses
		WHERE project_id = $1 AND type = 'overview'
		ORDER BY created_at DESC LIMIT 1
	`, projectID).Scan(&overviewJSON, &overviewAt); err == nil {
		summary.LastAnalysisAt = &overviewAt
		var parsed map[string]interface{}
		if json.Unmarshal(overviewJSON, &parsed) == nil {
			if content, ok := parsed["content"].(string); ok && content != "" {
				summary.Overview = &content
				summary.Summary = &content
			}
		}
	}

	if summary.Overview == nil {
		var resultsJSON []byte
		var createdAt time.Time
		err = s.db.QueryRow(`
			SELECT results, created_at FROM analyses
			WHERE project_id = $1 AND type = 'summary'
			ORDER BY created_at DESC LIMIT 1
		`, projectID).Scan(&resultsJSON, &createdAt)
		if err == nil {
			summary.LastAnalysisAt = &createdAt
			var parsed map[string]interface{}
			if json.Unmarshal(resultsJSON, &parsed) == nil {
				if text, ok := parsed["message"].(string); ok {
					summary.Summary = &text
				}
			}
		} else if summary.FileCount > 0 {
			msg := fmt.Sprintf(
				"Analyzed %d files with %d functions and %d classes",
				summary.FileCount, summary.FunctionCount, summary.ClassCount,
			)
			summary.Summary = &msg
		}
	}

	return summary, nil
}

func (s *ProjectService) GetProjectFiles(userID, projectID uuid.UUID) ([]*models.FileRecord, error) {
	if _, err := s.GetProject(userID, projectID); err != nil {
		return nil, err
	}

	rows, err := s.db.Query(`
		SELECT id, project_id, path, content_hash, language, size_bytes, last_analyzed, created_at
		FROM files WHERE project_id = $1
		ORDER BY path ASC
	`, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to list files: %w", err)
	}
	defer rows.Close()

	files := make([]*models.FileRecord, 0)
	for rows.Next() {
		f := &models.FileRecord{}
		if err := rows.Scan(
			&f.ID, &f.ProjectID, &f.Path, &f.ContentHash, &f.Language,
			&f.SizeBytes, &f.LastAnalyzed, &f.CreatedAt,
		); err != nil {
			return nil, err
		}
		files = append(files, f)
	}
	return files, nil
}

func (s *ProjectService) SearchCode(userID, projectID uuid.UUID, query string) ([]map[string]interface{}, error) {
	if _, err := s.GetProject(userID, projectID); err != nil {
		return nil, err
	}

	pattern := "%" + strings.ToLower(query) + "%"
	rows, err := s.db.Query(`
		SELECT f.id, f.name, f.signature, f.summary, fl.path, 'function' as entity_type
		FROM functions f
		JOIN files fl ON fl.id = f.file_id
		WHERE fl.project_id = $1 AND (
			LOWER(f.name) LIKE $2 OR LOWER(COALESCE(f.signature, '')) LIKE $2 OR LOWER(COALESCE(f.summary, '')) LIKE $2
		)
		UNION ALL
		SELECT c.id, c.name, NULL as signature, c.summary, fl.path, 'class' as entity_type
		FROM classes c
		JOIN files fl ON fl.id = c.file_id
		WHERE fl.project_id = $1 AND (
			LOWER(c.name) LIKE $2 OR LOWER(COALESCE(c.summary, '')) LIKE $2
		)
		LIMIT 50
	`, projectID, pattern)
	if err != nil {
		return nil, fmt.Errorf("search failed: %w", err)
	}
	defer rows.Close()

	results := make([]map[string]interface{}, 0)
	for rows.Next() {
		var id uuid.UUID
		var name string
		var signature, summary, path, entityType sql.NullString
		if err := rows.Scan(&id, &name, &signature, &summary, &path, &entityType); err != nil {
			continue
		}
		results = append(results, map[string]interface{}{
			"id":          id,
			"name":        name,
			"signature":   nullString(signature),
			"summary":     nullString(summary),
			"path":        nullString(path),
			"entity_type": nullString(entityType),
		})
	}
	return results, nil
}

func (s *ProjectService) AskQuestion(userID, projectID uuid.UUID, req *models.AskQuestionRequest) (*models.AskQuestionResponse, error) {
	if _, err := s.GetProject(userID, projectID); err != nil {
		return nil, err
	}
	if !s.settings.HasAPIKey(userID) {
		return nil, fmt.Errorf("api key not configured — add OpenAI or Gemini key in Settings")
	}

	question := strings.TrimSpace(req.Question)
	if question == "" {
		return nil, fmt.Errorf("question is required")
	}

	var answer string
	var sources []map[string]interface{}
	var aiErr error

	if s.aiClient == nil {
		return nil, fmt.Errorf("AI service not configured — start the AI service on :8000 (./run-ai.sh)")
	}

	out, aiErr := s.aiClient.AskWithOptions(projectID.String(), question, req.Context, req.Files, strings.TrimSpace(req.Lens))
	if aiErr != nil {
		return nil, fmt.Errorf("%w — ensure ./run-ai.sh is running", aiErr)
	}
	if a, ok := out["answer"].(string); ok {
		answer = a
	}
	if src, ok := out["sources"].([]interface{}); ok {
		for _, item := range src {
			if m, ok := item.(map[string]interface{}); ok {
				sources = append(sources, m)
			}
		}
	}
	if strings.TrimSpace(answer) == "" {
		return nil, fmt.Errorf("AI returned an empty answer — try re-analyzing the project")
	}

	userMeta := map[string]interface{}{}
	displayQuestion := question
	if lens := strings.TrimSpace(req.Lens); lens != "" {
		userMeta["lens"] = lens
		displayQuestion = fmt.Sprintf("[%s] %s", lens, question)
	}
	if len(req.Files) > 0 {
		paths := make([]string, 0, len(req.Files))
		for _, f := range req.Files {
			if f.Path != "" {
				paths = append(paths, f.Path)
			}
		}
		userMeta["files"] = paths
		if len(paths) > 0 {
			displayQuestion = fmt.Sprintf("%s\n\n[files: %s]", displayQuestion, strings.Join(paths, ", "))
		}
	}
	if req.Context != nil && strings.TrimSpace(req.Context.Code) != "" {
		userMeta["selection"] = map[string]interface{}{
			"path":       req.Context.Path,
			"start_line": req.Context.StartLine,
			"end_line":   req.Context.EndLine,
			"language":   req.Context.Language,
		}
		if req.Context.Path != "" {
			loc := req.Context.Path
			if req.Context.StartLine > 0 {
				if req.Context.EndLine > req.Context.StartLine {
					loc = fmt.Sprintf("%s:%d-%d", req.Context.Path, req.Context.StartLine, req.Context.EndLine)
				} else {
					loc = fmt.Sprintf("%s:%d", req.Context.Path, req.Context.StartLine)
				}
			}
			displayQuestion = fmt.Sprintf("%s\n\n[selection %s]", displayQuestion, loc)
		}
	}
	userMetaJSON, _ := json.Marshal(userMeta)

	_, _ = s.db.Exec(`
		INSERT INTO chat_messages (project_id, user_id, role, content, metadata)
		VALUES ($1, $2, 'user', $3, $4)
	`, projectID, userID, displayQuestion, userMetaJSON)
	meta, _ := json.Marshal(map[string]interface{}{"sources": sources})
	_, _ = s.db.Exec(`
		INSERT INTO chat_messages (project_id, user_id, role, content, metadata)
		VALUES ($1, $2, 'assistant', $3, $4)
	`, projectID, userID, answer, meta)

	return &models.AskQuestionResponse{
		Answer:   answer,
		Sources:  sources,
		Question: question,
	}, nil
}

func (s *ProjectService) GetDependencyDiagram(userID, projectID uuid.UUID) (map[string]interface{}, error) {
	if _, err := s.GetProject(userID, projectID); err != nil {
		return nil, err
	}

	// Prefer AI-generated mermaid diagram
	var resultsJSON []byte
	err := s.db.QueryRow(`
		SELECT results FROM analyses
		WHERE project_id = $1 AND type = 'diagram'
		ORDER BY created_at DESC LIMIT 1
	`, projectID).Scan(&resultsJSON)
	if err == nil {
		var parsed map[string]interface{}
		if json.Unmarshal(resultsJSON, &parsed) == nil {
			if content, ok := parsed["content"].(string); ok && content != "" {
				return map[string]interface{}{
					"format":  "mermaid",
					"content": content,
					"source":  "ai",
				}, nil
			}
		}
	}

	// Fallback structural graph
	rows, err := s.db.Query(`
		SELECT fl.path, f.name, 'function' as kind
		FROM functions f
		JOIN files fl ON fl.id = f.file_id
		WHERE fl.project_id = $1
		UNION ALL
		SELECT fl.path, c.name, 'class' as kind
		FROM classes c
		JOIN files fl ON fl.id = c.file_id
		WHERE fl.project_id = $1
		LIMIT 200
	`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	nodes := make([]map[string]string, 0)
	edges := make([]map[string]string, 0)
	fileNodes := map[string]bool{}

	for rows.Next() {
		var path, name, kind string
		if err := rows.Scan(&path, &name, &kind); err != nil {
			continue
		}
		if !fileNodes[path] {
			nodes = append(nodes, map[string]string{"id": path, "label": path, "type": "file"})
			fileNodes[path] = true
		}
		entityID := path + "::" + name
		nodes = append(nodes, map[string]string{"id": entityID, "label": name, "type": kind})
		edges = append(edges, map[string]string{"from": path, "to": entityID, "type": "contains"})
	}

	return map[string]interface{}{
		"format": "graph",
		"nodes":  nodes,
		"edges":  edges,
		"source": "structural",
	}, nil
}

func (s *ProjectService) GetGeneratedDocs(userID, projectID uuid.UUID) (map[string]interface{}, error) {
	if _, err := s.GetProject(userID, projectID); err != nil {
		return nil, err
	}

	var resultsJSON []byte
	err := s.db.QueryRow(`
		SELECT results FROM analyses
		WHERE project_id = $1 AND type = 'docs'
		ORDER BY created_at DESC LIMIT 1
	`, projectID).Scan(&resultsJSON)
	if err == nil {
		var parsed map[string]interface{}
		if json.Unmarshal(resultsJSON, &parsed) == nil {
			if content, ok := parsed["content"].(string); ok {
				return map[string]interface{}{
					"format":  "markdown",
					"content": content,
					"source":  "ai",
					"status":  "ready",
				}, nil
			}
		}
	}

	return map[string]interface{}{
		"format":  "markdown",
		"content": "",
		"status":  "missing",
		"message": "Documentation not generated yet. Click Generate Docs.",
	}, nil
}

func (s *ProjectService) GenerateDocs(userID, projectID uuid.UUID, force bool) (map[string]interface{}, error) {
	if _, err := s.GetProject(userID, projectID); err != nil {
		return nil, err
	}
	if !s.settings.HasAPIKey(userID) {
		return nil, fmt.Errorf("api key not configured — add OpenAI or Gemini key in Settings")
	}
	if s.aiClient == nil {
		return nil, fmt.Errorf("AI service not configured")
	}
	return s.aiClient.GenerateDocs(projectID.String(), force)
}

func (s *ProjectService) GetFileContent(userID, projectID uuid.UUID, path string) (map[string]interface{}, error) {
	project, err := s.GetProject(userID, projectID)
	if err != nil {
		return nil, err
	}
	path = strings.TrimSpace(strings.TrimPrefix(path, "/"))
	if path == "" {
		return nil, fmt.Errorf("path is required")
	}

	var (
		fileID    uuid.UUID
		language  sql.NullString
		sizeBytes sql.NullInt64
	)
	err = s.db.QueryRow(`
		SELECT id, language, size_bytes FROM files
		WHERE project_id = $1 AND path = $2
	`, projectID, path).Scan(&fileID, &language, &sizeBytes)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("file not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to lookup file: %w", err)
	}

	symbols := s.listFileSymbols(fileID)

	result := map[string]interface{}{
		"id":       fileID,
		"path":     path,
		"language": nullString(language),
		"symbols":  symbols,
	}
	if sizeBytes.Valid {
		result["size_bytes"] = sizeBytes.Int64
	}

	if project.RepoURL == nil || strings.TrimSpace(*project.RepoURL) == "" {
		result["content"] = ""
		result["message"] = "No repository URL — cannot load file contents"
		result["source"] = "none"
		return result, nil
	}

	token := s.resolveGitHubToken(userID)
	content, htmlURL, err := s.fetchGitHubFileContent(*project.RepoURL, path, token)
	if err != nil {
		result["content"] = ""
		result["message"] = err.Error()
		result["source"] = "error"
		return result, nil
	}
	result["content"] = content
	result["html_url"] = htmlURL
	result["source"] = "github"
	return result, nil
}

func (s *ProjectService) listFileSymbols(fileID uuid.UUID) []map[string]interface{} {
	out := make([]map[string]interface{}, 0)
	rows, err := s.db.Query(`
		SELECT id, name, signature, summary, start_line, entity_type FROM (
			SELECT id, name, signature, summary, start_line, 'function' AS entity_type
			FROM functions WHERE file_id = $1
			UNION ALL
			SELECT id, name, NULL AS signature, summary, start_line, 'class' AS entity_type
			FROM classes WHERE file_id = $1
		) symbols
		ORDER BY start_line NULLS LAST, name
	`, fileID)
	if err != nil {
		return out
	}
	defer rows.Close()
	for rows.Next() {
		var id uuid.UUID
		var name, entityType string
		var signature, summary sql.NullString
		var startLine sql.NullInt64
		if err := rows.Scan(&id, &name, &signature, &summary, &startLine, &entityType); err != nil {
			continue
		}
		item := map[string]interface{}{
			"id":          id,
			"name":        name,
			"entity_type": entityType,
			"signature":   nullString(signature),
			"summary":     nullString(summary),
		}
		if startLine.Valid {
			item["start_line"] = startLine.Int64
		}
		out = append(out, item)
	}
	return out
}

func (s *ProjectService) GetChatHistory(userID, projectID uuid.UUID, limit int) ([]map[string]interface{}, error) {
	if _, err := s.GetProject(userID, projectID); err != nil {
		return nil, err
	}
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	rows, err := s.db.Query(`
		SELECT id, role, content, metadata, created_at
		FROM chat_messages
		WHERE project_id = $1
		ORDER BY created_at ASC
		LIMIT $2
	`, projectID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to load chat: %w", err)
	}
	defer rows.Close()

	messages := make([]map[string]interface{}, 0)
	for rows.Next() {
		var id uuid.UUID
		var role, content string
		var meta []byte
		var createdAt time.Time
		if err := rows.Scan(&id, &role, &content, &meta, &createdAt); err != nil {
			continue
		}
		var metadata interface{}
		_ = json.Unmarshal(meta, &metadata)
		messages = append(messages, map[string]interface{}{
			"id":         id,
			"role":       role,
			"content":    content,
			"metadata":   metadata,
			"created_at": createdAt,
		})
	}
	return messages, nil
}

func (s *ProjectService) GetProjectInsights(userID, projectID uuid.UUID, includeGitHub bool) (map[string]interface{}, error) {
	project, err := s.GetProject(userID, projectID)
	if err != nil {
		return nil, err
	}

	// Language by file count + bytes
	langRows, err := s.db.Query(`
		SELECT COALESCE(language, 'unknown') AS language,
		       COUNT(*) AS file_count,
		       COALESCE(SUM(size_bytes), 0) AS total_bytes
		FROM files WHERE project_id = $1
		GROUP BY COALESCE(language, 'unknown')
		ORDER BY total_bytes DESC, file_count DESC
	`, projectID)
	if err != nil {
		return nil, err
	}
	defer langRows.Close()

	languages := make([]map[string]interface{}, 0)
	var totalBytes int64
	var totalFiles int
	for langRows.Next() {
		var lang string
		var fileCount int
		var bytes int64
		if err := langRows.Scan(&lang, &fileCount, &bytes); err != nil {
			continue
		}
		totalBytes += bytes
		totalFiles += fileCount
		languages = append(languages, map[string]interface{}{
			"language":   lang,
			"file_count": fileCount,
			"bytes":      bytes,
		})
	}

	// Extension breakdown
	extRows, err := s.db.Query(`
		SELECT
			CASE
				WHEN path ~ '\.[A-Za-z0-9]+$' THEN lower(substring(path from '\.([A-Za-z0-9]+)$'))
				ELSE '(none)'
			END AS ext,
			COUNT(*) AS file_count,
			COALESCE(SUM(size_bytes), 0) AS total_bytes
		FROM files WHERE project_id = $1
		GROUP BY 1
		ORDER BY file_count DESC
		LIMIT 15
	`, projectID)
	extensions := make([]map[string]interface{}, 0)
	if err == nil {
		defer extRows.Close()
		for extRows.Next() {
			var ext string
			var fileCount int
			var bytes int64
			if err := extRows.Scan(&ext, &fileCount, &bytes); err != nil {
				continue
			}
			extensions = append(extensions, map[string]interface{}{
				"extension":  ext,
				"file_count": fileCount,
				"bytes":      bytes,
			})
		}
	}

	// Directory depth histogram (top-level folders)
	dirRows, err := s.db.Query(`
		SELECT
			CASE
				WHEN position('/' in path) = 0 THEN '(root)'
				ELSE split_part(path, '/', 1)
			END AS folder,
			COUNT(*) AS file_count,
			COALESCE(SUM(size_bytes), 0) AS total_bytes
		FROM files WHERE project_id = $1
		GROUP BY 1
		ORDER BY file_count DESC
		LIMIT 12
	`, projectID)
	folders := make([]map[string]interface{}, 0)
	if err == nil {
		defer dirRows.Close()
		for dirRows.Next() {
			var folder string
			var fileCount int
			var bytes int64
			if err := dirRows.Scan(&folder, &fileCount, &bytes); err != nil {
				continue
			}
			folders = append(folders, map[string]interface{}{
				"folder":     folder,
				"file_count": fileCount,
				"bytes":      bytes,
			})
		}
	}

	// Largest files
	largeRows, err := s.db.Query(`
		SELECT path, COALESCE(language, 'unknown'), COALESCE(size_bytes, 0)
		FROM files WHERE project_id = $1
		ORDER BY size_bytes DESC NULLS LAST
		LIMIT 12
	`, projectID)
	largestFiles := make([]map[string]interface{}, 0)
	if err == nil {
		defer largeRows.Close()
		for largeRows.Next() {
			var path, lang string
			var size int
			if err := largeRows.Scan(&path, &lang, &size); err != nil {
				continue
			}
			largestFiles = append(largestFiles, map[string]interface{}{
				"path":       path,
				"language":   lang,
				"size_bytes": size,
			})
		}
	}

	// Key / entry-point style files
	keyRows, err := s.db.Query(`
		SELECT path, COALESCE(language, 'unknown'), COALESCE(size_bytes, 0)
		FROM files
		WHERE project_id = $1 AND (
			lower(path) ~ '(^|/)readme(\.[a-z0-9]+)?$'
			OR lower(path) ~ '(^|/)license(\.[a-z0-9]+)?$'
			OR lower(path) IN (
				'package.json','pnpm-lock.yaml','yarn.lock','package-lock.json',
				'go.mod','go.sum','cargo.toml','cargo.lock','pyproject.toml','requirements.txt',
				'pipfile','composer.json','gemfile','pom.xml','build.gradle','build.gradle.kts',
				'dockerfile','docker-compose.yml','docker-compose.yaml',
				'makefile','cmakelists.txt','tsconfig.json','next.config.js','next.config.mjs',
				'vite.config.ts','vite.config.js','turbo.json','.gitignore','main.go','main.py',
				'app.py','index.ts','index.tsx','index.js','src/main.rs','cmd/main.go'
			)
			OR lower(path) LIKE '%/main.go'
			OR lower(path) LIKE '%/main.py'
			OR lower(path) LIKE '%/index.ts'
			OR lower(path) LIKE '%/index.tsx'
			OR lower(path) LIKE '%/%dockerfile'
		)
		ORDER BY
			CASE
				WHEN lower(path) ~ 'readme' THEN 0
				WHEN lower(path) LIKE '%package.json' OR lower(path) = 'go.mod' OR lower(path) = 'pyproject.toml' THEN 1
				WHEN lower(path) LIKE '%dockerfile%' OR lower(path) LIKE '%docker-compose%' THEN 2
				ELSE 3
			END,
			path ASC
		LIMIT 40
	`, projectID)
	keyFiles := make([]map[string]interface{}, 0)
	if err == nil {
		defer keyRows.Close()
		for keyRows.Next() {
			var path, lang string
			var size int
			if err := keyRows.Scan(&path, &lang, &size); err != nil {
				continue
			}
			keyFiles = append(keyFiles, map[string]interface{}{
				"path":       path,
				"language":   lang,
				"size_bytes": size,
				"kind":       classifyKeyFile(path),
			})
		}
	}

	// Top symbols
	fnRows, err := s.db.Query(`
		SELECT f.name, COALESCE(f.signature, ''), fl.path, COALESCE(f.start_line, 0)
		FROM functions f
		JOIN files fl ON fl.id = f.file_id
		WHERE fl.project_id = $1
		ORDER BY length(COALESCE(f.signature, f.name)) DESC, f.name ASC
		LIMIT 20
	`, projectID)
	topFunctions := make([]map[string]interface{}, 0)
	if err == nil {
		defer fnRows.Close()
		for fnRows.Next() {
			var name, sig, path string
			var line int
			if err := fnRows.Scan(&name, &sig, &path, &line); err != nil {
				continue
			}
			topFunctions = append(topFunctions, map[string]interface{}{
				"name": name, "signature": sig, "path": path, "start_line": line,
			})
		}
	}

	classRows, err := s.db.Query(`
		SELECT c.name, fl.path, COALESCE(c.start_line, 0)
		FROM classes c
		JOIN files fl ON fl.id = c.file_id
		WHERE fl.project_id = $1
		ORDER BY c.name ASC
		LIMIT 20
	`, projectID)
	topClasses := make([]map[string]interface{}, 0)
	if err == nil {
		defer classRows.Close()
		for classRows.Next() {
			var name, path string
			var line int
			if err := classRows.Scan(&name, &path, &line); err != nil {
				continue
			}
			topClasses = append(topClasses, map[string]interface{}{
				"name": name, "path": path, "start_line": line,
			})
		}
	}

	var functionCount, classCount, embeddingCount int
	_ = s.db.QueryRow(`
		SELECT COUNT(*) FROM functions f JOIN files fl ON fl.id = f.file_id WHERE fl.project_id = $1
	`, projectID).Scan(&functionCount)
	_ = s.db.QueryRow(`
		SELECT COUNT(*) FROM classes c JOIN files fl ON fl.id = c.file_id WHERE fl.project_id = $1
	`, projectID).Scan(&classCount)
	_ = s.db.QueryRow(`
		SELECT COUNT(*) FROM embeddings e
		WHERE (e.content_type = 'function' AND e.content_id IN (
			SELECT f.id FROM functions f JOIN files fl ON fl.id = f.file_id WHERE fl.project_id = $1
		)) OR (e.content_type = 'class' AND e.content_id IN (
			SELECT c.id FROM classes c JOIN files fl ON fl.id = c.file_id WHERE fl.project_id = $1
		)) OR (e.content_type = 'file' AND e.content_id IN (
			SELECT id FROM files WHERE project_id = $1
		))
	`, projectID).Scan(&embeddingCount)

	var hasOverview, hasDiagram, hasDocs bool
	_ = s.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM analyses WHERE project_id=$1 AND type='overview')`, projectID).Scan(&hasOverview)
	_ = s.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM analyses WHERE project_id=$1 AND type='diagram')`, projectID).Scan(&hasDiagram)
	_ = s.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM analyses WHERE project_id=$1 AND type='docs')`, projectID).Scan(&hasDocs)

	var chatCount int
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM chat_messages WHERE project_id=$1`, projectID).Scan(&chatCount)

	// Local analysis activity from jobs
	jobRows, err := s.db.Query(`
		SELECT DATE(created_at) AS day, COUNT(*) AS jobs,
		       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
		       SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
		FROM jobs
		WHERE project_id = $1 AND created_at > NOW() - INTERVAL '30 days'
		GROUP BY DATE(created_at)
		ORDER BY day ASC
	`, projectID)
	activity := make([]map[string]interface{}, 0)
	if err == nil {
		defer jobRows.Close()
		for jobRows.Next() {
			var day time.Time
			var jobs, completed, failed int
			if err := jobRows.Scan(&day, &jobs, &completed, &failed); err != nil {
				continue
			}
			activity = append(activity, map[string]interface{}{
				"date":      day.Format("2006-01-02"),
				"jobs":      jobs,
				"completed": completed,
				"failed":    failed,
			})
		}
	}

	var lastJobStatus sql.NullString
	var lastJobAt sql.NullTime
	_ = s.db.QueryRow(`
		SELECT status, updated_at FROM jobs WHERE project_id=$1
		ORDER BY updated_at DESC LIMIT 1
	`, projectID).Scan(&lastJobStatus, &lastJobAt)

	insights := map[string]interface{}{
		"languages":      languages,
		"extensions":     extensions,
		"folders":        folders,
		"largest_files":  largestFiles,
		"key_files":      keyFiles,
		"top_functions":  topFunctions,
		"top_classes":    topClasses,
		"activity":       activity,
		"total_bytes":    totalBytes,
		"total_files":    totalFiles,
		"function_count": functionCount,
		"class_count":    classCount,
		"embedding_count": embeddingCount,
		"chat_count":     chatCount,
		"artifacts": map[string]interface{}{
			"overview": hasOverview,
			"diagram":  hasDiagram,
			"docs":     hasDocs,
		},
	}
	if lastJobStatus.Valid {
		insights["last_job_status"] = lastJobStatus.String
	}
	if lastJobAt.Valid {
		insights["last_job_at"] = lastJobAt.Time
	}

	if includeGitHub && project.RepoURL != nil && strings.TrimSpace(*project.RepoURL) != "" {
		repoURL := *project.RepoURL
		token := s.resolveGitHubToken(userID)
		if meta, err := s.fetchGitHubRepoMeta(repoURL, token); err == nil {
			insights["github"] = meta
		} else {
			insights["github_error"] = err.Error()
		}
		if langs, err := s.fetchGitHubLanguages(repoURL, token); err == nil {
			insights["github_languages"] = langs
		} else {
			insights["github_languages_error"] = err.Error()
		}
		if contributors, err := s.fetchGitHubContributors(repoURL, 12, token); err == nil {
			insights["contributors"] = contributors
		} else {
			insights["contributors_error"] = err.Error()
		}
		if releases, err := s.fetchGitHubReleases(repoURL, 5, token); err == nil {
			insights["releases"] = releases
		} else {
			insights["releases_error"] = err.Error()
		}
		if readme, err := s.fetchGitHubReadme(repoURL, token); err == nil {
			insights["readme"] = readme
		} else {
			insights["readme_error"] = err.Error()
		}
		if openPRs, err := s.fetchGitHubPullsOpen(repoURL, token); err == nil {
			insights["open_prs"] = openPRs
		} else {
			insights["open_prs_error"] = err.Error()
		}
		if commits, err := s.fetchGitHubCommits(repoURL, 25, token); err == nil {
			insights["commits"] = commits
			commitDays := map[string]int{}
			authors := map[string]int{}
			for _, c := range commits {
				if d, ok := c["date"].(time.Time); ok {
					key := d.UTC().Format("2006-01-02")
					commitDays[key]++
				}
				author := ""
				if login, ok := c["login"].(string); ok && login != "" {
					author = login
				} else if name, ok := c["author"].(string); ok {
					author = name
				}
				if author != "" {
					authors[author]++
				}
			}
			commitActivity := make([]map[string]interface{}, 0, len(commitDays))
			for day, count := range commitDays {
				commitActivity = append(commitActivity, map[string]interface{}{
					"date":  day,
					"count": count,
				})
			}
			authorStats := make([]map[string]interface{}, 0, len(authors))
			for name, count := range authors {
				authorStats = append(authorStats, map[string]interface{}{
					"name":  name,
					"count": count,
				})
			}
			for i := 0; i < len(authorStats); i++ {
				for j := i + 1; j < len(authorStats); j++ {
					if authorStats[j]["count"].(int) > authorStats[i]["count"].(int) {
						authorStats[i], authorStats[j] = authorStats[j], authorStats[i]
					}
				}
			}
			insights["commit_activity"] = commitActivity
			insights["recent_authors"] = authorStats
		} else {
			insights["commits_error"] = err.Error()
		}
	}

	insights["github_token_configured"] = s.resolveGitHubToken(userID) != ""
	return insights, nil
}

func (s *ProjectService) RefreshGitHubSection(userID, projectID uuid.UUID, section string) (map[string]interface{}, error) {
	project, err := s.GetProject(userID, projectID)
	if err != nil {
		return nil, err
	}
	if project.RepoURL == nil || strings.TrimSpace(*project.RepoURL) == "" {
		return nil, fmt.Errorf("project has no repository URL")
	}
	repoURL := *project.RepoURL
	token := s.resolveGitHubToken(userID)
	section = strings.ToLower(strings.TrimSpace(section))
	out := map[string]interface{}{
		"section": section,
	}

	switch section {
	case "meta", "github":
		meta, err := s.fetchGitHubRepoMeta(repoURL, token)
		if err != nil {
			out["error"] = err.Error()
		} else {
			out["github"] = meta
		}
	case "languages", "github_languages":
		langs, err := s.fetchGitHubLanguages(repoURL, token)
		if err != nil {
			out["error"] = err.Error()
		} else {
			out["github_languages"] = langs
		}
	case "contributors":
		items, err := s.fetchGitHubContributors(repoURL, 12, token)
		if err != nil {
			out["error"] = err.Error()
		} else {
			out["contributors"] = items
		}
	case "releases":
		items, err := s.fetchGitHubReleases(repoURL, 5, token)
		if err != nil {
			out["error"] = err.Error()
		} else {
			out["releases"] = items
		}
	case "readme":
		readme, err := s.fetchGitHubReadme(repoURL, token)
		if err != nil {
			out["error"] = err.Error()
		} else {
			out["readme"] = readme
		}
	case "pulls", "open_prs":
		n, err := s.fetchGitHubPullsOpen(repoURL, token)
		if err != nil {
			out["error"] = err.Error()
		} else {
			out["open_prs"] = n
		}
	case "commits", "activity":
		commits, err := s.fetchGitHubCommits(repoURL, 25, token)
		if err != nil {
			out["error"] = err.Error()
			break
		}
		out["commits"] = commits
		commitDays := map[string]int{}
		authors := map[string]int{}
		for _, c := range commits {
			if d, ok := c["date"].(time.Time); ok {
				key := d.UTC().Format("2006-01-02")
				commitDays[key]++
			}
			author := ""
			if login, ok := c["login"].(string); ok && login != "" {
				author = login
			} else if name, ok := c["author"].(string); ok {
				author = name
			}
			if author != "" {
				authors[author]++
			}
		}
		commitActivity := make([]map[string]interface{}, 0, len(commitDays))
		for day, count := range commitDays {
			commitActivity = append(commitActivity, map[string]interface{}{"date": day, "count": count})
		}
		authorStats := make([]map[string]interface{}, 0, len(authors))
		for name, count := range authors {
			authorStats = append(authorStats, map[string]interface{}{"name": name, "count": count})
		}
		for i := 0; i < len(authorStats); i++ {
			for j := i + 1; j < len(authorStats); j++ {
				if authorStats[j]["count"].(int) > authorStats[i]["count"].(int) {
					authorStats[i], authorStats[j] = authorStats[j], authorStats[i]
				}
			}
		}
		out["commit_activity"] = commitActivity
		out["recent_authors"] = authorStats
	default:
		return nil, fmt.Errorf("unknown section %q (use meta, languages, contributors, releases, readme, pulls, commits)", section)
	}

	out["github_token_configured"] = token != ""
	return out, nil
}

func classifyKeyFile(path string) string {
	p := strings.ToLower(path)
	base := p
	if i := strings.LastIndex(p, "/"); i >= 0 {
		base = p[i+1:]
	}
	switch {
	case strings.Contains(base, "readme"):
		return "readme"
	case strings.Contains(base, "license"):
		return "license"
	case base == "dockerfile" || strings.Contains(base, "docker-compose"):
		return "container"
	case base == "package.json" || base == "go.mod" || base == "pyproject.toml" ||
		base == "cargo.toml" || base == "pom.xml" || base == "requirements.txt" ||
		base == "composer.json" || base == "gemfile":
		return "manifest"
	case strings.Contains(base, "lock"):
		return "lockfile"
	case base == "makefile" || strings.HasPrefix(base, "cmakelists"):
		return "build"
	case strings.HasPrefix(base, "main.") || base == "index.ts" || base == "index.tsx" || base == "index.js" || base == "app.py":
		return "entrypoint"
	case strings.Contains(base, "config") || base == "tsconfig.json" || base == "turbo.json":
		return "config"
	default:
		return "important"
	}
}

func nullString(ns sql.NullString) interface{} {
	if ns.Valid {
		return ns.String
	}
	return nil
}
