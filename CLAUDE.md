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

## 📋 QUICK REFERENCE

### **Database Model Names (CRITICAL)**
- ✅ Use `prisma.game` (NOT `prisma.match`)
- ✅ Use `match.matchType` (NOT `match.type`) 
- ✅ Use `team.stadium` (NOT `team.stadiums`)
- ✅ Use `staff.type` (NOT `staff.role`) for StaffType enum
- ✅ Use `team.finances` (NOT `team.TeamFinance`)
- ✅ Use `prisma.playerMatchStats` and `prisma.teamMatchStats` for comprehensive dome ball statistics
- ✅ Subdivision naming uses Greek alphabet (alpha, beta, gamma) with underscore numbering (alpha_1, beta_2)

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

### **Domain-Driven Architecture**
Server organized by business domains with clear separation:
```
server/domains/
├── auth/          # Authentication services
├── economy/       # Credits, marketplace, transactions
├── matches/       # Game simulation, live matches  
├── tournaments/   # Competition management
└── index.ts       # Centralized domain registry
```

Each domain includes: `service.ts`, `routes.ts`, `schemas.ts`, `index.ts`

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

### **Performance Optimization**
- Countdown timers update every minute (not second)
- Efficient React Query patterns with proper invalidation
- Lazy loading for all major components
- Optimized Prisma queries with proper indexing

---

**Last Updated**: September 4th, 2025 - GitHub Actions Guardian Agents Implementation & Root Directory Cleanup
**Status**: Production operational at https://realmrivalry.com with automated code quality monitoring
**Next Review**: After Guardian Agents first run results and frontend/UI development sessions

---

## 🎯 KEY SESSION ACCOMPLISHMENTS SUMMARY

This development session achieved unprecedented system completeness:

1. **Dynamic Playoff System**: Complete implementation of real-time playoff scheduling
2. **Dome Ball Statistics**: Comprehensive 40+ statistic tracking system with full database integration  
3. **Greek Alphabet Consistency**: Resolved naming inconsistencies across all subdivision systems
4. **System Cleanup**: Removed three unintended systems cleanly without breaking functionality
5. **Documentation Sync**: Both CLAUDE.md and REALM_RIVALRY_COMPLETE_DOCUMENTATION.md fully updated

**Technical Debt**: Zero - All implementations follow production-ready patterns
**Database Schema**: Enhanced with comprehensive statistics models  
**Code Quality**: All new services follow domain-driven architecture patterns

### **GitHub Actions Guardian Agents Implementation (September 4th, 2025)**
- ✅ **4 Automated Guardian Agents**: TypeScript, Code Quality, Prisma Database, and Deployment Readiness agents fully operational
- ✅ **Production-Aligned Thresholds**: Agents now use realistic failure criteria that match actual deployment requirements
- ✅ **Auto-Fix Capabilities**: All agents enabled with safe auto-fix features for common issues (Prisma imports, console.log removal, etc.)
- ✅ **Comprehensive Monitoring**: Agents run on push/PR events plus scheduled maintenance cycles
- ✅ **Root Directory Cleanup**: Archived 9 obsolete files to maintain clean development environment

### **Documentation Consolidation (September 3rd, 2025)**
- ✅ **Eliminated Redundancy**: Removed 4 redundant markdown files (README.md, replit.md, README-ORGANIZATION.md, github_integration_steps.md)
- ✅ **Unified AI Guidance**: CLAUDE.md now serves ALL AI development assistants (Claude Code, Replit AI, GitHub Copilot)
- ✅ **Merged Unique Content**: creditFormatter utility reference, external dependencies, and enhanced late signup details integrated
- ✅ **Clean Documentation**: Only 2 essential files remain - CLAUDE.md (development guide) and REALM_RIVALRY_COMPLETE_DOCUMENTATION.md (comprehensive reference)