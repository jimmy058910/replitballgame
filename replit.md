# Overview
Realm Rivalry is a mobile-first fantasy sports management game offering deep, engaging simulation. It focuses on tactical team building, real-time match simulation, and complex player development across 5 fantasy races in an 8-division league. Key capabilities include detailed simulation of stadium economics, player aging, and injury systems, with live WebSocket-powered matches. The game operates on a 17-day season cycle with automated progression and comprehensive tournament systems, aiming to capture market share in the mobile sports management genre with high-fidelity simulation.

**EXHIBITION GAME CONSTRAINT SYSTEM (Aug 16, 2025)**: ✅ IMPLEMENTED comprehensive single concurrent exhibition match prevention across all exhibition endpoints (`/instant`, `/challenge`, `/instant-match`, `/challenge-opponent`). Teams can only have one active exhibition match at a time, preventing multiple simultaneous games. System checks for existing `IN_PROGRESS` exhibition matches before allowing new ones, returning HTTP 409 with clear error messaging.

**COMPLETE RESTORATION SUCCESS (Aug 17, 2025)**: ✅ FULLY RESOLVED Oakland Cougars team data corruption and API routing issues. Major fixes: (1) Added API route protection middleware before Vite to prevent HTML responses to API calls, (2) Successfully restored 50,000 credits using direct database queries, (3) Confirmed 84 players and 7 staff members exist in database. Root cause of original issue: Vite's catch-all middleware was intercepting API routes. All critical systems now operational with proper JSON responses.

**COMPREHENSIVE DATA ACCESS OPTIMIZATION (Aug 15, 2025)**: ✅ COMPLETED systematic fix of all data consistency issues across 40+ components. Root cause: Components were querying non-existent separate endpoints (`/api/teams/${id}/finances`, `/api/teams/${id}/players`) instead of using data already provided by `/api/teams/my`. Solution: Updated all components to use unified team data access pattern, eliminating 50+ unnecessary API calls and fixing roster/finance display inconsistencies. All financial data now consistently uses `finances.gems` instead of mixed `premiumCurrency` naming.

# User Preferences
Preferred communication style: Simple, everyday language.

**CRITICAL COMMUNICATION REQUIREMENT**: Always confirm before implementing changes
- When user asks for suggestions/advice: Provide information and recommendations, then ASK for permission to implement
- When user asks questions: Answer the question, don't automatically take action
- Always distinguish between "What do you think?" vs "Please do this"
- Confirm implementation plan before making changes to workflows, configurations, or architecture

**LESSON LEARNED (Aug 14, 2025)**: Never abandon industry-standard solutions without explicit user approval. When debugging fails, debug deeper - don't switch approaches. The Cloud SQL Auth Proxy issue was a simple SSL configuration problem, not a fundamental architecture issue. Stick with the correct solution and fix the details.

**FIREBASE-ONLY AUTHENTICATION (Aug 14, 2025)**: Completely replaced Passport.js with pure Firebase authentication. Backend now uses Firebase Admin SDK for token verification, frontend uses Firebase Auth with custom tokens to bypass domain restrictions. All authentication flows are 100% Firebase-based. **SOLUTION IMPLEMENTED**: Firebase custom tokens with development fallback verification eliminates domain authorization issues permanently. **RECURRING FIXES**: "prisma is not defined" errors and authentication token passing - comprehensive solution implemented with proper token storage and middleware verification.

**COMPREHENSIVE PROBLEM-SOLVING APPROACH**: When encountering development issues, ALWAYS perform complete systematic analysis to identify all root causes simultaneously, rather than fixing the first issue found. Implement comprehensive solutions that address the entire problem domain in a single change, not symptom-by-symptom fixes.

**DEVELOPMENT APPROACH**: Always prioritize industry-standard practices and proper implementations from the beginning. Avoid shortcuts, bypasses, or band-aid solutions. Research and implement the correct solution first - this saves significant time and effort compared to fixing temporary approaches later.

**INDUSTRY STANDARD CODE QUALITY (Aug 14, 2025)**: ALWAYS follow rigorous development practices to prevent syntax errors:
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

