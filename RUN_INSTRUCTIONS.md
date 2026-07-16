# Running CodeExp AI Locally

## Architecture

- **Landing** (`apps/landing`) → http://localhost:3002
- **Web app** (`apps/web`) → http://localhost:3000
- **Admin** (`apps/admin`) → http://localhost:3001
- **Go API** (`backend/api`) → http://localhost:8080
- **AI service** (`backend/ai-service`) → http://localhost:8000
- **Postgres + Redis** via Docker Compose

## Quick start

```bash
# 1) Install frontend deps
pnpm install

# 2) Copy env
cp .env.example .env

# 3) Start Postgres + Redis + Go API
chmod +x run-api.sh run-ai.sh run-apps.sh
./run-api.sh

# 4) In another terminal — AI worker (clones repos, parses code, embeddings)
./run-ai.sh

# 5) In another terminal — frontends
./run-apps.sh
```

## Local auth (no Clerk required)

1. Open http://localhost:3000/login
2. Use any email (default `dev@codeexp.ai`)
3. The API issues a JWT via `POST /api/v1/auth/dev-login`

## Product loop

1. Create a project with a public GitHub URL
2. Analysis is queued on Redis (`jobs:repository_analysis`)
3. The AI worker clones → parses → stores entities → embeddings
4. Open the project for Overview / Files / Q&A / Docs / Diagram

## Health checks

- Go API: `curl http://localhost:8080/health`
- AI service: `curl http://localhost:8000/health`
