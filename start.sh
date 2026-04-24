#!/bin/bash

# ============================================
# AI Airport & Air Traffic Operations
# Startup Script
# ============================================

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║     ✈️  AI Airport & Air Traffic Operations      ║"
echo "  ║         Ground & Air Operations Center           ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo -e "${NC}"

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
  echo -e "${GREEN}✓ Environment variables loaded${NC}"
else
  echo -e "${RED}✗ .env file not found!${NC}"
  exit 1
fi

BACKEND_PORT=${BACKEND_PORT:-4000}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

# ============================================
# Clean up used ports
# ============================================
echo -e "\n${YELLOW}→ Cleaning up ports...${NC}"

cleanup_port() {
  local port=$1
  local pids=$(lsof -ti :$port 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo -e "  Killing processes on port $port: $pids"
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
}

cleanup_port $BACKEND_PORT
cleanup_port $FRONTEND_PORT
echo -e "${GREEN}✓ Ports $BACKEND_PORT and $FRONTEND_PORT are free${NC}"

# ============================================
# Check PostgreSQL
# ============================================
echo -e "\n${YELLOW}→ Checking PostgreSQL...${NC}"
if command -v pg_isready &> /dev/null; then
  if pg_isready -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} &> /dev/null; then
    echo -e "${GREEN}✓ PostgreSQL is running${NC}"
  else
    echo -e "${RED}✗ PostgreSQL is not running. Please start it first.${NC}"
    echo -e "  brew services start postgresql@14"
    exit 1
  fi
else
  echo -e "${YELLOW}⚠ pg_isready not found, assuming PostgreSQL is running${NC}"
fi

# ============================================
# Create database if not exists
# ============================================
echo -e "\n${YELLOW}→ Setting up database...${NC}"
DB_NAME=${DB_NAME:-airport_ops}
DB_USER=${DB_USER:-postgres}

if psql -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} -U $DB_USER -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw $DB_NAME; then
  echo -e "${GREEN}✓ Database '$DB_NAME' exists${NC}"
else
  echo -e "  Creating database '$DB_NAME'..."
  createdb -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} -U $DB_USER $DB_NAME 2>/dev/null || true
  echo -e "${GREEN}✓ Database '$DB_NAME' created${NC}"
fi

# ============================================
# Install dependencies
# ============================================
echo -e "\n${YELLOW}→ Installing backend dependencies...${NC}"
cd "$PROJECT_DIR/backend"
npm install --silent 2>&1 | tail -1
echo -e "${GREEN}✓ Backend dependencies installed${NC}"

echo -e "\n${YELLOW}→ Installing frontend dependencies...${NC}"
cd "$PROJECT_DIR/frontend"
npm install --silent 2>&1 | tail -1
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

# ============================================
# Seed database
# ============================================
echo -e "\n${YELLOW}→ Seeding database with sample data...${NC}"
cd "$PROJECT_DIR/backend"
node src/seeds/seed.js
echo -e "${GREEN}✓ Database seeded (15 items per feature)${NC}"

# ============================================
# Start backend with auto-reload (nodemon)
# ============================================
echo -e "\n${YELLOW}→ Starting backend on port $BACKEND_PORT...${NC}"
cd "$PROJECT_DIR/backend"
npx nodemon src/server.js &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID) with auto-reload${NC}"

# Wait for backend
sleep 2

# ============================================
# Start frontend with hot-reload
# ============================================
echo -e "\n${YELLOW}→ Starting frontend on port $FRONTEND_PORT...${NC}"
cd "$PROJECT_DIR/frontend"
BROWSER=none PORT=$FRONTEND_PORT REACT_APP_API_URL=http://localhost:$BACKEND_PORT npm start &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID) with hot-reload${NC}"

# ============================================
# Ready
# ============================================
echo -e "\n${CYAN}══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✈️  Application is running!${NC}"
echo -e ""
echo -e "  ${BLUE}Frontend:${NC}  http://localhost:$FRONTEND_PORT"
echo -e "  ${BLUE}Backend:${NC}   http://localhost:$BACKEND_PORT"
echo -e "  ${BLUE}API Docs:${NC}  http://localhost:$BACKEND_PORT/api/health"
echo -e ""
echo -e "  ${YELLOW}Login:${NC}     admin@airport.com / admin123"
echo -e ""
echo -e "  ${RED}Press Ctrl+C to stop all services${NC}"
echo -e "${CYAN}══════════════════════════════════════════════════${NC}"

# Cleanup on exit
cleanup() {
  echo -e "\n${YELLOW}→ Shutting down...${NC}"
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  cleanup_port $BACKEND_PORT
  cleanup_port $FRONTEND_PORT
  echo -e "${GREEN}✓ All services stopped${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

# Keep running
wait
