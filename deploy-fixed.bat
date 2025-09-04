@echo off
REM Quick deployment script with fixed configuration

echo ========================================
echo DEPLOYING WITH FIXED CONFIGURATION
echo ========================================
echo.

REM Commit the fixes
echo Committing fixes...
git add -A
git commit -m "Fix TypeScript build errors for GCP deployment" 2>nul

REM Push to trigger deployment
echo Pushing to main branch...
git push origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo DEPLOYMENT TRIGGERED SUCCESSFULLY!
    echo ========================================
    echo.
    echo Monitor the build at:
    echo https://console.cloud.google.com/cloud-build/builds?project=direct-glider-465821-p7
    echo.
    echo Or manually trigger with:
    echo deploy-to-gcp.bat
) else (
    echo.
    echo Push failed. You can manually deploy with:
    echo deploy-to-gcp.bat
)

pause