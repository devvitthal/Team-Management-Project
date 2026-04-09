#!/usr/bin/env bash
# Script: Local Development Environment Startup
# Purpose: Start both backend microservices and frontend dev server simultaneously
# Usage: ./start-dev.sh

set -e

# Usage helper
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    echo "Usage: $0"
    echo "Start all backend microservices and the frontend dev server in parallel."
    echo ""
    echo "Services started:"
    echo "  Auth Service         : http://localhost:8001"
    echo "  Employee Service     : http://localhost:8002"
    echo "  Organization Service : http://localhost:8003"
    echo "  Achievement Service  : http://localhost:8004"
    echo "  Validation Service   : http://localhost:8005"
    echo "  Frontend Dev Server  : http://localhost:3000"
    echo ""
    echo "Options:"
    echo "  -h, --help      Show this help message"
    echo ""
    echo "Requirements:"
    echo "  - Python 3.11+ with pip and uvicorn"
    echo "  - Node.js with npm"
    echo "  - PostgreSQL running on localhost:5432"
    exit 0
fi

echo "============================================"
echo "Team Management & Achievement Analytics"
echo "Local Development Environment Startup"
echo "============================================"
echo ""

# Resolve script directory and project root
SCRIPT_DIR="$(cd "$(dirname "$0")" > /dev/null 2>&1 || exit 1; pwd -P)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." > /dev/null 2>&1 || exit 1; pwd -P)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# Track all background PIDs for cleanup
PIDS=()

# Trap Ctrl+C and EXIT â€” kill all background processes
cleanup() {
    echo ""
    echo "Shutting down all services..."
    for pid in "${PIDS[@]}"; do
        kill "$pid" 2>/dev/null || true
    done
    # Kill any lingering uvicorn processes started by this shell
    pkill -P $$ 2>/dev/null || true
    echo "All services stopped."
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# ============================================================
# CHECK PREREQUISITES
# ============================================================
echo "[1/3] Checking prerequisites..."

# Python / pip
if ! command -v python3 &>/dev/null && ! command -v python &>/dev/null; then
    echo "  ERROR: Python 3 is not installed."
    exit 1
fi
PYTHON_CMD=$(command -v python3 || command -v python)

if ! command -v pip3 &>/dev/null && ! command -v pip &>/dev/null; then
    echo "  ERROR: pip is not installed."
    exit 1
fi
PIP_CMD=$(command -v pip3 || command -v pip)

# Node / npm
if ! command -v npm &>/dev/null; then
    echo "  ERROR: npm is not installed."
    exit 1
fi
echo "  OK  Python : $($PYTHON_CMD --version)"
echo "  OK  Node   : $(node --version)"
echo "  OK  npm    : $(npm --version)"

# PostgreSQL (warn only â€” services will fail gracefully if unavailable)
if pg_isready -q 2>/dev/null; then
    echo "  OK  PostgreSQL is ready"
else
    echo "  WARN: PostgreSQL does not appear to be running on localhost:5432."
    echo "        Backend services may fail to connect."
fi

echo ""

# ============================================================
# SET SHARED ENVIRONMENT VARIABLES
# ============================================================
export POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
export POSTGRES_PORT="${POSTGRES_PORT:-5432}"
export POSTGRES_USER="${POSTGRES_USER:-postgres}"
export POSTGRES_PASS="${POSTGRES_PASS:-PgMarvel@241}"
export POSTGRES_NAME="${POSTGRES_NAME:-workshop_db}"
export JWT_SECRET_KEY="${JWT_SECRET_KEY:-dev-secret-key-change-in-production}"
export IS_LOCAL="true"

# ============================================================
# START BACKEND SERVICES (parallel)
# ============================================================
echo "[2/3] Starting backend microservices..."
echo ""

LOG_DIR="/tmp/tms-dev-logs"
mkdir -p "$LOG_DIR"

start_service() {
    local name="$1"
    local port="$2"
    local dir="$BACKEND_DIR/$name"

    if [ ! -d "$dir" ]; then
        echo "  SKIP $name â€” directory not found: $dir"
        return
    fi

    echo "  ...  Installing dependencies for $name"
    cd "$dir"
    $PIP_CMD install -q -r requirements.txt

    echo "  OK   Starting $name on port $port"
    uvicorn function:app \
        --host 0.0.0.0 \
        --port "$port" \
        --reload \
        --log-level warning \
        > "$LOG_DIR/$name.log" 2>&1 &
    PIDS+=($!)
    cd "$PROJECT_ROOT"
}

start_service "auth-service"         8001
start_service "employee-service"     8002
start_service "organization-service" 8003
start_service "achievement-service"  8004
start_service "validation-service"   8005

# ============================================================
# WRITE FRONTEND .env.local (direct service URLs)
# ============================================================
ENV_FILE="$FRONTEND_DIR/.env.local"
cat > "$ENV_FILE" <<EOF
VITE_AUTH_SERVICE_URL=http://localhost:8001
VITE_EMPLOYEE_SERVICE_URL=http://localhost:8002
VITE_ORGANIZATION_SERVICE_URL=http://localhost:8003
VITE_ACHIEVEMENT_SERVICE_URL=http://localhost:8004
VITE_VALIDATION_SERVICE_URL=http://localhost:8005
EOF
echo ""
echo "  OK   Written $ENV_FILE"

# ============================================================
# START FRONTEND (in background so both stream together)
# ============================================================
echo ""
echo "[3/3] Starting frontend dev server..."
echo ""

cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
    echo "  ...  Installing frontend dependencies (first run)..."
    npm install --silent
fi

npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
PIDS+=($FRONTEND_PID)

# Give everything a moment to start
sleep 2

# ============================================================
# SUMMARY
# ============================================================
echo "============================================"
echo "  All services are starting up!"
echo "============================================"
echo ""
echo "  Auth Service         :  http://localhost:8001/docs"
echo "  Employee Service     :  http://localhost:8002/docs"
echo "  Organization Service :  http://localhost:8003/docs"
echo "  Achievement Service  :  http://localhost:8004/docs"
echo "  Validation Service   :  http://localhost:8005/docs"
echo "  Frontend             :  http://localhost:3000"
echo ""
echo "  Logs in: $LOG_DIR/"
echo ""
echo "  Press Ctrl+C to stop all services."
echo ""

# Wait for all background jobs; exit when any of them exit
wait
