# Enhanced Dev Full Start Command

**Combined primer, MCP diagnostics, and parallel development environment startup**

## Description
Loads complete project context, verifies/fixes MCP server connections, and starts all development services in parallel for maximum speed. This is the optimized version with enhanced reliability, parallel execution, and comprehensive MCP auto-fix capabilities.

## Enhanced Workflow

### Phase 1: Context Loading & MCP Verification (Parallel)
1. **Load Project Context** (Concurrent):
   - CLAUDE.md development guide
   - SESSION_LOG.md development history  
   - context/design-principles.md and style-guide.md
   - Recent git commits and current status
   - Project structure overview

2. **MCP Server Diagnostics & Auto-Fix** (✅ UPDATED 2025-09-11):
   - **Direct MCP Testing**: Use function calls instead of CLI commands for faster results
   - **Serena MCP**: Windows `cmd /c` wrapper applied, uvx path verification, context flag support
   - **Playwright MCP**: Test connection, verify npm packages, auto-install if missing
   - **In-Memoria MCP**: Test connection, validate SQLite database, rebuild if corrupted  
   - **Firebase MCP**: Test connection, check authentication status, validate project access
   - **Google Cloud MCP**: Test gcloud authentication, verify project configuration
   - **Intelligence Learning**: Auto-learn if codebase is stale with optimal settings (`force: false, includeProgress: true`)
   - **Performance Benchmark**: Measure and track intelligence query performance
   - **Configuration Consolidation**: All MCP servers moved to project .mcp.json (not user config)
   - **Windows Compatibility**: All servers use `cmd /c` wrapper for proper Windows execution

### Phase 2: Parallel Infrastructure & Server Startup
1. **Infrastructure Checks** (Parallel):
   - Verify Google Cloud SQL Proxy status (port 5432) - auto-restart if needed
   - Quick Google Cloud authentication check (skip if working) - auto-authenticate if expired
   - Validate environment variables (.env.local) - provide guidance if missing
   - Clear any port conflicts (3000, 5173) - auto-kill conflicting processes

2. **Development Servers** (Parallel Launch):
   - **Backend**: Start Express.js server on port 3000 with database connection
   - **Frontend**: Start Vite dev server on port 5173 with hot reloading
   - **Intelligence Watcher**: Start In-Memoria file watcher for real-time learning
   - **WebSockets**: Initialize Socket.IO + Native WebSocket connections
   - **Dependency Optimization**: Run Vite dependency pre-bundling in background

3. **Verification & Launch**:
   - Health check both servers (wait for 200 responses)
   - Verify database connectivity and MCP server responses
   - Launch browser with development environment
   - Display comprehensive status dashboard

## Enhanced Features

### **🚀 Parallel Execution**
- All independent operations run simultaneously
- **60-80% faster startup** compared to sequential execution
- Smart dependency management (database before backend)
- Concurrent context loading and infrastructure checks

### **🔧 MCP Auto-Fix Capabilities** 
- **Serena MCP Issues** (Updated with Research Findings):
  - **Configuration Priority**: Use `claude mcp add serena -- uvx --from git+https://github.com/oraios/serena serena start-mcp-server --context ide-assistant --project $(pwd)`
  - **Alternative Command**: Try `serena-mcp-server` if `start-mcp-server` fails
  - **Path Format**: Ensure forward slash paths (C:/Users/...) vs backslashes
  - **Manual Reconnection**: Use `/mcp - Reconnect` workaround for Claude Code bug #3426
  - **Known Issue**: Claude Code 1.0.111+ has systematic MCP tool exposure bug affecting all MCP servers
  - **Verify uvx installation** at `C:\Users\Jimmy\.local\bin\uvx.exe`
  - **Check Python 3.13+ compatibility**
  - **Auto-install Serena if missing**
  - **Fallback**: Use standard tools if MCP integration fails due to Claude Code bug

- **Playwright MCP Issues**:
  - Verify `@playwright/mcp` npm package installation
  - Check Node.js version compatibility
  - Auto-install missing dependencies
  - Reset browser contexts if corrupted

