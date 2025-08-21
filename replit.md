# Overview
Realm Rivalry is a mobile-first fantasy sports management game offering deep, engaging simulation. It focuses on tactical team building, real-time match simulation, and complex player development across 5 fantasy races in an 8-division league. Key capabilities include detailed simulation of stadium economics, player aging, and injury systems, with live WebSocket-powered matches. The game operates on a 17-day season cycle with automated progression and comprehensive tournament systems, aiming to capture market share in the mobile sports management genre with high-fidelity simulation.

**DYNAMIC LATE SIGNUP SYSTEM FULLY FUNCTIONAL** (August 21, 2025): Complete dynamic late registration system implemented for Division 8 with flexible schedule generation:

**Core Features:**
- **AI Fill Timing**: 3:00 PM EDT daily fills incomplete subdivisions with AI teams
- **Game Start**: Same day at 4:00 PM EDT (1 hour after AI fill)
- **Dynamic Schedule**: Game count = (14 - fill_day + 1) games per team
  - Day 2 signup → Day 5 fill → 10 games per team (Days 5-14)
  - Day 7 signup → Day 8 fill → 7 games per team (Days 8-14)
- **Time Distribution**: Concentrated within subdivisions (15-minute intervals), spread across server (different base hours)
- **Round-Robin Algorithm**: Each team plays every other team once, balanced HOME/AWAY distribution with coin flip for 4 vs 3 home games
- **Schedule Recovery**: Automatic regeneration system detects incomplete schedules and rebuilds with correct patterns

# User Preferences
Preferred communication style: Simple, everyday language.

## Recent Technical Improvements (August 2025)
**DYNAMIC LATE REGISTRATION SYSTEM IMPLEMENTATION** (August 21, 2025): Built comprehensive late registration system per technical specifications:

**NEW SYSTEM IMPLEMENTED:**
- **Complete Late Registration Service**: Greek alphabet subdivision naming (Alpha, Beta, Gamma, etc.)
- **AI Team Generation Service**: Professional team names with full rosters, staff, and stadium setup
- **Advanced Schedule Generation**: Round-robin algorithm with home/away balance and time slot distribution
- **Daily Automation Service**: 3:00 PM EDT daily processing with comprehensive error handling
- **API Endpoints**: Full REST API for registration, status, manual triggers, and subdivision management

**TECHNICAL ARCHITECTURE:**
- **Core Services**: `lateRegistrationSystem.ts`, `dailyAutomationService.ts`
- **API Routes**: `/api/late-registration/*` with authentication and comprehensive endpoints
- **Database Integration**: Prisma-compatible with existing schema, Cloud SQL ready
- **Greek Subdivisions**: Automatic naming system supporting up to 24 subdivisions per division
- **Game Scheduling**: Concentrated 15-minute time slots with subdivision staggering (4-10 PM EDT)

**IMPLEMENTATION STATUS**: Core system complete, database connection pending Cloud SQL proxy initialization

**Previous Issue Resolution:**
- Resolved Shadow Runners placeholder issue in Division 8 late registration system
- **Root Cause**: AI team generation service was using "Shadow Runners" as first name in list, creating variants like "Shadow Runners 197", "Shadow Runners 500"
- **System Design**: Division 8 teams trigger late signup service which fills subdivisions with AI opponents for 36-game shortened schedules
- **Proper Solution**: Removed "Shadow Runners" from AI team name list, prioritized "Iron Wolves" and other professional names
- **Database Fix**: Renamed existing Shadow Runners teams to proper AI team names (Iron Wolves 858, Fire Hawks 261, etc.)
- **Verification**: Header now displays correct opponent names, 36-game schedule fully functional for late registration teams
- **Zero Technical Debt**: Fixed root cause in late signup service, updated frontend cache invalidation

**CRITICAL CACHING ARCHITECTURE OVERHAUL**: Completely replaced problematic cache-fighting approaches with industry-standard React Query patterns. Key improvements:
- **Hierarchical Query Keys**: Structured keys (`['teams', 'my', 'matches', 'upcoming']`) for efficient cache invalidation
- **Centralized Data Management**: Created `useTeamData.ts` hook with proper staleTime configuration based on data volatility  
- **Proper Loading States**: Added skeleton UI to prevent stale data flash before fresh data loads
- **Eliminated Technical Debt**: Removed `Date.now()` query key hacks and aggressive cache clearing that were fighting React Query mechanisms
- **Industry Standards**: Following TanStack Query v5 best practices for cache synchronization and invalidation patterns

