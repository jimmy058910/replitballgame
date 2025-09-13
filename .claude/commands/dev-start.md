# Start Development Environment

**Command:** `/dev-start`

**Description:** Automatically start the complete Realm Rivalry development environment with Google Cloud SQL Proxy, frontend, and backend servers.

**Allowed Tools:**
- Bash
- TodoWrite
- mcp__playwright__browser_navigate
- mcp__playwright__browser_console_messages
- mcp__playwright__browser_take_screenshot

## Workflow Steps

### Phase 1: Environment Validation
1. **Check Current Status**
   ```bash
   # Check if services are already running
   netstat -ano | findstr ":5173 :3000 :5432"
   ```

2. **Verify Prerequisites**
   ```bash
   # Check if cloud-sql-proxy is available
   where cloud-sql-proxy
   # Check if npm dependencies are installed
   npm list --depth=0
   ```

### Phase 2: Service Startup
1. **Start In Memoria Intelligence Server**
   ```bash
   # Start In Memoria server if not running
   npx in-memoria server --daemon &
   ```

2. **Start Google Cloud SQL Proxy**
   ```bash
   # Start proxy in background if not running
   start /B cloud-sql-proxy direct-glider-465821-p7:us-central1:realm-rivalry-dev --port=5432
   ```

3. **Start Development Servers**
   ```bash
   # Start backend server with debugging
   npm run dev:backend:debug &
   # Start frontend server separately  
   npm run dev:frontend:local &
   ```

### Phase 3: Environment Verification
1. **Wait for Services**
   - Poll localhost:5173 until frontend is ready
   - Poll localhost:3000 until backend is ready
   - Verify database connection through proxy

2. **Browser Launch**
   ```bash
   # Navigate to development environment
   mcp__playwright__browser_navigate http://localhost:5173
   ```

3. **Health Check**
   ```bash
   # Check console for errors
   mcp__playwright__browser_console_messages
   ```

4. **Status Report**
   - Create TodoWrite with environment status
   - Provide development URLs
   - Report any issues found

## Expected Output

**Success Message:**
```
🚀 Development Environment Ready!

✅ In Memoria Intelligence: Running (7,278+ concepts learned)
✅ Google Cloud SQL Proxy: Running on port 5432
✅ Backend Server: Running on http://localhost:3000  
✅ Frontend Server: Running on http://localhost:5173
✅ Browser: Chrome opened automatically
✅ Database: Connected via Cloud SQL Proxy

🎯 Ready for:
- Code development with hot reloading
- Intelligent pattern recommendations via /memoria
- Design reviews with "Run design review on localhost:5173"
- Database operations via Prisma
- Real-time debugging

Environment Status: OPERATIONAL 🟢
Intelligence Status: ACTIVE 🧠
```

**Error Handling:**
- If services fail to start, provide specific troubleshooting steps
- If ports are in use, offer port conflict resolution
- If authentication fails, guide through gcloud setup

## Usage Examples

**Basic Usage:**
```
/dev-start
```

**Expected Interaction:**
- Automatically starts all required services
- Opens browser to development environment
- Provides status updates throughout process
- Creates todo list with next development steps