- **In-Memoria MCP Issues**:
  - Validate SQLite database at `./in-memoria.db`
  - Rebuild vector database if corrupted
  - Re-learn codebase intelligence if stale using optimal settings
  - Reset analysis engines if malfunctioning
  - **Optimal Auto-Learn**: `mcp__in-memoria__auto_learn_if_needed(force: false, includeProgress: true)`
  - **Performance Target**: 7000+ concepts, 100+ patterns, <20ms query time

- **Firebase MCP Issues**:
  - Check Firebase CLI authentication status
  - Validate project permissions and access
  - Test basic Firebase operations (get environment)
  - Auto-login if credentials are available

- **Google Cloud MCP Issues**:
  - Verify gcloud authentication status
  - Check active project configuration
  - Test basic GCP operations (project info)
  - Validate Cloud SQL proxy connectivity

### **⚡ Smart Port & Process Management**
- **Automatic Port Cleanup**: Kill processes on 3000, 5173 if occupied
- **Graceful Fallback**: Use alternative ports (5174, 5175) if conflicts persist
- **Process Health Monitoring**: Detect and restart failed services
- **Memory Optimization**: Clean up previous development sessions

### **📊 Comprehensive Diagnostics**
- **Real-time Health Monitoring**: Live status updates during startup
- **Database Connection Testing**: Verify Cloud SQL proxy and Prisma connectivity
- **MCP Capability Testing**: Validate all MCP server tool availability
- **Performance Metrics**: Startup time tracking and optimization recommendations

### **🔄 Reliability & Error Recovery**
- **Idempotent Operations**: Safe to run multiple times without conflicts
- **Automatic Cleanup**: Remove incomplete previous startups
- **Error Context**: Detailed error messages with actionable solutions
- **Fallback Strategies**: Multiple paths to successful environment startup

## Permissions & Security

All operations pre-approved in `.claude/settings.local.json`:
```json
"allow": [
  "Bash(npm run dev:*)",     // Development server startup
  "Bash(npx kill-port:*)",   // Port conflict resolution  
  "Bash(gcloud auth:*)",     // Google Cloud authentication
  "Bash(netstat:*)",         // Port status checking
  "Bash(concurrently:*)",    // Parallel execution
  "mcp__serena",             // Serena MCP testing & repair
  "mcp__playwright",         // Playwright MCP testing & repair
  "mcp__in-memoria",         // In-Memoria MCP testing & repair
  "mcp__firebase",           // Firebase MCP testing & management
  "mcp__gcloud",             // Google Cloud MCP testing & operations
  "Bash(start http://localhost:*)"  // Browser launching
]
```

## Usage
```
/dev-full-start
```

## Troubleshooting & Auto-Fix

### **Automatic MCP Server Repair**
1. **Connection Test**: Test each MCP server with simple tool call
2. **Diagnosis**: Identify specific failure points (installation, configuration, process)
3. **Auto-Repair**: Execute appropriate fix based on failure type
4. **Verification**: Re-test connection after repair
5. **Fallback**: Use reduced MCP configuration if repair fails

### **🔧 Enhanced Serena MCP Troubleshooting** (Based on Latest Research)
**Known Issue**: Claude Code bug #3426 - "Claude Code fails to expose MCP tools to AI sessions"

**Diagnostic Steps**:
1. **Verify Server Startup**: Check if Serena logs show successful initialization
2. **Test Tool Availability**: Try `mcp__serena__get_symbols_overview` to confirm tools exist
3. **Check Configuration**: Ensure proper `claude mcp add` command was used

**Progressive Fix Attempts**:
1. **Primary Configuration**:
   ```bash
   claude mcp add serena -- uvx --from git+https://github.com/oraios/serena serena start-mcp-server --context ide-assistant --project $(pwd)
   ```

2. **Alternative Command**:
   ```bash
   claude mcp add serena -- uvx --from git+https://github.com/oraios/serena serena-mcp-server --context ide-assistant --project $(pwd)
   ```

