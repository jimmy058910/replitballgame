# Realm Rivalry - Fantasy Sports Management Game

## Overview
Realm Rivalry is an advanced fantasy sports management web application featuring tactical team management with 5 specific fantasy races (Human, Sylvan, Gryll, Lumina, Umbra), comprehensive league systems with division-based tournaments, exhibition matches, advanced 3-tier player abilities system, team inactivity tracking, enhanced marketplace with bidding system, live match simulation with comprehensive game animations, detailed injury and recovery mechanics, mobile-first responsive design, and advanced stadium/facility management.

Built as a React + Express web application with PostgreSQL database, using modern UI components and real-time features.

## Project Status
**Current Phase**: PRODUCTION (working toward Pre-Alpha with 8-16 handpicked users)
**Primary Goal**: Achieve working season loop, then transition to pre-Alpha testing phase

## Project Architecture

### Frontend (React + Vite)
- **Framework**: React with TypeScript
- **Routing**: Wouter for client-side routing
- **UI Components**: shadcn/ui with Tailwind CSS
- **State Management**: Zustand for real-time state + TanStack Query for server state
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React and React Icons
- **Real-time Updates**: WebSocket integration with Zustand stores

### Backend (Express + Node.js)
- **Server**: Express with TypeScript
- **Database**: PostgreSQL with Prisma ORM (100% Prisma syntax only)
- **Database Infrastructure**: Neon (serverless PostgreSQL) - recommended for production scaling
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: PostgreSQL-backed sessions
- **Architecture**: Domain-driven design with bounded contexts
- **API Validation**: Zod schemas for type-safe API boundaries
- **Error Handling**: Centralized error management with structured logging

### Code Standards
- **Database Operations**: Use Prisma Client exclusively - no Drizzle syntax allowed
- **Query Patterns**: Use prisma.model.findMany(), prisma.model.create(), etc.
- **Error Handling**: Always include try-catch blocks for database operations
- **Type Safety**: Use Prisma-generated types for all database interactions
- **Domain Architecture**: Organize code into bounded contexts with clear interfaces
- **API Validation**: Use Zod schemas for all API endpoints with comprehensive validation
- **State Management**: Use Zustand for real-time state, TanStack Query for server state
- **Testing**: Maintain 80% branch coverage with comprehensive unit and integration tests

### Key Features Implemented
- **Team Management**: Complete roster management with formation system
- **League System**: 8-division structure with integrated playoffs
- **Player System**: 5 fantasy races with role-based gameplay (Passer, Runner, Blocker)
- **Stadium Management**: Multi-level facility upgrades and revenue tracking
- **Marketplace**: Player trading with bidding system
- **Notifications**: Real-time notification system with deletion capability
- **Store System**: In-game purchases and premium currency
- **Contract Management**: Advanced contract negotiation system
- **Injury System**: Detailed injury tracking and recovery mechanics

## Revenue Model
- **Realm Pass**: Monthly subscription with gameplay perks
- **Ad-Supported**: Free gameplay with advertising revenue
- **Gem Purchases**: Premium currency for credits, extra exhibition games, and additional tournament entries
- **Future**: Cosmetic and customization items

## Current Architecture Status

### 6-Hub Mobile-First Interface (Updated July 22, 2025)
- **Team HQ** (/) - Mission control dashboard with seasonal context
- **Roster HQ** (/roster-hq) - Complete player and staff management  
- **Competition Center** (/competition) - Leagues, tournaments, live matches
- **Market District** (/market-district) - Trading, store, inventory, transactions
- **Community Portal** (/community) - Social features, referrals, support, game manual
- **Legacy Routes** - Maintained for backwards compatibility (/team, /market, /world)

### Navigation Display Structure
- **Mobile**: "Team / Roster / Competition / Market / Community"
- **Desktop**: "Team HQ / Roster HQ / Competition Center / Market District / Community Portal"

### Mobile-First Design Principles
- Touch targets: minimum 44px (standard), 56px (large actions)
- Responsive typography: clamp() functions for optimal mobile readability
- Grid systems: mobile-cards, dashboard, stats with intelligent breakpoints
- Safe area insets: iOS/Android notch and home indicator compatibility
- Performance optimization: lazy loading, efficient polling, cache management

## Core Game Mechanics & Systems

### 1. Player Generation & Attributes
**Attribute Scale**: All 8 player attributes (Speed, Power, Throwing, Catching, Kicking, Stamina, Leadership, Agility) use a 1-40 scale with racial modifiers applied after base generation (final cap of 40).

