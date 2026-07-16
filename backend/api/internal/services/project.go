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
	db    *sql.DB
	redis *redis.Client
}

func NewProjectService(db *sql.DB, redis *redis.Client) *ProjectService {
	return &ProjectService{
		db:    db,
		redis: redis,
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
			} else {
				msg := fmt.Sprintf(
					"Analyzed %d files with %d functions and %d classes",
					summary.FileCount, summary.FunctionCount, summary.ClassCount,
				)
				summary.Summary = &msg
			}
		}
	} else if summary.FileCount > 0 {
		msg := fmt.Sprintf(
			"Analyzed %d files with %d functions and %d classes",
			summary.FileCount, summary.FunctionCount, summary.ClassCount,
		)
		summary.Summary = &msg
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

func (s *ProjectService) AskQuestion(userID, projectID uuid.UUID, question string) (*models.AskQuestionResponse, error) {
	if _, err := s.GetProject(userID, projectID); err != nil {
		return nil, err
	}

	// Keyword RAG fallback using DB search (AI service semantic search used when available)
	results, err := s.SearchCode(userID, projectID, question)
	if err != nil {
		return nil, err
	}

	var b strings.Builder
	b.WriteString("Based on the analyzed codebase:\n\n")
	if len(results) == 0 {
		b.WriteString("I couldn't find specific matching code for that question. Try analyzing the repo first, or ask about a function/class name.")
	} else {
		b.WriteString(fmt.Sprintf("I found %d related symbols:\n", len(results)))
		for i, r := range results {
			if i >= 8 {
				break
			}
			b.WriteString(fmt.Sprintf("- %s `%s` in %s", r["entity_type"], r["name"], r["path"]))
			if summary, ok := r["summary"].(string); ok && summary != "" {
				b.WriteString(fmt.Sprintf(" — %s", summary))
			}
			b.WriteString("\n")
		}
		b.WriteString("\nThese are the most relevant matches for your question about: ")
		b.WriteString(question)
	}

	answer := b.String()

	_, _ = s.db.Exec(`
		INSERT INTO chat_messages (project_id, user_id, role, content, metadata)
		VALUES ($1, $2, 'user', $3, '{}')
	`, projectID, userID, question)
	meta, _ := json.Marshal(map[string]interface{}{"sources": results})
	_, _ = s.db.Exec(`
		INSERT INTO chat_messages (project_id, user_id, role, content, metadata)
		VALUES ($1, $2, 'assistant', $3, $4)
	`, projectID, userID, answer, meta)

	return &models.AskQuestionResponse{
		Answer:   answer,
		Sources:  results,
		Question: question,
	}, nil
}

func (s *ProjectService) GetDependencyDiagram(userID, projectID uuid.UUID) (map[string]interface{}, error) {
	if _, err := s.GetProject(userID, projectID); err != nil {
		return nil, err
	}

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
	}, nil
}

func (s *ProjectService) GetGeneratedDocs(userID, projectID uuid.UUID) (map[string]interface{}, error) {
	summary, err := s.GetProjectSummary(userID, projectID)
	if err != nil {
		return nil, err
	}

	var md strings.Builder
	md.WriteString("# Project Documentation\n\n")
	md.WriteString(fmt.Sprintf("**Status:** %s\n\n", summary.Status))
	md.WriteString("## Overview\n\n")
	if summary.Summary != nil {
		md.WriteString(*summary.Summary)
		md.WriteString("\n\n")
	}
	md.WriteString("## Statistics\n\n")
	md.WriteString(fmt.Sprintf("- Files: %d\n", summary.FileCount))
	md.WriteString(fmt.Sprintf("- Functions: %d\n", summary.FunctionCount))
	md.WriteString(fmt.Sprintf("- Classes: %d\n", summary.ClassCount))
	md.WriteString("\n## Languages\n\n")
	for lang, count := range summary.Languages {
		md.WriteString(fmt.Sprintf("- %s: %d files\n", lang, count))
	}

	rows, err := s.db.Query(`
		SELECT name, entity_type, path FROM (
			SELECT f.name, 'function' as entity_type, fl.path
			FROM functions f
			JOIN files fl ON fl.id = f.file_id
			WHERE fl.project_id = $1
			UNION ALL
			SELECT c.name, 'class' as entity_type, fl.path
			FROM classes c
			JOIN files fl ON fl.id = c.file_id
			WHERE fl.project_id = $1
		) symbols
		ORDER BY name
		LIMIT 40
	`, projectID)
	if err == nil {
		defer rows.Close()
		md.WriteString("\n## Symbols\n\n")
		for rows.Next() {
			var name, entityType, path string
			if err := rows.Scan(&name, &entityType, &path); err != nil {
				continue
			}
			md.WriteString(fmt.Sprintf("### `%s` (%s)\n\nPath: `%s`\n\n", name, entityType, path))
		}
	}

	return map[string]interface{}{
		"format":  "markdown",
		"content": md.String(),
		"summary": summary,
	}, nil
}

func nullString(ns sql.NullString) interface{} {
	if ns.Valid {
		return ns.String
	}
	return nil
}
