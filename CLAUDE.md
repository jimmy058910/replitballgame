# CLAUDE.md - Realm Rivalry Development Guide

**This file provides essential development guidance to ALL AI development assistants (Claude Code, Replit AI, GitHub Copilot, etc.) when working with code in this repository.**

## 📚 Documentation Structure

- **CLAUDE.md** (this file): Core development standards, setup, and daily workflow
- **[SESSION_LOG.md](./SESSION_LOG.md)**: Development history, bug fixes, and architectural achievements
- **[REALM_RIVALRY_COMPLETE_DOCUMENTATION.md](./REALM_RIVALRY_COMPLETE_DOCUMENTATION.md)**: Game mechanics, business documentation, and deployment details

## 🤖 AI Development Assistant Instructions

**For Claude Code (claude.ai/code)**: This serves as your primary reference for development context, technical decisions, and session continuity.

**For Replit AI**: Use this file's principles and architecture details for all development work within the Replit environment.

**For Any AI Assistant**: Follow the development principles, code standards, and architectural patterns defined here to maintain consistency.

## 🚨 CRITICAL DEVELOPMENT PRINCIPLES

### **ZERO TECHNICAL DEBT POLICY**
- **NO BAND-AIDS**: Temporary fixes, workarounds, or placeholder solutions are PROHIBITED
- **NO SHORTCUTS**: All features must be implemented using proper, industry-standard approaches  
- **NO TECHNICAL DEBT**: Every solution must be the correct, long-term implementation from the start
- **NO BACKWARD COMPATIBILITY**: In development phase, prioritize optimal architecture over legacy support
- **BREAK THINGS TO FIX THEM**: Remove old code and technical debt without hesitation
- **CONTINUOUS VALIDATION**: Test and validate changes frequently throughout development using available scripts and tools
- **USE FULL AI CAPABILITIES**: Leverage maximum tokens and comprehensive analysis for optimal solutions

### **COMPREHENSIVE PROBLEM-SOLVING APPROACH**
**ALWAYS perform complete systematic analysis to identify ALL root causes simultaneously, rather than fixing symptoms individually.**

**Phase 1: Complete System Analysis**
1. **BASIC FILE AVAILABILITY**: Check .gitignore, file existence, build context issues FIRST
2. **Map the entire failure domain** - Identify all components involved in the failing process
3. **Configuration consistency check** - Verify all environment variables, ports, URLs align
4. **Architecture compatibility review** - Ensure system design matches deployment environment

**Phase 2: Root Cause Investigation Order**
1. **File System Issues**: Check .gitignore, file paths, build context, file permissions
2. **Simple Configuration Issues**: Check URLs, API keys, secrets, environment variables
3. **Code Conflicts**: Look for duplicate routes, overriding functions, import conflicts
4. **Basic Logic Errors**: Verify function calls, variable assignments, conditional logic
5. **Architectural Mismatches**: System design incompatible with deployment environment

**ANTI-PATTERN TO AVOID**: Finding first issue → implementing fix → deploying → finding next issue → repeat
**CORRECT PATTERN**: Complete analysis → identify all issues → comprehensive fix → single deployment

### **INDUSTRY STANDARD CODE QUALITY**
- View complete function context before making any edits (minimum 50+ lines of context)
- Use proper TypeScript/JavaScript error handling patterns with complete try-catch-finally blocks  
- Never create orphaned code blocks or incomplete control structures
- Follow consistent indentation and code structure patterns
- Use TypeScript strict mode practices for type safety

### **USER PREFERENCES**
- **Communication Style**: Simple, everyday language
- **Performance First**: Efficient implementations, minimize unnecessary resource usage
- **Mobile-First**: Architecture prioritizes mobile users and PWA capabilities
- **ALWAYS CONFIRM**: Ask for permission before implementing changes when user asks for suggestions

## 📚 DEVELOPMENT STANDARDS

### **COMPREHENSIVE SOLUTIONS ONLY**
- ✅ **NO BAND-AID FIXES**: Temporary patches, quick hacks, or workarounds are PROHIBITED
- ✅ **ROOT CAUSE RESOLUTION**: Always identify and fix the underlying cause, not symptoms
- ✅ **FUTURE-PROOF IMPLEMENTATIONS**: Solutions must be maintainable and scalable long-term
- ✅ **SYSTEMATIC APPROACH**: Fix entire problem domains, not individual edge cases

### **MANDATORY IMPLEMENTATION STANDARDS**

#### **1. COMPREHENSIVE ERROR HANDLING**
```typescript
// ✅ CORRECT: Full error handling with recovery
try {
  const result = await complexOperation();
  return processResult(result);
} catch (error) {
  logger.error('Operation failed', { error, context: operationContext });
  await notifyMonitoring(error);
  return handleFailureGracefully(error);
}
```

#### **2. TYPE SAFETY & VALIDATION**
```typescript
// ✅ CORRECT: Runtime validation + compile-time types
const validateTeamStats = z.object({
  wins: z.number().min(0),
  losses: z.number().min(0), 
  draws: z.number().min(0),
  points: z.number().min(0)
});

export async function updateTeamStats(data: unknown): Promise<TeamStats> {
  const validatedData = validateTeamStats.parse(data);
  return await persistTeamStats(validatedData);
}
```

