# Development Environment Synchronization Guide

**Command:** `/dev-setup-sync`

**Description:** Ensure consistent development environment setup across multiple computers for Realm Rivalry development.

## Current MCP Server Configuration

Based on your working setup, here's what needs to be consistent across both computers:

### 1. Claude Code MCP Servers (.claude.json)

```json
"mcpServers": {
  "playwright": {
    "type": "stdio",
    "command": "npx",
    "args": ["@playwright/mcp@latest"],
    "env": {}
  },
  "serena": {
    "type": "stdio", 
    "command": "uvx",
    "args": [
      "--from", "git+https://github.com/oraios/serena",
      "serena", "start-mcp-server",
      "--context", "ide-assistant", 
      "--project", "C:\\Users\\Jimmy\\OneDrive\\Documents\\Realm Rivalry\\replitballgame"
    ],
    "env": {}
  },
  "in-memoria": {
    "type": "stdio",
    "command": "npx", 
    "args": ["in-memoria", "server"],
    "env": {}
  }
}
```

## Environment Synchronization Checklist

### Phase 1: Prerequisites Installation

**On Each Computer:**

1. **Node.js & NPM**
   ```bash
   node --version  # Should be v18+
   npm --version
   ```

2. **Python & UV**
   ```bash
   python --version  # Should be 3.8+
   pip install uv     # For uvx command
   ```

3. **Google Cloud SDK**
   ```bash
   gcloud --version
   gcloud auth login
   gcloud config set project direct-glider-465821-p7
   ```

4. **Claude Code**
   ```bash
   claude --version
   ```

### Phase 2: Project Setup

1. **Clone Repository** (if not using OneDrive sync)
   ```bash
   git clone [repository-url]
   cd "Realm Rivalry/replitballgame"
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Files**
   ```bash
   cp .env.local.example .env.local
   # Configure your specific environment variables
   ```

### Phase 3: MCP Server Installation

1. **Playwright MCP**
   ```bash
   npx @playwright/mcp@latest --help
   npx playwright install chrome
   ```

2. **Serena MCP**
   ```bash
   uvx --from git+https://github.com/oraios/serena serena --help
   ```

3. **In Memoria MCP**
   ```bash
   npx in-memoria --help
   npx in-memoria setup --interactive
   ```

### Phase 4: Claude Code Configuration

1. **Copy MCP Configuration**
   - Ensure `.claude.json` has the correct `mcpServers` section
   - Update project path to match your specific computer's path

2. **Copy Slash Commands**
   ```bash
   # Ensure these directories exist with same content:
   .claude/commands/
   ```

### Phase 5: Cursor AI Integration

1. **Cursor AI Settings**
   - Install Cursor AI on both computers
   - Sync settings via Cursor's built-in sync
   - Ensure same extensions are installed

2. **Workspace Configuration**
   ```json
   // .vscode/settings.json (or Cursor equivalent)
   {
     "typescript.preferences.includePackageJsonAutoImports": "on",
     "editor.codeActionsOnSave": {
       "source.fixAll": true
     }
   }
   ```

## Verification Script

### Quick Environment Check

```bash
# Run this on both computers to verify setup
echo "=== Environment Verification ==="
echo "Node.js: $(node --version)"
echo "NPM: $(npm --version)" 
echo "Python: $(python --version)"
echo "UVX: $(uvx --version)"
echo "Claude Code: $(claude --version)"
echo "Google Cloud: $(gcloud --version | head -1)"

echo "\n=== MCP Server Check ==="
claude mcp list

echo "\n=== Project Dependencies ==="
cd "C:\Users\Jimmy\OneDrive\Documents\Realm Rivalry\replitballgame"
npm list --depth=0 | grep -E "(playwright|serena|in-memoria)"

echo "\n=== Development Server Test ==="
# Test if servers can start
timeout 10 npx @playwright/mcp@latest --help > /dev/null && echo "✅ Playwright MCP: OK" || echo "❌ Playwright MCP: Failed"
timeout 10 uvx --from git+https://github.com/oraios/serena serena --help > /dev/null && echo "✅ Serena MCP: OK" || echo "❌ Serena MCP: Failed"  
timeout 10 npx in-memoria --help > /dev/null && echo "✅ In Memoria MCP: OK" || echo "❌ In Memoria MCP: Failed"
```

## Cursor AI Specific Setup

### 1. Extensions to Install
- **Cursor AI Chat**: Built-in
- **TypeScript**: Built-in
- **Prisma**: For database schema
- **Tailwind CSS IntelliSense**: For styling
- **ES7+ React/Redux/React-Native snippets**: For React development

### 2. Cursor AI Configuration
```json
// Cursor settings.json
{
  "cursor.chat.model": "gpt-4o",
  "cursor.completion.model": "gpt-4o-mini",
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true
}
```

## Troubleshooting Common Issues

### Path Differences
- **Issue**: Different user paths between computers
- **Solution**: Update `.claude.json` project path for each computer
- **Check**: Ensure `C:\Users\Jimmy\OneDrive\Documents\Realm Rivalry\replitballgame` exists on both

### MCP Connection Failures  
- **Issue**: MCP servers not connecting
- **Solution**: Run `claude mcp list` to verify all 3 servers show "✓ Connected"
- **Fix**: Restart Claude Code after configuration changes

### Development Server Issues
- **Issue**: npm run dev:local fails
- **Solution**: Verify Google Cloud Auth Proxy setup
- **Check**: `gcloud auth list` shows active account

## Daily Workflow Synchronization

### Starting Development Session
1. **Computer A**: Run `/dev-start` or `/dev-full-start`
2. **Computer B**: Run `/dev-start` or `/dev-full-start`  
3. **Verify**: Both show same services running:
   - ✅ Frontend: http://localhost:5173 (separate Vite dev server)
   - ✅ Backend: http://localhost:3000 (Express with debugging on 9229)
   - ✅ Database: Cloud SQL Proxy on port 5432
   - ✅ Playwright MCP: Connected
   - ✅ Serena MCP: Connected (port 24283, project activated)
   - ✅ In Memoria MCP: Connected (5245+ concepts learned)
   - ✅ Firebase MCP: Connected (general@realmrivalry.com)
   - ⚠️ Google Cloud MCP: Available (requires credential setup)

### Code Synchronization
- **OneDrive**: Auto-sync for file changes
- **Git**: Manual commits/pulls for major changes
- **Claude Code**: Settings sync via `.claude.json` in project

## Files to Keep in Sync

### Critical Configuration Files
- `.claude.json` (with computer-specific paths)
- `.env.local` (environment variables)
- `package.json` / `package-lock.json`
- `.claude/commands/*.md` (slash commands)

### Development Files  
- `CLAUDE.md` (project instructions)
- `SESSION_LOG.md` (development history)
- `.gitignore` 
- `tsconfig.json`

This guide ensures both computers have identical development capabilities with Claude Code, MCP servers, and Cursor AI integration.