**Racial Modifiers**:
- **Human**: +1 to all stats
- **Sylvan**: +3 Speed, +4 Agility, -2 Power
- **Gryll**: +5 Power, +3 Stamina, -3 Speed, -2 Agility
- **Lumina**: +4 Throwing, +3 Leadership, -1 Stamina
- **Umbra**: +2 Speed, +3 Agility, -3 Power, -1 Leadership

**Rookie Generation (Tryouts)**:
- **Age**: 16-20 years old
- **Potential**: Single overall rating on 10-point scale (0.5 to 5 stars)
- **Total Attribute Points (TAP)**: BasePoints + (PotentialRating × 4)
  - Basic Tryout BasePoints: 40-60
  - Advanced Tryout BasePoints: 60-85
- **Point Distribution**: 3 baseline to each attribute (24 total), remaining TAP distributed by role (60% primary stats, 40% secondary)

**Free Agent Generation**: Ages 18-35 with wider TAP variance for hidden gems and veterans.

### 2. Player Progression, Aging & Retirement
**Daily Progression (3 AM Reset)**: Each player has small chance (1% + AgeModifier) to gain +1 in random eligible attribute.

**End-of-Season Progression (Day 17)**: Primary development event with ProgressionChance calculated as:
`BaseChance + PotentialModifier + AgeModifier + UsageModifier + TrainerBonus`

**Age-Related Decline**: Players 31+ have chance to lose 1 point in physical stats (Speed, Agility, Power).
`DeclineChance = (player.age - 30) × 2.5%`

**Retirement System**: Players 35+ have retirement chance, automatic at age 45.
`RetirementChance = BaseAgeChance + (CareerInjuries × 2%) + LowPlayingTimeModifier`

### 3. Staff System & Effects
**Staff Attributes**: All staff use 1-40 scale with specific roles:
- **Head Coach** (Motivation, Development): Increases BaseChance for player progression, boosts trainer effectiveness, contributes to Team Camaraderie
- **Trainers** (Teaching): Provide TrainerBonus to ProgressionChance for specific attribute groups during end-of-season development
- **Recovery Specialist** (Physiology): Increases Injury Recovery Points healed per day
- **Scouts** (Talent_Identification, Potential_Assessment): Reduce "fog of war" for tryout and marketplace player evaluations

### 4. Power & Camaraderie Calculations
**Player Power (CAR)**: Core Athleticism Rating displayed as "Power" in UI, calculated from 6 main attributes only
`Power (CAR) = Average(Speed, Power, Throwing, Catching, Kicking, Agility)`
*Note: Stamina and Leadership attributes affect other game systems but are excluded from Power calculation*

**Team Power**: Average Power rating of top 9 players on roster, assigned descriptive tier (Foundation, Developing, Competitive, Contender, Elite)

**Team Camaraderie**: Average of individual player camaraderie scores, updated end-of-season based on team success, player loyalty (years on team), and Head Coach leadership

### 5. Stadium, Finance & Atmosphere
**Fan Loyalty (0-100)**: Persistent team score updated end-of-season, influenced by win percentage, championships, and stadium facilities (Lighting, Screens)

**Attendance Rate**: Primarily driven by FanLoyalty with small bonus for winning streaks
`Actual Attendance = StadiumCapacity × AttendanceRate`

**Revenue Calculation (Per Home Game)**:
- Ticket Sales: ActualAttendance × 25₡
- Concessions: ActualAttendance × 8₡ × ConcessionsLevel
- Parking: (ActualAttendance × 0.3) × 10₡ × ParkingLevel
- Apparel Sales: ActualAttendance × 3₡ × MerchandisingLevel
- VIP Suites: VIPSuitesLevel × 5000₡
- Atmosphere Bonus: Small credit bonus per attendee if FanLoyalty very high

**Home Field Advantage**: Intimidation Factor based on ActualAttendance and FanLoyalty applies temporary debuff to away team's Catching/Throwing stats

### 6. Roster & Taxi Squad Management
**Roster Structure**:
- **Total Roster Size**: Maximum 15 players (flexible distribution)
- **Position Requirements**: Minimum 4 Blockers, 4 Runners, 3 Passers (12 minimum players total)
- **Main Roster**: 13-15 players eligible for matches and tactics
- **Taxi Squad**: Maximum 2 players available for promotion only
- **Flexible Distribution**: Can be 15 main + 0 taxi, 14 main + 1 taxi, or 13 main + 2 taxi

