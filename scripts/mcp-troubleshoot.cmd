@echo off
echo ============================================
echo MCP Server Troubleshooting - Realm Rivalry
echo ============================================
echo.

echo 1. Checking Prerequisites...
echo -----------------------------------------
echo Python Version:
python --version 2>nul || echo ERROR: Python not found
echo.

echo Node Version:
node --version 2>nul || echo ERROR: Node not found  
echo.

echo uvx Version:
uvx --version 2>nul || echo ERROR: uvx not found
echo.

echo 2. Testing Serena Manual Startup...
echo -----------------------------------------
echo Starting Serena (will timeout after 5 seconds)...
timeout 5 uvx --from git+https://github.com/oraios/serena serena start-mcp-server 2>&1
echo Serena test completed (timeout expected)
echo.

echo 3. Checking MCP Configuration...
echo -----------------------------------------
echo Current .mcp.json exists:
if exist .mcp.json (echo YES) else (echo NO - using fallback)
echo.

echo 4. Environment Information...
echo -----------------------------------------
echo Current Directory: %CD%
echo Computer Name: %COMPUTERNAME%
echo User: %USERNAME%
echo.

echo 5. Recommendations...
echo -----------------------------------------
echo If Serena fails:
echo - Copy .mcp-fallback.json to .mcp.json for stable setup
echo - Restart Claude Code after any MCP changes
echo - Check logs in the logs/ directory
echo.
echo For cross-computer sync:
echo - All files sync via OneDrive except logs/
echo - Prerequisites must be installed on both computers
echo.

pause