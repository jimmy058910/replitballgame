@echo off
REM Deploy to GCP using Cloud Build (Windows version)

echo Starting GCP Cloud Build deployment...
echo ========================================

REM Check if gcloud is installed
where gcloud >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: gcloud CLI not found. Please install Google Cloud SDK.
    echo Visit: https://cloud.google.com/sdk/docs/install-sdk#windows
    exit /b 1
)

REM Set project ID
set PROJECT_ID=direct-glider-465821-p7
echo Project ID: %PROJECT_ID%

REM Set the project
gcloud config set project %PROJECT_ID%

REM Get current git commit SHA
for /f "tokens=*" %%a in ('git rev-parse --short HEAD 2^>nul') do set SHORT_SHA=%%a
if "%SHORT_SHA%"=="" set SHORT_SHA=latest
echo Git commit: %SHORT_SHA%

REM Trigger the Cloud Build
echo Triggering Cloud Build...
gcloud builds submit ^
  --config=cloudbuild-deployment.yaml ^
  --substitutions=SHORT_SHA=%SHORT_SHA% ^
  --project=%PROJECT_ID%

if %errorlevel% equ 0 (
    echo.
    echo Cloud Build triggered successfully!
    echo View build progress at:
    echo https://console.cloud.google.com/cloud-build/builds?project=%PROJECT_ID%
) else (
    echo.
    echo ERROR: Cloud Build failed to trigger
    echo Please check your GCP permissions and configuration
    exit /b 1
)