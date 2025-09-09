# Stop Development Environment

**Command:** `/dev-stop`

**Description:** Safely stop all development services including Google Cloud SQL Proxy, frontend, and backend servers.

**Allowed Tools:**
- Bash
- TodoWrite

## Workflow Steps

### Phase 1: Service Discovery
1. **Identify Running Services**
   ```bash
   # Find all relevant processes
   tasklist /FI "IMAGENAME eq cloud-sql-proxy.exe" /FO CSV
   tasklist /FI "IMAGENAME eq node.exe" /FO CSV
   ```

2. **Check Port Usage**
   ```bash
   # Identify processes using development ports
   netstat -ano | findstr ":5432 :5173 :3000"
   ```

### Phase 2: Graceful Shutdown
1. **Stop Node.js Processes**
   ```bash
   # Kill development servers
   npx kill-port 5173 3000
   ```

2. **Stop Cloud SQL Proxy**
   ```bash
   # Gracefully stop proxy
   taskkill /IM cloud-sql-proxy.exe /T
   ```

3. **Clean Up Background Processes**
   ```bash
   # Ensure all related processes are stopped
   taskkill /F /IM node.exe /T 2>nul
   ```

### Phase 3: Verification
1. **Confirm Services Stopped**
   ```bash
   # Verify no processes remain
   tasklist /FI "IMAGENAME eq cloud-sql-proxy.exe" /FO CSV
   netstat -ano | findstr ":5432 :5173 :3000"
   ```

2. **Port Availability Check**
   ```bash
   # Confirm ports are available
   echo "Checking port availability..."
   powershell -Command "Test-NetConnection -ComputerName localhost -Port 5173"
   ```

### Phase 4: Status Report
1. **Create Shutdown Summary**
   - Report which services were stopped
   - Confirm all ports are available
   - Note any services that couldn't be stopped
   - Provide restart instructions

2. **Todo List Update**
   ```bash
   TodoWrite
   ```
   - Create items for any cleanup needed
   - Add reminders for next development session
   - Note any issues encountered during shutdown

## Expected Output

**Successful Shutdown:**
```
🛑 Development Environment Shutdown

✅ SERVICES STOPPED
✅ Frontend Server: Stopped (Port 5173 now available)
✅ Backend Server: Stopped (Port 3000 now available)  
✅ Google Cloud SQL Proxy: Stopped (Port 5432 now available)
✅ Background Processes: Cleaned up

🔧 PORT STATUS
- Port 5173: Available ✅
- Port 3000: Available ✅
- Port 5432: Available ✅

📊 SHUTDOWN SUMMARY
- Total processes stopped: 3
- Cleanup duration: 2.3 seconds
- Status: CLEAN SHUTDOWN ✅

🚀 TO RESTART
Use: /dev-start
Or: scripts\start-dev.bat

Environment Status: STOPPED 🔴
Ready for clean restart: YES ✅
```

**Issues During Shutdown:**
```
⚠️ Shutdown Issues Encountered

🟡 PARTIAL SHUTDOWN
✅ Frontend Server: Stopped successfully
❌ Backend Server: Process not responding (PID: 5678)
✅ Cloud SQL Proxy: Stopped successfully

🚨 MANUAL INTERVENTION NEEDED
Backend server (PID: 5678) requires force termination:
taskkill /F /PID 5678

📋 CLEANUP STATUS
- Port 5173: Available ✅
- Port 3000: Still in use by PID 5678 ❌
- Port 5432: Available ✅

🔧 NEXT STEPS
1. Force kill remaining process: taskkill /F /PID 5678
2. Verify port availability: netstat -ano | findstr ":3000"
3. Restart when ready: /dev-start

Environment Status: PARTIALLY STOPPED 🟡
```

## Advanced Options

**Force Stop (if graceful shutdown fails):**
```bash
# Nuclear option - force kill all Node processes
taskkill /F /IM node.exe /T
taskkill /F /IM cloud-sql-proxy.exe /T

# Clear all development ports
npx kill-port 5173 3000 5432
```

**Selective Stop:**
```bash
# Stop only frontend
npx kill-port 5173

# Stop only backend  
npx kill-port 3000

# Stop only database proxy
taskkill /IM cloud-sql-proxy.exe
```

## Usage Examples

**Basic Shutdown:**
```
/dev-stop
```

**Expected Interaction:**
- Gracefully stops all development services
- Verifies clean shutdown
- Reports port availability
- Provides restart instructions
- Creates todo items for any issues