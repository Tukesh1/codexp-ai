#!/usr/bin/env bash
# Start local infra + Go API for CodeExp AI development
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "==> Starting Postgres + Redis"
docker compose up -d postgres redis

echo "==> Waiting for Postgres..."
until docker compose exec -T postgres pg_isready -U codeexp >/dev/null 2>&1; do
  sleep 1
done

echo "==> Building Go API"
(cd backend/api && go build -o ../../bin/codeexp-api .)

mkdir -p bin
export DATABASE_URL="${DATABASE_URL:-postgresql://codeexp:secure_password@localhost:5432/codeexp?sslmode=disable}"
export REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
export JWT_SECRET="${JWT_SECRET:-dev-jwt-secret-change-me}"
export GO_ENV="${GO_ENV:-development}"

echo "==> Starting Go API on :8080"
exec ./bin/codeexp-api