3. **Manual Reconnection**: Use `/mcp - Reconnect` if tools don't appear after configuration
4. **Path Format Check**: Ensure project path uses forward slashes (Unix-style)
5. **Transport Alternative**: Try SSE transport instead of stdio if available

**Status Recognition**:
- ✅ **Working**: Tools like `mcp__serena__*` are available and functional
- ⚠️ **Partial**: Serena server starts but tools not exposed (Claude Code bug)
- ❌ **Failed**: Serena server fails to start (configuration/installation issue)

### **Automatic Environment Repair**
- **Port Conflicts**: `npx kill-port 3000 5173` + alternative ports
- **Database Issues**: Cloud SQL Proxy restart + connection validation
- **Authentication**: Quick check with `gcloud config get-value account --quiet` (5s timeout)
- **Dependencies**: `npm install` if package.json changed

### **Manual Fallback Options**
- **Individual Commands**: `/primer`, `/dev-start` if combined fails
- **Reduced MCP**: `.mcp-fallback.json` configuration
- **Local Development**: Skip Cloud SQL, use SQLite fallback

## Expected Enhanced Output

```
🔄 Loading project context... (3 files parallel)
🔍 Testing MCP connections... (Serena, Playwright, In-Memoria, Firebase, Google Cloud)
✅ Project context loaded (CLAUDE.md, SESSION_LOG.md, design files)
✅ MCP Status: All 5 servers operational and accessible
✅ Serena, Playwright, In-Memoria (7202 concepts, 119 patterns), Firebase & Google Cloud ready

🔄 Starting infrastructure... (parallel)
🔍 Checking ports 3000, 5173... Clear
🔍 Cloud SQL Proxy... Active (port 5432)
🔍 Google Cloud auth... Valid

🚀 Launching development servers... (parallel)
✅ Backend server operational (port 3000) - 2.3s
✅ Frontend server operational (port 5173) - 1.8s
✅ WebSocket connections initialized
✅ Browser launched → http://localhost:5173

🎯 DEVELOPMENT ENVIRONMENT READY (Total: 4.7s)
   Frontend: http://localhost:5173 (Mobile-first 5-hub interface)
   Backend:  http://localhost:3000 (API + Database operations)
   Serena:   http://127.0.0.1:24285/dashboard/index.html (Server running, tools not exposed)
   
   📊 Performance: 73% faster than sequential startup
   🔧 MCP Status: All 5 servers connected (Serena tools may not be exposed due to Claude Code bug #3426)
   💾 Database: Connected via Cloud SQL Proxy
   🌐 Authentication: Valid for 6h 23m
   ⚠️ Note: Use standard tools for development until Serena MCP integration is resolved
```

## Next Steps: Intelligent Development

🧠 **Ready for AI-Powered Development**
Environment startup complete. For optimal productivity, follow the **Unified Workflow** patterns:

### **Quick Reference**
- **Code Exploration**: Use Serena for symbol-level navigation
- **Pattern Analysis**: Use In-Memoria for established patterns (7202 concepts ready)
- **UI Validation**: Use Playwright for design testing
- **Firebase Management**: Use Firebase MCP for auth/user operations
- **Cloud Operations**: Use Google Cloud MCP for infrastructure management
- **Intelligence Updates**: Auto-learn triggers when code >24h stale
- **Full Methodology**: See `/UNIFIED_WORKFLOW` command

### **Intelligent Query Examples**
```bash
# Find specific functions
"Use Serena to find the PlayerStats interface"

# Understand patterns  
"What error handling patterns does In-Memoria show?"

# Test UI changes
"Run design review on the competition center"
```

## Command Hierarchy
- `/primer` - Context loading only
- `/dev-start` - Environment startup only  
- `/dev-full-start` - **Enhanced combined operation** (this command)
- `/UNIFIED_WORKFLOW` - **Development methodology guide**

🎯 **Your environment is ready - now develop intelligently!**

This enhanced command provides maximum development efficiency with enterprise-grade reliability, comprehensive error handling, and intelligent auto-repair capabilities.