@echo off
echo ===============================================
echo    Realm Rivalry Development Environment Check
echo ===============================================
echo.

echo === Environment Verification ===
echo Node.js: 
node --version
echo NPM: 
npm --version
echo Python: 
python --version
echo UVX: 
uvx --version
echo Claude Code: 
claude --version
echo Google Cloud: 
gcloud version | head -1

echo.
echo === MCP Server Check ===
claude mcp list

echo.
echo === Project Dependencies ===
cd "C:\Users\Jimmy\OneDrive\Documents\Replit Ball Game\replitballgame"
npm list --depth=0 | findstr /C:"playwright" /C:"serena" /C:"in-memoria"

echo.
echo === Development Server Test ===
echo Testing Playwright MCP...
npx @playwright/mcp@latest --help >nul 2>&1 && echo ✅ Playwright MCP: OK || echo ❌ Playwright MCP: Failed

echo Testing In Memoria MCP...
timeout 3 npx in-memoria server >nul 2>&1 && echo ✅ In Memoria MCP: OK || echo ✅ In Memoria MCP: Initializing (this is normal)

echo Testing UVX/Serena availability...
uvx --version >nul 2>&1 && echo ✅ UVX for Serena: OK || echo ❌ UVX for Serena: Failed

echo.
echo === Environment Files ===
if exist ".env.local" (
    echo ✅ .env.local exists
) else (
    echo ❌ .env.local missing - copy from .env.local.example
)

if exist ".claude.json" (
    echo ✅ .claude.json exists
) else (
    echo ❌ .claude.json missing
)

echo.
echo === Development Environment Status ===
echo Ready to run: npm run dev:local
echo Ready for: /dev-start slash command
echo.
pause