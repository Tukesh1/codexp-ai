package database

import (
	"database/sql"
	"fmt"
	"log"

	"github.com/go-redis/redis/v8"
	_ "github.com/lib/pq"
)

// Initialize PostgreSQL connection with pgvector
func Initialize(databaseURL string) (*sql.DB, error) {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Run initial migrations
	if err := runMigrations(db); err != nil {
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	log.Println("Database connection established successfully")
	return db, nil
}

// Initialize Redis connection
func InitializeRedis(redisURL string) *redis.Client {
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		log.Fatal("Failed to parse Redis URL:", err)
	}

	client := redis.NewClient(opt)

	// Test connection
	ctx := client.Context()
	if err := client.Ping(ctx).Err(); err != nil {
		log.Fatal("Failed to connect to Redis:", err)
	}

	log.Println("Redis connection established successfully")
	return client
}

// Run database migrations
func runMigrations(db *sql.DB) error {
	migrations := []string{
		`CREATE EXTENSION IF NOT EXISTS vector;`,
		`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,
		`
		CREATE TABLE IF NOT EXISTS users (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			clerk_id VARCHAR(255) UNIQUE NOT NULL,
			email VARCHAR(255) UNIQUE NOT NULL,
			plan VARCHAR(50) DEFAULT 'free',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
		`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS openai_api_key TEXT;`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS gemini_api_key TEXT;`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS github_token TEXT;`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_provider VARCHAR(50) DEFAULT 'openai';`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_model VARCHAR(100) DEFAULT 'gpt-4o-mini';`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);`,
		`
		CREATE TABLE IF NOT EXISTS projects (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			name VARCHAR(255) NOT NULL,
			repo_url VARCHAR(500),
			github_repo_id BIGINT,
			status VARCHAR(50) DEFAULT 'pending',
			settings JSONB DEFAULT '{}',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
		`,
		`
		CREATE TABLE IF NOT EXISTS files (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
			path TEXT NOT NULL,
			content_hash VARCHAR(64),
			language VARCHAR(50),
			size_bytes INTEGER,
			last_analyzed TIMESTAMP,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(project_id, path)
		);
		`,
		`
		CREATE TABLE IF NOT EXISTS functions (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
			name VARCHAR(255) NOT NULL,
			signature TEXT,
			summary TEXT,
			start_line INTEGER,
			end_line INTEGER,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
		`,
		`
		CREATE TABLE IF NOT EXISTS classes (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
			name VARCHAR(255) NOT NULL,
			summary TEXT,
			start_line INTEGER,
			end_line INTEGER,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
		`,
		`
		CREATE TABLE IF NOT EXISTS embeddings (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			content_type VARCHAR(50) NOT NULL, -- 'function', 'class', 'file'
			content_id UUID NOT NULL,
			vector vector(384), -- sentence-transformers/all-MiniLM-L6-v2 dimension
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(content_type, content_id)
		);
		`,
		`
		CREATE TABLE IF NOT EXISTS analyses (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
			type VARCHAR(50) NOT NULL, -- 'summary', 'diagram', 'qa'
			results JSONB,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
		`,
		`
		CREATE TABLE IF NOT EXISTS jobs (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
			type VARCHAR(50) NOT NULL, -- 'repository_analysis', 'code_summary', etc.
			status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
			progress INTEGER DEFAULT 0, -- 0-100
			error_message TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
		`,
		`
		CREATE TABLE IF NOT EXISTS chat_messages (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
			user_id UUID REFERENCES users(id) ON DELETE SET NULL,
			role VARCHAR(20) NOT NULL,
			content TEXT NOT NULL,
			metadata JSONB DEFAULT '{}',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
		`,
		`CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);`,
		`CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);`,
		`CREATE INDEX IF NOT EXISTS idx_files_project_id ON files(project_id);`,
		`CREATE INDEX IF NOT EXISTS idx_functions_file_id ON functions(file_id);`,
		`CREATE INDEX IF NOT EXISTS idx_classes_file_id ON classes(file_id);`,
		`CREATE INDEX IF NOT EXISTS idx_embeddings_content ON embeddings(content_type, content_id);`,
		`CREATE INDEX IF NOT EXISTS idx_jobs_project_id ON jobs(project_id);`,
		`CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);`,
		`CREATE INDEX IF NOT EXISTS idx_chat_messages_project_id ON chat_messages(project_id);`,
		// Notes table for user annotations on code
		`
		CREATE TABLE IF NOT EXISTS notes (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
			user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			path TEXT NOT NULL,
			start_line INTEGER,
			end_line INTEGER,
			symbol_name TEXT,
			content TEXT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
		`,
		`CREATE INDEX IF NOT EXISTS idx_notes_project ON notes(project_id);`,
		`CREATE INDEX IF NOT EXISTS idx_notes_path ON notes(project_id, path);`,
		// Code references for call graph
		`
		CREATE TABLE IF NOT EXISTS code_references (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
			from_file_id UUID REFERENCES files(id) ON DELETE CASCADE,
			from_path TEXT NOT NULL,
			from_line INTEGER,
			to_name TEXT NOT NULL,
			to_kind VARCHAR(20),
			to_file_id UUID REFERENCES files(id) ON DELETE SET NULL,
			to_path TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
		`,
		`CREATE INDEX IF NOT EXISTS idx_code_refs_project ON code_references(project_id);`,
		`CREATE INDEX IF NOT EXISTS idx_code_refs_to_name ON code_references(project_id, to_name);`,
		`CREATE INDEX IF NOT EXISTS idx_code_refs_from_path ON code_references(project_id, from_path);`,
		// Quiz attempts for knowledge testing
		`
		CREATE TABLE IF NOT EXISTS quiz_attempts (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
			user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			quiz JSONB NOT NULL,
			answers JSONB,
			score INTEGER,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
		`,
	}

	for _, migration := range migrations {
		if _, err := db.Exec(migration); err != nil {
			return fmt.Errorf("failed to execute migration: %w", err)
		}
	}

	log.Println("Database migrations completed successfully")
	return nil
}
