# Claude Code Slash Commands - Realm Rivalry

**Complete development workflow automation through Claude Code slash commands.**

## 🚀 Available Commands

### **Development Environment Management**

| Command | Description | Usage |
|---------|-------------|-------|
| `/primer` | Load project context and In Memoria intelligence | Start of new session |
| `/dev-start` | Start complete development environment | Begin development work |
| `/dev-status` | Check environment status and health | Troubleshoot issues |
| `/dev-stop` | Safely stop all development services | End development session |

### **Design & Quality Assurance**

| Command | Description | Usage |
|---------|-------------|-------|
| `/design-review` | Comprehensive UI/UX review with Playwright | After UI changes |

## 🔄 Typical Development Workflow

### **Starting a New Session**
```
/primer              # Load unified intelligence (Serena + In Memoria + docs)
/dev-start          # Start all services + intelligence servers
```

### **During Development**
**Intelligent Natural Language Workflow:**
```
"Find the team roster validation logic using Serena"
"Check our React component patterns with In Memoria"
"Show me all API routes related to matches"
"Update the PlayerCard component following our established patterns"
```

**Structured Commands:**
```
/dev-status         # Check environment health
/design-review      # UI/UX testing with Playwright
```

**Manual Tool Access:**
```bash
npx in-memoria analyze ./client/src --brief    # Pattern intelligence
# Serena tools: Available through natural language requests
# Playwright: Available through /design-review command
```

### **Ending Session**
```
/dev-stop          # Clean shutdown of all services
```

## 📋 Command Details

### `/primer`
**What it does:**
- Reads CLAUDE.md for development standards
- Loads REALM_RIVALRY_COMPLETE_DOCUMENTATION.md for game context
- Reviews SESSION_LOG.md for recent work
- Provides complete project understanding
- Shows project structure (Windows-compatible directory listing)
- Checks recent git activity and modified files
- Creates development session todo list

**When to use:** Start of every development session

**Windows Compatibility:** ✅ Fixed - Now uses PowerShell commands instead of Unix `tree` command

### `/dev-start`
**What it does:**
- Starts Google Cloud SQL Proxy automatically
- Launches frontend (localhost:5173) and backend (localhost:3000)
- Opens Chrome browser for Playwright consistency
- Provides environment status dashboard
- Creates todo list for development tasks

**When to use:** Beginning development work

### `/dev-status` 
**What it does:**
- Checks all running development services
- Validates port usage and conflicts
- Tests frontend/backend accessibility
- Analyzes browser console errors
- Reports environment health status

**When to use:** Troubleshooting or status checks

### `/dev-stop`
**What it does:**
- Gracefully stops all development servers
- Terminates Google Cloud SQL Proxy
- Cleans up background processes
- Verifies all ports are available
- Provides clean restart instructions

**When to use:** End of development session

### `/design-review`
**What it does:**
- Multi-viewport testing (mobile, tablet, desktop)
- Accessibility compliance validation (WCAG AA)
- Credit formatting verification ("amount₡")
- 5-hub navigation testing
- Screenshot evidence capture
- Comprehensive issue reporting with priorities

**When to use:** After UI changes, before PRs

## 🎯 Automation Benefits

### **Before Slash Commands**
1. Manually read documentation for context
2. Start Cloud SQL Proxy manually
3. Run `npm run dev:local` manually
4. Open browser manually
5. Deal with Chrome/Edge inconsistency
6. Manual design testing with multiple steps

### **With Slash Commands**
1. `/primer` → **Instant context loading**
2. `/dev-start` → **One-command environment**
3. `/design-review` → **Professional-grade testing**
4. `/dev-stop` → **Clean shutdown**

## 🔧 Advanced Features

### **Smart Process Management**
- Auto-detects running services (no duplicates)
- Port conflict detection and resolution
- Graceful shutdown with cleanup verification
- Process health monitoring

### **Browser Consistency**
- Chrome used for both development and testing
- Playwright MCP configured for Chrome
- Eliminates Chrome/Edge inconsistencies

### **Comprehensive Design Reviews**
- Tests across 4 viewports automatically
- Captures evidence screenshots
- Validates Realm Rivalry design principles
- Creates prioritized todo lists for fixes

### **Context-Aware Operations**
- Loads project-specific documentation
- Understands Realm Rivalry game mechanics
- Maintains fantasy sports development context
- Integrates with existing git workflow

## 🚨 Troubleshooting

### **Command Not Working**
```bash
# Check if command files exist
ls .claude\commands\

# Verify Claude Code can read commands
cat .claude\commands\dev-start.md
```

### **Tree Command Error (Fixed)**
**Issue:** `/primer` command failed with "tree command not recognized"
**Solution:** ✅ Updated to use Windows-compatible PowerShell commands
**Fix Applied:** Primer now uses `powershell -Command "Get-ChildItem"` instead of Unix `tree`

### **Service Startup Issues**
```
/dev-status    # Diagnose issues
/dev-stop      # Clean reset
/dev-start     # Fresh start
```

### **Playwright Browser Issues**
Commands automatically use Chrome for consistency. If Chrome isn't available, they'll provide specific guidance for installation.

## 📊 Command Comparison

| Feature | Scripts | Slash Commands |
|---------|---------|----------------|
| **Convenience** | Double-click files | Type `/command` |
| **Integration** | External tools | Native Claude Code |
| **Context** | Separate process | Full Claude context |
| **Feedback** | Terminal output | Rich Claude responses |
| **Automation** | Basic automation | Intelligent automation |
| **Error Handling** | Script-based | AI-assisted troubleshooting |

## 🎉 Best Practices

### **Start Each Session**
```
/primer       # Get up to speed
/dev-start    # Begin development  
```

### **During Development**
- Use `/dev-status` if anything seems wrong
- Run `/design-review` after UI changes
- Commands provide context-aware guidance

### **End Each Session**
```
/dev-stop     # Clean shutdown
```

### **Workflow Integration**
- Commands work with your existing git workflow
- Design reviews integrate with PR process
- Status checks help diagnose issues quickly

---

**These slash commands transform your development workflow from manual setup to professional automation with intelligent assistance.**

*Created: September 2025*  
*Status: Production Ready*  
*Integration: Claude Code Native*