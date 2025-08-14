# Overview
Realm Rivalry is a mobile-first fantasy sports management game providing a deep, engaging, and high-fidelity simulation. It focuses on tactical team building, real-time match simulation, and complex player development across 5 fantasy races in an 8-division league. Key capabilities include detailed simulation of stadium economics, player aging, and injury systems, with live WebSocket-powered matches. The game operates on a 17-day season cycle with automated progression and comprehensive tournament systems, aiming to capture market share in the mobile sports management genre.

# User Preferences
Preferred communication style: Simple, everyday language.

**CRITICAL COMMUNICATION REQUIREMENT**: Always confirm before implementing changes
- When user asks for suggestions/advice: Provide information and recommendations, then ASK for permission to implement
- When user asks questions: Answer the question, don't automatically take action
- Always distinguish between "What do you think?" vs "Please do this"
- Confirm implementation plan before making changes to workflows, configurations, or architecture

**COMPREHENSIVE PROBLEM-SOLVING APPROACH**: When encountering development issues, ALWAYS perform complete systematic analysis to identify all root causes simultaneously, rather than fixing the first issue found. Implement comprehensive solutions that address the entire problem domain in a single change, not symptom-by-symptom fixes.

**DEVELOPMENT APPROACH**: Always prioritize industry-standard practices and proper implementations from the beginning. Avoid shortcuts, bypasses, or band-aid solutions. Research and implement the correct solution first - this saves significant time and effort compared to fixing temporary approaches later.

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

**FIREBASE + CLOUD SQL UNIFIED ARCHITECTURE (Aug 13, 2025)**:
✅ **Firebase Authentication Unified**: Successfully configured Firebase Authentication for both development and production environments, eliminating dual authentication systems.
✅ **DevAuth System Removed**: Removed development-only authentication system in favor of consistent Firebase Authentication across all environments.
✅ **Cloud SQL Configuration**: Updated database configuration to use Cloud SQL for both development (realm-rivalry-dev) and production (realm-rivalry-prod) instances.
✅ **Authentication Flow Fixed**: Resolved duplicate route conflicts, API routing issues, and authentication provider inconsistencies - now uses redirect authentication for better cross-domain compatibility.
✅ **Development Domain Issue Identified**: Firebase authentication requires adding current Replit domain (84e7df37-b386-43d5-a4d2-28ef9c3a4ebe-00-3hsmig2a5zsfq.janeway.replit.dev) to Firebase Console authorized domains list.
✅ **Production Ready**: Architecture configured for production deployment where realmrivalry.com domain should be properly authorized in Firebase Console.

**TEAM CREATION SYSTEM FULLY OPERATIONAL (Aug 13, 2025)**:
✅ **Complete Database Resolution**: Successfully resolved all "prisma is not defined" errors across 25+ files with comprehensive Prisma client access patterns.
✅ **Database Schema Synchronization**: Prisma schema successfully pushed to Cloud SQL development instance with all tables created and operational.
✅ **Production-Ready Team Creation**: Full team creation flow working with database persistence, including team records, finances, stadium, and player roster generation.
✅ **Authentication Status Endpoint**: Added missing `/api/auth/status` endpoint that client expects for authentication verification.
✅ **Server-Client Auth Sync**: Fixed authentication mismatch between server and client - both systems now properly synchronized.
✅ **Team Name Validation**: Comprehensive validation system working with profanity filtering, length validation, character validation, and PII filtering.
✅ **Content Security Policy**: Fixed CSP headers to allow Font Awesome fonts from cdnjs.cloudflare.com.
✅ **End-to-End Team Creation**: User can now authenticate, create teams, and have full team records with players and staff generated automatically.
✅ **PROFANITY FILTER FIXED (Aug 13, 2025)**: Resolved overly aggressive profanity filtering that incorrectly flagged legitimate team names like "Test Eagles" and "Mac Attack" - now allows common sports terms while blocking actual offensive content.

**CLOUD SQL AUTH PROXY SOLUTION IMPLEMENTED (Aug 14, 2025)**:
✅ **Industry-Standard Architecture**: Implemented Google Cloud SQL Auth Proxy to eliminate IP whitelisting issues entirely.
✅ **IAM Authentication**: Uses service account authentication instead of network IP restrictions.
✅ **Database Connection Logic**: Updated database.ts to use proxy (localhost:5433) instead of direct Cloud SQL IP.
✅ **Proxy Verification**: Proxy starts successfully with proper IAM authentication and connects to realm-rivalry-dev instance.
⚠️ **Environment Issue**: Proxy process management requires manual restart in Replit development environment (works natively in Cloud Run production).

