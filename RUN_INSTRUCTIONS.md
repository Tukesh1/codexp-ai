# 🚀 Running the Monorepo Locally

This monorepo contains:

✅ **Next.js apps** (`apps/web`, `apps/admin`, `apps/landing`)
✅ **Expo mobile app** (`apps/mobile`)
✅ **FastAPI backend** (`backend/`)

You can run services either using convenience scripts or manually.

---

## ✅ 1. Prerequisites

Before running, ensure you have installed:

* **Node.js ≥ 20**
* **pnpm ≥ 8**

  ```bash
  npm install -g pnpm
  ```
* **Python ≥ 3.11**
* **Docker (optional)** if you want to use containers
* **Git Bash / WSL (Windows users)** for `.sh` scripts

---

## ✅ 2. Running Services (Script Method - Recommended)

You need **3 terminal tabs** (or windows) for full development.

### 🛠 Make Run Scripts Executable (First Time Only)
```bash
chmod +x run-apps.sh run-mobile.sh && cd backend && chmod +x run-backend.sh && cd ..
```

> ✅ If you cloned after the scripts were committed with `+x`, you can skip this.

---

### 🖥 Run Next.js Apps (Web/Admin/Landing)
```bash
./run-apps.sh
```
**What it does:**
1. Runs `pnpm install` (workspace-aware)
2. Starts all Next.js apps using Turbopack

**Access at:**
- **Web** → [http://localhost:3000](http://localhost:3000)
- **Admin** → [http://localhost:3001](http://localhost:3001)
- **Landing** → [http://localhost:3002](http://localhost:3002)

### 📱 Run Expo Mobile App
```bash
./run-mobile.sh
```
**Access at:**
- **Expo DevTools** → [http://localhost:19002](http://localhost:19002)

### 🔧 Run Backend (FastAPI)
```bash
cd backend && ./run-backend.sh
```
**Access at:**
- **FastAPI** → [http://localhost:8000](http://localhost:8000)

---

## ✅ 3. Running Services (Manual Method)

### 🖥 Manual Next.js Setup
```bash
pnpm install
cd apps/web && pnpm dev & 
cd apps/admin && pnpm dev & 
cd apps/landing && pnpm dev
```

### 📱 Manual Expo Setup
```bash
cd apps/mobile
pnpm install
pnpm start
```

### 🔧 Manual Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# OR venv\Scripts\activate (Windows)
pip install -r requirements.txt
uvicorn main:app --reload
```

---

## ✅ 4. Docker Alternative

Run all services in containers:
```bash
docker-compose up --build
```

---

## ✅ 5. Common Issues

* **Windows script issues?**
  - Use Git Bash/WSL or run commands manually
* **Lockfile problems?**
  ```bash
  rm -rf node_modules .pnpm-store
  pnpm install
  ```
* **Expo project not found?**
  - Verify `apps/mobile/package.json` exists

---

## ✅ 6. Recommended Workflow

1️⃣ Terminal 1: `./run-apps.sh` (or manual Next.js)  
2️⃣ Terminal 2: `./run-mobile.sh` (or manual Expo)  
3️⃣ Terminal 3: `cd backend && ./run-backend.sh` (or manual FastAPI)  

Now you have **All Next.js apps + Expo Mobile App + FastAPI Backend running locally**. 🎉
