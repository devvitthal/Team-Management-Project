@echo off
setlocal enabledelayedexpansion
:: Script: Run All Tests and Generate Reports (Windows)
:: Usage: bin\run-tests.bat
:: Reports are written to: test-reports\

title Team Management - Test Runner

echo ============================================
echo  Team Management ^& Achievement Analytics
echo  Test Suite Runner
echo ============================================
echo.

:: Resolve project root (parent of the bin folder)
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."
set "BACKEND_DIR=%PROJECT_ROOT%\backend"
set "FRONTEND_DIR=%PROJECT_ROOT%\frontend"
set "REPORT_DIR=%PROJECT_ROOT%\test-reports"

:: ============================================================
:: CREATE REPORT OUTPUT DIRECTORY
:: ============================================================
if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
if not exist "%REPORT_DIR%\backend" mkdir "%REPORT_DIR%\backend"
if not exist "%REPORT_DIR%\frontend" mkdir "%REPORT_DIR%\frontend"

echo   Reports will be written to: test-reports\
echo.

:: Track overall pass/fail
set OVERALL_EXIT=0

:: ============================================================
:: CHECK PREREQUISITES
:: ============================================================
echo [0/6] Checking prerequisites...

where python >nul 2>&1 || (
    echo   ERROR: Python is not installed or not in PATH.
    pause & exit /b 1
)
where npm >nul 2>&1 || (
    echo   ERROR: npm is not installed or not in PATH.
    pause & exit /b 1
)
echo   OK   Python and npm found.
echo.

:: ============================================================
:: BACKEND TESTS
:: ============================================================

set BACKEND_SERVICES=auth-service achievement-service validation-service employee-service

set SVCNUM=0
for %%S in (%BACKEND_SERVICES%) do (
    set /a SVCNUM+=1
    echo [!SVCNUM!/6] Running backend tests: %%S...

    set "SVC_DIR=%BACKEND_DIR%\%%S"
    set "SVC_REPORT=%REPORT_DIR%\backend\%%S-report.xml"
    set "SVC_HTML=%REPORT_DIR%\backend\%%S-report.html"

    if not exist "!SVC_DIR!\tests" (
        echo   SKIP %%S ^(no tests\ folder found^)
    ) else (
        :: Install service deps + test deps quietly
        python -m pip install -q -r "!SVC_DIR!\requirements.txt" -r "%BACKEND_DIR%\requirements-test.txt" >nul 2>&1
        if !errorlevel! neq 0 (
            echo   WARN Could not install dependencies for %%S, tests may fail.
        )

        python -m pytest "!SVC_DIR!\tests" ^
            --tb=short ^
            --junitxml="!SVC_REPORT!" ^
            -v 2>&1 | tee "%REPORT_DIR%\backend\%%S-output.txt"

        if !errorlevel! neq 0 (
            echo   FAIL %%S tests failed. See test-reports\backend\%%S-output.txt
            set OVERALL_EXIT=1
        ) else (
            echo   PASS %%S
        )
    )
    echo.
)

:: ============================================================
:: FRONTEND TESTS
:: ============================================================
echo [6/6] Running frontend tests ^(Vitest^)...

:: Install npm deps if node_modules is missing
if not exist "%FRONTEND_DIR%\node_modules" (
    echo   Installing npm dependencies...
    pushd "%FRONTEND_DIR%"
    npm install --silent
    popd
)

pushd "%FRONTEND_DIR%"
npm run test:coverage -- ^
    --reporter=verbose ^
    --reporter=junit ^
    --outputFile.junit="%REPORT_DIR%\frontend\vitest-report.xml" 2>&1 | tee "%REPORT_DIR%\frontend\vitest-output.txt"

if !errorlevel! neq 0 (
    echo   FAIL Frontend tests failed. See test-reports\frontend\vitest-output.txt
    set OVERALL_EXIT=1
) else (
    echo   PASS Frontend tests
)
popd
echo.

:: ============================================================
:: SUMMARY
:: ============================================================
echo ============================================
echo  Test Run Complete
echo ============================================
echo.
echo  Reports:
echo    Backend JUnit XML : test-reports\backend\*-report.xml
echo    Backend stdout    : test-reports\backend\*-output.txt
echo    Frontend JUnit XML: test-reports\frontend\vitest-report.xml
echo    Frontend stdout   : test-reports\frontend\vitest-output.txt
echo    Coverage (HTML)   : frontend\coverage\index.html
echo.

if %OVERALL_EXIT% equ 0 (
    echo  RESULT: ALL TESTS PASSED
) else (
    echo  RESULT: SOME TESTS FAILED -- review the output files above
)
echo.

endlocal
exit /b %OVERALL_EXIT%
