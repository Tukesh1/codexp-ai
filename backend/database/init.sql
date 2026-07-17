-- Initialize pgvector extension and base privileges
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

GRANT ALL PRIVILEGES ON DATABASE codeexp TO codeexp;

-- Tables are also created by the Go API migrations on startup.
-- This init script ensures a usable schema if the API has not run yet.

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    plan VARCHAR(50) DEFAULT 'free',
    openai_api_key TEXT,
    gemini_api_key TEXT,
    github_token TEXT,
    ai_provider VARCHAR(50) DEFAULT 'openai',
    ai_model VARCHAR(100) DEFAULT 'gpt-4o-mini',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    summary TEXT,
    start_line INTEGER,
    end_line INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_type VARCHAR(50) NOT NULL,
    content_id UUID NOT NULL,
    vector vector(384),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(content_type, content_id)
);

CREATE TABLE IF NOT EXISTS analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    results JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_files_project_id ON files(project_id);
CREATE INDEX IF NOT EXISTS idx_functions_file_id ON functions(file_id);
CREATE INDEX IF NOT EXISTS idx_classes_file_id ON classes(file_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_content ON embeddings(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_jobs_project_id ON jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_project_id ON chat_messages(project_id);

-- Notes for user annotations on code
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
CREATE INDEX IF NOT EXISTS idx_notes_project ON notes(project_id);
CREATE INDEX IF NOT EXISTS idx_notes_path ON notes(project_id, path);

-- Code references for call graph / symbol graph
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
CREATE INDEX IF NOT EXISTS idx_code_refs_project ON code_references(project_id);
CREATE INDEX IF NOT EXISTS idx_code_refs_to_name ON code_references(project_id, to_name);
CREATE INDEX IF NOT EXISTS idx_code_refs_from_path ON code_references(project_id, from_path);

-- Quiz attempts for knowledge testing
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quiz JSONB NOT NULL,
    answers JSONB,
    score INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
CREATE INDEX IF NOT EXISTS idx_notes_project ON notes(project_id);
CREATE INDEX IF NOT EXISTS idx_notes_path ON notes(project_id, path);

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
CREATE INDEX IF NOT EXISTS idx_code_refs_project ON code_references(project_id);
CREATE INDEX IF NOT EXISTS idx_code_refs_to_name ON code_references(project_id, to_name);
CREATE INDEX IF NOT EXISTS idx_code_refs_from_path ON code_references(project_id, from_path);

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quiz JSONB NOT NULL,
    answers JSONB,
    score INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_project ON quiz_attempts(project_id);
