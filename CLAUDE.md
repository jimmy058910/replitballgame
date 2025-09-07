# CLAUDE.md - Realm Rivalry Development Guide

**This file provides comprehensive guidance to ALL AI development assistants (Claude Code, Replit AI, GitHub Copilot, etc.) when working with code in this repository.**

## 🤖 AI Development Assistant Instructions

**For Claude Code (claude.ai/code)**: This serves as your primary reference for development context, technical decisions, and session continuity.

**For Replit AI**: Use this file's principles and architecture details for all development work within the Replit environment.

**For Any AI Assistant**: Follow the development principles, code standards, and architectural patterns defined here to maintain consistency.

## 🚨 CRITICAL DEVELOPMENT PRINCIPLES

### **ZERO TECHNICAL DEBT POLICY**
- **NO BAND-AIDS**: Temporary fixes, workarounds, or placeholder solutions are PROHIBITED
- **NO SHORTCUTS**: All features must be implemented using proper, industry-standard approaches  
- **NO TECHNICAL DEBT**: Every solution must be the correct, long-term implementation from the start

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

### **UNIVERSAL CREDIT FORMAT STANDARD**
Credits must ALWAYS be displayed with amount BEFORE the ₡ symbol:
- ✅ CORRECT: "25,000₡", "1.5M₡", "0₡"  
- ❌ INCORRECT: "₡25,000", "₡1.5M", "₡0"
- **Implementation**: Use the creditFormatter utility (`client/src/utils/creditFormatter.ts`) for standardized formatting

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
✅ **Live Preview**: Frontend automatically opens at http://localhost:5173  
✅ **Hot Reloading**: Instant updates when you save files  
✅ **Database Integration**: Real Cloud SQL connection via Auth Proxy  
✅ **Debugging**: Full breakpoint debugging in IDE  
✅ **API Proxy**: Seamless API calls from frontend to backend  
✅ **WebSocket Support**: Real-time Socket.IO connections  

### **Daily Development Workflow**
1. Open your IDE (Cursor AI recommended)
2. Run: `npm run dev:local`
3. Browser automatically opens to http://localhost:5173
4. Start coding - changes appear instantly!

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

### **Troubleshooting**
- **"Upgrade Required" Error**: Backend isn't connected to database - ensure Cloud SQL Auth Proxy is running
- **Port Conflicts**: Use `npx kill-port 3000 5173` or change ports in .env.local
- **TypeScript Errors**: Run `npm run check` and `npm run build:all`

## 📋 QUICK REFERENCE

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

# Testing
npm test               # Run Vitest tests
npm run test:coverage  # Tests with coverage
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

### **Core Game Mechanics**
- **Fantasy Sports**: "Dome Ball" sport with 5 races (Human, Sylvan, Gryll, Lumina, Umbra)
- **🏟️ CRITICAL - Dome Ball Nature**: NOT American Football - continuous action with no downs, no stoppages (except after scores), no timeouts, no out of bounds, no penalties. Anything goes action in enclosed dome
- **Team Structure**: 6-player teams (Passer, Runner, Blocker roles) + coaching staff
- **Camaraderie System**: 5-tier team chemistry affecting performance (Excellent/Good/Average/Low/Poor)
- **Stadium Economics**: Revenue from tickets, concessions, parking, VIP suites
- **Tactical Systems**: Field size choices and strategic focuses
- **16-Skill Progression**: Dynamic aging, retirement, injury mechanics
- **Greek Alphabet Subdivisions**: All subdivisions use Greek alphabet naming (alpha, beta, gamma) with numbered extensions (alpha_1, beta_2) when needed

### **Competition Systems**  
- **Real-time Match Engine**: WebSocket-powered simulation with detailed statistics
- **League Structure**: 8 divisions with subdivision support, seasonal progression
- **Tournament System**: Daily tournaments with bracket management
- **Multi-currency Economy**: Credits (₡) and gems with marketplace trading

### **Advanced Features**
- **Equipment System**: Stat-boosting items and consumables
- **Camaraderie Effects**: Team chemistry impacts stats, injuries, contract negotiations
- **Coaching Integration**: Head coach tactics skill affects team performance
- **Player Development**: Age-based progression with potential, injury, and loyalty factors

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

