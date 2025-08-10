
# 🧠 Omni-SaaS FastAPI Backend Template

This FastAPI template is for boostrap your next FastAPI project faster with few clicks.

---

## 🛠️ Project Setup

Follow the steps below to set up the backend environment on your local machine.

### ✅ Prerequisites

- Python 3.10+
- Git
- [Git Bash](https://git-scm.com/) (Recommended on Windows)
- A code editor (e.g., VS Code)

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/NeoZyvren/FastAPI-BE-TEMP.git
cd RatCV-BE
```

### 2. Run the Setup Script

```bash
./run.sh
```

This script will:

- Create a virtual environment (`.venv`)
- Install all dependencies from `requirements.txt`
- Auto-create `.env` from `.env.example` if it doesn't exist
- Launch the backend server using Uvicorn

---

## 🌐 Running the Server Manually

If you prefer manual setup:

```bash
# Create virtual environment
python -m venv .venv

# Activate venv (Windows)
source .venv/Scripts/activate

# Activate venv (Linux/macOS)
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy .env file if needed
cp .env.example .env

# Run FastAPI server
uvicorn app.main:app --reload
```

---

## 📁 Project Structure

```
Backend/
│
├── app/
│   ├── api/                  # All route controllers
│   │   ├── v1/
│   │   │   ├── endpoints/
│   │   │   │   ├── auth.py           # (optional auth)
│   │   │   │   └── payment.py        # Stripe webhooks
│   │   │   └── __init__.py
│   │   └── __init__.py
│   │
│   ├── core/                # Config & startup logic
│   │   ├── config.py
│   │   ├── security.py
│   │   └── prompt.py        # AI prompt templates
│   │
│   ├── services/            # Business logic
│   │   ├── gpt_client.py
│   │   ├── stripe_service.py
│   │   └── __init__.py
│   │
│   ├── models/              # Pydantic models
│   │   ├── user.py
│   │   └── __init__.py
│   │
│   ├── db/                  # Optional: DB connection logic
│   │   └── database.py
│   │
│   └── main.py              # FastAPI app entry point
│
├── tests/                   # Unit & integration tests
│   └── test_user.py
│
├── .env                     # Environment secrets (never commit)
├── .env.example             # Sample env for local dev
├── requirements.txt         # Pip dependencies
├── README.md
└── run.sh                   # Script to start dev server
```

---

## ⚙️ Environment Variables

Add your credentials and environment settings to the `.env` file. If not present, `.env` will be created from `.env.example`.

Make sure to update fields like:
```
OPENAI_API_KEY=your-openai-key
STRIPE_SECRET_KEY=your-stripe-key
DEBUG=True
```

---

## 📦 Dependencies

Core libraries used:

- [FastAPI](https://fastapi.tiangolo.com/)
- [Uvicorn](https://www.uvicorn.org/)
- [Pydantic](https://docs.pydantic.dev/)
- [HTTPX](https://www.python-httpx.org/)
- [Stripe](https://stripe.com/docs/api)
- [OpenAI](https://platform.openai.com/docs)

---

## 🧪 Testing

Basic testing can be done with FastAPI's built-in support for `pytest`. (Add `pytest` to `requirements.txt` if needed.)

```bash
pytest
```

---

## 👨‍💻 Maintainers

- **Neo Zyvren** (Nethmina Sandaruwan) – [neozyvren@gmail.com](mailto:neozyvren@gmail.com)
- **MP** (Menuka Prasad) – [menukaprasad0311@gmail.com](mailto:menukaprasad0311@gmail.com)

---

## 🛡 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

## 🧠 Tip

> For better results with `.env`-based secrets, consider using [python-dotenv](https://github.com/theskumar/python-dotenv) and secure vaults in production.

---
