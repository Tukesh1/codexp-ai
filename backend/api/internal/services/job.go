package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/Tukesh1/codexp-ai/backend/api/internal/models"
	"github.com/go-redis/redis/v8"
	"github.com/google/uuid"
)

type JobService struct {
	db    *sql.DB
	redis *redis.Client
}

type JobPayload struct {
	ID        uuid.UUID   `json:"id"`
	Type      string      `json:"type"`
	ProjectID uuid.UUID   `json:"project_id"`
	Data      interface{} `json:"data"`
}

func NewJobService(db *sql.DB, redis *redis.Client) *JobService {
	return &JobService{
		db:    db,
		redis: redis,
	}
}

// QueueJob adds a job to the Redis queue and persists it.
func (s *JobService) QueueJob(jobType string, projectID uuid.UUID, data interface{}) (*models.Job, error) {
	job := &models.Job{
		ID:        uuid.New(),
		ProjectID: &projectID,
		Type:      jobType,
		Status:    "pending",
		Progress:  0,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if s.db != nil {
		_, err := s.db.Exec(`
			INSERT INTO jobs (id, project_id, type, status, progress)
			VALUES ($1, $2, $3, $4, $5)
		`, job.ID, projectID, job.Type, job.Status, job.Progress)
		if err != nil {
			return nil, fmt.Errorf("failed to persist job: %w", err)
		}
	}

	payload := JobPayload{
		ID:        job.ID,
		Type:      jobType,
		ProjectID: projectID,
		Data:      data,
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal job payload: %w", err)
	}

	ctx := context.Background()
	queueName := fmt.Sprintf("jobs:%s", jobType)

	err = s.redis.LPush(ctx, queueName, payloadBytes).Err()
	if err != nil {
		return nil, fmt.Errorf("failed to queue job: %w", err)
	}

	statusKey := fmt.Sprintf("job_status:%s", job.ID.String())
	statusData, _ := json.Marshal(job)
	s.redis.Set(ctx, statusKey, statusData, 24*time.Hour)

	return job, nil
}

func (s *JobService) GetJobStatus(jobID uuid.UUID) (*models.Job, error) {
	ctx := context.Background()
	statusKey := fmt.Sprintf("job_status:%s", jobID.String())

	result, err := s.redis.Get(ctx, statusKey).Result()
	if err != nil {
		if err == redis.Nil {
			return nil, fmt.Errorf("job not found")
		}
		return nil, fmt.Errorf("failed to get job status: %w", err)
	}

	var job models.Job
	err = json.Unmarshal([]byte(result), &job)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal job status: %w", err)
	}

	return &job, nil
}

func (s *JobService) UpdateJobStatus(jobID uuid.UUID, status string, progress int, errorMessage *string) error {
	ctx := context.Background()
	statusKey := fmt.Sprintf("job_status:%s", jobID.String())

	job, err := s.GetJobStatus(jobID)
	if err != nil {
		return err
	}

	job.Status = status
	job.Progress = progress
	job.ErrorMessage = errorMessage
	job.UpdatedAt = time.Now()

	statusData, err := json.Marshal(job)
	if err != nil {
		return fmt.Errorf("failed to marshal job status: %w", err)
	}

	err = s.redis.Set(ctx, statusKey, statusData, 24*time.Hour).Err()
	if err != nil {
		return fmt.Errorf("failed to update job status: %w", err)
	}

	if s.db != nil {
		_, _ = s.db.Exec(`
			UPDATE jobs SET status = $2, progress = $3, error_message = $4, updated_at = CURRENT_TIMESTAMP
			WHERE id = $1
		`, jobID, status, progress, errorMessage)
	}

	return nil
}

func (s *JobService) GetProjectJobs(projectID uuid.UUID) ([]*models.Job, error) {
	ctx := context.Background()
	pattern := "job_status:*"

	keys, err := s.redis.Keys(ctx, pattern).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get job keys: %w", err)
	}

	jobs := make([]*models.Job, 0)
	for _, key := range keys {
		result, err := s.redis.Get(ctx, key).Result()
		if err != nil {
			continue
		}

		var job models.Job
		if err := json.Unmarshal([]byte(result), &job); err != nil {
			continue
		}

		if job.ProjectID != nil && *job.ProjectID == projectID {
			jobs = append(jobs, &job)
		}
	}

	return jobs, nil
}