## 📱 MOBILE & PWA FEATURES

### **Mobile-First Design**
- Touch targets >44px, responsive grid systems
- Hub-specific gradients, safe area insets
- Lazy loading for all components
- Service workers for offline functionality

### **PWA Capabilities**
- App manifest for app store installation
- Push notifications support
- Offline functionality with service workers
- Mobile-optimized navigation and interactions

## 🚀 DEPLOYMENT & PRODUCTION

### **Google Cloud Infrastructure**
- **Cloud Run**: Containerized backend deployment
- **Artifact Registry**: Docker image storage with layer caching
- **Cloud Build**: Automated CI/CD pipeline (replaced GitHub Actions)
- **Secret Manager**: Secure environment variable management

### **Deployment Pipeline**  
- Triggers on Git push from Replit
- Multi-stage Dockerfile with aggressive layer caching
- Blue-Green deployment for zero-downtime releases
- Health checks and database integration verification

### **CRITICAL DEPLOYMENT NOTES**
- **NEVER use Replit's Deploy button** - Custom pipeline only
- **Reserved Variables**: PORT is auto-managed by Cloud Run
- **Secrets vs Env Vars**: Proper separation required for deployment success

### **External Dependencies**
- **Google Cloud Platform**: Cloud Run, Artifact Registry, IAM, Cloud SQL PostgreSQL
- **Firebase**: Frontend hosting, authentication services  
- **Unity Ads**: Monetization platform
- **Stripe**: Payment processing
- **Google Fonts**: Orbitron, Inter font families
- **Font Awesome**: Icon library
- **Development Tools**: Vite, Docker, GitHub Actions, Prisma ORM

## 📊 RECENT ACHIEVEMENTS

### **September 3rd, 2025 - Comprehensive System Overhaul**

**Major Systems Implemented:**
- ✅ **Dynamic Playoff Scheduling**: Implemented real-time playoff round scheduling that monitors match completion times and dynamically schedules subsequent rounds 30 minutes after previous round completion
- ✅ **Comprehensive Dome Ball Statistics System**: Complete overhaul of player and team statistics tracking with 25+ individual player stats and 20+ team stats reflecting continuous action gameplay
- ✅ **Statistics Database Persistence**: Fixed major gap between statistics generation and database storage - statistics are now properly saved to `PlayerMatchStats` and `TeamMatchStats` models
- ✅ **Greek Alphabet Subdivision System**: Consistent implementation of Greek alphabet naming (alpha, beta, gamma, etc.) replacing hardcoded "main/east/west" defaults
- ✅ **Late Signup System Validation**: Comprehensive bulletproofing of Division 8 late registration system with AI auto-fill and shortened seasons

**Systems Completely Removed:**
- ❌ **Equipment Enhancement System**: Removed unintended upgrade mechanics with enhancement stones
- ❌ **Equipment Durability System**: Removed durability degradation and repair mechanics  
- ❌ **Salary Cap & Financial Fair Play**: Removed luxury tax, cap limits, and contract restrictions

**Key Technical Files Modified:**
- `server/services/seasonTimingAutomationService.ts`: Added playoff generation trigger on Day 14→15 advancement
- `server/services/seasonalFlowService.ts`: Fixed Division 2 to use 8-team brackets, implemented first-round-only scheduling
- `server/services/dynamicPlayoffService.ts`: **NEW** - Real-time playoff round monitoring and dynamic scheduling
- `server/services/lateSignupService.ts`: Enhanced Greek alphabet subdivision naming with numbered extensions
- `server/storage/teamStorage.ts`: Added `getDefaultSubdivision()` function to replace hardcoded defaults
- `prisma/schema.prisma`: Added comprehensive `PlayerMatchStats` and `TeamMatchStats` models
- `server/services/statsService.ts`: Complete rewrite with real database queries replacing placeholder data
- `server/services/quickMatchSimulation.ts`: Added statistics persistence and realistic dome ball stat generation
- `shared/types/LiveMatchState.ts`: Updated stat interfaces for comprehensive dome ball tracking

