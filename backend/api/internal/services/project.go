package services

import (
	"database/sql"
	"fmt"

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

	var projects []*models.Project
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
