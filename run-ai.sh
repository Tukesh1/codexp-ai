#!/usr/bin/env bash
# Start the Python AI service (analysis worker + embeddings)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT/backend/ai-service"

PYTHON="${PYTHON:-python3}"

if [ ! -d .venv ]; then
  echo "==> Creating virtualenv"
  "$PYTHON" -m venv .venv
fi

# Prefer venv binaries directly (more reliable than relying on activate + PATH)
PIP=".venv/bin/pip"
UVICORN=".venv/bin/uvicorn"
PY=".venv/bin/python"

if [ ! -x "$UVICORN" ]; then
  echo "==> Installing AI service dependencies (this can take a few minutes)"
  "$PIP" install --upgrade pip
  "$PIP" install -r requirements.txt
fi

export DATABASE_URL="${DATABASE_URL:-postgresql://codeexp:secure_password@localhost:5432/codeexp}"
export REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
export PYTHON_ENV="${PYTHON_ENV:-development}"
export SKIP_HEAVY_MODELS="${SKIP_HEAVY_MODELS:-true}"
export MODEL_CACHE_DIR="${MODEL_CACHE_DIR:-$ROOT/backend/ai-service/models}"
export PGSSLMODE="${PGSSLMODE:-disable}"

mkdir -p "$MODEL_CACHE_DIR"
export HF_HOME="${HF_HOME:-$MODEL_CACHE_DIR/huggingface}"
export TRANSFORMERS_CACHE="${TRANSFORMERS_CACHE:-$HF_HOME}"
mkdir -p "$HF_HOME"

echo "==> Starting AI service on :8000"
exec "$UVICORN" main:app --host 0.0.0.0 --port 8000 --reload
