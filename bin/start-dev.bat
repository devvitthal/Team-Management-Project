@echo off
:: Script: Local Development Environment Startup (Windows)
:: Purpose: Start all backend microservices and frontend dev server
:: Usage: bin\start-dev.bat

title Team Management - Dev Environment

echo ============================================
echo  Team Management ^& Achievement Analytics
echo  Local Development Environment Startup
echo ============================================
echo.

:: Resolve project root (parent of the bin folder)
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."
set "BACKEND_DIR=%PROJECT_ROOT%\backend"
set "FRONTEND_DIR=%PROJECT_ROOT%\frontend"

:: ============================================================
:: SHARED ENVIRONMENT VARIABLES
:: ============================================================
set "POSTGRES_HOST=localhost"
set "POSTGRES_PORT=5432"
set "POSTGRES_USER=postgres"
set "POSTGRES_PASS=PgMarvel@241"
set "POSTGRES_NAME=workshop_db"
set "JWT_SECRET_KEY=dev-secret-key-change-in-production"
set "ACCESS_TOKEN_EXPIRE_MINUTES=480"
set "IS_LOCAL=true"

:: ============================================================
:: CHECK PREREQUISITES
:: ============================================================
echo [1/3] Checking prerequisites...

where python >nul 2>&1 || (
    echo   ERROR: Python is not installed or not in PATH.
    pause & exit /b 1
)
where npm >nul 2>&1 || (
    echo   ERROR: npm is not installed or not in PATH.
    pause & exit /b 1
)
where uvicorn >nul 2>&1 || (
    echo   WARN: uvicorn not found in PATH. Installing...
    pip install uvicorn
)

for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo   OK  %%v
for /f "tokens=*" %%v in ('node --version 2^>^&1')   do echo   OK  Node %%v
for /f "tokens=*" %%v in ('npm --version 2^>^&1')    do echo   OK  npm %%v
echo.

:: ============================================================
:: START BACKEND MICROSERVICES (each in its own window)
:: ============================================================
echo [2/3] Starting backend microservices...
echo.

call :start_service "auth-service"         8001
call :start_service "employee-service"     8002
call :start_service "organization-service" 8003
call :start_service "achievement-service"  8004
call :start_service "validation-service"   8005

:: ============================================================
:: WRITE FRONTEND .env.local
:: ============================================================
set "ENV_FILE=%FRONTEND_DIR%\.env.local"
(
    echo VITE_AUTH_SERVICE_URL=http://localhost:8001
    echo VITE_EMPLOYEE_SERVICE_URL=http://localhost:8002
    echo VITE_ORGANIZATION_SERVICE_URL=http://localhost:8003
    echo VITE_ACHIEVEMENT_SERVICE_URL=http://localhost:8004
    echo VITE_VALIDATION_SERVICE_URL=http://localhost:8005
) > "%ENV_FILE%"
echo   OK   Written %ENV_FILE%
echo.

:: ============================================================
:: START FRONTEND
:: ============================================================
echo [3/3] Starting frontend dev server...
echo.

if not exist "%FRONTEND_DIR%\node_modules" (
    echo   Installing frontend dependencies...
    pushd "%FRONTEND_DIR%"
    call npm install
    popd
)

start "Frontend - http://localhost:3000" cmd /k "cd /d %FRONTEND_DIR% && npm run dev"

:: Brief pause so services can start
timeout /t 3 /nobreak >nul

:: ============================================================
:: SUMMARY
:: ============================================================
echo.
echo ============================================
echo   All services are starting up!
echo ============================================
echo.
echo   Auth Service         :  http://localhost:8001/docs
echo   Employee Service     :  http://localhost:8002/docs
echo   Organization Service :  http://localhost:8003/docs
echo   Achievement Service  :  http://localhost:8004/docs
echo   Validation Service   :  http://localhost:8005/docs
echo   Frontend             :  http://localhost:3000
echo.
echo   Each service runs in its own window.
echo   Close those windows to stop individual services.
echo.
pause
exit /b 0

:: ============================================================
:: SUBROUTINE: start_service <name> <port>
:: ============================================================
:start_service
set "SVC_NAME=%~1"
set "SVC_PORT=%~2"
set "SVC_DIR=%BACKEND_DIR%\%SVC_NAME%"

if not exist "%SVC_DIR%" (
    echo   SKIP %SVC_NAME% -- directory not found
    exit /b 0
)

echo   OK   Starting %SVC_NAME% on port %SVC_PORT%
set "SVC_CMD=cd /d "%SVC_DIR%" && set POSTGRES_HOST=%POSTGRES_HOST%&& set POSTGRES_PORT=%POSTGRES_PORT%&& set POSTGRES_USER=%POSTGRES_USER%&& set POSTGRES_PASS=%POSTGRES_PASS%&& set POSTGRES_NAME=%POSTGRES_NAME%&& set JWT_SECRET_KEY=%JWT_SECRET_KEY%&& set IS_LOCAL=%IS_LOCAL%&& pip install -q -r requirements.txt && uvicorn function:app --host 0.0.0.0 --port %SVC_PORT% --reload"
start "%SVC_NAME% - http://localhost:%SVC_PORT%/docs" cmd /k "%SVC_CMD%"

exit /b 0
