# CodeExp AI

> Automated codebase analysis and documentation platform powered by AI

CodeExp AI is a comprehensive platform that automatically analyzes codebases, generates documentation, creates dependency diagrams, and provides intelligent Q&A capabilities for software repositories.

## 🚀 Features

- **Automatic Code Analysis**: Parse and understand codebases using tree-sitter
- **AI-Powered Summaries**: Generate function/class summaries and documentation
- **Intelligent Q&A**: Ask questions about your codebase and get grounded answers
- **Visual Diagrams**: Create dependency graphs and call diagrams
- **Multi-Language Support**: Python, JavaScript/TypeScript, Go, C++, and more
- **Real-time Processing**: Track analysis progress with live updates
- **Export Capabilities**: Generate documentation in multiple formats

## 🏗️ Architecture

### Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend API**: Go (Gin framework) with JWT authentication
- **AI Service**: Python (FastAPI) + Hugging Face Transformers
- **Database**: PostgreSQL with pgvector extension
- **Cache & Jobs**: Redis for job queues and caching
- **Infrastructure**: Docker + Docker Compose

### Services

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │───▶│   Go API    │───▶│ Python AI   │
│   (React)   │    │ (Gateway)   │    │ (Analysis)  │
└─────────────┘    └─────────────┘    └─────────────┘
                          │                    │
                          ▼                    ▼
                   ┌─────────────┐    ┌─────────────┐
                   │ PostgreSQL  │    │    Redis    │
                   │ + pgvector  │    │ (Jobs/Cache)│
                   └─────────────┘    └─────────────┘
```

## 🛠️ Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ with pnpm
- Git

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Tukesh1/codexp-ai.git
   cd codexp-ai
   ```

2. **Run setup script**
   ```bash
   make setup
   ```

3. **Start development environment**
   ```bash
   make dev
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - API: http://localhost:8080
   - AI Service: http://localhost:8000

### Manual Setup

If you prefer manual setup:

```bash
# Install dependencies
pnpm install

# Create environment file
cp .env.example .env

# Start services
docker-compose up -d
```

## 📖 Development

### Project Structure

```
codexp-ai/
├── apps/                    # Frontend applications
│   ├── web/                # Main web application
│   ├── admin/              # Admin dashboard
│   ├── landing/            # Landing page
│   └── mobile/             # Mobile app (React Native)
├── backend/                # Backend services
│   ├── api/                # Go API service
│   └── ai-service/         # Python AI service
├── packages/               # Shared packages
│   ├── ui/                 # UI component library
│   ├── typescript-config/  # TypeScript configurations
│   └── eslint-config/      # ESLint configurations
└── docker-compose.yml      # Development environment
```

### Available Commands

```bash
# Development
make dev          # Start development environment
make logs         # View all service logs
make ps           # Check service status

# Building
make build        # Build all Docker images
make clean        # Clean up containers and volumes

# Testing
make test         # Run all tests
make lint         # Run linters

# Database
make db-shell     # Connect to PostgreSQL
make db-reset     # Reset database
```

### Development Workflow

1. **Phase 1 (Week 1-2)**: Core infrastructure and repository parsing
2. **Phase 2 (Week 3-4)**: AI-powered analysis and frontend
3. **Phase 3 (Week 5-6)**: Advanced features and monetization
4. **Phase 4 (Week 7-8)**: Production readiness and launch

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Database
DATABASE_URL=postgresql://codeexp:secure_password@localhost:5432/codeexp

# Authentication (Clerk)
CLERK_SECRET_KEY=your_clerk_secret
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

# GitHub Integration
GITHUB_APP_ID=your_app_id
GITHUB_APP_PRIVATE_KEY=your_private_key

# AI Service
HUGGINGFACE_API_KEY=your_hf_token

# Payments (Stripe)
STRIPE_SECRET_KEY=your_stripe_secret
```

### Docker Services

- **postgres**: PostgreSQL 16 with pgvector extension
- **redis**: Redis 7 for job queues and caching
- **api**: Go API service (port 8080)
- **ai-service**: Python AI service (port 8000)
- **frontend**: React application (port 3000)

## 📊 API Endpoints

### Authentication
- `POST /auth/webhook` - Clerk webhook handler
- `GET /auth/me` - Get current user

### Projects
- `GET /projects` - List user projects
- `POST /projects` - Create new project
- `GET /projects/{id}` - Get project details
- `DELETE /projects/{id}` - Delete project

### Analysis
- `POST /projects/{id}/analyze` - Start repository analysis
- `GET /projects/{id}/status` - Get analysis status
- `GET /projects/{id}/summary` - Get project summary
- `POST /projects/{id}/ask` - Ask questions about code

### Export
- `GET /projects/{id}/diagram` - Get dependency diagram
- `GET /projects/{id}/docs` - Get generated documentation

## 🧪 Testing

```bash
# Run all tests
make test

# Run specific service tests
docker-compose exec api go test ./...
docker-compose exec ai-service python -m pytest

# Run frontend tests
cd apps/web && npm test
```

## 🚀 Deployment

### Production Build

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Setup

1. **Database**: PostgreSQL with pgvector on Railway/Supabase
2. **Cache**: Redis Cloud/Upstash
3. **API**: Deploy Go service to Fly.io/Render
4. **AI Service**: Deploy Python service to Render/Railway
5. **Frontend**: Deploy to Vercel
6. **Storage**: S3/Cloudflare R2 for artifacts

## 📈 Monitoring

- **Health Checks**: `/health` endpoints on all services
- **Logging**: Structured JSON logs
- **Metrics**: Application performance monitoring
- **Alerts**: Error tracking with Sentry

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## 🔗 Links

- [Documentation](./docs/)
- [API Reference](./docs/api.md)
- [Development Guide](./docs/development.md)
- [Deployment Guide](./docs/deployment.md)