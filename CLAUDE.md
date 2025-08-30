# CLAUDE.md - Realm Rivalry Development Guide

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 CRITICAL DEVELOPMENT PRINCIPLES (FROM REPLIT.MD)

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

## 📋 QUICK REFERENCE

### **Database Model Names (CRITICAL)**
- ✅ Use `prisma.game` (NOT `prisma.match`)
- ✅ Use `match.matchType` (NOT `match.type`) 
- ✅ Use `team.stadium` (NOT `team.stadiums`)
- ✅ Use `staff.type` (NOT `staff.role`) for StaffType enum
- ✅ Use `team.finances` (NOT `team.TeamFinance`)

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
- **Team Structure**: 6-player teams (Passer, Runner, Blocker roles) + coaching staff
- **Camaraderie System**: 5-tier team chemistry affecting performance (Excellent/Good/Average/Low/Poor)
- **Stadium Economics**: Revenue from tickets, concessions, parking, VIP suites
- **Tactical Systems**: Field size choices and strategic focuses
- **16-Skill Progression**: Dynamic aging, retirement, injury mechanics

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

## 📊 RECENT ACHIEVEMENTS

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

### **Performance & Mobile Optimization**
- React Native mobile app development planning
- Enhanced 2D match visualization components
- PWA capabilities expansion
- Advanced marketplace features

### **Game Systems Enhancement**  
- **Quick Match Simulation**: New instant simulation for development/testing
- Advanced tournament bracket management
- Enhanced player development mechanics
- Sophisticated AI opponent systems

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

**Last Updated**: Current session
**Status**: Production operational at https://realmrivalry.com
**Next Review**: After major feature additions or architectural changes