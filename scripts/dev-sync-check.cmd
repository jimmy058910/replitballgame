@echo off
echo ============================================
echo    REALM RIVALRY DEV ENVIRONMENT SYNC CHECK
echo ============================================
echo.

echo === COMPUTER IDENTIFICATION ===
echo Computer Name: %COMPUTERNAME%
echo User: %USERNAME%
echo Working Directory: %CD%
echo.

echo === ENVIRONMENT VERSIONS ===
echo Node.js:
node --version 2>nul || echo ❌ Node.js not found
echo.

echo Python:  
python --version 2>nul || echo ❌ Python not found
echo.

echo UVX:
uvx --version 2>nul || echo ❌ UVX not found
echo.

echo Claude Code:
claude --version 2>nul || echo ❌ Claude Code not found
echo.

echo Google Cloud SDK:
gcloud --version 2>nul | findstr "Google" || echo ❌ Google Cloud SDK not found
echo.

echo Firebase CLI:
firebase --version 2>nul || echo ❌ Firebase CLI not found
echo.

echo === PROJECT STRUCTURE CHECK ===
if exist ".mcp.json" (
    echo ✅ MCP Configuration: Found
) else (
    echo ❌ MCP Configuration: Missing
)

if exist ".env.local" (
    echo ✅ Environment Config: Found
) else (
    echo ❌ Environment Config: Missing
)

if exist "package.json" (
    echo ✅ Package Config: Found
) else (
    echo ❌ Package Config: Missing
)

if exist "CLAUDE.md" (
    echo ✅ Claude Instructions: Found
) else (
    echo ❌ Claude Instructions: Missing
)

if exist ".claude\commands" (
    echo ✅ Claude Commands: Found
) else (
    echo ❌ Claude Commands: Missing
)
echo.

echo === MCP CONFIGURATION FILES ===
if exist ".mcp.json" (
    echo ✅ Project MCP Config: .mcp.json
)
if exist ".mcp-backup.json" (
    echo ✅ Backup MCP Config: .mcp-backup.json
)
if exist ".mcp-bulletproof.json" (
    echo ✅ Bulletproof MCP Config: .mcp-bulletproof.json
)
echo.

echo === MCP SERVER AVAILABILITY TEST ===
echo Testing Firebase MCP...
timeout 10 npx firebase-tools@latest --version >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Firebase MCP: Available
) else (
    echo ❌ Firebase MCP: Failed
)

echo Testing Playwright MCP...
timeout 10 npx @playwright/mcp --help >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Playwright MCP: Available
) else (
    echo ❌ Playwright MCP: Failed
)

echo Testing Serena MCP...
timeout 10 uvx --from git+https://github.com/oraios/serena serena --help >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Serena MCP: Available  
) else (
    echo ❌ Serena MCP: Failed
)

echo Testing In-Memoria MCP...
timeout 10 npx in-memoria --help >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ In-Memoria MCP: Available
) else (
    echo ❌ In-Memoria MCP: Failed
)
echo.

echo === GOOGLE CLOUD AUTH STATUS ===
gcloud auth list 2>nul | findstr "ACTIVE" >nul
if %errorlevel% == 0 (
    echo ✅ Google Cloud: Authenticated
    gcloud config get-value project 2>nul && echo Project configured
) else (
    echo ⚠️ Google Cloud: Authentication needed
    echo Run: gcloud auth login
)
echo.

echo === FIREBASE AUTH STATUS ===
firebase projects:list >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Firebase: Authenticated
) else (
    echo ⚠️ Firebase: Authentication needed
    echo Run: firebase login
)
echo.

echo === DEVELOPMENT SERVER PORTS ===
echo Checking if development ports are available:
netstat -an | findstr ":3000 " >nul && echo ⚠️  Port 3000: In use || echo ✅ Port 3000: Available
netstat -an | findstr ":5173 " >nul && echo ⚠️  Port 5173: In use || echo ✅ Port 5173: Available  
netstat -an | findstr ":5432 " >nul && echo ⚠️  Port 5432: In use || echo ✅ Port 5432: Available
echo.

echo === MCP SERVERS LIVE CONNECTION TEST ===
echo NOTE: This will test actual MCP server connections through Claude Code
echo Run 'claude /mcp' manually to see live MCP server status
echo.

echo === SLASH COMMANDS CHECK ===
if exist ".claude\commands\dev-start.md" (
    echo ✅ /dev-start command: Found
) else (
    echo ❌ /dev-start command: Missing
)

if exist ".claude\commands\dev-status.md" (
    echo ✅ /dev-status command: Found  
) else (
    echo ❌ /dev-status command: Missing
)

if exist ".claude\commands\design-review.md" (
    echo ✅ /design-review command: Found
) else (
    echo ❌ /design-review command: Missing
)
echo.

echo === SYNC VERIFICATION COMPLETE ===
echo.
echo NEXT STEPS TO COMPLETE SYNC:
echo 1. If Firebase shows ❌: Run 'firebase login'
echo 2. If Google Cloud shows ❌: Run 'gcloud auth login' 
echo 3. If any MCP shows ❌: Check installation commands above
echo 4. Run 'claude /mcp' to test live MCP connections
echo 5. Run '/dev-start' to test full development environment
echo.
echo Run this same script on your other computer to compare results!
echo.
pause