**DUAL ENVIRONMENT CONFIGURATION VERIFIED**:
✅ **Development Environment (Replit)**:
   - Domain: `84e7df37-b386-43d5-a4d2-28ef9c3a4ebe-00-3hsmig2a5zsfq.janeway.replit.dev`
   - Database: Cloud SQL `realm-rivalry-dev` instance (IP: 35.225.150.44)
   - **REPLIT IP AUTHORIZATION REQUIRED**: Add `34.148.247.147/32` to Cloud SQL authorized networks (IP changed Aug 14, 2025)
   - OAuth Callback: `https://84e7df37-b386-43d5-a4d2-28ef9c3a4ebe-00-3hsmig2a5zsfq.janeway.replit.dev/api/auth/google/callback`
   - Firebase: ✅ Domain authorized in Google Console

✅ **Production Environment (realmrivalry.com)**:
   - Domain: `realmrivalry.com` / `www.realmrivalry.com`
   - Database: Cloud SQL `realm-rivalry-prod` instance (IP: 34.171.83.78)  
   - OAuth Callback: `https://www.realmrivalry.com/api/auth/google/callback`
   - Firebase: Firebase Console authorized domains include realmrivalry.com

# System Architecture

## Hybrid Cloud Deployment Model
The application uses a hybrid architecture with the frontend on Firebase Hosting and backend services on Google Cloud Run (Express.js, WebSockets, database connections), allowing for independent failure recovery and flexible release cycles.

## Database and ORM Architecture
Google Cloud SQL PostgreSQL is used for both development and production environments with complete separation. **PRISMA ORM ONLY** - the project uses Prisma Client exclusively for all database operations, type-safe database access, and schema management with comprehensive indexing. Production connects via unix sockets in cloud environments, development uses direct TCP connections.

**CRITICAL**: NO Drizzle ORM - project uses Prisma only for simplicity and consistency.

## Frontend Technology Stack
The frontend is built with React 18 and TypeScript. UI components use Radix UI primitives and shadcn/ui, styled with Tailwind CSS for mobile-first responsiveness. TanStack React Query handles server state, and Wouter is used for client-side routing with lazy loading. The design features a five-hub navigation system optimized for mobile devices with PWA capabilities including service workers for offline functionality, push notifications, and app manifest.

## Backend Service Architecture
The core backend is an Express.js application with a comprehensive middleware stack. Real-time features are powered by a Socket.IO WebSocket server. Authentication is handled via Google OAuth 2.0 integration with Passport.js and session-based authentication stored in PostgreSQL. Security is enhanced with Helmet.js, express-rate-limit, and input sanitization.

## Game Systems Architecture
Key game systems include a real-time WebSocket-powered match simulation engine with complex stat calculations and injury systems. Player development features a 16-skill progression system with dynamic aging and retirement mechanics. Economic systems involve a dual currency model, stadium revenue, and a player trading marketplace. Game rules, stadium configurations, and store item definitions are managed through an externalized JSON-based configuration system. A recruiting-based temporary roster system (Taxi Squad) allows for player evaluation before permanent contracts.

## Development and Deployment Infrastructure
Vite is used for the build system. Vitest with React Testing Library provides component testing. Deployment automation is managed via GitHub Actions for automated hybrid deployment with build context verification. Docker is used for Cloud Run containerization with multi-stage builds. Firebase CLI is used for frontend deployment. A Blue-Green deployment strategy is employed for zero-downtime releases.

### **📊 GCP COMPREHENSIVE TECH STACK RESEARCH (Aug 13, 2025)**
**✅ STRATEGIC EXPANSION PLANNING**: Researched Google Cloud Platform's 150+ product catalog and created comprehensive technical architecture blueprint incorporating 80+ GCP services for hypothetical implementation pending credits approval.

**Key Documentation Created:**
- `docs/GCP_COMPREHENSIVE_TECH_STACK.md` - Strategic architectural blueprint
- **AI/ML Integration**: Vertex AI, predictive analytics, player recommendations
- **Global Scale Architecture**: Multi-region, CDN, enterprise security
- **Phased Implementation**: 8-month roadmap with cost analysis ($2K-$100K tiers)
- **Fantasy Sports Optimization**: Real-time simulation, mobile experience, social features

# External Dependencies

## Cloud Infrastructure
- **Google Cloud Platform**: Cloud Run, Artifact Registry, IAM.
- **Firebase**: Frontend hosting, authentication services, session management.
- **Google Cloud SQL**: PostgreSQL database with VPC-native Cloud Run integration.

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