# MCP Server Configuration - Complete Success (Sept 9, 2025)

## Working Configuration (.mcp.json)
All three MCP servers successfully configured and operational:

```json
{
  "mcpServers": {
    "serena": {
      "command": "cmd",
      "args": ["/c", "uvx", "--from", "git+https://github.com/oraios/serena", "serena", "start-mcp-server"],
      "env": {}
    },
    "playwright": {
      "command": "cmd",
      "args": ["/c", "npx", "@playwright/mcp"],
      "env": {}
    },
    "in-memoria": {
      "command": "cmd", 
      "args": ["/c", "npx", "in-memoria", "server"],
      "env": {}
    }
  }
}
```

## Key Lessons Learned
1. **Windows Compatibility**: All servers require `cmd /c` wrapper
2. **Configuration Hierarchy**: User config conflicts take precedence over project config
3. **Package Names**: Use `@playwright/mcp` not `@playwright/mcp@latest`
4. **Troubleshooting**: Use `claude --debug` to see actual error messages

## Root Cause Fixed
- Removed broken configurations from `~/.claude.json` user config
- Standardized all servers to use same `cmd /c` pattern as working Serena config

## Server Capabilities
- **Serena**: Codebase analysis, symbolic operations, memory management
- **Playwright**: Browser automation, UI testing, design review capabilities
- **In-Memoria**: Persistent intelligence, pattern learning, codebase intelligence

## Verification
- All servers show as connected in `/mcp`
- No more "stdio" command errors
- Cross-computer configuration via OneDrive sync