**Critical Fixes Applied:**
- **Missing Playoff Generation**: Playoff brackets weren't generating when advancing Day 14→15
- **Fixed vs Dynamic Scheduling**: User wanted dynamic scheduling based on completion times, not fixed times  
- **Statistics Persistence Gap**: Stats were generated but never saved to database
- **Greek Alphabet Inconsistency**: Multiple files defaulting to "main" instead of Greek alphabet
- **StatsService Placeholder Data**: Service returned zeros instead of real aggregated statistics

### **Production Operational (August 2025)**
- ✅ Complete migration from GitHub Actions to Google Cloud Build
- ✅ Docker layer caching with "Layer already exists" optimization  
- ✅ End-to-end deployment pipeline with health checks
- ✅ Mobile-first 5-hub architecture fully operational
- ✅ Advanced camaraderie system with 5 tiers and comprehensive effects

### **Critical Systems Working**
- ✅ Real-time WebSocket match simulation
- ✅ Tournament automation with daily cycles
- ✅ Dynamic late signup system for Division 8
- ✅ Comprehensive marketplace with bidding system
- ✅ Stadium revenue processing and team finances
- ✅ Player aging, progression, and retirement systems

## 🎯 CURRENT DEVELOPMENT FOCUS

### **Newly Operational Systems (September 2025)**
- ✅ **Dynamic Playoff Scheduling**: Real-time tournament progression with 30-minute round buffers
- ✅ **Comprehensive Statistics System**: 25+ player stats, 20+ team stats with database persistence
- ✅ **Greek Alphabet Subdivisions**: Consistent naming throughout all systems
- ✅ **System Cleanup**: Removed unintended Equipment Enhancement, Durability, and Salary Cap systems

### **Next Development Priorities**
- **React Native Mobile App**: Native mobile app development planning
- **Enhanced Match Visualization**: Improved 2D match graphics with dome ball mechanics
- **PWA Expansion**: Enhanced offline capabilities and push notifications
- **Advanced Tournament Features**: Enhanced bracket management and seeding systems
- **AI Team Intelligence**: More sophisticated AI opponent strategies and behaviors

## 📝 DEVELOPMENT WORKFLOW

### **Starting a New Session**
1. Read this CLAUDE.md file first
2. Check recent commits for context
3. State specific goal: "I need to implement playoff brackets"
4. Reference specific files: `server/services/tournamentService.ts:150`

### **During Development**
- Follow domain-driven patterns in `/server/domains/`
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
7. **Multiple Development Ports**: Frontend should consistently use localhost:5173. **SOLUTION**: Added `strictPort: true` to `vite.config.local.ts` to prevent port fallback behavior and multiple port accumulation over time

### **Performance Optimization**
- Countdown timers update every minute (not second)
- Efficient React Query patterns with proper invalidation
- Lazy loading for all major components
- Optimized Prisma queries with proper indexing

---

## 📋 SESSION UPDATES & DEVELOPMENT HISTORY

**For detailed session logs, bug fixes, and development progress, see: [SESSION_LOG.md](./SESSION_LOG.md)**

This includes:
- Critical bug fixes and resolutions
- Route consolidation project progress
- Emergency system resets and fixes
- Technical debt reduction initiatives
- Database integrity improvements

---

**Last Updated**: September 4th, 2025 - GitHub Actions Guardian Agents Implementation & Root Directory Cleanup
**Status**: Production operational at https://realmrivalry.com with automated code quality monitoring
**Next Review**: After Guardian Agents first run results and frontend/UI development sessions

---

## 🎯 RECENT ACHIEVEMENTS SUMMARY

### **September 2025 Major Accomplishments**
- ✅ **Dynamic Playoff System**: Real-time playoff scheduling with 30-minute round buffers
- ✅ **Comprehensive Statistics**: 40+ dome ball statistics with full database persistence
- ✅ **Route Consolidation**: 16 route files → 4 enhanced systems (60+ endpoints)
- ✅ **GitHub Actions Agents**: 4 automated code quality guardians operational
- ✅ **Documentation Cleanup**: Consolidated to CLAUDE.md + SESSION_LOG.md structure

---

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

