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

2. **MCP Server Diagnostics & Auto-Fix** (✅ UPDATED 2025-09-12):
   - **Direct MCP Testing**: Use function calls instead of CLI commands for faster results
   - **Serena MCP**: Port 24283 (auto-detect), project activation required, Windows `cmd /c` wrapper
   - **Playwright MCP**: Test connection, verify npm packages, auto-install if missing
   - **In-Memoria MCP**: Test connection, validate SQLite database, auto-learn if stale  
   - **Firebase MCP**: Fully operational with direct-glider-465821-p7 project access
   - **Google Cloud MCP**: Available but requires credential configuration
   - **Intelligence Learning**: Auto-learn if codebase is stale with optimal settings (`force: false, includeProgress: true`)
   - **Performance Benchmark**: Measure and track intelligence query performance
   - **Configuration Consolidation**: All MCP servers moved to project .mcp.json (not user config)
   - **Windows Compatibility**: All servers use `cmd /c` wrapper for proper Windows execution

### Phase 2: Parallel Infrastructure & Server Startup
1. **Infrastructure Checks** (Parallel):
   - Verify Google Cloud SQL Proxy status (port 5432) - using persistent service account authentication
   - Service account authentication (never expires) - eliminates recurring auth issues
   - Validate environment variables (.env.local) - provide guidance if missing
   - Clear any port conflicts (3000, 5173) - auto-kill conflicting processes

2. **Development Servers** (Parallel Launch):
   - **Backend**: Start Express.js server on port 3000 with debugging (`npm run dev:backend:debug`)
   - **Frontend**: Start separate Vite dev server on port 5173 (`npm run dev:frontend:local`)
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
  - **Dynamic Port Detection**: Automatically detect active Serena port (24282-24285 range) via netstat
  - **Multi-Instance Management**: Handle multiple Serena instances, identify the active one
  - **Dashboard Validation**: Test HTTP connectivity to verify working dashboard
  - **Process Health Check**: Verify Python process is running and responsive
  - **Configuration Priority**: Use `claude mcp add serena -- uvx --from git+https://github.com/oraios/serena serena start-mcp-server --context ide-assistant --project $(pwd)`
  - **Alternative Command**: Try `serena-mcp-server` if `start-mcp-server` fails
  - **Path Format**: Ensure forward slash paths (C:/Users/...) vs backslashes
  - **Manual Reconnection**: Use `/mcp - Reconnect` workaround for Claude Code bug #3426
  - **Status Recognition**: ✅ Working (dashboard accessible), ⚠️ Partial (server runs, tools not exposed), ❌ Failed (not running)
  - **Verify uvx installation** at `C:\Users\Jimmy\.local\bin\uvx.exe`
  - **Check Python 3.13+ compatibility**
  - **Auto-install Serena if missing**
  - **Cleanup Dead Instances**: Kill zombie processes on non-responsive ports
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
1. **Auto-Detect Active Port**: Scan ports 24282-24285 for LISTENING Python processes
2. **Dashboard Health Check**: Test HTTP connectivity to `http://127.0.0.1:{port}/dashboard/index.html`
3. **Process Validation**: Verify Python process PID, start time, and responsiveness
4. **Multi-Instance Cleanup**: Identify and terminate dead/zombie instances
5. **Tool Availability Test**: Try `mcp__serena__get_symbols_overview` to confirm tools exist
6. **Configuration Verification**: Ensure proper `claude mcp add` command was used

**Enhanced Port Detection Algorithm**:
```bash
# Step 1: Find all Serena ports (24282-24285 range)
netstat -ano | findstr "242" | findstr "LISTENING"

# Step 2: Test each port's dashboard
for port in 24282 24283 24284 24285; do
  curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:${port}/dashboard/index.html
done

# Step 3: Identify process details
powershell "Get-Process -Id {PID} | Select-Object ProcessName,Id,StartTime"

# Step 4: Clean up dead instances
taskkill /PID {dead_pid} /F
```

**Progressive Fix Attempts**:
1. **Port Validation**: Auto-detect and validate active Serena dashboard port
2. **Primary Configuration**:
   ```bash
   claude mcp add serena -- uvx --from git+https://github.com/oraios/serena serena start-mcp-server --context ide-assistant --project $(pwd)
   ```

3. **Alternative Command**:
   ```bash
   claude mcp add serena -- uvx --from git+https://github.com/oraios/serena serena-mcp-server --context ide-assistant --project $(pwd)
   ```

4. **Manual Reconnection**: Use `/mcp - Reconnect` if tools don't appear after configuration
5. **Path Format Check**: Ensure project path uses forward slashes (Unix-style)
6. **Multi-Instance Management**: Kill conflicting instances, restart single instance

**Enhanced Status Recognition**:
- ✅ **Working**: Dashboard accessible + tools functional (rare due to Claude Code bug)
- ⚠️ **Partial**: Dashboard accessible + server running + tools not exposed (most common)
- 🔄 **Multi-Instance**: Multiple servers detected, auto-select newest/healthiest
- ❌ **Failed**: No dashboard accessible, server not running

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
🔍 Serena Port Detection: Scanning 24282-24285...
   • Port 24282: Not active
   • Port 24283: LISTENING ✅ Dashboard: 200 (Project activation required)
   • Port 24284: Not found
   • Port 24285: Not found
✅ Active Serena: Port 24283 (Dashboard responsive, tools functional after activation)

✅ Project context loaded (CLAUDE.md, SESSION_LOG.md, design files)
✅ MCP Status: 4 servers operational, 1 requires config
✅ Serena (24283), Playwright, In-Memoria (5245 concepts, 72 patterns), Firebase ready
⚠️ Google Cloud MCP: Available but credentials not configured

🔄 Starting infrastructure... (parallel)
🔍 Checking ports 3000, 5173... Clear
🔍 Cloud SQL Proxy... Active (port 5432) - Service Account Authentication ✅
🔍 Google Cloud auth... Persistent (never expires)

🚀 Launching development servers... (parallel)
✅ Backend server operational (port 3000) - 2.3s
✅ Frontend server operational (port 5173) - 1.8s
✅ WebSocket connections initialized
✅ Browser launched → http://localhost:5173

🎯 DEVELOPMENT ENVIRONMENT READY (Total: 4.7s)
   Frontend: http://localhost:5173 (Mobile-first 5-hub interface)
   Backend:  http://localhost:3000 (API + Database operations)
   Serena:   http://127.0.0.1:24283/dashboard/index.html ✅ (Fully functional)
   
   📊 Performance: 73% faster than sequential startup
   🔧 MCP Status: 4/5 servers connected (Serena port auto-detected: 24283)
   💾 Database: Connected via Cloud SQL Proxy (port 5432) - Service Account ✅
   🌐 Authentication: Persistent (never expires) - Service Account Key
   ✅ Note: All MCP tools fully operational after project activation
```

## Next Steps: Intelligent Development

🧠 **Ready for AI-Powered Development**
Environment startup complete. For optimal productivity, follow the **Unified Workflow** patterns:

### **Quick Reference**
- **Code Exploration**: Use Serena for symbol-level navigation
- **Pattern Analysis**: Use In-Memoria for established patterns (5245 concepts ready)
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