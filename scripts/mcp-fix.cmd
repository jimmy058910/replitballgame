@echo off
echo ==============================================
echo Realm Rivalry MCP Serena Connection Fix
echo ==============================================
echo.

echo [1/4] Checking prerequisites...
where uvx >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: uvx not found in PATH
    echo Please install uvx first: pip install uvx
    pause
    exit /b 1
)
echo ✅ uvx found

echo.
echo [2/4] Testing Serena installation...
uvx --from git+https://github.com/oraios/serena serena --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: Serena installation failed
    echo Please check your internet connection and GitHub access
    pause
    exit /b 1
)
echo ✅ Serena accessible

echo.
echo [3/4] Applying bulletproof MCP configuration...
copy .mcp-bulletproof.json .mcp.json >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: Could not apply bulletproof config
    echo Trying backup configuration...
    copy .mcp-backup.json .mcp.json >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ ERROR: Could not apply backup config either
        pause
        exit /b 1
    )
    echo ⚠️  Applied backup configuration
) else (
    echo ✅ Applied bulletproof configuration
)

echo.
echo [4/4] Final verification...
echo Current MCP configuration:
type .mcp.json
echo.

echo ==============================================
echo ✅ MCP Fix Complete!
echo ==============================================
echo.
echo Next steps:
echo 1. Restart Claude Code completely
echo 2. Run: claude /mcp
echo 3. Verify all three servers show as connected
echo.
echo If Serena still fails, try the backup config:
echo   copy .mcp-backup.json .mcp.json
echo.
pause