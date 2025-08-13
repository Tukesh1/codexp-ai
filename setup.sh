#!/bin/bash

# CodeExp AI Setup Script
# This script sets up the development environment for CodeExp AI

set -e

echo "🚀 Setting up CodeExp AI development environment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "⚠️  pnpm is not installed. Installing pnpm..."
    npm install -g pnpm
fi

# Create .env file from example if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update the .env file with your actual configuration values."
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
pnpm install

# Start Docker services
echo "🐳 Starting Docker services..."
docker-compose up -d postgres redis

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker-compose exec postgres pg_isready -U codeexp; do
    sleep 2
done

echo "⏳ Waiting for Redis to be ready..."
until docker-compose exec redis redis-cli ping; do
    sleep 2
done

# Build and start the API service
echo "🔧 Building Go API service..."
docker-compose build api

echo "🔧 Building Python AI service..."
docker-compose build ai-service

# Start all services
echo "🚀 Starting all services..."
docker-compose up -d

echo "✅ CodeExp AI development environment is ready!"
echo ""
echo "🌐 Services available at:"
echo "  - Frontend: http://localhost:3000"
echo "  - Go API: http://localhost:8080"
echo "  - Python AI Service: http://localhost:8000"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo ""
echo "📊 To check service status:"
echo "  docker-compose ps"
echo ""
echo "📋 To view logs:"
echo "  docker-compose logs -f [service-name]"
echo ""
echo "🛑 To stop all services:"
echo "  docker-compose down"