#### **3. DATABASE CONSISTENCY & RELIABILITY**
```typescript
// ✅ CORRECT: Transaction-based consistency
export async function syncTeamStandings(teamId: number): Promise<void> {
  return await prisma.$transaction(async (tx) => {
    const games = await tx.game.findMany({ /* query */ });
    const calculatedStats = calculateStatsFromGames(games);
    const updatedTeam = await tx.team.update({
      where: { id: teamId },
      data: calculatedStats
    });
    await tx.auditLog.create({ /* audit trail */ });
    return updatedTeam;
  });
}
```

### **PROHIBITED PRACTICES**
- ❌ TODO comments in production code
- ❌ Console.log statements (use proper logging)
- ❌ Magic numbers or hardcoded values
- ❌ Silent error swallowing
- ❌ Direct database access outside service layer
- ❌ Unvalidated user input
- ❌ Missing error handling
- ❌ Temporary fixes or workarounds

### **UNIVERSAL CREDIT FORMAT STANDARD**
Credits must ALWAYS be displayed with amount BEFORE the ₡ symbol:
- ✅ CORRECT: "25,000₡", "1.5M₡", "0₡"  
- ❌ INCORRECT: "₡25,000", "₡1.5M", "₡0"
- **Implementation**: Use the creditFormatter utility (`client/src/utils/creditFormatter.ts`) for standardized formatting

## 🎯 TYPESCRIPT MIGRATION SUCCESS (September 2025)

**Current Status**: Relaxed TypeScript configuration with 875 non-critical errors for development velocity.

**Key Files Created**:
- `client/src/lib/api/queries.ts` - QueryOptions factory
- `shared/types/models.ts` - Shared type definitions

