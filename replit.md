# Realm Rivalry - Compressed replit.md

## Overview
Realm Rivalry is an advanced fantasy sports management web application that combines tactical team management with comprehensive league systems and real-time features. It includes 5 distinct fantasy races, a 3-tier player abilities system, an enhanced marketplace with a bidding system, live match simulation, detailed injury mechanics, and advanced stadium management. The project aims to provide a rich, immersive fantasy sports experience, prioritizing gameplay depth over visual polish.

## User Preferences
- **Gameplay Focus**: Prioritize comprehensive gameplay mechanics over visual polish
- **Feature Implementation**: Prefer complete feature implementation with detailed documentation
- **Analytics & Statistics**: Values detailed statistics, analytics, and performance tracking
- **Game Balance**: Emphasizes proper balance and realistic simulation mechanics
- **Mobile Strategy**: React Native conversion planned for native app store deployment
- **UI Preferences**: Dark theme UI with mobile-responsive design principles
- **No Pay-to-Win Policy**: All gameplay-affecting items must be purchasable with Credits (₡), Gems (💎) only for convenience/cosmetics
- **Documentation Consistency**: Maintain comprehensive game mechanics documentation with exact formulas and system specifications
- **Game Design Philosophy**: Organic progression systems, balanced economies, realistic player development cycles
- **Deployment Preference**: Prefers Google Cloud Shell Terminal for all gcloud commands, deployment operations, and Google Cloud Platform management tasks
- **UI Element Preference**: User prefers the removal of persistent yellow dots on navigation items.
- **UI Element Preference**: User prefers the removal of all emojis and lightning bolt icons from team headers and the main dashboard for a cleaner display.

## System Architecture

### Core Technologies
- **Frontend**: React with TypeScript, Vite, Wouter for routing, shadcn/ui with Tailwind CSS for UI components, Zustand for state management, TanStack Query for server state, React Hook Form with Zod for forms, Lucide React and React Icons for icons.
- **Backend**: Express with TypeScript, Node.js.
- **Database**: PostgreSQL with Prisma ORM (100% Prisma syntax only).
- **Authentication**: Google OAuth 2.0 with Passport.js.
- **Session Management**: PostgreSQL-backed sessions with `express-session`.

### Design Patterns & Principles
- **Architecture**: Domain-driven design with bounded contexts.
- **Code Standards**: Exclusive use of Prisma Client for database operations, comprehensive type safety with Prisma-generated types, Zod schemas for API validation, 80% branch coverage for testing.
- **Development Standards**: TypeScript throughout, modern React with hooks and functional components, mobile-first responsive design, comprehensive error handling.
- **Real-Time Features**: Implemented via WebSockets for live updates and background automation.

### Key Features
- **Team Management**: Roster management, formation system, flexible 15-player roster with up to 2 taxi squad players.
- **League System**: 8-division structure with integrated playoffs and round-robin scheduling.
- **Player System**: 5 fantasy races, role-based gameplay (Passer, Runner, Blocker), advanced attributes (1-40 scale) with racial modifiers, daily and end-of-season progression, aging, and retirement mechanics.
- **Stadium Management**: Multi-level facility upgrades, daily revenue/cost system, fan loyalty, attendance, and home-field advantage calculations.
- **Marketplace**: Player trading with bidding system, anti-sniping protection, `buy-now` pricing, and listing limits.
- **Notifications**: Real-time system with deletion capability.
- **Store System**: In-game purchases with Credits and Gems, daily rotation of items, and race-specific equipment.
- **Contract Management**: Advanced negotiation system with salary caps based on division.
- **Injury System**: Detailed tracking, recovery mechanics, and probability formulas.
- **Tournament System**: 16-team Mid-Season Cup and Daily Division tournaments with overtime.
- **Financial System**: Comprehensive revenue/expense tracking, transaction logging.
- **Player Skills**: 3-tier system (Common, Uncommon, Rare) with race-specific abilities.
- **Staff System**: Head Coach, Trainers, Recovery Specialist, and Scouts with distinct attributes and effects on player development, injuries, and team performance.
- **Tactical System**: Formation types (Balanced, Offensive, Defensive, Speed, Power) and tactical focus effects.
- **Season Cycle**: 17-day structure with daily progression, 3 AM reset actions, and end-of-season events including promotion/relegation.
- **Match Engine**: 2D canvas-based live match simulation with 6v6 dome system, dynamic commentary, and stamina tracking based on minutes played.
- **UI/UX**: 6-hub mobile-first interface (Team HQ, Roster HQ, Competition Center, Market District, Community Portal, Legacy Routes), dark theme UI with `shadcn/ui` components and Tailwind CSS, modern sticky header, enhanced player cards, and revamped financial and inventory tabs.

## External Dependencies
- **Cloud Platform**: Google Cloud Platform (GCP).
- **Hosting**: Firebase Hosting (for frontend).
- **Backend Services**: Google Cloud Run (for backend APIs and WebSockets).
- **Database**: Neon (serverless PostgreSQL).
- **Secrets Management**: GCP Secret Manager.
- **Authentication**: Google OAuth 2.0.
- **CI/CD**: GitHub Actions.
- **Container Registry**: GCP Artifact Registry.