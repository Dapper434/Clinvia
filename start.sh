#!/usr/bin/env bash

# ==============================================================================
# TBTrack Full-Stack Launch Script
# ==============================================================================
# Starts both the Flask Backend (Flask-SQLAlchemy) and Vite React Frontend
# concurrently.
# ==============================================================================

# Determine root repository directory
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# Text styles & colors
BOLD='\033[1m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}${BOLD}"
echo "  _____ ____ _____             _    "
echo " |_   _| __ )_   _| __ __ _  ___| | __"
echo "   | | |  _ \ | || '__/ _\` |/ __| |/ /"
echo "   | | | |_) || || | | (_| | (__|   < "
echo "   |_| |____/ |_||_|  \__,_|\___|_|\_\\"
echo -e "${NC}"
echo -e "${BOLD}Tuberculosis Case Management & Adherence Platform${NC}"
echo "=================================================="

# 1. Check environment files
if [ ! -f "$ROOT_DIR/backend/.env" ]; then
    echo -e "${YELLOW}⚠️  backend/.env not found. Creating from backend/.env.example...${NC}"
    cp "$ROOT_DIR/backend/.env.example" "$ROOT_DIR/backend/.env"
    echo -e "${GREEN}✓ Created backend/.env${NC}"
fi

if [ ! -f "$ROOT_DIR/frontend/.env" ]; then
    echo -e "${YELLOW}⚠️  frontend/.env not found. Creating from frontend/.env.example...${NC}"
    cp "$ROOT_DIR/frontend/.env.example" "$ROOT_DIR/frontend/.env"
    echo -e "${GREEN}✓ Created frontend/.env${NC}"
fi

# 2. Check Python, Node.js and npm
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed. Please install Python 3.11+ to continue.${NC}"
    exit 1
fi

# node/npm are commonly installed via nvm, which only loads in interactive shell
# rc files (.zshrc/.bashrc). This script runs as a plain bash subprocess (e.g. from
# a task runner or a different shell), which never sources those — so load nvm
# directly here if node isn't already on PATH.
if ! command -v node &> /dev/null; then
    export NVM_DIR="$HOME/.nvm"
    if [ -s "$NVM_DIR/nvm.sh" ]; then
        \. "$NVM_DIR/nvm.sh"
    fi
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed (or not found on PATH — checked nvm too). Please install Node.js (v18+) to continue.${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed. Please install npm to continue.${NC}"
    exit 1
fi

# 3. Backend: create venv & install dependencies if needed
if [ ! -d "$ROOT_DIR/backend/venv" ]; then
    echo -e "${CYAN}🐍 Creating backend virtual environment...${NC}"
    python3 -m venv "$ROOT_DIR/backend/venv"
    echo -e "${CYAN}📦 Installing backend dependencies...${NC}"
    "$ROOT_DIR/backend/venv/bin/pip" install --upgrade pip -q
    "$ROOT_DIR/backend/venv/bin/pip" install -r "$ROOT_DIR/backend/requirements.txt" -q
fi

# 4. Frontend: install dependencies if needed
if [ ! -d "$ROOT_DIR/node_modules" ]; then
    echo -e "${CYAN}📦 Installing frontend dependencies...${NC}"
    npm install
fi

# 5. Cleanup background processes on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down TBTrack services...${NC}"
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
    wait 2>/dev/null || true
    echo -e "${GREEN}✓ All services stopped. Goodbye!${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# 6. Start Backend Service (Flask)
echo -e "${CYAN}🚀 Starting Backend API on http://localhost:5000...${NC}"
(
    cd "$ROOT_DIR/backend"
    source venv/bin/activate
    python wsgi.py
) &
BACKEND_PID=$!

# 7. Start Frontend Service
echo -e "${CYAN}🚀 Starting Frontend UI on http://localhost:5173...${NC}"
(
    cd "$ROOT_DIR/frontend"
    npm run dev
) &
FRONTEND_PID=$!

# Sleep briefly to allow startup messages
sleep 2

echo ""
echo "=================================================="
echo -e "${GREEN}${BOLD}✓ TBTrack is up and running!${NC}"
echo "=================================================="
echo -e "  💻 ${BOLD}Frontend App:${NC}   ${CYAN}http://localhost:5173${NC}"
echo -e "  🔌 ${BOLD}Backend API:${NC}    ${CYAN}http://localhost:5000${NC}"
echo -e "  🩺 ${BOLD}API Health:${NC}     ${CYAN}http://localhost:5000/health${NC}"
echo "=================================================="
echo -e "Press ${BOLD}Ctrl+C${NC} at any time to stop all services."
echo ""

# Wait for background jobs
wait
