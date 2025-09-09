# Development Environment Status

**Command:** `/dev-status`

**Description:** Check the current status of all development services and provide a comprehensive environment dashboard.

**Allowed Tools:**
- Bash
- TodoWrite
- mcp__playwright__browser_navigate
- mcp__playwright__browser_console_messages

## Workflow Steps

### Phase 1: Service Discovery
1. **Check Running Processes**
   ```bash
   # Check for cloud-sql-proxy
   tasklist /FI "IMAGENAME eq cloud-sql-proxy.exe" /FO CSV
   
   # Check Node.js processes (frontend/backend)
   tasklist /FI "IMAGENAME eq node.exe" /FO CSV
   
   # Check Chrome processes for Playwright consistency
   tasklist /FI "IMAGENAME eq chrome.exe" /FO CSV
   ```

2. **Port Status Check**
   ```bash
   # Check specific ports
   netstat -ano | findstr ":5432 :5173 :3000"
   ```

### Phase 2: Service Validation
1. **Frontend Health Check**
   ```bash
   # Test frontend accessibility
   curl -I http://localhost:5173 -m 5
   ```

2. **Backend Health Check**
   ```bash
   # Test backend API
   curl -I http://localhost:3000/api/health -m 5
   ```

3. **Database Proxy Check**
   ```bash
   # Test database connection via proxy
   nc -zv localhost 5432
   ```

### Phase 3: Browser Environment Check
1. **Navigate to Development Site**
   ```bash
   mcp__playwright__browser_navigate http://localhost:5173
   ```

2. **Console Error Analysis**
   ```bash
   mcp__playwright__browser_console_messages
   ```

### Phase 4: Status Dashboard
1. **Create Environment Report**
   - Service status (running/stopped/error)
   - Port usage and conflicts
   - Browser compatibility status
   - Recent console errors/warnings
   - Development URLs

2. **Todo List Creation**
   - Create TodoWrite with any issues found
   - Suggest next actions if problems detected
   - Provide quick fix commands

## Expected Output

**Healthy Environment:**
```
📊 Development Environment Status

🟢 SERVICES RUNNING
✅ Google Cloud SQL Proxy: Active (PID: 1234, Port: 5432)
✅ Backend Server: Active (PID: 5678, Port: 3000)
✅ Frontend Server: Active (PID: 9012, Port: 5173)
✅ Chrome Browser: Active (Playwright Compatible)

🌐 DEVELOPMENT URLS
- Frontend: http://localhost:5173 ✅
- Backend API: http://localhost:3000 ✅
- Database: postgresql://localhost:5432 ✅

🔧 BROWSER STATUS
- Default Browser: Chrome (Playwright Compatible) ✅
- Console Errors: 0 ✅
- Page Load Time: 1.2s ✅

🎯 READY FOR DEVELOPMENT
Environment Status: FULLY OPERATIONAL 🟢

Next Actions:
- Start coding - everything is ready!
- Run design reviews with confidence
- All services operating normally
```

**Issues Detected:**
```
⚠️ Development Environment Issues

🔴 SERVICES WITH PROBLEMS
❌ Google Cloud SQL Proxy: Not running
✅ Frontend Server: Active (Port: 5173)
❌ Backend Server: Failed to start (Port conflict on 3000)

🚨 ISSUES FOUND
1. Cloud SQL Proxy not authenticated
   Fix: gcloud auth login
   
2. Port 3000 in use by another process (PID: 7890)
   Fix: npx kill-port 3000
   
3. Backend server can't connect to database
   Fix: Start Cloud SQL Proxy first

🔧 QUICK FIX
Run: /dev-start (will resolve most issues automatically)

Environment Status: DEGRADED 🟡
```

## Usage Examples

**Basic Status Check:**
```
/dev-status
```

**Expected Interaction:**
- Provides comprehensive environment dashboard
- Identifies any issues with specific solutions
- Creates todo list for any problems found
- Offers quick fix commands