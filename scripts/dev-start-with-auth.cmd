@echo off
echo.
echo ========================================
echo   REALM RIVALRY DEVELOPMENT STARTUP
echo   WITH PERSISTENT AUTHENTICATION
echo ========================================
echo.

REM Check if service account key exists
if exist "%GOOGLE_APPLICATION_CREDENTIALS%" (
    echo ✅ Using service account authentication
    echo    Key: %GOOGLE_APPLICATION_CREDENTIALS%
    echo.
) else (
    echo ⚠️ Service account key not found, falling back to user auth
    echo    Expected: %GOOGLE_APPLICATION_CREDENTIALS%
    echo    Running: gcloud auth application-default login
    echo.
    gcloud auth application-default login
    if errorlevel 1 (
        echo ❌ Authentication failed
        pause
        exit /b 1
    )
    echo ✅ User authentication successful
    echo.
)

echo 🚀 Starting development environment...
echo.

REM Start Cloud SQL Proxy in background
echo 🔗 Starting Cloud SQL Proxy...
start /B cmd /c "cloud-sql-proxy direct-glider-465821-p7:us-central1:realm-rivalry-dev --port=5432 > nul 2>&1"

REM Wait a moment for proxy to start
timeout /t 3 > nul

REM Start development server
echo 🖥️ Starting development server...
npm run dev

pause