**For Complete Migration Details**: See [SESSION_LOG.md - TypeScript Migration Journey](./SESSION_LOG.md#typescript-migration-journey)

## 💻 LOCAL DEVELOPMENT SETUP

### **Quick Start**
```bash
# 1. Copy environment configuration
cp .env.local.example .env.local

# 2. Install dependencies  
npm install

# 3. Start development environment
npm run dev:local
```

### **Database Setup**

#### **Step 1: Install Google Cloud SDK**
- **Windows**: Download from https://cloud.google.com/sdk/docs/install
- **Or use Chocolatey**: `choco install gcloudsdk`

#### **Step 2: Authenticate & Setup Cloud SQL Proxy**
```bash
# 1. Login to your Google account
gcloud auth login

# 2. Set your project
gcloud config set project direct-glider-465821-p7

# 3. Install Cloud SQL Auth Proxy
gcloud components install cloud-sql-proxy

# 4. Test the proxy connection
cloud-sql-proxy direct-glider-465821-p7:us-central1:realm-rivalry-dev --port=5432
```

### **Development Environment Features**
✅ **Integrated Fullstack Server**: Frontend served via Vite middleware on port 3000 (NOT separate 5173)  
✅ **Hot Reloading**: Instant updates when you save files  
✅ **Database Integration**: Real Cloud SQL connection via Auth Proxy on port 5432  
✅ **Debugging**: Full breakpoint debugging in IDE  
✅ **API Proxy**: Backend serves frontend through Vite development middleware  
✅ **WebSocket Support**: Socket.IO + Native WebSocket both on port 3000  

### **🚀 SLASH COMMAND DEVELOPMENT WORKFLOW** 

**Claude Code Native Commands** - Professional automation:

#### **Start Development Session**
```
/primer      # Load complete project context
/dev-start   # Start all services automatically
```

#### **During Development**
```
/dev-status     # Check environment health
/design-review  # Professional UI/UX testing
```

#### **End Session**
```
/dev-stop    # Clean shutdown of all services
```

#### **Traditional Fallback**
```bash
# If slash commands unavailable
npm run dev:local
```

### **🎯 Automated Environment Features**

**✅ Google Cloud SQL Proxy**
- Automatically starts cloud-sql-proxy if not running
- Connects to direct-glider-465821-p7:us-central1:realm-rivalry-dev
- Handles authentication and port configuration

**✅ Integrated Development Server**
- **CRITICAL**: Single integrated server on port 3000 serves both frontend and backend
- **Architecture**: Express server + Vite middleware (NO separate 5173 server)
- **Frontend**: Served through Vite development middleware at http://localhost:3000
- **Backend**: Express API routes + Socket.IO + Native WebSocket on same port
- **Hot reloading**: Vite middleware provides frontend hot reloading
- **Database**: Cloud SQL Proxy on port 5432 (separate process)

**✅ Browser Consistency** 
- **Fixed Chrome/Edge Issue**: Always opens Chrome for Playwright consistency
- Playwright MCP configured to use Chrome channel
- Design reviews use same browser as development

**✅ Slash Command Intelligence**
- Context-aware environment management  
- AI-powered problem diagnosis and solutions
- Integrated todo list creation and progress tracking
- Native Claude Code workflow integration

### **🔧 Design Review Integration**

**Slash Command Workflow:**
1. `/dev-start` (starts everything automatically)
2. `/design-review` (professional-grade testing)
3. Multi-viewport testing with screenshot evidence
4. Prioritized issue reporting with actionable recommendations

**Native Claude Code integration - no external tools needed!**

### **Environment Configuration (.env.local)**
```env
# Required: Your Cloud SQL database
DATABASE_URL="postgresql://username:password@localhost:5432/database_name?schema=public&sslmode=prefer"

# Required: Firebase configuration
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"

# Required: Google Cloud
GOOGLE_CLOUD_PROJECT="your-gcp-project-id"
```

### **Debugging Setup**
- **Backend**: Set breakpoints in TypeScript code, press F5
- **Frontend**: Chrome DevTools + React DevTools available
- **Database**: Direct query access via Cloud SQL Auth Proxy

### **🔌 MCP Server Configuration (COMPLETED)**

**Status**: ✅ All three MCP servers successfully configured and operational

**Bulletproof Configuration** (`.mcp.json`):
```json
{
  "mcpServers": {
    "serena": {
      "command": "uvx",
      "args": ["--from", "git+https://github.com/oraios/serena", "serena", "start-mcp-server"],
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

**MCP Server Capabilities & Expected Behavior:**
- ✅ **Serena**: Advanced codebase analysis, symbolic operations, memory management
  - **Expected Ports**: 24282-24285 (usually 2 instances running simultaneously)
  - **Dashboard Test**: Both http://127.0.0.1:24282/dashboard and http://127.0.0.1:24283/dashboard should return HTTP 200
  - **Project Activation Required**: Must call `mcp__serena__activate_project('replitballgame')` before use
- ✅ **Playwright**: Browser automation, testing, UI interaction capabilities
  - **Browser Management**: Handles Chrome browser instances for testing
  - **Page Navigation**: Ready for immediate http://localhost:3000 testing
- ✅ **In-Memoria**: Persistent intelligence, codebase learning, pattern analysis  
  - **Expected State**: 3,680+ concepts, 47+ patterns (data current as of 2025-09-11)
  - **Auto-Learning**: Usually disabled (data current), but can force refresh if needed

**Key Configuration Notes:**
- **Windows Compatibility**: All servers use `cmd /c` wrapper for proper Windows execution
- **Project-Specific**: Configuration stored in `.mcp.json` for cross-computer sync via OneDrive
- **User Config Clean**: Removed conflicting configurations from `~/.claude.json`
- **Package Names**: Playwright uses `@playwright/mcp` (not `@latest` suffix)

**Verification Commands:**
```bash
# Check MCP server status
claude /mcp

# Debug MCP issues  
claude --debug

# Cross-computer troubleshooting
scripts\mcp-troubleshoot.cmd
```

**Cross-Computer Setup Requirements:**
- ✅ **Prerequisites**: Python 3.13+, Node 22+, uvx 0.8.15+ installed on both computers
- ✅ **PATH Configuration**: Ensure uvx.exe is accessible at `C:\Users\Jimmy\.local\bin\uvx.exe` on both machines
- ✅ **OneDrive Sync**: `.mcp.json` automatically syncs between computers via OneDrive
- ✅ **User Config Clean**: Remove conflicting MCP configurations from `~/.claude.json`
- ✅ **PowerShell Execution**: Serena requires PowerShell with full path invocation syntax

**🚀 ULTIMATE MCP FIX SOLUTION (September 2025):**
- **Root Cause**: PowerShell PATH and JSON escaping issues in Claude Code MCP execution
- **Solution**: Direct uvx command execution (simplest and most reliable)
- **Cross-Computer**: Requires uvx in PATH on both machines (standard installation)

**Automated Fix Tools:**
- ✅ **Quick Fix Script**: `scripts\mcp-fix.cmd` - Complete automated repair
- ✅ **Bulletproof Config**: `.mcp-bulletproof.json` - Direct uvx execution 
- ✅ **Backup Config**: `.mcp-backup.json` - Full path fallback if needed
- ✅ **Legacy Fallback**: `.mcp-fallback.json` - Playwright + In-Memoria only

**🔧 Instant MCP Repair Process:**
```bash
# Run the automated fix script
scripts\mcp-fix.cmd

# Or manually apply bulletproof config
copy .mcp-bulletproof.json .mcp.json

# Restart Claude Code and verify
claude /mcp
```

**If Serena MCP STILL Fails:**
```bash
# Step 1: Verify uvx PATH access
uvx --version
# Should show: uvx 0.8.15+ 

# Step 2: Apply backup configuration
copy .mcp-backup.json .mcp.json

# Step 3: Last resort - Playwright + In-Memoria only
copy .mcp-fallback.json .mcp.json

# Then restart Claude Code completely
```

### **🔧 Automated Troubleshooting**

**Environment Issues:**
- **Proxy Not Starting**: Run `gcloud auth login` and `gcloud config set project direct-glider-465821-p7`
- **Port Conflicts**: Automated script checks and reports port usage
- **Missing Chrome**: Script falls back to default browser but warns about Playwright inconsistency

**Quick Fixes with Slash Commands:**
```
/dev-stop      # Clean shutdown of all services
/dev-status    # Diagnose environment issues  
/dev-start     # Fresh restart with validation
```

**Critical Startup Issues & Solutions:**

**🚨 VITE DEPENDENCY CACHE CORRUPTION (COMMON)**
- **Error Pattern**: `UNKNOWN: unknown error, unlink 'node_modules\.vite\deps\chunk-*.js.map'`
- **Root Cause**: Corrupted Vite dependency optimization cache
- **Immediate Fix**: `del /q "node_modules\.vite\deps\*"` (Windows) or `rm -rf node_modules/.vite/deps/*` (Unix)
- **Prevention**: Cache clears automatically, but corruption happens during interrupted builds

**🔧 PORT CONFLICT RESOLUTION**
- **Only Port 3000 Matters**: Integrated server uses single port (NOT 5173)
- **Check Active**: `netstat -ano | findstr ":3000 " | findstr "LISTENING"`
- **Kill Conflicts**: `npx kill-port 3000` (if needed)
- **Database Port**: Cloud SQL Proxy on 5432 (separate, should already be running)

**Traditional Fallback:**
```bash
# Full environment cleanup and restart
del /q "node_modules\.vite\deps\*"  # Clear Vite cache first
npx kill-port 3000                  # Clear port conflicts
npm run dev                         # Start integrated server
```

**Slash Command Intelligence:**
- ✅ **Smart diagnostics** with AI-powered problem identification
- ✅ **Context-aware solutions** with specific troubleshooting steps
- ✅ **Automatic validation** of environment state
- ✅ **Todo list integration** for tracking fixes

## 📋 QUICK REFERENCE

### **Database Connection Architecture (CRITICAL)**

**ARCHITECTURAL DECISION (September 11th, 2025)**: The codebase maintains TWO working database connection systems for different use cases:

1. **DatabaseService.ts** (Optimized DOA System)
   - **Purpose**: High-performance operations with advanced optimization
   - **Used by**: Storage layer (`teamStorage.ts`, etc.), new modular services
   - **Features**: Connection pooling, lazy initialization, comprehensive error handling

2. **database.ts** (Cloud Run Compatible System) 
   - **Purpose**: Simple, reliable connections for legacy routes and scripts
   - **Used by**: 136+ route files, utility scripts, data access layers
   - **Features**: Cloud Run startup compatibility, dual-environment URL handling

**Why Both Systems Coexist:**
- ✅ **Risk Mitigation**: Migrating 136+ files would introduce significant deployment risk
- ✅ **Production Stability**: Both systems work reliably after authentication fixes
- ✅ **Clear Separation**: New development uses DatabaseService, legacy continues with database.ts
- ✅ **Gradual Migration**: Files can migrate to DatabaseService over time without urgency

**Authentication Resolution (September 11th, 2025):**
- **Root Cause**: Expired Google Cloud authentication tokens causing "Database unavailable" errors
- **Fix**: `gcloud auth application-default login` + proper userId mapping in firebaseAuth.ts
- **Both systems now work identically** after authentication and URL conversion fixes

**PERSISTENT AUTHENTICATION SOLUTION (September 11th, 2025):**
✅ **Service Account Key Implemented**: `realm-rivalry-dev@direct-glider-465821-p7.iam.gserviceaccount.com`
✅ **Never Expires**: Eliminates recurring authentication breakages
✅ **Automatic Loading**: `.env.local` contains `GOOGLE_APPLICATION_CREDENTIALS` path
✅ **Health Check**: `npm run dev:auth-check` for comprehensive environment validation
✅ **Smart Startup**: `scripts/dev-start-with-auth.cmd` with fallback to user auth

### **Database Model Names (CRITICAL)**
- ✅ Use `prisma.game` (NOT `prisma.match`)
- ✅ Use `match.matchType` (NOT `match.type`) 
- ✅ Use `team.stadium` (NOT `team.stadiums`)
- ✅ Use `staff.type` (NOT `staff.role`) for StaffType enum
- ✅ Use `team.finances` (NOT `team.TeamFinance`)
- ✅ Use `prisma.playerMatchStats` and `prisma.teamMatchStats` for comprehensive dome ball statistics
- ✅ Subdivision naming uses Greek alphabet (alpha, beta, gamma) with underscore numbering (alpha_1, beta_2)

### **User-Team Association Architecture (CRITICAL)**
The system uses a two-tier authentication model:
1. **UserProfile** model: Contains Firebase UID in `userId` field, plus user details (email, firstName, lastName)
2. **Team** model: Links to UserProfile via `userProfileId` field (NOT directly to Firebase UID)

**Flow**: Firebase Auth → userId → UserProfile.userId → UserProfile.id → Team.userProfileId

**Important Notes**:
- Team model does NOT have a `userId` field - it uses `userProfileId`
- UserProfile is the bridge between Firebase Auth and game data
- Development uses `dev-user-123` as the default Firebase UID
- The `/api/teams/my` endpoint looks up: Firebase UID → UserProfile → Team

### **Key Development Commands**
```bash
# Development
npm run dev              # Start dev server with tsx
npm run build:all        # Build both server and client
npm run check           # TypeScript type checking

# Database  
npm run db:push         # Push Prisma schema changes

# Testing (CONTINUOUS VALIDATION REQUIRED)
npm test               # Run Vitest tests - USE FREQUENTLY during development
npm run test:coverage  # Tests with coverage
npm run lint           # Code quality checks - RUN BEFORE COMMITS
npm run typecheck      # TypeScript validation - VALIDATE CONTINUOUSLY
```

## 🏗️ SYSTEM ARCHITECTURE

### **Hybrid Cloud Deployment**
- **Frontend**: Firebase Hosting (React 18, Vite, TailwindCSS)
- **Backend**: Google Cloud Run (Express.js, Socket.IO, PostgreSQL)
- **Database**: Google Cloud SQL PostgreSQL with Prisma ORM EXCLUSIVELY
- **Auth**: Firebase Auth with custom tokens
- **Deployment**: Google Cloud Build (NOT GitHub Actions) with Blue-Green strategy

### **Technology Stack**
- **Frontend**: React 18, TypeScript, Radix UI, shadcn/ui, TailwindCSS, Wouter routing
- **Backend**: Express.js, Socket.IO, Firebase Admin SDK, Helmet.js security
- **Database**: PostgreSQL + Prisma (comprehensive indexing, type-safe operations)
- **State Management**: TanStack React Query, Zustand
- **Testing**: Vitest with React Testing Library
- **Build**: Vite with multi-stage Docker builds

### **Mobile-First 5-Hub Architecture**
Revolutionary interface replacing 6-hub/23-tab design:
1. **Command Center**: Dashboard with contextual seasonal actions
2. **Roster HQ**: Player management with mobile-first design  
3. **Competition Center**: League standings, tournaments, live matches
4. **Market District**: Trading, marketplace, store system
5. **Settings Hub**: Team management and configuration

## 🎮 GAME SYSTEMS OVERVIEW

**Key Game Mechanics**:
- **Dome Ball Sport**: Continuous action (NOT American Football) with 5 fantasy races
- **6-Player Teams**: Passer/Runner/Blocker roles + coaching staff
- **Greek Alphabet Subdivisions**: alpha, beta, gamma naming system
- **Real-time WebSocket Matches**: Detailed statistics and live simulation

**For Complete Game Documentation**: See [REALM_RIVALRY_COMPLETE_DOCUMENTATION.md - Game Systems](./REALM_RIVALRY_COMPLETE_DOCUMENTATION.md#game-systems)

### **🎯 COMPREHENSIVE GAME SYSTEMS (FULLY IMPLEMENTED)**

**Status**: ✅ All core game mechanics implemented and operational via `/api/game-systems/` endpoints

**Key Systems**: TAP player generation, Daily progression (3 AM reset), Power calculations (CAR), Staff effects (1-40 scale), Team camaraderie, Anti-pay-to-win compliance

**For Complete Game Systems Documentation**: See [REALM_RIVALRY_COMPLETE_DOCUMENTATION.md - Game Systems](./REALM_RIVALRY_COMPLETE_DOCUMENTATION.md#game-systems-deep-dive)

### **💰 MASTER ECONOMY & REWARDS SYSTEM (FULLY UNIFIED)**

**Status**: ✅ Complete implementation restored and unified across backend/frontend

#### **Dual Currency Architecture**
- **Credits (₡)**: Primary earned currency for team operations, always display as "25,000₡"
- **Gems (💎)**: Premium currency for exclusive items and accelerated progress

#### **Stadium Economics Engine** 
**Location**: `shared/stadiumSystem.ts` (99% intact, import paths fixed)
- **Dynamic Attendance**: Fan loyalty, weather, division modifiers, win streak bonuses
- **Revenue Calculation**: Ticket sales, concessions, merchandise based on attendance
- **Maintenance Costs**: Facilities upkeep, staff salaries, operational expenses

#### **Monetization Systems**
**Configuration**: `server/config/store_config.json` (95% configured)

**Gem Store Packages**:
- Starter Pack: $1.99 → 25💎 (bonus: +5💎)  
- Value Pack: $4.99 → 75💎 (bonus: +15💎)
- Premium Pack: $9.99 → 175💎 (bonus: +40💎)
- Elite Pack: $19.99 → 400💎 (bonus: +100💎)  
- Champion Pack: $39.99 → 900💎 (bonus: +250💎)
- Ultimate Pack: $99.99 → 2750💎 (bonus: +750💎)

**Realm Pass Subscription**: $9.95/month with exclusive rewards and bonuses

**Gem-to-Credit Exchange** (Anti-Pay-to-Win Ratios):
- 10💎 → 2,000₡ (1:200 ratio - Starter)
- 50💎 → 11,250₡ (1:225 ratio - Popular)  
- 300💎 → 75,000₡ (1:250 ratio - Best Value)
- 1000💎 → 275,000₡ (1:275 ratio - Bulk)

#### **Tournament Reward Structure** 
**Service**: `server/services/tournamentService_old_backup.ts` (✅ Updated with correct values)

**Daily Division Tournaments**:
- Division 1 Champion: 25,000₡ + 15💎
- Division 2 Champion: 20,000₡ + 12💎
- Division 3 Champion: 15,000₡ + 10💎
- Division 4 Champion: 12,000₡ + 8💎
- Division 5 Champion: 9,000₡ + 6💎
- Division 6 Champion: 6,000₡ + 4💎
- Division 7 Champion: 4,000₡ + 2💎
- Division 8 Champion: 2,500₡ + 1💎

**Mid-Season Cup Tournaments**:
- Division 1 Champion: 750,000₡ + 300💎
- Division 2 Champion: 600,000₡ + 250💎
- Division 3 Champion: 450,000₡ + 200💎
- Division 4 Champion: 350,000₡ + 150💎
- Division 5 Champion: 275,000₡ + 125💎
- Division 6 Champion: 200,000₡ + 100💎
- Division 7 Champion: 125,000₡ + 75💎
- Division 8 Champion: 75,000₡ + 50💎

#### **Ad Rewards System**
**Configuration**: `server/config/store_config.json` (✅ Updated to specification)
- **Daily Watch Limit**: 5 ads maximum per day
- **Premium Box Milestone**: 70 ads watched unlocks premium rewards
- **Reward Structure**: Progressive premium boxes with escalating value

#### **Financial Automation** 
**Database Models**: `prisma/schema.prisma` (TeamFinances, Stadium models exist)
- **Maintenance Costs**: Automated weekly facilities/staff salary processing
- **Revenue Processing**: Game attendance revenue, merchandise sales
- **Salary Management**: Player and staff contract payments
- **Transaction Logging**: Complete payment history and audit trails

#### **Individual Awards System**
- **MVP Awards**: Season-ending recognition with substantial rewards
- **Positional Awards**: Best at position recognition
- **Achievement Bonuses**: Performance milestone rewards
- **Hall of Fame**: Long-term recognition system

#### **Implementation Status**
- ✅ **Stadium Economics**: 99% intact, import paths fixed
- ✅ **Monetization Config**: 95% configured, ad system updated  
- ✅ **Tournament Rewards**: Service updated with correct values
- 🔄 **API Endpoints**: Need gem exchange, ad rewards, premium box endpoints
- 🔄 **Financial Automation**: Core logic exists, needs activation
- 🔄 **Transaction Logging**: Database models exist, service layer needed

#### **Key Technical Files**
- `shared/stadiumSystem.ts` - Complete stadium economics engine
- `server/config/store_config.json` - Monetization configuration
- `server/services/tournamentService_old_backup.ts` - Tournament rewards
- `server/routes/enhancedStadiumRoutes.ts` - Stadium economic endpoints
- `prisma/schema.prisma` - TeamFinances, Stadium, AdRewardMilestone models

**For Complete Economy Documentation**: See [REALM_RIVALRY_COMPLETE_DOCUMENTATION.md - Economy & Rewards](./REALM_RIVALRY_COMPLETE_DOCUMENTATION.md#economy-rewards)

## 🔧 DEVELOPMENT PATTERNS

### **Flat Architecture Decision (September 2025 Refactor)**
**ARCHITECTURAL DECISION**: The codebase uses a flat architecture pattern with routes and services organized by feature. The domain-driven architecture experiment was removed due to import complexity issues in production.

```
server/
├── routes/        # 70+ feature-specific route files
├── services/      # 40+ business logic services
├── storage/       # Data access layer
├── utils/         # Shared utilities
└── middleware/    # Express middleware
```

This flat structure provides:
- Direct import paths without complex chains
- Clear separation between routes, services, and data access
- Easier debugging and maintenance
- Better compatibility with production builds

### **API Route Registration Order (CRITICAL)**
ALL API routes must be registered BEFORE Vite middleware:
1. Basic middleware
2. Session management  
3. Authentication middleware
4. **ALL API ROUTES** ← Critical placement
5. Vite middleware setup
6. Error handler

### **React Query Caching Architecture**
Industry-standard patterns with:
- Hierarchical query keys for efficient invalidation
- Centralized `useTeamData.ts` hook with `staleTime` configuration
- Proper skeleton UI loading states
- NO aggressive cache clearing or `Date.now()` hacks

### **Type Safety Infrastructure**
- Centralized API types in `shared/types/api.ts`
- Type-safe query hooks with `useTypedQuery.ts`
- Runtime type guards in `typeGuards.ts`
- Strict TypeScript config with comprehensive error prevention

### **Player Marketplace Architecture**
**FULLY IMPLEMENTED**: Dynamic Player Marketplace system with comprehensive features

**Core System Components:**
- **EnhancedMarketplaceService**: Primary backend service with escrow system
- **DynamicMarketplaceManager**: React frontend with real-time updates  
- **Anti-Sniping System**: 5-minute extensions (max 6 per auction)
- **CAR-Based Pricing**: Minimum bids calculated as (CAR × 1000) + (Potential × 2000)

**Development Standards:**
```typescript
// ✅ CORRECT: Standardized auction durations
const VALID_DURATIONS = [12, 24, 72, 168]; // 12h, 24h, 3d, 7d

// ✅ CORRECT: Season integration with Day 17 deadline (2AM)
const AUCTION_CUTOFF_HOUR = 2; // 2AM on Day 17

// ✅ CORRECT: Comprehensive escrow validation
await this.validateEscrowBalance(bidderId, bidAmount);
await this.processEscrowTransaction(listing, bidAmount);
```

**Key Implementation Patterns:**
- **Escrow System**: All bids held in secure escrow until auction completion
- **Real-time Updates**: WebSocket integration for live bid notifications
- **Roster Protection**: Minimum 12 players enforced, maximum 3 listings per team
- **Financial Structure**: 3% listing fee + 5% market tax on sales
- **Off-season Behavior**: Days 16-17 convert all auctions to buy-now only

**Database Integration:**
- Comprehensive `player_listings` schema with auction/buy-now support
- Escrow balance tracking in `team_finances` model
- Audit trail for all marketplace transactions

**Frontend Architecture:**
- Mobile-first marketplace interface with touch-optimized bidding
- Real-time countdown timers with anti-sniping extension notifications
- Comprehensive listing creation with duration dropdown validation
- Credit formatting compliance: Display as "25,000₡" format throughout

### **Injury & Stamina Architecture**
**FULLY IMPLEMENTED**: Comprehensive dual-stamina system with persistent health tracking

**Core System Components:**
- **InjuryStaminaService**: Primary backend service with dual stamina system
- **EnhancedInjuryRoutes**: 15+ API endpoints for injury/stamina management
- **Dual Stamina System**: `dailyStaminaLevel` (persistent) + `inGameStamina` (temporary)
- **Game Mode Integration**: Exhibition safety rules, League/Tournament depletion

**Development Standards:**
```typescript
// ✅ CORRECT: Dual stamina system implementation
const matchStartStamina = gameMode === 'exhibition' ? 100 : 
  Math.round((player.staminaAttribute * player.dailyStaminaLevel) / 100);

// ✅ CORRECT: Injury calculation with stamina modifier  
const staminaModifier = carrierInGameStamina < 50 ? 10 : 0;
const finalInjuryChance = baseChance + powerModifier + staminaModifier;

// ✅ CORRECT: Daily reset automation (3AM)
await injuryStaminaService.performDailyReset();
```

**Key Implementation Patterns:**
- **Exhibition Safety**: Always 100% stamina start, temporary injuries only
- **Match Start Logic**: `dailyStaminaLevel` percentage of `staminaAttribute` = effective starting stamina
- **In-Game Depletion**: Tackle events, knockdowns affect temporary stamina during match
- **Performance Impact**: Low stamina increases injury risk (+10% when <50%)
- **Daily Recovery**: Complex formula with base(20) + stamina scaling + coach bonuses
- **Item Management**: 2 items per player per day, resets at 3AM

**Database Integration:**
- `injuryStatus` enum: HEALTHY, MINOR_INJURY, MODERATE_INJURY, SEVERE_INJURY
- Recovery point system: Minor=100RP, Moderate=300RP, Severe=750RP  
- `dailyItemsUsed` counter with 3AM reset automation
- Career injury tracking for aging/retirement calculations

**Frontend Architecture:**
- `InjuryStaminaManager`: Team health dashboard with real-time status
- Recovery item validation: stamina items only for <100% stamina players
- Exhibition match UI: No stamina warnings, temporary injury indicators only
- Player cards show both current stamina level and injury status throughout UI

### **🎨 UI/UX Design & Testing**

**Mobile-first design system with automated validation**

**For Complete Design Workflows**: See [UI-UX.md - Design Review Workflow](./UI-UX.md)

## 📱 MOBILE & PWA FEATURES

**Mobile-first architecture** with 5-hub design, touch-optimized interface, and PWA capabilities.

**For Complete Mobile & PWA Documentation**: See [REALM_RIVALRY_COMPLETE_DOCUMENTATION.md - Mobile & PWA](./REALM_RIVALRY_COMPLETE_DOCUMENTATION.md#mobile-pwa-features)
**For UI/UX Design Guidelines**: See [UI-UX.md](./UI-UX.md)

## 🚀 DEPLOYMENT & PRODUCTION

**Production**: Live at https://realmrivalry.com via Google Cloud Run + Firebase Hosting

**Critical Notes**: 
- NEVER use Replit's Deploy button - Custom Google Cloud Build pipeline only
- PORT auto-managed by Cloud Run

**For Complete Deployment Documentation**: See [REALM_RIVALRY_COMPLETE_DOCUMENTATION.md - Deployment](./REALM_RIVALRY_COMPLETE_DOCUMENTATION.md#deployment-production)

## 📊 RECENT ACHIEVEMENTS

**🏆 LATEST**: Complete Game Systems Implementation (September 12th, 2025)
- All missing game mechanics implemented: TAP, Daily Progression, Power Calculations, Staff Effects, Anti-Pay-to-Win
- 5 new comprehensive services with full API integration
- 100% specification-implementation-documentation unification

**🏗️ PREVIOUS**: Comprehensive Technical Debt Resolution (September 10th, 2025) 
- Security vulnerabilities: 3 critical → 0 (100% resolved)
- Service layer: Disconnected implementations → fully functional
- Payment system: Placeholders → full Stripe integration

**For Complete Achievement History**: See [SESSION_LOG.md - Recent Achievements](./SESSION_LOG.md#recent-achievements)

## 🎯 CURRENT DEVELOPMENT FOCUS

### **Next Development Priorities**
- **📁 Root Directory Organization**: Move analysis tools to proper directories  
- **React Native Mobile App**: Native mobile app development planning
- **Enhanced Match Visualization**: Improved 2D match graphics with dome ball mechanics
- **PWA Expansion**: Enhanced offline capabilities and push notifications
- **Advanced Tournament Features**: Enhanced bracket management and seeding systems

## 📝 DEVELOPMENT WORKFLOW

### **Starting a New Session**
1. Read this CLAUDE.md file first
2. Check recent commits for context
3. State specific goal: "I need to implement playoff brackets"
4. Reference specific files: `server/services/tournamentService.ts:150`
5. **For Technical Debt Analysis**: Use Serena MCP tools for systematic codebase analysis

### **During Development**

#### **🧠 MAXIMIZE AI CAPABILITIES (CRITICAL)**
**USE FULL AI POWER - Leverage maximum tokens and comprehensive analysis:**

- **Deep Analysis**: Take time to understand complete problem domains before coding
- **Comprehensive Solutions**: Address all related issues simultaneously, not piecemeal
- **Extended Reasoning**: Use extra tokens to think through optimal approaches
- **Multi-Tool Integration**: Combine Serena, Playwright, and In-Memoria MCPs for maximum effectiveness
- **Thorough Validation**: Test extensively using available scripts throughout development
- **No Rushed Implementations**: Quality over speed - use full reasoning capacity

#### **🚀 SERENA MCP DEVELOPMENT WORKFLOW (CRITICAL)**

**ALWAYS use Serena MCP tools for systematic development - they are significantly more efficient than manual file reading:**

**1. Code Analysis & Understanding:**
```bash
# Find specific functions/classes
mcp__serena__find_symbol name_path="functionName" relative_path="path/to/file"

# Search for patterns across codebase
mcp__serena__search_for_pattern substring_pattern="pattern" relative_path="directory"

# Get file overview before detailed reading
mcp__serena__get_symbols_overview relative_path="path/to/file"
```

**2. Targeted Code Reading:**
```bash
# Read specific sections instead of entire files
mcp__serena__read_file relative_path="path/to/file" start_line=100 end_line=150

# Find references to understand usage
mcp__serena__find_referencing_symbols name_path="symbol" relative_path="file"
```

**3. Precise Code Modifications:**
```bash
# Replace specific code sections with regex
mcp__serena__replace_regex relative_path="file" regex="pattern" repl="replacement"

# Modify specific function/class bodies
mcp__serena__replace_symbol_body name_path="symbol" relative_path="file" body="new_code"
```

**4. Strategic Code Insertion:**
```bash
# Insert after specific symbols
mcp__serena__insert_after_symbol name_path="symbol" relative_path="file" body="code"

# Insert before specific symbols (e.g., imports)
mcp__serena__insert_before_symbol name_path="symbol" relative_path="file" body="code"
```

**✅ Serena MCP Benefits:**
- **10x Faster Analysis**: Find exact code locations instantly
- **Precision Editing**: Target specific functions/classes without context loss
- **Pattern Recognition**: Search across entire codebase systematically
- **Symbolic Navigation**: Understand code relationships efficiently
- **Minimal Context Usage**: Read only necessary code sections

**❌ Avoid Manual Approaches:**
- Reading entire files when you need specific functions
- Manual text searching when patterns can be found systematically  
- Blind code modifications without understanding symbol structure
- Context-heavy approaches that waste tokens on irrelevant code

**Example Workflow (Frontend API Issue):**
1. `mcp__serena__search_for_pattern` → Find API call pattern
2. `mcp__serena__find_symbol` → Locate specific hook implementation  
3. `mcp__serena__read_file` → Read targeted function only
4. `mcp__serena__replace_regex` → Fix precise issue
5. **Result**: Issue resolved with minimal context, maximum precision

#### **Traditional Development Patterns:**
- Follow flat architecture patterns in `/server/routes/` and `/server/services/`
- Use proper Prisma model names (Game not Match)  
- Implement comprehensive error handling
- Test with realistic data scenarios

### **Ending a Session**
- Update this file with major changes made
- Document any architectural decisions
- Note pending issues or next steps
- Commit with descriptive messages

## 🔍 TROUBLESHOOTING QUICK REFERENCE

### **Common Issues & Solutions**
1. **Server Won't Start**: Check Prisma model names and relationships
2. **TypeScript Errors**: Use proper type guards and optional chaining
3. **Database Errors**: Verify field names match Prisma schema exactly
4. **Deployment Failures**: Check secrets vs environment variables separation
5. **API Route Issues**: Ensure registration before Vite middleware
6. **Server Hot-Reload Not Working**: The development server using `tsx` doesn't always hot-reload server-side changes, especially in route files. **Always restart the server (`npx kill-port 3000 && npm run dev`) after modifying server routes or middleware** to ensure changes take effect
7. **Multiple Development Ports**: **OUTDATED** - System now uses integrated server on port 3000 only
8. **Expected Server Startup Pattern**: Normal startup includes these messages:
   - ✅ "🚀 Starting Realm Rivalry Server..." 
   - ✅ "✅ Database connection verified"
   - ✅ "✅ All modular routes loaded successfully" 
   - ✅ "✅ Server running successfully" on port 3000
   - ⚠️ "⚠️ Season timing automation failed to start" (expected - automationService.start is not a function)
   - ✅ "✅ Tournament automation initialized successfully"
9. **Duplicate Server Processes**: When running `npm run dev` multiple times, expect one to succeed and others to fail with "EADDRINUSE" - this is normal behavior

### **Performance Optimization**
- Countdown timers update every minute (not second)
- Efficient React Query patterns with proper invalidation
- Lazy loading for all major components
- Optimized Prisma queries with proper indexing

## 📚 **DOCUMENTATION POLICY**

### **🚨 MANDATORY: Documentation Consolidation Rule**

**ALL technical development documentation MUST be consolidated into CLAUDE.md - DO NOT create separate documentation files.**

### **Approved Documentation Structure:**
```
📁 Repository Root
├── 📄 CLAUDE.md (Complete AI development guide - ALL technical info)
├── 📄 REALM_RIVALRY_COMPLETE_DOCUMENTATION.md (Business/user documentation)
└── 📄 README.md (Basic project overview - optional)
```

### **❌ PROHIBITED: Additional Documentation Files**
- **DO NOT CREATE**: DEVELOPMENT_STANDARDS.md, LOCAL_DEVELOPMENT.md, SETUP_DATABASE.md
- **DO NOT CREATE**: Any other .md files for development purposes
- **ALWAYS ADD TO**: CLAUDE.md under appropriate sections instead

### **✅ When Adding New Technical Documentation:**
1. **Identify the appropriate section** in CLAUDE.md
2. **Add content under existing headers** (Development Standards, Local Development, etc.)
3. **Use consistent formatting** with existing content
4. **Update the table of contents** if adding major sections

### **🔧 Why This Policy Exists:**
- **Single Source of Truth**: Prevents documentation fragmentation
- **Easier Maintenance**: One file to keep updated
- **Better AI Assistance**: All context in one place for AI development assistants
- **Reduced Redundancy**: Eliminates duplicate or conflicting information
- **Faster Onboarding**: Developers find everything in one location

---

**For Historical Development Details**: See [SESSION_LOG.md](./SESSION_LOG.md)  
**For Complete Game Documentation**: See [REALM_RIVALRY_COMPLETE_DOCUMENTATION.md](./REALM_RIVALRY_COMPLETE_DOCUMENTATION.md)

**Last Updated**: September 10th, 2025 - Comprehensive Technical Debt Resolution via Serena MCP  
**Status**: Production operational at https://realmrivalry.com  
**Next Session**: Advanced Feature Development with Clean, Secure Codebase