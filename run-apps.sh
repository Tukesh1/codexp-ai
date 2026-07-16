#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "📦 Installing dependencies for all apps..."
pnpm install

echo "🚀 Starting Next.js apps (web:3000, admin:3001, landing:3002)..."
exec pnpm dev
