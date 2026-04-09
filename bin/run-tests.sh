#!/usr/bin/env bash
# Script: Run All Tests and Generate Reports
# Usage: ./bin/run-tests.sh
# Reports are written to: test-reports/

set -euo pipefail

# ============================================================
# RESOLVE PATHS
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd -P)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
REPORT_DIR="$PROJECT_ROOT/test-reports"

echo "============================================"
echo " Team Management & Achievement Analytics"
echo " Test Suite Runner"
echo "============================================"
echo ""

# ============================================================
# CREATE REPORT OUTPUT DIRECTORIES
# ============================================================
mkdir -p "$REPORT_DIR/backend"
mkdir -p "$REPORT_DIR/frontend"
echo "  Reports will be written to: test-reports/"
echo ""

# Track overall result
OVERALL_EXIT=0

# ============================================================
# CHECK PREREQUISITES
# ============================================================
echo "[0/6] Checking prerequisites..."

command -v python3 >/dev/null 2>&1 || {
    echo "  ERROR: python3 is not installed or not in PATH."
    exit 1
}
command -v npm >/dev/null 2>&1 || {
    echo "  ERROR: npm is not installed or not in PATH."
    exit 1
}
echo "  OK   python3 and npm found."
echo ""

# ============================================================
# BACKEND TESTS
# ============================================================
BACKEND_SERVICES=(
    "auth-service"
    "achievement-service"
    "validation-service"
    "employee-service"
)

SVC_NUM=0
for SVC in "${BACKEND_SERVICES[@]}"; do
    SVC_NUM=$((SVC_NUM + 1))
    SVC_DIR="$BACKEND_DIR/$SVC"
    SVC_REPORT="$REPORT_DIR/backend/${SVC}-report.xml"
    SVC_OUTPUT="$REPORT_DIR/backend/${SVC}-output.txt"

    echo "[$SVC_NUM/6] Running backend tests: $SVC..."

    if [ ! -d "$SVC_DIR/tests" ]; then
        echo "  SKIP $SVC (no tests/ folder found)"
        echo ""
        continue
    fi

    # Install service deps + shared test deps quietly
    python3 -m pip install -q \
        -r "$SVC_DIR/requirements.txt" \
        -r "$BACKEND_DIR/requirements-test.txt" 2>/dev/null || \
        echo "  WARN Could not install all deps for $SVC — tests may fail."

    set +e
    python3 -m pytest "$SVC_DIR/tests" \
        --tb=short \
        --junitxml="$SVC_REPORT" \
        -v 2>&1 | tee "$SVC_OUTPUT"
    SVC_EXIT=${PIPESTATUS[0]}
    set -e

    if [ "$SVC_EXIT" -ne 0 ]; then
        echo "  FAIL $SVC tests failed. See test-reports/backend/${SVC}-output.txt"
        OVERALL_EXIT=1
    else
        echo "  PASS $SVC"
    fi
    echo ""
done

# ============================================================
# FRONTEND TESTS
# ============================================================
echo "[6/6] Running frontend tests (Vitest)..."

# Install npm deps if node_modules is missing
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo "  Installing npm dependencies..."
    npm --prefix "$FRONTEND_DIR" install --silent
fi

FRONTEND_OUTPUT="$REPORT_DIR/frontend/vitest-output.txt"
FRONTEND_JUNIT="$REPORT_DIR/frontend/vitest-report.xml"

set +e
npm --prefix "$FRONTEND_DIR" run test:coverage -- \
    --reporter=verbose \
    --reporter=junit \
    --outputFile.junit="$FRONTEND_JUNIT" 2>&1 | tee "$FRONTEND_OUTPUT"
FRONTEND_EXIT=${PIPESTATUS[0]}
set -e

if [ "$FRONTEND_EXIT" -ne 0 ]; then
    echo "  FAIL Frontend tests failed. See test-reports/frontend/vitest-output.txt"
    OVERALL_EXIT=1
else
    echo "  PASS Frontend tests"
fi
echo ""

# ============================================================
# SUMMARY
# ============================================================
echo "============================================"
echo " Test Run Complete"
echo "============================================"
echo ""
echo " Reports:"
echo "   Backend JUnit XML : test-reports/backend/*-report.xml"
echo "   Backend stdout    : test-reports/backend/*-output.txt"
echo "   Frontend JUnit XML: test-reports/frontend/vitest-report.xml"
echo "   Frontend stdout   : test-reports/frontend/vitest-output.txt"
echo "   Coverage (HTML)   : frontend/coverage/index.html"
echo ""

if [ "$OVERALL_EXIT" -eq 0 ]; then
    echo " RESULT: ALL TESTS PASSED"
else
    echo " RESULT: SOME TESTS FAILED -- review the output files above"
fi
echo ""

exit "$OVERALL_EXIT"
