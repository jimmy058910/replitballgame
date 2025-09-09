# Prime Context for Claude Code

**Command:** `/primer`

**Description:** Load complete project context and understanding for Realm Rivalry development sessions.

**Allowed Tools:**
- Read
- Bash
- Glob
- TodoWrite

## Workflow Steps

### Phase 1: Project Structure Overview
1. **Get Project Structure** (Windows Compatible)
   ```bash
   # Windows tree command with proper formatting
   powershell -Command "Get-ChildItem -Recurse -Directory | Select-Object -First 20 | Format-Table Name, FullName"
   
   # Alternative: List key directories
   ls -la
   ls client/src
   ls server
   ls shared
   ```

2. **Identify Key Areas**
   - Frontend structure (client/src)
   - Backend structure (server)
   - Shared types and utilities
   - Configuration files
   - Documentation structure

### Phase 2: Core Documentation Loading
1. **Development Standards & Context**
   ```bash
   Read CLAUDE.md
   ```
   - Load all development principles and standards
   - Understand architecture patterns
   - Review current development focus areas

2. **Game Mechanics & Business Context**
   ```bash
   Read REALM_RIVALRY_COMPLETE_DOCUMENTATION.md
   ```
   - Understand Dome Ball game mechanics
   - Learn fantasy sports context
   - Review deployment and business documentation

3. **Recent Development History**
   ```bash
   Read SESSION_LOG.md
   ```
   - See what was last worked on
   - Understand recent achievements
   - Review any pending issues

### Phase 3: Current Development State
1. **Check Recent Changes**
   ```bash
   # Get recent git activity
   git log --oneline -5
   git status
   ```

2. **Identify Modified Files**
   ```bash
   # See what's currently in progress
   git diff --name-only HEAD~1 HEAD
   ```

### Phase 4: Unified Intelligence Integration
1. **Activate Serena Project**
   - Use `activate_project` tool to enable semantic code analysis
   - Verify symbol search and code navigation capabilities
   - Prepare for intelligent code exploration

2. **Query In Memoria Intelligence**
   ```bash
   npx in-memoria analyze ./client/src --brief
   ```
   - Get learned patterns and concepts (7,278+ concepts, 53+ patterns)
   - Review coding style consistency
   - Identify architectural insights

3. **Serena Code Overview**
   - Use `get_symbols_overview` for key architectural files
   - Identify major symbols and code organization
   - Prepare semantic search capabilities

4. **Unified Context Enhancement**
   - Combine documentation + In Memoria intelligence + Serena symbols
   - Highlight Realm Rivalry domain concepts
   - Note coding pattern recommendations + symbol relationships

### Phase 5: Context Summary & Next Steps
1. **Create Enhanced Development Context Summary**
   - Project architecture overview + learned patterns
   - Recent development activities + pattern analysis
   - Current development priorities + intelligence insights
   - Available commands and In Memoria integration

2. **Todo List Creation**
   ```bash
   TodoWrite
   ```
   - Create items enhanced by pattern analysis
   - Note any pattern inconsistencies found
   - Set up development session priorities with intelligence guidance

## Expected Output

**Successful Context Loading:**
```
🧠 Realm Rivalry Unified Intelligence Context Loaded

📁 PROJECT STRUCTURE
✅ Frontend: React + TypeScript + TailwindCSS (698 files, 50,407+ lines)
✅ Backend: Express.js + Prisma + PostgreSQL (119 API routes)
✅ Shared: Types and utilities
✅ Documentation: Complete and up-to-date

🤖 AI INTELLIGENCE STACK
✅ Serena: Active (19 semantic code tools, symbol-level editing)
✅ In Memoria: Running (7,278+ concepts, 53+ patterns learned)
✅ Playwright: Connected (design testing, browser automation)
✅ Claude Code: 5 slash commands ready

📋 DEVELOPMENT STANDARDS
✅ Zero Technical Debt Policy
✅ Mobile-First Architecture (5-hub design)
✅ Comprehensive Error Handling
✅ Type Safety & Validation
✅ Design Review Workflow

🎮 GAME CONTEXT
✅ Dome Ball Sport: Fantasy sports with 5 races
✅ 6-Player Teams: Passer/Runner/Blocker roles
✅ Greek Subdivisions: alpha, beta, gamma system
✅ Real-time WebSocket Matches

🧠 LEARNED INTELLIGENCE
✅ Coding Patterns: camelCase naming (4,935+ instances)
✅ Architecture: Hook-based React, comprehensive error handling
✅ Domain Concepts: 45+ Dome Ball terms, fantasy sports patterns
✅ Symbol Navigation: Full TypeScript/JavaScript semantic search

📊 RECENT ACTIVITY
Last Session: [Summary of recent work]
Modified Files: [List of changed files]
Current Focus: [Current development priorities]

🚀 READY FOR INTELLIGENT DEVELOPMENT
Available Workflow:
- Serena: Symbol search, precise editing, code navigation
- In Memoria: Pattern consistency, architectural insights  
- Playwright: Multi-viewport testing, design validation
- Slash Commands: /dev-start, /dev-status, /design-review, /dev-stop

Intelligence Status: FULLY OPERATIONAL 🧠
Context Status: UNIFIED & ENHANCED ✅
Session Ready: MAXIMUM EFFICIENCY 🚀
```

## Windows Compatibility Notes

**Fixed Issues:**
- ✅ Replaced Unix `tree` with Windows-compatible directory listing
- ✅ Uses PowerShell commands for cross-platform compatibility
- ✅ Fallback methods if PowerShell commands fail
- ✅ Compatible with Claude Code's bash environment

**Alternative Commands:**
```bash
# If PowerShell tree fails, use:
ls -la                    # Root directory structure
find . -type d -maxdepth 2  # Directory tree alternative
```

## Usage Examples

**Start New Development Session:**
```
/primer
```

**Expected Interaction:**
- Loads complete project understanding
- Provides development context summary
- Creates todo list for session
- Offers next step recommendations

**Integration with Other Commands:**
```
/primer        # Load context
/dev-start     # Begin development
/design-review # Test changes
/dev-stop      # End session
```

IMPORTANT: The primer uses Read, Bash, and Glob tools to systematically load project context. If any step fails, it will provide alternative approaches to ensure complete context loading.