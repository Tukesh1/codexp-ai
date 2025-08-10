# Omni-SaaS — AI SaaS Starter Monorepo ⚡

**Omni-SaaS** is a scalable and MVP-friendly AI SaaS starter template built with a modern full-stack tech stack. It’s designed for rapid development, structured growth, and easy deployment.

---

## 🔧 Tech Stack

**Frontend**
- [Next.js 14+ (App Router)](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vercel Hosting](https://vercel.com/)

**Backend**
- [FastAPI](https://fastapi.tiangolo.com/)
- [Supabase Auth](https://supabase.com/)
- [Stripe](https://stripe.com/) for billing
- [Hugging Face](https://huggingface.co/) or OpenAI API for AI services
- [Railway](https://railway.app/) or Fly.io for backend hosting

**Tooling**
- [PNPM Workspaces](https://pnpm.io/)
- [Turborepo](https://turbo.build/repo)
- [Docker Compose](https://docs.docker.com/compose/)

---

## 📁 Project Structure

```

Omni-SaaS/
├── apps/
│   ├── web/        # Main user dashboard (Next.js)
│   ├── admin/      # Admin interface
│   ├── landing/    # Marketing website
│   └── mobile/     # (Optional) Mobile app (Expo)
│
│   backend/
│   │
│   ├── app/
│   │   ├── api/                  # All route controllers
│   │   │   ├── v1/
│   │   │   │   ├── endpoints/
│   │   │   │   │   ├── auth.py           # (optional auth)
│   │   │   │   │   └── payment.py        # Stripe webhooks
│   │   │   │   └── __init__.py
│   │   │   └── __init__.py
│   │   │
│   │   ├── core/                # Config & startup logic
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   └── prompt.py        # AI prompt templates
│   │   │
│   │   ├── services/            # Business logic
│   │   │   ├── gpt_client.py
│   │   │   ├── stripe_service.py
│   │   │   └── __init__.py
│   │   │
│   │   ├── models/              # Pydantic models
│   │   │   ├── user.py
│   │   │   └── __init__.py
│   │   │
│   │   ├── db/                  # Optional: DB connection logic
│   │   │   └── database.py
│   │   │
│   │   └── main.py              # FastAPI app entry point
│   │
│   ├── tests/                   # Unit & integration tests
│   │   └── test_user.py
│   │
│   ├── .env                     # Environment secrets (never commit)
│   ├── .env.example             # Sample env for local dev
│   ├── requirements.txt         # Pip dependencies
│   ├── README.md
│   └── run.sh                   # Script to start dev server
│
├── packages/
│   ├── ui/         # Shared UI components (used across apps)
│   ├── utils/      # Shared utility functions
│   └── types/      # Shared TS types
│
├── docker-compose.yml
├── pnpm-workspace.yaml
├── .env
└── README.md

````

---

## 🚀 Getting Started (Development)

### 1. Clone the Repo

```bash
git clone https://github.com/YOUR_USERNAME/omnisaas.git
cd omnisaas
````

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Start All Apps with Docker (Local Dev)

```bash
docker-compose up --build
```

Or, run manually:

```bash
# Frontend
pnpm --filter web dev

# Backend
cd services/api
uvicorn app.main:app --reload
```

---

## 🔐 Environment Variables

You’ll need these `.env` files:

* `/services/api/.env`
* `/apps/web/.env.local`
* `/apps/admin/.env.local`
* `/apps/landing/.env.local`

Basic example:

```env
# Shared
NEXT_PUBLIC_API_URL=http://localhost:8000

# Backend only
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key
STRIPE_SECRET_KEY=sk_test_****
```

---

## 🧱 Commands

| Script              | Description                     |
| ------------------- | ------------------------------- |
| `pnpm dev`          | Run all dev servers with Turbo  |
| `pnpm build`        | Build all packages & apps       |
| `pnpm lint`         | Lint all code                   |
| `docker-compose up` | Local fullstack dev with Docker |

---

## 📦 Deployment Plan (MVP Friendly)

| Target         | Tool    | Notes                         |
| -------------- | ------- | ----------------------------- |
| `apps/web`     | Vercel  | Free tier is enough initially |
| `apps/admin`   | Vercel  | Internal admin dashboard      |
| `services/api` | Railway | FastAPI backend hosting       |

> You can scale later by splitting services into `ai`, `billing`, etc.

---

## 👥 Contributing

Want to contribute to OmniSaaS? Feel free to fork, improve, and suggest features. PRs are welcome.

---

## 📄 License

MIT © [Nethmina Sandaruwan](https://github.com/ByteBigBoss)
