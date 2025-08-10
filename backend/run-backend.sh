#!/bin/bash

# ---------------------------------------------
# 🧠 Backend Runner Script (Cross-Platform + Pydantic v2)
# Author: Nethmina Sandaruwan
# ---------------------------------------------

ENV_FILE=".env"
ENV_EXAMPLE_FILE=".env.example"
REQUIREMENTS="requirements.txt"
VENV_DIR=".venv"

# 🖥 Detect OS and Python command
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" || "$OSTYPE" == "cygwin" ]]; then
    PYTHON_CMD="python"
    PIP_CMD="pip"
    ACTIVATE_SCRIPT="$VENV_DIR/Scripts/activate"
else
    # Prefer python3.11 if available
    if command -v python3.11 &>/dev/null; then
        PYTHON_CMD="python3.11"
    else
        PYTHON_CMD="python3"
    fi
    PIP_CMD="pip3"
    ACTIVATE_SCRIPT="$VENV_DIR/bin/activate"
fi

# ✅ Ensure Python is installed
if ! command -v "$PYTHON_CMD" &>/dev/null; then
    echo "❌ ERROR: $PYTHON_CMD is not installed!"
    echo "➡ On macOS, run: brew install python@3.11"
    exit 1
fi

# ✅ Create virtual environment if missing
if [ ! -d "$VENV_DIR" ]; then
    echo "🔧 Creating virtual environment with $PYTHON_CMD..."
    $PYTHON_CMD -m venv "$VENV_DIR" || {
        echo "❌ Failed to create virtualenv!"
        exit 1
    }
fi

# ✅ Activate the virtual environment
if [ -f "$ACTIVATE_SCRIPT" ]; then
    echo "✅ Activating virtual environment..."
    source "$ACTIVATE_SCRIPT"
else
    echo "❌ Activation script not found! Removing venv and recreating..."
    rm -rf "$VENV_DIR"
    $PYTHON_CMD -m venv "$VENV_DIR"
    source "$ACTIVATE_SCRIPT"
fi

# ✅ Ensure pip is upgraded
$PIP_CMD install --upgrade pip

# ✅ Check & install missing deps
if [ ! -f "$VENV_DIR/requirements.installed" ] || [ "$REQUIREMENTS" -nt "$VENV_DIR/requirements.installed" ]; then
    echo "📦 Installing Python dependencies from $REQUIREMENTS..."
    $PIP_CMD install -r "$REQUIREMENTS"
    # Ensure pydantic-settings is installed
    $PIP_CMD install --upgrade pydantic-settings
    touch "$VENV_DIR/requirements.installed"
fi

# ✅ Ensure .env exists
if [ ! -f "$ENV_FILE" ]; then
    if [ -f "$ENV_EXAMPLE_FILE" ]; then
        echo "📄 .env not found. Creating from $ENV_EXAMPLE_FILE..."
        cp "$ENV_EXAMPLE_FILE" "$ENV_FILE"
        echo "✅ .env created. Please update it with actual values."
    else
        echo "⚠️  No .env or .env.example found! Please create $ENV_FILE manually."
        exit 1
    fi
fi

echo "🔐 Loading environment from $ENV_FILE"
export $(grep -v '^#' "$ENV_FILE" | xargs)

# ✅ Run FastAPI app
echo "🚀 Starting Backend at http://localhost:8000"
uvicorn app.main:app --reload
