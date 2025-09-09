# Dev Full Start Command

**Combined primer and development environment startup**

## Description
Loads complete project context and starts all development services in one command. This combines the functionality of both `/primer` and `/dev-start` for complete session initialization.

## Workflow

### Phase 1: Context Loading (Primer)
1. Load CLAUDE.md development guide
2. Load SESSION_LOG.md development history  
3. Load context/design-principles.md and style-guide.md
4. Load recent git commits and current status
5. Load project structure overview

### Phase 2: Environment Startup (Dev Start)
1. Start Google Cloud SQL Proxy (if not running)
2. Start backend server on port 3000
3. Start frontend dev server on port 5173
4. Verify MCP server connections (Playwright, Serena, In Memoria)
5. Open development environment in browser
6. Display environment status summary

## Usage
```
/dev-full-start
```

## Individual Commands Available
- `/primer` - Context loading only
- `/dev-start` - Environment startup only
- `/dev-full-start` - Combined operation

This provides flexibility to run operations individually or combined based on your needs.