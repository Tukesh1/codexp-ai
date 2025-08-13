# CodeExp AI Makefile

.PHONY: help setup dev build test clean logs ps up down restart

# Default target
help:
	@echo "CodeExp AI Development Commands"
	@echo "==============================="
	@echo "setup    - Initial setup of development environment"
	@echo "dev      - Start development environment"
	@echo "build    - Build all Docker images"
	@echo "test     - Run tests for all services"
	@echo "clean    - Clean up Docker containers and volumes"
	@echo "logs     - Show logs for all services"
	@echo "ps       - Show status of all services"
	@echo "up       - Start all services"
	@echo "down     - Stop all services"
	@echo "restart  - Restart all services"

# Initial setup
setup:
	@echo "🚀 Setting up CodeExp AI..."
	@chmod +x setup.sh
	@./setup.sh

# Development environment
dev: up
	@echo "🔧 Development environment running..."
	@echo "Frontend: http://localhost:3000"
	@echo "API: http://localhost:8080"
	@echo "AI Service: http://localhost:8000"

# Build all images
build:
	@echo "🔨 Building all Docker images..."
	@docker-compose build

# Run tests
test:
	@echo "🧪 Running tests..."
	@docker-compose exec api go test ./...
	@docker-compose exec ai-service python -m pytest

# Clean up
clean:
	@echo "🧹 Cleaning up..."
	@docker-compose down -v
	@docker system prune -f

# Show logs
logs:
	@docker-compose logs -f

# Show service status
ps:
	@docker-compose ps

# Start services
up:
	@echo "▶️  Starting services..."
	@docker-compose up -d

# Stop services
down:
	@echo "⏹️  Stopping services..."
	@docker-compose down

# Restart services
restart: down up
	@echo "🔄 Services restarted"

# Individual service commands
api-logs:
	@docker-compose logs -f api

ai-logs:
	@docker-compose logs -f ai-service

frontend-logs:
	@docker-compose logs -f frontend

db-logs:
	@docker-compose logs -f postgres

redis-logs:
	@docker-compose logs -f redis

# Database commands
db-shell:
	@docker-compose exec postgres psql -U codeexp -d codeexp

db-reset:
	@echo "⚠️  Resetting database..."
	@docker-compose down
	@docker volume rm codexp_postgres_data
	@docker-compose up -d postgres
	@sleep 5

# Development helpers
install:
	@echo "📦 Installing dependencies..."
	@pnpm install

lint:
	@echo "🔍 Running linters..."
	@pnpm lint

format:
	@echo "✨ Formatting code..."
	@pnpm format
