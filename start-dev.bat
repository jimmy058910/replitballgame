@echo off
echo 🎮 Realm Rivalry - Starting Local Development
echo ==========================================

REM Check if gcloud is installed
where gcloud >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Google Cloud SDK not found!
    echo 💡 Please install Google Cloud SDK first:
    echo    https://cloud.google.com/sdk/docs/install
    echo.
    echo 🚀 Alternative: Follow SETUP_DATABASE.md for detailed instructions
    pause
    exit /b 1
)

echo ✅ Google Cloud SDK found

REM Start Cloud SQL Auth Proxy in background
echo 🔗 Starting Cloud SQL Auth Proxy...
start "Cloud SQL Proxy" /MIN cloud-sql-proxy direct-glider-465821-p7:us-central1:realm-rivalry-dev --port=5432

REM Wait a moment for proxy to start
timeout /t 3 /nobreak > nul

REM Start the development environment
echo 🚀 Starting development environment...
npm run dev:local

pause