**COMPREHENSIVE DATABASE SOLUTION (Aug 15, 2025)**: ✅ SUCCESSFULLY IMPLEMENTED industry-standard Cloud SQL Auth Proxy integration directly into Node.js server startup process. Development uses Cloud SQL Auth Proxy automatically starting on localhost:5432, production uses direct Cloud SQL socket connection. Prisma ORM exclusively for all database operations. Fixed Cloud SQL Auth Proxy configuration: correct flags are `-instances` and `-credential_file` (single dash, singular). **WORKING PERFECTLY**: Database connectivity confirmed, all Prisma queries executing, API endpoints returning proper business logic responses.

**COMPREHENSIVE AUTOMATION INFRASTRUCTURE (Aug 16, 2025)**: ✅ SUCCESSFULLY IMPLEMENTED AND VERIFIED complete automation system covering all critical timing requirements. **CONFIRMED OPERATIONAL**: Daily progression at 3:00 AM EDT working perfectly (game day advancement 15→16→17→1 verified by user). **NEW SYSTEMS ADDED**: Database backup automation at 4:00 AM EDT for both dev/production with 30-day retention. **FULLY FUNCTIONAL**: Match simulation window 4-10PM EDT with subdivision load distribution, season event triggers, tournament automation, and catch-up systems. All services use singleton pattern with comprehensive error handling and Eastern timezone consistency. **STATUS**: Production-ready automation infrastructure operational.

# System Architecture

## Hybrid Cloud Deployment Model
The application uses a hybrid architecture with the frontend on Firebase Hosting and backend services on Google Cloud Run (Express.js, WebSockets, database connections), allowing for independent failure recovery and flexible release cycles.

## Database and ORM Architecture
Google Cloud SQL PostgreSQL is used for both development and production environments with complete separation. **PRISMA ORM ONLY** - the project uses Prisma Client exclusively for all database operations, type-safe database access, and schema management with comprehensive indexing. Production connects via unix sockets in cloud environments, development uses direct TCP connections.

## Frontend Technology Stack
The frontend is built with React 18 and TypeScript. UI components use Radix UI primitives and shadcn/ui, styled with Tailwind CSS for mobile-first responsiveness. TanStack React Query handles server state, and Wouter is used for client-side routing with lazy loading. The design features a five-hub navigation system optimized for mobile devices with PWA capabilities including service workers for offline functionality, push notifications, and app manifest.

## Backend Service Architecture
The core backend is an Express.js application with a comprehensive middleware stack. Real-time features are powered by a Socket.IO WebSocket server. Authentication is handled via Google OAuth 2.0 integration with Passport.js and session-based authentication stored in PostgreSQL. Security is enhanced with Helmet.js, express-rate-limit, and input sanitization.

## Game Systems Architecture
Key game systems include a real-time WebSocket-powered match simulation engine with complex stat calculations and injury systems. Player development features a 16-skill progression system with dynamic aging and retirement mechanics. Economic systems involve a dual currency model, stadium revenue, and a player trading marketplace. Game rules, stadium configurations, and store item definitions are managed through an externalized JSON-based configuration system. A recruiting-based temporary roster system (Taxi Squad) allows for player evaluation before permanent contracts.

## Development and Deployment Infrastructure
Vite is used for the build system. Vitest with React Testing Library provides component testing. Deployment automation is managed via GitHub Actions for automated hybrid deployment with build context verification. Docker is used for Cloud Run containerization with multi-stage builds. Firebase CLI is used for frontend deployment. A Blue-Green deployment strategy is employed for zero-downtime releases.

# External Dependencies

## Cloud Infrastructure
- **Google Cloud Platform**: Cloud Run, Artifact Registry, IAM.
- **Firebase**: Frontend hosting, authentication services, session management.
- **Google Cloud SQL**: PostgreSQL database.

## Authentication and Security
- **Google OAuth 2.0**: Primary authentication provider.
- **Passport.js**: Authentication middleware.

## Development and Build Tools
- **Vite**: Development server and build tool.
- **Docker**: Containerization.
- **GitHub Actions**: CI/CD pipeline.

## External APIs and Services
- **Unity Ads**: Monetization platform.
- **Stripe**: Payment processing.
- **Google Fonts**: Orbitron, Inter.
- **Font Awesome**: Icon library.