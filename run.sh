#!/usr/bin/env bash
# Temp helper: start API + AI + apps together (does not modify other run_*.sh scripts)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

mkdir -p "$ROOT/.run-logs"
API_LOG="$ROOT/.run-logs/api.log"
AI_LOG="$ROOT/.run-logs/ai.log"
APPS_LOG="$ROOT/.run-logs/apps.log"

API_PID=""
AI_PID=""
APPS_PID=""

cleanup() {
  echo ""
  echo "==> Stopping services..."
  [[ -n "${APPS_PID}" ]] && kill "${APPS_PID}" 2>/dev/null || true
  [[ -n "${AI_PID}" ]] && kill "${AI_PID}" 2>/dev/null || true
  [[ -n "${API_PID}" ]] && kill "${API_PID}" 2>/dev/null || true
  # Catch leftover child processes from the scripts
  pkill -P "${APPS_PID}" 2>/dev/null || true
  pkill -P "${AI_PID}" 2>/dev/null || true
  pkill -P "${API_PID}" 2>/dev/null || true
  wait 2>/dev/null || true
  echo "==> Stopped."
}

trap cleanup EXIT INT TERM

chmod +x "$ROOT/run-api.sh" "$ROOT/run-ai.sh" "$ROOT/run-apps.sh" 2>/dev/null || true

echo "==> Starting Go API (logs: .run-logs/api.log)"
"$ROOT/run-api.sh" >"$API_LOG" 2>&1 &
API_PID=$!

echo "==> Waiting for API health on :8080..."
for i in $(seq 1 60); do
  if curl -sf http://localhost:8080/health >/dev/null 2>&1; then
    echo "    API is up"
    break
  fi
  if ! kill -0 "$API_PID" 2>/dev/null; then
    echo "API failed to start. See $API_LOG"
    exit 1
  fi
  sleep 1
  if [[ "$i" -eq 60 ]]; then
    echo "API health check timed out. See $API_LOG"
    exit 1
  fi
done

echo "==> Starting AI service (logs: .run-logs/ai.log)"
"$ROOT/run-ai.sh" >"$AI_LOG" 2>&1 &
AI_PID=$!

echo "==> Waiting for AI health on :8000..."
for i in $(seq 1 120); do
  if curl -sf http://localhost:8000/health >/dev/null 2>&1; then
    echo "    AI is up"
    break
  fi
  if ! kill -0 "$AI_PID" 2>/dev/null; then
    echo "AI failed to start. See $AI_LOG"
    exit 1
  fi
  sleep 1
  if [[ "$i" -eq 120 ]]; then
    echo "AI health check timed out (still starting?). Continuing anyway — see $AI_LOG"
  fi
done

echo "==> Starting apps (logs: .run-logs/apps.log)"
"$ROOT/run-apps.sh" >"$APPS_LOG" 2>&1 &
APPS_PID=$!

echo ""
echo "All services launching:"
echo "  Web     http://localhost:3000"
echo "  Admin   http://localhost:3001"
echo "  Landing http://localhost:3002"
echo "  API     http://localhost:8080"
echo "  AI      http://localhost:8000"
echo ""
echo "Logs: .run-logs/{api,ai,apps}.log"
echo "Press Ctrl+C to stop everything."
echo ""

# Keep run.sh alive until one process exits or user interrupts
while true; do
  if ! kill -0 "$API_PID" 2>/dev/null; then
    echo "API exited. Check $API_LOG"
    exit 1
  fi
  if ! kill -0 "$AI_PID" 2>/dev/null; then
    echo "AI exited. Check $AI_LOG"
    exit 1
  fi
  if ! kill -0 "$APPS_PID" 2>/dev/null; then
    echo "Apps exited. Check $APPS_LOG"
    exit 1
  fi
  sleep 2
done