**Taxi Squad Rules**:
- **Promotion Only**: Players can only be promoted FROM taxi squad, never relegated TO it
- **Offseason Promotions**: Taxi squad promotions only allowed during Days 16-17 (offseason)
- **Player Releases**: During offseason, players can be released to make room for taxi squad promotions
- **Match Eligibility**: Only main roster players can participate in matches and be selected for tactics/formations

**Substitution System**:
- **Auto-Substitution**: Players auto-substitute at 50% stamina or when severely injured
- **Substitution Order**: Managed through drag-and-drop interface in Tactics & Lineup hub
- **Position-Specific**: Substitutes queued by position (Blocker, Runner, Passer)

### 7. Marketplace & Store
**Marketplace Rules**:
- 10-player roster minimum requirement
- 3-player listing limit per team
- 2% listing fee on starting bid
- Anti-sniping system with 5-minute extensions
- Buy-now pricing formula: (Player CAR × 1000) + (Potential × 2000)

**Store System (Minimal Pay-to-Win)**:
- Game designed to generate revenue while maintaining competitive balance
- Players can gain advantages with real money but success is achievable without spending
- All gameplay-affecting items available for Credits, with Gems offering convenience/premium options
- **Credit Store**: Daily rotating Common/Uncommon items
- **Featured Store**: Daily rotating Rare/Epic/Legendary items for Gems or high Credits
- **Race-Specific Equipment**: Thematic gear matching the 5 fantasy races
- **Consumables**: Recovery items and single-game performance boosters only

### 8. Match Duration & Tournament Rules
**Match Durations**:
- **Exhibition Matches**: 30 minutes (1800 seconds) with 15-minute halves for casual play
- **League Matches**: 40 minutes (2400 seconds) with 20-minute halves for competitive play

**Tournament Overtime**:
- All tournament matches feature sudden death overtime if tied at regulation end
- First team to score in overtime wins immediately
- Overtime can extend up to 10 additional minutes until first score

## Recent Changes

### July 22, 2025 - ✅ DRAMATIC TEAM HQ MOBILE-FIRST REDESIGN COMPLETE ✅

#### ✅ REVOLUTIONARY INTERFACE TRANSFORMATION - MOBILE-FIRST COMMAND CENTER IMPLEMENTED
- ✓ **Hero Banner Redesign**: Dramatic gradients, large typography, and visual progress indicators for seasonal context
- ✓ **Critical Alerts System**: Bold red warning system with urgent action buttons for immediate user attention
- ✓ **Quick Access Tiles**: Transformed into large, colorful cards with hover animations and status badges
- ✓ **Progressive Disclosure**: Collapsible sections with touch-friendly interaction design optimized for mobile
- ✓ **Mobile-First CSS Framework**: Custom utilities for responsive design, enhanced visual impact, and performance
- ✓ **Component Integration**: DramaticTeamHQ.tsx and TeamHQHeroBanner.tsx components operational with full functionality
- ✓ **Production Ready**: Complete Team HQ interface transformation operational with dramatic visual improvements

### July 22, 2025 - ✅ COMPREHENSIVE DOCUMENTATION UPDATE COMPLETE ✅

#### ✅ REPLIT.MD OVERHAUL - RESOLVED ALL CONFLICTS AND INCONSISTENCIES
- ✓ **Architecture Clarification**: Confirmed 100% Prisma ORM usage, removed all Drizzle references
- ✓ **Navigation Structure**: Updated to reflect 6-hub structure (Team HQ, Roster HQ, Competition Center, Market District, Community Portal, Legacy Routes)
- ✓ **Game Mechanics Fixes**: Corrected Power calculation (6 attributes), roster structure (15 max, 2 max taxi), match durations (40min league, 30min exhibition)
- ✓ **Revenue Model Documentation**: Added Realm Pass, ad-supported, gem purchases, and future cosmetic items
- ✓ **Production Status**: Clarified current PRODUCTION phase working toward Pre-Alpha with 8-16 users
- ✓ **Archive Creation**: Moved changes from July 18-21 to replit-archive.md for better document management
- ✓ **Current Information**: Updated all specifications to reflect accurate game design and user requirements

### July 22, 2025 - ✅ PLAYER DETAIL MODAL COMPLETE REDESIGN - MOBILE-FIRST SINGLE-SCROLL INTERFACE IMPLEMENTED ✅

#### ✅ REVOLUTIONARY MODAL INTERFACE TRANSFORMATION - 4-TAB TO PROGRESSIVE DISCLOSURE DESIGN
- ✓ **Tab Elimination**: Removed 4-tab layout (Overview, Abilities, Equipment, Game Logs) replaced with single scrollable view
