@echo off
setlocal enabledelayedexpansion
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
:: LOAD ENVIRONMENT VARIABLES FROM backend\.env
:: ============================================================
set "BACKEND_ENV=%BACKEND_DIR%\.env"
if not exist "%BACKEND_ENV%" (
    echo   ERROR: backend\.env not found.
    echo   Copy backend\.env.sample to backend\.env and fill in values.
    pause ^& exit /b 1
)
for /f "usebackq tokens=1,* delims==" %%A in ("%BACKEND_ENV%") do (
    set "line=%%A"
    if not "!line:~0,1!"=="#" if not "%%A"=="" set "%%A=%%B"
)
echo   OK   Loaded environment from backend\.env
echo.

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

call :start_service "auth-service"         %AUTH_PORT%
call :start_service "employee-service"     %EMPLOYEE_PORT%
call :start_service "organization-service" %ORGANIZATION_PORT%
call :start_service "achievement-service"  %ACHIEVEMENT_PORT%
call :start_service "validation-service"   %VALIDATION_PORT%
call :start_service "api-gateway"          %API_GATEWAY_PORT%

:: ============================================================
:: WRITE FRONTEND .env.local
:: ============================================================
set "ENV_FILE=%FRONTEND_DIR%\.env.local"
(
    echo VITE_API_GATEWAY_URL=http://localhost:%API_GATEWAY_PORT%
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
echo   Auth Service         :  http://localhost:%AUTH_PORT%/docs
echo   Employee Service     :  http://localhost:%EMPLOYEE_PORT%/docs
echo   Organization Service :  http://localhost:%ORGANIZATION_PORT%/docs
echo   Achievement Service  :  http://localhost:%ACHIEVEMENT_PORT%/docs
echo   Validation Service   :  http://localhost:%VALIDATION_PORT%/docs
echo   API Gateway          :  http://localhost:%API_GATEWAY_PORT%/docs
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
:: api-gateway uses main:app; all other services use function:app
set "APP_MODULE=function:app"
if "%SVC_NAME%"=="api-gateway" set "APP_MODULE=main:app"
start "%SVC_NAME% - http://localhost:%SVC_PORT%/docs" cmd /k "cd /d "%SVC_DIR%" && pip install -q -r requirements.txt && uvicorn %APP_MODULE% --host 0.0.0.0 --port %SVC_PORT% --reload"

exit /b 0