## CRITICAL DEVELOPMENT RULE: API Route Registration Order
**ISSUE THAT OCCURRED 50+ TIMES DURING DEVELOPMENT:**
- Vite middleware has a catch-all route `app.use("*", ...)` in `server/vite.ts` that serves HTML for any unhandled route
- If API routes are registered AFTER Vite middleware, the catch-all intercepts API calls and returns HTML instead of JSON
- This causes frontend to receive HTML responses when expecting JSON, breaking the app

**PERMANENT SOLUTION - NEVER CHANGE THIS ORDER:**
1. Register ALL API routes FIRST in `server/index.ts` 
2. Then setup Vite middleware AFTER all API routes
3. The catch-all `app.use("*", ...)` in Vite only catches non-API routes

**CORRECT MIDDLEWARE ORDER:**
```javascript
// 1. Basic middleware (CORS, compression, etc.)
// 2. Session management
// 3. Authentication middleware
// 4. ALL API ROUTES (critical to be before Vite)
await registerAllRoutes(app); // <- MUST BE BEFORE Vite
// 5. Vite middleware setup (includes catch-all)
await setupVite(app, httpServer);
// 6. Error handler (always last)
```

**IF THIS RULE IS VIOLATED:** API endpoints will return HTML instead of JSON, causing infinite loading states and broken functionality.

**CRITICAL COMMUNICATION REQUIREMENT**: Always confirm before implementing changes
- When user asks for suggestions/advice: Provide information and recommendations, then ASK for permission to implement
- When user asks questions: Answer the question, don't automatically take action
- Always distinguish between "What do you think?" vs "Please do this"
- Confirm implementation plan before making changes to workflows, configurations, or architecture

**PERFORMANCE OPTIMIZATION**: User prefers efficient implementations that minimize unnecessary resource usage
- Countdown timers should update every minute, not every second
- Avoid excessive re-renders and unnecessary API calls
- Balance real-time updates with performance considerations

**COMPREHENSIVE PROBLEM-SOLVING APPROACH**: When encountering development issues, ALWAYS perform complete systematic analysis to identify all root causes simultaneously, rather than fixing the first issue found. Implement comprehensive solutions that address the entire problem domain in a single change, not symptom-by-symptom fixes.

**DEVELOPMENT APPROACH**: Always prioritize industry-standard practices and proper implementations from the beginning. Avoid shortcuts, bypasses, or band-aid solutions. Research and implement the correct solution first - this saves significant time and effort compared to fixing temporary approaches later.

**INDUSTRY STANDARD CODE QUALITY**: ALWAYS follow rigorous development practices to prevent syntax errors:
- View complete function context before making any edits (minimum 50+ lines of context)
- Use proper TypeScript/JavaScript error handling patterns with complete try-catch-finally blocks
- Never create orphaned code blocks or incomplete control structures
- Implement comprehensive async/await error handling following Node.js best practices
- Test syntax validity after each significant change
- Make complete, atomic changes rather than piecemeal modifications
- Follow consistent indentation and code structure patterns
- Use TypeScript strict mode practices for type safety

**COMMITMENT TO EXCELLENCE**: Take additional time for research and comprehensive implementation when it ensures industry-standard compliance. Quality and proper architecture always precede speed of delivery.

**ZERO TECHNICAL DEBT POLICY**: No band-aids, no temporary fixes, no shortcuts. Every solution must be implemented correctly from the start using industry-standard practices. If a temporary approach is suggested, it must be rejected in favor of the proper implementation.

**COMPREHENSIVE TROUBLESHOOTING METHODOLOGY**: ALWAYS perform holistic analysis to identify ALL root causes simultaneously, rather than fixing symptoms individually. Required approach:

**Phase 1: Complete System Analysis**
1. **BASIC FILE AVAILABILITY**: Check .gitignore, file existence, build context issues FIRST
2. **Map the entire failure domain** - Identify all components involved in the failing process
3. **Timing and sequencing analysis** - Check for race conditions, startup sequences, timeout mismatches
4. **Configuration consistency check** - Verify all environment variables, ports, URLs, and deployment settings align
5. **Architecture compatibility review** - Ensure system design matches deployment environment expectations
6. **Resource and constraint analysis** - Check memory, CPU, network, and infrastructure limitations

**Phase 2: Root Cause Investigation Order**
1. **File System Issues**: Check .gitignore, file paths, build context, file permissions
2. **Simple Configuration Issues**: Check URLs, API keys, secrets, typos, environment variables
3. **Code Conflicts**: Look for duplicate routes, overriding functions, import conflicts
4. **Basic Logic Errors**: Verify function calls, variable assignments, conditional logic
5. **Architectural Mismatches**: System design incompatible with deployment environment
6. **Infrastructure Issues**: Only after exhausting code-level explanations
7. **Nuclear Approaches**: Absolute last resort after systematic investigation proves infrastructure failure

**Phase 3: Comprehensive Solution Implementation**
- Fix ALL identified root causes simultaneously, not individually
- Validate that fixes don't create new conflicts or dependencies
- Test the complete solution holistically before deployment

**ANTI-PATTERN TO AVOID**: Finding first issue → implementing fix → deploying → finding next issue → repeat
**CORRECT PATTERN**: Complete analysis → identify all issues → comprehensive fix → single deployment

**IMPLEMENTATION STANDARDS**:
- **NO BAND-AIDS**: Temporary fixes, workarounds, or placeholder solutions are prohibited
- **NO SHORTCUTS**: All features must be implemented using proper, industry-standard approaches
- **NO TECHNICAL DEBT**: Every solution must be the correct, long-term implementation from the start

**CRITICAL DEPLOYMENT PREFERENCE**: NEVER use Replit's Deploy button. User has custom hybrid deployment pipeline (Google Cloud Run + Firebase + Cloud SQL) that auto-deploys on Git push from Replit using GitHub Actions Blue-Green deployment workflow for zero-downtime releases.

# System Architecture

## Hybrid Cloud Deployment Model
The application uses a hybrid architecture with the frontend on Firebase Hosting and backend services on Google Cloud Run (Express.js, WebSockets, database connections), allowing for independent failure recovery and flexible release cycles.

## Database and ORM Architecture
Google Cloud SQL PostgreSQL is used for both development and production environments with complete separation. **PRISMA ORM ONLY** - the project uses Prisma Client exclusively for all database operations, type-safe database access, and schema management with comprehensive indexing. Production connects via unix sockets in cloud environments, development uses direct TCP connections.

## Frontend Technology Stack
The frontend is built with React 18 and TypeScript. UI components use Radix UI primitives and shadcn/ui, styled with Tailwind CSS for mobile-first responsiveness. TanStack React Query handles server state, and Wouter is used for client-side routing with lazy loading. The design features a five-hub navigation system optimized for mobile devices with PWA capabilities including service workers for offline functionality, push notifications, and app manifest.

## Backend Service Architecture
The core backend is an Express.js application with a comprehensive middleware stack. Real-time features are powered by a Socket.IO WebSocket server. Authentication is handled via Firebase Admin SDK for token verification on the backend and Firebase Auth with custom tokens on the frontend. Security is enhanced with Helmet.js, express-rate-limit, and input sanitization.

## Game Systems Architecture
Key game systems include a real-time WebSocket-powered match simulation engine with complex stat calculations and injury systems. Player development features a 16-skill progression system with dynamic aging and retirement mechanics. Economic systems involve a dual currency model, stadium revenue, and a player trading marketplace. Game rules, stadium configurations, and store item definitions are managed through an externalized JSON-based configuration system. A recruiting-based temporary roster system (Taxi Squad) allows for player evaluation before permanent contracts.

## Development and Deployment Infrastructure
Vite is used for the build system. Vitest with React Testing Library provides component testing. Deployment automation is managed via GitHub Actions for automated hybrid deployment with build context verification. Docker is used for Cloud Run containerization with multi-stage builds. Firebase CLI is used for frontend deployment. A Blue-Green deployment strategy is employed for zero-downtime releases.

# External Dependencies

## Cloud Infrastructure
- **Google Cloud Platform**: Cloud Run, Artifact Registry, IAM.
- **Firebase**: Frontend hosting, authentication services.
- **Google Cloud SQL**: PostgreSQL database (ONLY database provider - all Neon references removed).

## Development and Build Tools
- **Vite**: Development server and build tool.
- **Docker**: Containerization.
- **GitHub Actions**: CI/CD pipeline.

## External APIs and Services
- **Unity Ads**: Monetization platform.
- **Stripe**: Payment processing.
- **Google Fonts**: Orbitron, Inter.
- **Font Awesome**: Icon library.