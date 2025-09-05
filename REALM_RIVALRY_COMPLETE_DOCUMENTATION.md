# Realm Rivalry - Complete Game Documentation
## The Ultimate Fantasy Sports Management Experience

*Last Updated: September 3rd, 2025*  
*Version: Pre-Alpha*  
*Live at: https://realmrivalry.com*

**This is the definitive unified documentation combining all technical specifications, game design documents, and operational procedures for Realm Rivalry.**

## 🔥 Latest Session Updates (September 3rd, 2025)

### **Major System Implementations Completed**
- ✅ **Comprehensive Statistics System**: Complete overhaul of player and team statistics tracking to reflect continuous action gameplay
- ✅ **Dynamic Playoff Scheduling**: Implemented real-time playoff round scheduling based on match completion times
- ✅ **Late Signup System Validation**: Bulletproof Greek alphabet subdivision system for Division 8 late registrations
- ✅ **Database Schema Updates**: Added comprehensive `PlayerMatchStats` and `TeamMatchStats` models
- ✅ **Statistics Persistence**: Full integration between match simulation and database storage

### **Key Technical Achievements**
- 🎯 **Greek Alphabet Subdivisions**: Consistent naming throughout (alpha, beta, gamma, etc.)
- 🏟️ **Statistics**: 25+ individual player stats, 20+ team stats reflecting continuous action
- ⚽ **Match Simulation Enhancement**: Role-based stat generation with realistic dome ball mechanics
- 📊 **StatsService Overhaul**: Real database queries replacing placeholder data

## Key Unifications Made

This unified documentation resolves several inconsistencies between the original technical documentation and the comprehensive game design specifications:

### Enhanced Game Mechanics
- **Detailed Race Characteristics**: Added specific stat bonuses and role specializations for each fantasy race
- **Comprehensive Player Development**: Integrated detailed aging algorithms, retirement mechanics, and potential systems
- **Advanced Match Simulation**: Added mathematical formulas for possession, scoring, and injury calculations

### UI/UX Integration
- **Mobile-First Design System**: Added detailed hub-specific color schemes and responsive breakpoints
- **Component Specifications**: Defined player card layouts, touch targets, and interaction patterns
- **Commentary System**: Integrated dynamic narrative generation with contextual factors

### Economic Balance
- **Mathematical Revenue Models**: Added precise stadium revenue calculations and attendance formulas  
- **Competitive Balance Mechanisms**: Defined division-based advantages and anti-manipulation systems
- **Season Automation**: Detailed 17-day cycle with automated progression and reward distribution

### Technical Architecture
- **Enhanced API Specifications**: Maintained existing robust backend while adding new endpoint details
- **Database Model Consistency**: Preserved all existing Prisma relationships while clarifying naming conventions
- **Real-time Systems**: Enhanced WebSocket implementation details for match simulation and tournaments

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Game Overview](#game-overview)
3. [Core Technology Stack](#core-technology-stack)
4. [Game Systems Deep Dive](#game-systems-deep-dive)
5. [Database Architecture](#database-architecture)
6. [Frontend Architecture](#frontend-architecture)
7. [Backend Architecture](#backend-architecture)
8. [Competition & League Systems](#competition--league-systems)
9. [Economic Systems](#economic-systems)
10. [Player Development & Management](#player-development--management)
11. [Stadium & Revenue Systems](#stadium--revenue-systems)
12. [Real-Time Match Engine](#real-time-match-engine)
13. [Dome Ball Statistics System](#dome-ball-statistics-system)
14. [Tournament Systems](#tournament-systems)
15. [Equipment & Item Systems](#equipment--item-systems)
16. [Advanced Features](#advanced-features)
17. [Mobile & PWA Features](#mobile--pwa-features)
18. [Deployment & Production](#deployment--production)
19. [Development Guidelines](#development-guidelines)
19. [API Reference](#api-reference)
20. [Game Balance & Economics](#game-balance--economics)
21. [Commentary & Narrative Systems](#commentary--narrative-systems)
22. [Advanced UI/UX Specifications](#advanced-uiux-specifications)
23. [Mathematical Formulas & Algorithms](#mathematical-formulas--algorithms)
24. [Season & Tournament Scheduling](#season--tournament-scheduling)
25. [Troubleshooting Guide](#troubleshooting-guide)

---

## Executive Summary

**Realm Rivalry** is a sophisticated fantasy sports management game built around the fictional sport best described as "Dome Ball." It represents a complete ecosystem featuring team management, player development, economic simulation, real-time competition, and social interaction. The game is currently operational in production with a full-stack TypeScript architecture utilizing modern web technologies.

### Key Achievements
- **Production Operational**: Live at https://realmrivalry.com with automated competitive cycles
- **Zero Technical Debt Policy**: Industry-standard implementations throughout
- **Mobile-First Design**: Revolutionary 5-hub interface replacing traditional tab-heavy approaches
- **Real-Time Competition**: WebSocket-powered match simulation and tournament management
- **Comprehensive Economy**: Multi-currency system with sophisticated marketplace mechanics

---

## Game Overview

### The Sport: Dome Ball
Dome Ball is a fantasy sport played by two teams of 6 players each in specialized roles within enclosed arena environments.

**Player Roles:**
- **Passer** (1-2 players): Primary ball handlers and strategic playmakers
  - High Throwing and Speed attributes crucial
  - Responsible for field positioning and tactical execution
- **Runner** (2-3 players): Speed-focused players for rapid movement and scoring  
  - Speed and Catching attributes are primary
  - Execute quick plays and breakthrough maneuvers
- **Blocker** (2-3 players): Defensive powerhouses controlling field dominance
  - Power and Stamina attributes essential
  - Control field zones and protect teammates

**Fantasy Races with Detailed Characteristics:**

1. **Human** - Balanced attributes, versatile in all roles
   - Natural adaptability across all positions
   - Moderate growth potential in all skills
   - Reliable performers with steady development

2. **Sylvan** - Naturally agile and fast, excellent Runners
   - Superior Speed base stats (+2-4 advantage)
   - Enhanced agility for field navigation
   - Lower Power but compensated by tactical awareness

3. **Gryll** - Powerful and durable, dominant Blockers
   - Exceptional Power and Stamina attributes
   - Natural damage resistance and field control
   - Slower development but higher ceiling potential

4. **Lumina** - Intelligent and precise, skilled Passers
   - Superior Throwing accuracy and tactical vision
   - Enhanced learning rates for strategic skills
   - Lower physical stats but superior decision-making

5. **Umbra** - Mysterious and adaptable, wild-card potential
   - Variable stat distributions with hidden bonuses
   - Unpredictable development patterns
   - Potential for breakthrough performance in any role

**Match Duration & Structure:**
- **Exhibition**: 30 minutes (15×2 halves), no overtime
- **League**: 40 minutes (20×2 halves), no overtime  
- **Tournament**: 40 minutes (20×2 halves) + 10-minute overtime + sudden death
- **Playoff**: 40 minutes (20×2 halves) + 10-minute overtime + sudden death
- Quick simulation available for development/testing
- Instant results with detailed statistics and commentary

### Core Game Philosophy
- **Depth Over Complexity**: Simple interface hiding sophisticated mechanics
- **Strategic Decision Making**: Every choice impacts team performance and economics
- **Long-term Investment**: Player development and team building over multiple seasons
- **Competitive Balance**: Fair competition regardless of spending or time investment
- **Community Engagement**: Social features and competitive tournaments

---

## Core Technology Stack

### Frontend Technologies
```typescript
// Primary Stack
React 18.3.1              // UI Framework with hooks and concurrent features
TypeScript 5.6.3          // Type-safe development
TailwindCSS 3.4.17       // Utility-first styling
Vite 6.3.5               // Build tool and dev server

// UI Components & Libraries
Radix UI                 // Unstyled, accessible components
shadcn/ui                // Pre-built component library
Lucide React 0.453.0     // Icon library
Framer Motion 11.18.2    // Animation library

// State Management
TanStack React Query 5.60.5  // Server state management
Zustand 5.0.6            // Client state management
React Hook Form 7.55.0   // Form management

// Routing & Navigation
Wouter 3.3.5             // Lightweight router
```

### Backend Technologies
```typescript
// Core Server Stack
Express.js 4.21.2        // Web framework
Node.js (Latest LTS)     // Runtime environment
TypeScript 5.6.3         // Type safety
Socket.IO 4.8.1          // Real-time communication

// Database & ORM
PostgreSQL               // Primary database
Prisma 6.10.1           // Database ORM and schema management
@prisma/client 6.10.1   // Database client

// Authentication & Security
Firebase Admin SDK 13.4.0    // Authentication service
Helmet.js 8.1.0             // Security headers
Express Rate Limit 8.0.1    // Rate limiting
CORS 2.8.5                  // Cross-origin resource sharing

// External Services
Google Cloud Run        // Container deployment
Google Cloud SQL       // Managed PostgreSQL
Firebase Hosting       // Static site hosting
Google Cloud Build     // CI/CD pipeline
```

### Development & Build Tools
```typescript
// Build & Development
Vite 6.3.5              // Build tool
TSX 4.20.3              // TypeScript execution
ESBuild 0.25.9          // Fast bundling

// Testing Framework
Vitest 3.2.4            // Unit testing
React Testing Library 16.3.0  // Component testing
JSDOM 26.1.0            // DOM simulation
Supertest 7.1.1         // API testing

// Code Quality
ESLint                  // Code linting
Prettier                // Code formatting
Husky 9.1.7            // Git hooks
Lint-staged 16.1.4     // Pre-commit formatting
```

---

## Game Systems Deep Dive

### 1. Team Management System

#### Roster Structure
```typescript
interface TeamRoster {
  mainRoster: Player[];        // 12-15 players (flexible)
  taxiSquad: Player[];        // 0-2 development players (counts towards main roster)
  minimumRoster: 12;          // Absolute minimum for competition
  maxMarketListings: 3;       // Marketplace constraint
}
```

#### Camaraderie System (5-Tier)
The team chemistry system affects all aspects of team performance:

**Excellent (85-100):**
- +15% contract willingness
- +10% player development speed
- -25% injury risk
- +5% match performance bonus

**Good (70-84):**
- +10% contract willingness
- +5% player development speed
- -15% injury risk
- +2% match performance bonus

**Average (55-69):**
- No bonuses or penalties
- Baseline team performance

**Low (40-54):**
- -10% contract willingness
- -5% player development speed
- +15% injury risk
- -2% match performance penalty

**Poor (0-39):**
- -20% contract willingness
- -10% player development speed
- +30% injury risk
- -5% match performance penalty

#### Player Development & Aging System
```typescript
interface PlayerDevelopment {
  skillProgression: {
    baseGrowthRate: 0.1,              // Points per day during prime years
    ageModifiers: {
      under23: 1.2,                   // +20% development rate
      age23to27: 1.0,                 // Standard rate (prime years)  
      age28to32: 0.8,                 // -20% development rate
      over32: 0.5                     // -50% development rate
    },
    potentialCap: {
      calculation: "75 + (15 * random())", // 75-90 potential ceiling
      impactOnGrowth: "Growth slows as current approaches potential",
      rareExceptions: "5% chance for 90+ potential breakthrough"
    }
  };

  retirementSystem: {
    baseRetirementAge: 35,
    modifiers: {
      injuryHistory: "+1 year per major injury",
      teamSuccess: "-1 year if won championship in last 3 seasons",
      financialSecurity: "-1 year if career earnings > 500k credits"
    },
    retirementProbability: {
      age35: "15% chance per season",
      age36: "30% chance per season", 
      age37: "50% chance per season",
      age38plus: "75% chance per season"
    }
  };
}
```

#### Strategic Systems
```typescript
enum TacticalFocus {
  BALANCED = "BALANCED",
  ALL_OUT_ATTACK = "ALL_OUT_ATTACK", 
  DEFENSIVE_WALL = "DEFENSIVE_WALL"
}

enum FieldSize {
  STANDARD = "STANDARD",  // Balanced gameplay
  LARGE = "LARGE",        // Favors speed and passing
  SMALL = "SMALL"         // Favors power and blocking
}
```

#### Dynamic Game Situations
The tactical system recognizes four distinct game situations that trigger different AI behaviors and modifiers:

```typescript
type GameSituation = 'normal' | 'late_close' | 'winning_big' | 'losing_big';

// Updated game situation parameters:
interface GameSituationRules {
  late_close: {
    timing: 'final_5_minutes';           // Last 5 minutes of regulation (was 3)
    scoreRange: 'within_2_points';       // 0-2 point difference (was 1)
    effects: 'clutch_performance_based_on_camaraderie';
    tacticalImpact: '±30%_performance_modifier';
  };
  
  winning_big: {
    timing: 'second_half_only';          // After halftime
    scoreRange: '6_or_more_points_ahead'; // Leading by 6+ (was 2+)
    effects: 'conservative_play_clock_management';
    tacticalImpact: '+50%_conservative_-40%_risk';
  };
  
  losing_big: {
    timing: 'second_half_only';          // After halftime  
    scoreRange: '6_or_more_points_behind'; // Trailing by 6+ (was 2+)
    effects: 'desperation_mode_overrides_tactics';
    tacticalImpact: '+80%_aggression_+100%_risk';
  };
  
  normal: {
    condition: 'all_other_situations';
    effects: 'standard_tactical_focus_applied';
    tacticalImpact: 'base_tactical_system_modifiers';
  };
}

// Match duration context for game situations:
interface MatchDurations {
  exhibition: {
    total: '30_minutes';
    late_game_trigger: 'final_5_minutes'; // 25:00+ 
    second_half: '15:00+';
  };
  
  league: {
    total: '40_minutes';  
    late_game_trigger: 'final_5_minutes'; // 35:00+
    second_half: '20:00+';
  };
  
  tournament_playoff: {
    total: '40_minutes + overtime';
    late_game_trigger: 'final_5_minutes'; // 35:00+ (regulation)
    second_half: '20:00+';
    overtime: '10_minute_period + sudden_death';
  };
}
```

**Game Situation Examples:**

| Situation | Time | Score | Result |
|-----------|------|--------|---------|
| `normal` | 15:00 | 12-10 | Standard tactical focus |
| `late_close` | 37:00 | 18-17 | Clutch performance effects |
| `winning_big` | 25:00 | 21-12 | Conservative play, protect lead |
| `losing_big` | 32:00 | 8-20 | Desperation mode, all-out attack |

### 2. Player Development System

#### Core Attributes (8 Primary)
1. **Speed** - Movement and positioning
2. **Power** - Physical strength and impact
3. **Agility** - Quick direction changes and flexibility
4. **Throwing** - Passing accuracy and distance
5. **Catching** - Ball reception and handling
6. **Kicking** - Specialized ball striking
7. **Stamina Attribute** - Base endurance level
8. **Leadership** - Team coordination and morale

#### Dynamic Statistics
- **Daily Stamina Level** (0-100) - Current energy state
- **Injury Status** - HEALTHY, MINOR_INJURY, MODERATE_INJURY, SEVERE_INJURY
- **Injury Recovery** - Points-based recovery system
- **Camaraderie Score** - Individual chemistry rating (0-100)
- **Potential Rating** - Development ceiling (0.5-5.0 stars)

#### Age & Career Progression
```typescript
interface PlayerCareer {
  age: number;                    // Current age
  careerInjuries: number;        // Accumulated injury history
  gamesPlayedLastSeason: number; // Experience tracking
  
  // Seasonal minutes by match type
  seasonMinutesLeague: number;
  seasonMinutesTournament: number;
  seasonMinutesExhibition: number;
  seasonMinutesTotal: number;
  
  isRetired: boolean;            // Career ended
}
```

#### Skill System (16 Skills)
```typescript
enum SkillType {
  PASSIVE = "PASSIVE",  // Always active effects
  ACTIVE = "ACTIVE"     // Situational abilities
}

enum SkillCategory {
  UNIVERSAL = "UNIVERSAL",  // Available to all players
  ROLE = "ROLE",           // Position-specific skills
  RACE = "RACE"            // Race-specific abilities
}
```

Skills have multiple tiers (typically 1-5) with increasing effectiveness at each level.

### 3. Staff & Coaching System

#### Staff Types & Responsibilities
```typescript
enum StaffType {
  HEAD_COACH = "HEAD_COACH",              // Overall team strategy
  PASSER_TRAINER = "PASSER_TRAINER",      // Passing skill development
  RUNNER_TRAINER = "RUNNER_TRAINER",      // Speed and agility training
  BLOCKER_TRAINER = "BLOCKER_TRAINER",    // Power and blocking skills
  RECOVERY_SPECIALIST = "RECOVERY_SPECIALIST", // Injury prevention/healing
  SCOUT = "SCOUT"                         // Player talent identification
}
```

#### Staff Attributes (7 Core Skills)
1. **Motivation** (1-40) - Player morale and effort
2. **Development** (1-40) - Training effectiveness
3. **Teaching** (1-40) - Skill transfer ability
4. **Physiology** (1-40) - Physical conditioning
5. **Talent Identification** (1-40) - Scouting accuracy
6. **Potential Assessment** (1-40) - Development ceiling recognition
7. **Tactics** (1-40) - Strategic planning (Head Coach specific)

---

## Database Architecture

### Core Entity Relationships

```sql
-- Primary Entities
UserProfile 1:1 Team
Team 1:many Player
Team 1:1 TeamFinances
Team 1:1 Stadium
Team 1:many Staff

-- Competition Structure
Season 1:many League
League 1:many Game
Team many:many Tournament (through TournamentEntry)

-- Economic Systems
Team 1:many MarketplaceListing
Team 1:many Bid
Team 1:many InventoryItem
Player 1:1 Contract (optional)

-- Player Systems
Player many:many Skill (through PlayerSkillLink)
Player 1:many ActiveBoost
Player 1:many PlayerEquipment
```

### Key Indexes & Performance
```sql
-- High-performance indexes for common queries
CREATE INDEX idx_team_division_subdivision ON Team(division, subdivision);
CREATE INDEX idx_player_role_race ON Player(role, race);
CREATE INDEX idx_marketplace_active_expiry ON MarketplaceListing(isActive, expiryTimestamp);
CREATE INDEX idx_game_status_date ON Game(status, gameDate);
CREATE INDEX idx_tournament_type_status ON Tournament(type, status);
```

### Data Integrity Features
- **Comprehensive Foreign Keys** - All relationships properly constrained
- **Audit Trails** - CreatedAt/UpdatedAt on all major entities
- **Soft Deletes** - Retirement/deactivation rather than deletion
- **Validation Layers** - Database, API, and frontend validation
- **Transaction Safety** - ACID compliance for financial operations

---

## Frontend Architecture

### 5-Hub Mobile-First Design

**Revolutionary Interface Philosophy:**
Traditional sports management games use 20+ tabs and complex navigation. Realm Rivalry consolidates all functionality into 5 strategic hubs:

#### 1. Command Center Hub
- **Dashboard** - Current season status, pending actions, notifications
- **Season Overview** - League standings, remaining games, playoff positioning
- **Critical Alerts** - Contract expirations, injury updates, important deadlines
- **Quick Actions** - Most common tasks accessible with one click

#### 2. Roster HQ Hub
- **Active Roster** - Starting lineup management and formation setting
- **Taxi Squad** - Development player tracking and promotion decisions
- **Player Details** - Comprehensive stats, skills, and development tracking
- **Staff Management** - Coaching staff oversight and contract management

#### 3. Competition Center Hub
- **League Standings** - Division rankings and season progression
- **Match Schedule** - Upcoming games and recent results
- **Tournament Bracket** - Active tournament participation and results
- **Live Matches** - Real-time match viewing and statistics

#### 4. Market District Hub
- **Marketplace** - Player auctions and buy-now listings
- **Active Bids** - Current auction participation tracking
- **Store** - Equipment, consumables, and premium items
- **Trading History** - Transaction records and market analytics

#### 5. Settings Hub
- **Team Configuration** - Stadium upgrades, tactical settings, field size
- **Financial Overview** - Credits, gems, revenue, and expense tracking
- **Notifications** - Message center and alert preferences
- **Account Settings** - Profile, security, and game preferences

### Component Architecture

#### Design System
```typescript
// Consistent styling with shadcn/ui
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Standardized spacing and typography
const SPACING = {
  xs: '0.25rem',
  sm: '0.5rem', 
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem'
} as const;
```

#### Lazy Loading Pattern
```typescript
// Efficient code splitting for performance
const RosterHQ = lazy(() => import('@/components/hubs/RosterHQ'));
const MarketDistrict = lazy(() => import('@/components/hubs/MarketDistrict'));

// Skeleton loading states
export const HubLoader = () => (
  <div className="animate-pulse">
    <div className="h-8 bg-gray-200 rounded mb-4" />
    <div className="h-64 bg-gray-200 rounded" />
  </div>
);
```

#### State Management Strategy
```typescript
// React Query for server state
const { data: teamData, isLoading } = useQuery({
  queryKey: ['team', teamId],
  queryFn: () => api.team.get(teamId),
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Zustand for client state
interface AppState {
  currentHub: Hub;
  selectedPlayer: Player | null;
  notificationCount: number;
  setCurrentHub: (hub: Hub) => void;
}
```

### Responsive Design Philosophy

#### Mobile-First Breakpoints
```css
/* Mobile-first responsive design */
.container {
  @apply w-full px-4;
}

/* Tablet and up */
@media (min-width: 768px) {
  .container {
    @apply px-6;
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .container {
    @apply max-w-7xl mx-auto px-8;
  }
}
```

#### Touch-Optimized Interactions
- **Minimum Touch Target**: 44px × 44px (iOS/Android standards)
- **Gesture Support**: Swipe navigation between hubs
- **Safe Area Insets**: Respect device notches and home indicators
- **Haptic Feedback**: Touch response for critical actions

---

## Backend Architecture

### Domain-Driven Design Pattern

```typescript
// server/domains/ structure
domains/
├── auth/           // Authentication & authorization
│   ├── service.ts  // Business logic
│   ├── routes.ts   // API endpoints
│   ├── schemas.ts  // Validation schemas
│   └── index.ts    // Domain exports
├── economy/        // Financial systems & marketplace
├── matches/        // Game simulation & results
├── tournaments/    // Competition management
└── index.ts        // Domain registry
```

### API Route Registration Order (Critical)
```typescript
// server/index.ts - EXACT ORDER REQUIRED
app.use(helmet());                    // Security headers
app.use(compression());               // Response compression
app.use(sessionMiddleware);           // Session management
app.use(firebaseAuthMiddleware);      // Authentication

// ALL API ROUTES MUST BE REGISTERED HERE
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/matches', matchRoutes);
// ... all other API routes

// VITE MIDDLEWARE MUST BE LAST
if (process.env.NODE_ENV !== 'production') {
  const vite = await createViteDevServer();
  app.use(vite.ssrFixStacktrace);
}
app.use(errorHandler);                // Error handling
```

### Service Layer Architecture
```typescript
// Example: Economy Domain Service
export class EconomyService {
  private prisma = getPrismaClient();
  
  async purchaseItem(teamId: number, itemId: number, quantity: number) {
    return await this.prisma.$transaction(async (tx) => {
      // Atomic transaction for financial safety
      const team = await tx.team.findUnique({
        where: { id: teamId },
        include: { finances: true }
      });
      
      const item = await tx.item.findUnique({
        where: { id: itemId }
      });
      
      // Validation and business logic
      if (!team.finances || team.finances.credits < item.creditPrice) {
        throw new Error('Insufficient credits');
      }
      
      // Execute purchase atomically
      await tx.teamFinances.update({
        where: { teamId },
        data: { credits: team.finances.credits - item.creditPrice }
      });
      
      await tx.inventoryItem.upsert({
        where: { teamId_itemId: { teamId, itemId } },
        update: { quantity: { increment: quantity } },
        create: { teamId, itemId, quantity }
      });
      
      return { success: true };
    });
  }
}
```

### WebSocket Real-Time Engine
```typescript
// Real-time match simulation
io.on('connection', (socket) => {
  socket.on('join-match', (matchId) => {
    socket.join(`match-${matchId}`);
  });
  
  socket.on('simulate-match', async (matchData) => {
    const simulation = await matchSimulationService.run(matchData);
    
    // Stream live updates to all viewers
    for (const update of simulation.liveUpdates) {
      io.to(`match-${matchData.id}`).emit('match-update', update);
      await sleep(100); // Realistic pacing
    }
    
    io.to(`match-${matchData.id}`).emit('match-complete', simulation.result);
  });
});
```

---

## Competition & League Systems

### Season Structure (17-Day Cycles)

#### Regular Season Phase (Days 1-14)
```typescript
interface SeasonSchedule {
  phase: 'REGULAR_SEASON';
  totalDays: 17;
  regularSeasonDays: 14;    // Days 1-14
  playoffDays: 3;           // Days 15-17
  simulationWindow: {
    start: '16:00 EDT',     // 4:00 PM
    end: '22:00 EDT'        // 10:00 PM
  };
}
```

#### Division Structure
```typescript
enum Division {
  DIAMOND = 1,    // Elite tier
  PLATINUM = 2,   // High competitive
  GOLD = 3,       // Mid-high competitive  
  SILVER = 4,     // Mid-tier
  BRONZE = 5,     // Mid-low tier
  COPPER = 6,     // Lower competitive
  IRON = 7,       // Entry competitive
  STONE = 8       // Beginner tier
}

interface DivisionConfig {
  subdivision: 'alpha' | 'beta' | 'gamma' | 'delta' | string; // Greek alphabet naming with numbered extensions (e.g., 'alpha_1', 'beta_2')
  maxTeams: number;
  minTeams: number;
  promotionSlots: number;
  relegationSlots: number;
}
```

#### Playoff System (Day 15) - Dynamic Scheduling

**Division Bracket Structure:**
- **Divisions 1-2**: 8-team brackets (Quarterfinals → Semifinals → Finals)
- **Divisions 3-8**: 4-team brackets (Semifinals → Finals)

**Dynamic Round Scheduling:**
- **First Round**: Scheduled at season start for Day 15 (3:00PM EDT base time)
- **Subsequent Rounds**: Dynamically scheduled 30 minutes after previous round completion
- **Example**: If semifinals end at 5:22PM and 5:26PM, finals automatically start at 5:56PM
- **Round Buffers**: 30-minute gaps between all rounds for strategy/preparation

```typescript
interface DynamicPlayoffScheduling {
  // Only first round scheduled initially
  initialScheduling: 'first_round_only';
  
  // Dynamic scheduling system monitors completed rounds
  roundCompletion: {
    monitoring: 'real_time_match_completion';
    nextRoundDelay: '30_minutes';
    calculationMethod: 'latest_match_completion_time + 15min_duration + 30min_buffer';
  };
  
  // Example progression
  example: {
    quarterfinals: '3:00PM EDT (fixed)',
    semifinals: '4:12PM EDT (dynamic - latest QF ended at 3:27PM)',
    finals: '5:45PM EDT (dynamic - latest SF ended at 5:00PM)'
  };
}

#### Late Signup System (Division 8 Only)

The Late Signup System allows new teams to join Division 8 after the season starts, providing a complete competitive experience with shortened seasons.

```typescript
interface LateSignupConfig {
  eligibleDivision: 8;               // Stone division only
  signupWindow: {
    start: "Day 1, 3:00 PM EDT";    // Opens after initial season starts
    end: "Day 9, 3:00 PM EDT";      // Hard cutoff for late registrations
  };
  dailyProcessing: "3:00 PM EDT";   // AI fill and schedule generation
  subdivisionSize: 8;                // Teams per subdivision  
  shortenedSeason: true;             // Reduced game count
  regularSeasonDays: "Dynamic";      // Formula: 14 - signupDay + 1
  playoffEligible: true;             // Full playoff participation
}
```

**Daily Processing Flow (3:00 PM EDT)**
1. Check all Division 8 subdivisions using **Greek alphabet naming** (alpha, beta, gamma, delta, epsilon, zeta, eta, theta, iota, kappa, lambda, mu, nu, xi, omicron, pi, rho, sigma, tau, upsilon, phi, chi, psi, omega)
2. If subdivision has 1-7 teams, fill with AI teams to reach exactly 8 teams
3. Generate shortened schedule for Days [currentDay] through 14
4. Teams begin playing immediately with balanced home/away games

**Subdivision Naming Convention:**
- **Base Names**: Greek alphabet (alpha, beta, gamma, etc.)
- **Extensions**: Numbered when Greek alphabet exhausted (alpha_1, beta_2, gamma_3)
- **NO "main/east/west"**: System exclusively uses Greek alphabet naming

**Example Scenarios:**
- **Day 4 Signup**: 4 users join 1PM-2:45PM → AI fills at 3PM → 11 games (Days 4-14)
- **Day 7 Signup**: 2 users join morning → AI fills at 3PM → 8 games (Days 7-14)
- **Day 9 Signup**: Last chance signups → AI fills at 3PM → 6 games (Days 9-14)

**Matchup Balancing:**
- Each team plays exactly once per day (4 matches per day with 8 teams)
- Home/away games balanced using rotation patterns
- Round-robin base with 7 unique patterns cycled for variety

### League Generation Algorithm

#### Balanced Scheduling
```typescript
interface ScheduleGeneration {
  teamsPerDivision: 8-16;           // Flexible league size based on Division
  gamesPerTeam: 6-14;              // Based on team count and potential late registration
  balancedHome: true;                // Equal home/away games
  divisionRivalries: true;          // Extra divisional games
  strengthOfSchedule: 'balanced';    // Competitive parity
}
```

#### Standings Calculation
```typescript
interface StandingsMetrics {
  wins: number;
  losses: number;  
  ties: number;
  pointsFor: number;        // Offensive performance
  pointsAgainst: number;    // Defensive performance
  pointDifferential: number; // Net scoring
  streak: string;           // W3, L1, etc.
  
  // Playoff tiebreakers
  divisionRecord: string;
  commonOpponents: string;
  strengthOfVictory: number;
  strengthOfSchedule: number;
}
```

---

## Economic Systems

### Multi-Currency Architecture

#### Credits (₡) - Primary Currency
```typescript
interface CreditSystem {
  symbol: '₡';                    // ALWAYS after amount: "25,000₡"
  startingAmount: 50000;          // New team allocation
  precision: 'integer';          // No decimal credits
  sources: [
    'stadium_revenue',
    'tournament_prizes', 
    'marketplace_sales',
    'sponsorship_deals',
    'achievement_rewards'
  ];
  sinks: [
    'player_salaries',
    'staff_contracts',
    'marketplace_purchases',
    'facility_upgrades',
    'consumable_items'
  ];
}
```

#### Gems - Premium Currency  
```typescript
interface GemSystem {
  sources: [
    'real_money_purchase',      // Primary source
    'tournament_achievements',  // Limited earning
    'special_events',          // Rare rewards
    'referral_bonuses'         // User growth incentive
  ];
  uses: [
    'premium_equipment',        // Exclusive items
    'credit_exchange',         // Convert to credits
    'tournament_entries',      // Special competitions
    'cosmetic_upgrades'        // Visual customization
  ];
}
```

### Marketplace Mechanics

#### Anti-Sniping Auction System
```typescript
interface AuctionMechanics {
  extensionTrigger: '1 minute';        // Remaining time threshold
  extensionDuration: '1 minute';       // Added time per extension
  maxExtensions: 5;                     // Prevents infinite extensions
  bidIncrement: 'dynamic';              // Based on current price
  
  // Example: Auction ending at 10:00 PM
  // Bid at 9:59 PM → Extends to 10:02 PM
  // Bid at 10:01:30 PM → Extends to 10:04 PM
}
```

#### Player Valuation Formula
```typescript
function calculateMinimumBuyNow(player: Player): number {
  const car = calculateCAR(player);      // Core Athleticism Rating
  const potential = player.potentialRating;
  
  return (car * 1000) + (potential * 2000);
}

function calculateCAR(player: Player): number {
  const coreStats = [
    player.speed,
    player.power, 
    player.agility,
    player.throwing,
    player.catching,
    player.kicking
  ];
  
  return coreStats.reduce((sum, stat) => sum + stat, 0) / coreStats.length;
}
```

#### Market Fees & Economics
```typescript
interface MarketplaceFees {
  listingFee: {
    rate: 0.03,                    // 3% of buy-now price
    refundable: false,             // Lost regardless of sale
    purpose: 'prevent_spam_listings'
  };
  
  marketTax: {
    rate: 0.05,                    // 5% of final sale price
    paidBy: 'seller',              // Deducted from proceeds
    purpose: 'economy_regulation'
  };
  
  escrowSystem: {
    bidAmount: 'held_immediately',  // Credits locked on bid
    refundDelay: '< 1 minute',     // Quick refund on outbid
    security: 'atomic_transactions' // No double-spending possible
  };
}
```

#### Off-Season Marketplace Conversion
```typescript
interface OffSeasonRules {
  trigger: 'day_17_3am_reset';        // Season end
  auctionConversion: 'buy_now_only';  // No more bidding
  autoDelistTimer: '7_days';          // Automatic removal
  seasonStartBehavior: 'full_restore'; // Normal auctions resume
}
```

### Financial Management

#### Team Finances Structure
```typescript
interface TeamFinances {
  credits: bigint;              // Available spending money
  gems: number;                // Premium currency balance
  escrowCredits: bigint;        // Locked in marketplace bids
  escrowGems: number;           // Locked premium currency
  
  // Projections and planning
  projectedIncome: bigint;      // Expected next-game revenue
  projectedExpenses: bigint;    // Upcoming costs (salaries, etc.)
  
  // Historical tracking
  lastSeasonRevenue: bigint;
  lastSeasonExpenses: bigint;
  
  // Operating costs
  facilitiesMaintenanceCost: bigint; // Stadium upkeep
}
```

#### Revenue Tracking System
```typescript
interface RevenueStream {
  stadiumTickets: number;       // Game day attendance
  concessionSales: number;      // Food and beverage
  parkingRevenue: number;       // Parking fees
  merchandising: number;        // Team store sales
  vipSuites: number;           // Premium seating
  
  // Performance bonuses
  tournamentPrizes: number;     // Competition winnings
  achievementRewards: number;   // Milestone bonuses
  
  // Seasonal income
  sponsorshipDeals: number;     // Corporate partnerships
  broadcastingRights: number;   // Media revenue share
}
```

---

## Stadium & Revenue Systems

### Stadium Facility Management

#### Upgrade System (5-Level Progression)
```typescript
interface FacilityUpgrade {
  concessionsLevel: 1-5;        // Food & beverage quality
  parkingLevel: 1-5;           // Parking capacity & convenience
  vipSuitesLevel: 1-5;         // Luxury seating options
  merchandisingLevel: 1-5;     // Team store & retail
  lightingScreensLevel: 1-5;   // Atmosphere & technology
}

interface UpgradeCosts {
  level1to2: 15000;            // ₡ credits
  level2to3: 30000;
  level3to4: 60000; 
  level4to5: 120000;
  totalMaxUpgrade: 225000;      // All facilities to max
}
```

#### Revenue Calculation Engine
```typescript
function calculateGameRevenue(
  stadium: Stadium,
  attendance: number,
  fanLoyalty: number
): StadiumRevenue {
  
  const baseTicketPrice = 15;   // Base ticket price in ₡
  
  const revenue = {
    tickets: attendance * baseTicketPrice * (1 + fanLoyalty/200),
    
    concessions: attendance * (5 + stadium.concessionsLevel * 2) * 
                (1 + fanLoyalty/300),
    
    parking: attendance * 0.7 * (3 + stadium.parkingLevel) *
             (1 + fanLoyalty/400),
    
    merchandise: attendance * (2 + stadium.merchandisingLevel * 3) *
                (1 + fanLoyalty/250),
    
    vip: stadium.vipSuitesLevel * 200 * (1 + fanLoyalty/150),
    
    total: 0  // Calculated as sum of above
  };
  
  revenue.total = Object.values(revenue).reduce((sum, val) => sum + val, 0);
  return revenue;
}
```

#### Atmosphere & Home Field Advantage
```typescript
interface StadiumAtmosphere {
  fanLoyalty: number;           // 0-100 base fan support
  facilityBonus: number;        // Lighting/screens contribution
  attendanceModifier: number;   // Crowd size impact
  rivalryBonus: number;         // Divisional games boost
  
  calculate(): number {
    return Math.min(100, 
      this.fanLoyalty + 
      (this.facilityBonus * 5) +
      this.attendanceModifier +
      this.rivalryBonus
    );
  }
}

interface HomeFieldAdvantage {
  playerStatBoost: number;      // +2% to +8% based on atmosphere
  injuryReduction: number;      // Lower injury risk at home
  opponentPenalty: number;      // Visiting team disadvantage
  refereeBias: number;          // Subtle officiating advantage
}
```

### Attendance Simulation

#### Dynamic Attendance Factors
```typescript
interface AttendanceCalculation {
  baseFactors: {
    stadiumCapacity: number;
    fanLoyalty: number;         // Primary driver
    teamRecord: number;         // Win percentage impact
    division: number;           // Higher divisions draw more
  };
  
  contextualModifiers: {
    opponentQuality: number;    // Star power of visiting team
    gameImportance: number;     // Playoff implications
    seasonTiming: number;       // Early vs. late season
    weatherConditions: string;  // 'good' | 'poor' | 'extreme'
    dayOfWeek: string;         // Weekend vs. weekday
    rivalryGame: boolean;      // Divisional matchups
  };
  
  calculate(): number {
    // Complex algorithm considering all factors
    const baseAttendance = this.stadiumCapacity * 0.4; // Minimum 40%
    const loyaltyMultiplier = 0.6 + (this.fanLoyalty / 100) * 0.6;
    
    return Math.min(
      this.stadiumCapacity,
      baseAttendance * loyaltyMultiplier * this.getContextualMultiplier()
    );
  }
}
```

---

## Real-Time Match Engine

### Simulation Architecture

#### Deterministic Randomness System
```typescript
interface MatchSimulation {
  seed: string;                 // Reproducible results
  homeTeam: Team;
  awayTeam: Team;
  conditions: MatchConditions;
  
  // Simulation guarantees
  reproducible: true;           // Same seed = same result
  realTime: false;             // Can be fast or slow
  interactive: true;           // Live updates via WebSocket
}

class MatchSimulator {
  private rng: SeededRandom;
  
  constructor(seed: string) {
    this.rng = new SeededRandom(seed);
  }
  
  async simulate(matchData: MatchData): Promise<MatchResult> {
    const events = [];
    
    for (let minute = 0; minute < 40; minute++) {
      const event = this.simulateMinute(minute);
      if (event) {
        events.push(event);
        await this.broadcastLiveUpdate(event);
      }
    }
    
    return this.calculateFinalResult(events);
  }
}
```

#### Live Commentary System
```typescript
interface CommentaryEngine {
  templates: {
    goals: string[];
    saves: string[];
    fouls: string[];
    substitutions: string[];
    timeouts: string[];
  };
  
  generate(event: MatchEvent): string {
    const template = this.selectTemplate(event.type);
    return this.populateTemplate(template, event.data);
  }
}
```

#### Quick Simulation Mode
```typescript
interface QuickSimMode {
  purpose: 'development_testing';
  speedMultiplier: 100;         // 100x faster than real-time
  preserveAccuracy: true;       // Same statistical outcomes
  liveUpdates: false;           // No WebSocket streaming
  
  // Usage in development
  async function runDevMatch(teams: [Team, Team]): Promise<MatchResult> {
    return await matchSimulator.simulate({
      teams,
      mode: 'quick',
      seed: generateTestSeed()
    });
  }
}
```

---

## Dome Ball Statistics System

### Match Statistics Tracking (Dome Ball Continuous Action)

#### Comprehensive Stat Categories
```typescript
interface DomeBallMatchStatistics {
  // Individual Player Stats
  individual: {
    // Core performance metrics
    playerId: number;
    minutesPlayed: number;          // Time on field during continuous action
    performanceRating: number;      // Overall 0-100 rating
    camaraderieContribution: number; // -5 to +5 team chemistry impact
    
    // Scoring
    scores: number;                 // Points scored
    assists: number;                // Passes/actions leading to scores
    
    // Passing in continuous dome ball action
    passAttempts: number;           // Any pass thrown during flow
    passCompletions: number;        // Successful catches by teammate
    passingYards: number;           // Total distance of completed passes
    perfectPasses: number;          // High-accuracy passes under pressure
    
    // Rushing in continuous flow
    rushingYards: number;           // Distance covered while carrying ball
    breakawayRuns: number;          // Long runs that break through defense (15+ yards)
    
    // Receiving (all positions can catch in dome ball)
    catches: number;                // Successful receptions
    receivingYards: number;         // Yards gained after catch
    drops: number;                  // Failed to secure passed ball
    
    // Physical defense in continuous action
    tackles: number;                // Successful takedowns/stops
    tackleAttempts: number;         // Defensive contact attempts
    knockdowns: number;             // Players physically knocked down
    blocks: number;                 // Offensive blocks made (pancakes)
    injuriesInflicted: number;      // Opponents injured by this player's actions
    
    // Ball disruption
    interceptions: number;          // Passes stolen/intercepted
    ballStrips: number;             // Forced fumbles during tackles
    passDeflections: number;        // Passes knocked away/disrupted
    
    // Ball control errors
    fumblesLost: number;            // Lost possession due to hits/mistakes
    ballRetention: number;          // Successful ball security under pressure
    
    // Continuous action metrics
    distanceCovered: number;        // Total yards moved during game
    staminaUsed: number;            // Physical exertion/fatigue
    ballPossessionTime: number;     // Seconds holding the ball
    pressureApplied: number;        // Times pressured opposing ball carrier
    
    // Physical toll
    injuries: number;               // Injuries sustained during game
  }[];
  
  // Team-Level Statistics
  team: {
    // Possession & Territory Control (continuous dome ball)
    timeOfPossession: number;        // Total seconds with ball control
    possessionPercentage: number;    // 0-100% of game time
    averageFieldPosition: number;    // Average position when gaining possession
    territoryGained: number;         // Net field position improvement
    
    // Offensive Production
    totalScore: number;
    totalPassingYards: number;
    totalRushingYards: number;
    totalOffensiveYards: number;     // All yardage gained
    passingAccuracy: number;         // Team completion percentage
    ballRetentionRate: number;       // Percentage of possessions kept
    scoringOpportunities: number;    // Times in scoring position
    scoringEfficiency: number;       // Conversion rate of opportunities
    
    // Physical Defense
    totalTackles: number;
    totalKnockdowns: number;
    totalBlocks: number;             // Pancakes/devastating blocks
    totalInjuriesInflicted: number;  // Opponents taken out
    
    // Ball Disruption
    totalInterceptions: number;
    totalBallStrips: number;         // Forced fumbles
    passDeflections: number;
    defensiveStops: number;          // Drives ended by defense
    
    // Physical & Flow Metrics (continuous action)
    totalFumbles: number;
    turnoverDifferential: number;    // (Forced - Lost)
    physicalDominance: number;       // Net knockdowns inflicted vs received
    ballSecurityRating: number;      // How well team maintains possession
    
    // Dome Environment Effects
    homeFieldAdvantage: number;      // Stadium atmosphere bonus
    crowdIntensity: number;          // Fan noise/energy impact
    domeReverberation: number;       // Enclosed stadium sound effects
    
    // Team Chemistry & Strategy
    camaraderieTeamBonus: number;    // Team chemistry effect on performance
    tacticalEffectiveness: number;   // Coach strategy success
    equipmentAdvantage: number;      // Gear performance bonuses
    physicalConditioning: number;    // Team stamina/endurance rating
  };
}
```

#### Key Dome Ball Differences from Traditional Sports
- **No Penalties**: Continuous action with no fouls or stoppages
- **No Downs System**: Free-flowing gameplay without structured plays
- **Universal Receiving**: All positions can catch passes
- **Physical Dominance**: Knockdowns and injuries are tracked as legitimate game metrics
- **Ball Strips**: Forced fumbles during tackles are distinct from accidental fumbles
- **Breakaway Runs**: 15+ yard rushes that break through defense
- **Perfect Passes**: High-accuracy throws under pressure
- **Continuous Action**: Minutes played reflects time in flowing gameplay

#### Statistical Significance Levels
- **Exhibition Matches**: Statistics NOT tracked (practice/friendly games)
- **League Matches**: Full statistics tracking (regular season)
- **Playoff/Tournament**: Enhanced statistics tracking with additional context

#### Historical Stat Aggregation
```typescript
interface DomeBallCareerStatistics {
  regularSeason: DomeBallStatLine;
  tournaments: DomeBallStatLine;
  playoffs: DomeBallStatLine;
  exhibitions: null; // Not tracked
  
  // Advanced dome ball metrics
  averagePerGame: DomeBallStatLine;
  physicalDominanceRating: number;    // Career knockdown vs fumble ratio
  ballSecurityRating: number;         // Career ball retention percentage
  clutchPerformanceIndex: number;     // Performance in high-intensity matches
  
  // Dome ball career highlights
  careerHighlights: {
    mostScoresInMatch: number;
    longestRushingStreak: number;
    mostKnockdownsInMatch: number;
    perfectPassStreak: number;
    injuriesSurvived: number;
  };
  
  // Trending analysis
  last5Games: DomeBallStatLine;
  seasonProgression: DomeBallStatLine[];
  intensityTolerance: number;         // Performance under physical pressure
}
```

---

## Tournament Systems

### Daily Divisional Tournaments

#### Automated Tournament System
Daily Divisional Tournaments are fully automated competitions that run continuously throughout each game day. **Division 1 (Diamond) does not participate** - only Divisions 2-8.

```typescript
interface DailyTournament {
  eligibility: 'divisions_2_through_8';    // Diamond division excluded
  entryFee: 0;                            // FREE entry for all divisions
  exactParticipants: 8;                   // Precisely 8 teams per tournament
  tournamentFormat: 'single_elimination'; // Quarterfinals → Semifinals → Finals
  
  // Automated registration and start system
  registrationWindow: {
    opens: '7:00_AM_EDT',                 // Daily window start
    closes: '1:00_AM_EDT_next_day',       // 18-hour registration period
    autoStart: 'immediate_on_8_teams',    // No waiting when full
    timerFallback: '60_minutes_from_first' // Auto-fill if not full
  };
  
  // Multiple concurrent tournaments per division/day
  concurrentInstances: true;              // New tournament ID when 8 teams register
  tournamentIdFormat: 'SDDT';            // Season-Division-Day-Sequential (e.g. "0841")
  
  // Prize structure by division
  rewards: {
    division2_platinum: { champion: { credits: 16000, gems: 8 }, runnerUp: { credits: 6000, gems: 0 }},
    division3_gold:     { champion: { credits: 12000, gems: 5 }, runnerUp: { credits: 4500, gems: 0 }},
    division4_silver:   { champion: { credits: 9000,  gems: 3 }, runnerUp: { credits: 3000, gems: 0 }},
    division5_bronze:   { champion: { credits: 6000,  gems: 0 }, runnerUp: { credits: 2000, gems: 0 }},
    division6_copper:   { champion: { credits: 4000,  gems: 0 }, runnerUp: { credits: 1500, gems: 0 }},
    division7_iron:     { champion: { credits: 2500,  gems: 0 }, runnerUp: { credits: 1000, gems: 0 }},
    division8_stone:    { champion: { credits: 1500,  gems: 0 }, runnerUp: { credits: 500,  gems: 0 }}
  };
}
```

#### AI Team Management System
```typescript
interface AITournamentFilling {
  // Intelligent AI team selection
  priorityOrder: [
    'existing_ai_teams_same_division',     // Use existing AI teams first
    'create_new_ai_teams_if_needed'       // Generate new ones only when required
  ];
  
  // AI team characteristics
  newAITeams: {
    balancedStats: '65_85_range',         // Competitive but not overpowered
    fullRoster: '12_players_per_team',    // Complete team with all positions
    basicFinances: '50000_credits_10_gems', // Reasonable starting resources
    stadiumLevel: 'tier_1_facilities'     // Standard stadium configuration
  };
  
  // Auto-fill trigger conditions
  autoFillTrigger: {
    timer_expires: '60_minutes_after_first_registration',
    registration_cutoff: '1:00_AM_EDT_enforcement'
  };
}
```

#### Tournament Scheduling
```typescript
interface TournamentSchedule {
  registrationOpen: '7am_edt';             // Daily registration window opens
  registrationClose: '1am_edt';            // Registration cutoff (next day)
  tournamentStart: 'auto_on_8_teams';      // OR 60-minute timer expires
  expectedDuration: 'instant_simulation';   // Uses QuickMatchSimulation
  
  // Multiple concurrent tournaments per division
  multipleInstances: true;                 // New tournament when 8 teams fill
  uniqueTournamentIds: 'SDDT_format';      // Season-Division-Day-Sequential
  autoFillTimer: '60_minutes';             // From first registration
  
  // AI team management
  useExistingAI: true;                     // Prioritize existing AI teams
  createAIIfNeeded: true;                  // Generate new AI if insufficient
  
  // Timing buffers
  bufferTimes: {
    preStart: '2_minutes';                 // Before tournament begins
    betweenRounds: '2_minutes';            // Between each round
  };
  
  minimumParticipants: 8;                  // Tournament viability
  maximumParticipants: 8;                  // Exact tournament size
}
```
 
#### Tournament Flow & Automation
```typescript
interface TournamentFlow {
  // Complete automation from start to finish
  automationLevel: 'fully_automated';
  
  // Tournament progression
  rounds: {
    quarterfinals: {
      matchCount: 4,               // 8 teams → 4 matches
      roundNumber: 1,
      bufferBefore: '2_minutes',
      simulationType: 'instant'    // QuickMatchSimulation
    },
    semifinals: {
      matchCount: 2,               // 4 winners → 2 matches  
      roundNumber: 2,
      bufferBefore: '2_minutes',
      generatedAutomatically: true // From quarterfinal winners
    },
    finals: {
      matchCount: 1,               // 2 winners → 1 match
      roundNumber: 3,
      bufferBefore: '2_minutes',
      generatedAutomatically: true // From semifinal winners
    }
  };
  
  // Prize distribution
  automaticRewards: {
    champion: 'immediate_upon_completion',
    runnerUp: 'immediate_upon_completion',
    semifinalists: 'automatic_ranking',     // 3rd place
    quarterfinalists: 'automatic_ranking'   // 5th place
  };
  
  // Post-completion cleanup
  postTournament: {
    moveToHistory: 'automatic',
    cleanupTimers: 'automatic', 
    updateTeamRecords: 'automatic'
  };
}
```

#### Bracket Generation
```typescript
interface BracketSystem {
  format: 'single_elimination_8_team';
  seeding: 'global_rankings_based';        // Competitive seeding using True Strength Rating
  exactParticipants: 8;                   // No byes, no odd numbers
  
  bracketStructure: {
    // Round 1: Quarterfinals (4 matches) - Seeded matchups
    quarterfinals: [
      'seed_1_vs_seed_2',    // Highest vs 2nd highest
      'seed_3_vs_seed_4',    // 3rd vs 4th  
      'seed_5_vs_seed_6',    // 5th vs 6th
      'seed_7_vs_seed_8'     // 7th vs 8th (lowest ranked)
    ],
    
    // Round 2: Semifinals (2 matches) - Generated from QF winners
    semifinals: ['QF1_winner v QF2_winner', 'QF3_winner v QF4_winner'],
    
    // Round 3: Finals (1 match) - Generated from SF winners  
    finals: ['SF1_winner v SF2_winner']
  };
  
  // Global Ranking-based seeding algorithm
  seedingCriteria: {
    algorithm: 'true_strength_rating';     // Same as Global Rankings endpoint
    components: {
      baseTeamPower: '40%_weight',         // Primary team strength
      divisionMultiplier: '15%_weight',    // Division competitive level
      winPercentage: '18%_weight',         // Win-loss record
      strengthOfSchedule: '15%_weight',    // Opponent quality
      teamCamaraderie: '12%_weight',       // Team chemistry factor
      recentForm: 'situational_bias',      // Recent performance
      healthFactor: 'injury_impact'        // Team health status
    };
    
    // Calculated moments before bracket creation
    seedingTiming: 'just_before_bracket_generation';
    fallback: 'random_shuffle_on_calculation_error';
  };
  
  generateBracket(participants: Team[]): TournamentBracket {
    if (participants.length !== 8 && participants.length !== 16) {
      throw new Error(`Tournament requires exactly 8 or 16 teams, found ${participants.length}`);
    }
    
    // Calculate Global Rankings for seeding
    const seededTeams = await this.seedByGlobalRankings(participants);
    
    // Create competitive matchups based on seeding
    return this.createSeededMatches(seededTeams);
  }
}
```

#### Tournament Seeding Examples
```typescript
interface SeedingExamples {
  // Example scenario: Division 7 Daily Tournament
  scenario: {
    registeredTeams: [
      { name: "Iron Eagles", globalRank: 3, trueStrengthRating: 847 },      // Seed #1
      { name: "Stone Hawks", globalRank: 12, trueStrengthRating: 723 },     // Seed #2  
      { name: "Thunder Bolts", globalRank: 455, trueStrengthRating: 534 },  // Seed #3
      { name: "Storm Riders", globalRank: 1000, trueStrengthRating: 421 },  // Seed #4
      { name: "Fire Wolves", globalRank: 1205, trueStrengthRating: 398 },   // Seed #5
      { name: "AI Team Alpha", globalRank: 1890, trueStrengthRating: 287 }, // Seed #6
      { name: "AI Team Beta", globalRank: 2001, trueStrengthRating: 276 },  // Seed #7
      { name: "AI Team Gamma", globalRank: 2156, trueStrengthRating: 251 }  // Seed #8
    ];
    
    // Generated quarterfinal matchups
    quarterfinals: [
      "Iron Eagles (Seed #1) vs Stone Hawks (Seed #2)",        // Top matchup
      "Thunder Bolts (Seed #3) vs Storm Riders (Seed #4)",     // Second tier
      "Fire Wolves (Seed #5) vs AI Team Alpha (Seed #6)",      // Third tier  
      "AI Team Beta (Seed #7) vs AI Team Gamma (Seed #8)"      // Bottom matchup
    ];
  };
  
  // Tournament creates compelling narratives
  competitiveBalance: {
    topTier: "Global rank #3 vs #12 creates elite competition",
    midTier: "Rank #455 vs #1000 represents divisional average", 
    bottomTier: "AI teams fill remaining spots with balanced stats",
    fairness: "Higher seeds face lower seeds for competitive balance"
  };
  
  // Benefits of Global Ranking seeding
  improvements: [
    "Eliminates pure randomness that could create unbalanced brackets",
    "Rewards teams with better records and performance", 
    "Creates compelling David vs Goliath storylines",
    "Ensures strongest teams don't meet until later rounds",
    "AI teams are properly positioned based on their strength"
  ];
}
```

### Mid-Season Classic Tournaments

#### Special Event Competitions
```typescript
interface MidSeasonClassic {
  frequency: 'seasonal';              // Once per season
  eligibility: 'all_divisions';       // Universal participation
  format: 'swiss_system' | 'elimination';
  duration: '4_days';                 // Multi-day event
  
  rewards: {
    champion: {
      credits: 50000,
      gems: 25, 
      trophy: 'Mid-Season Classic Champion',
      title: 'Classic Champion'
    };
    topPerformers: {
      top8: { credits: 15000, gems: 8 };
      top16: { credits: 5000, gems: 3 };
    };
  };
}
```

#### Special Event Types
```typescript
enum TournamentType {
  DAILY_DIVISIONAL = "DAILY_DIVISIONAL",    // Regular competitions
  MID_SEASON_CLASSIC = "MID_SEASON_CLASSIC", // Major events
}
  
  milestone: {
    'season_kickoff': { celebration: 'new_season', freeEntry: true },
    'championship_preview': { preparation: 'playoffs', eliteOnly: true }
  };
}
```

### Tournament Entry & Management

#### Entry Validation System
```typescript
interface EntryValidation {
  teamRequirements: {
    minimumRosterSize: 12;          // Must have enough players
    activeContracts: 'all_staff';   // Coaching staff required
    financialStanding: 'positive';  // No massive debt
  };
  
  competitionRestrictions: {
    maxSimultaneousTournaments: 2;   // Prevent overcommitment
    divisionLimits: 'respect_eligibility';
    seasonPhase: 'regular_season_only'; // No off-season tournaments
  };
  
  async validateEntry(teamId: number, tournamentId: number): Promise<boolean> {
    const team = await this.getTeamWithValidation(teamId);
    const tournament = await this.getTournament(tournamentId);
    
    return this.checkAllRequirements(team, tournament);
  }
}
```

#### Prize Distribution System
```typescript
interface PrizeDistribution {
  timing: 'immediate_upon_completion';
  method: 'automatic_transfer';
  
  async distributePrizes(tournament: Tournament): Promise<void> {
    const results = await this.getFinalStandings(tournament.id);
    
    for (const [rank, teamId] of results.entries()) {
      const prize = this.calculatePrize(tournament, rank);
      
      if (prize) {
        await this.transferRewards(teamId, prize);
        await this.createNotification(teamId, {
          type: 'TOURNAMENT_REWARD',
          message: `Tournament reward: ${prize.credits}₡ + ${prize.gems} gems`,
          tournament: tournament.name
        });
      }
    }
  }
}
```

---

## Equipment & Item Systems

**⚠️ Systems Removed During September 3rd, 2025 Session:**
- ❌ **Equipment Enhancement System**: No upgrade mechanics with enhancement stones
- ❌ **Equipment Durability**: No durability degradation or repair mechanics
- ❌ **Salary Cap Integration**: Equipment costs no longer restricted by salary caps

**Current System Focus**: Basic equipment with stat bonuses only - clean, straightforward implementation.

### Equipment Categories & Slots

#### Equipment Slot System
```typescript
enum EquipmentSlot {
  HELMET = "HELMET",        // Head protection & visibility
  FOOTWEAR = "FOOTWEAR",    // Speed & agility enhancement
  GLOVES = "GLOVES",        // Grip & ball handling
  ARMOR = "ARMOR"           // Body protection & durability
}

interface EquipmentItem {
  id: number;
  name: string;
  slot: EquipmentSlot;
  raceRestriction?: Race;    // Some items race-specific
  rarity: ItemRarity;
  statEffects: {
    [attribute: string]: number;  // Direct stat modifications
  };
  specialEffects?: {
    description: string;
    gameplayImpact: string;
  };
}
```

#### Rarity System & Drop Rates
```typescript
enum ItemRarity {
  COMMON = "COMMON",        // 60% drop rate
  UNCOMMON = "UNCOMMON",    // 25% drop rate  
  RARE = "RARE",           // 10% drop rate
  EPIC = "EPIC",           // 4% drop rate
  LEGENDARY = "LEGENDARY",  // 0.9% drop rate
  UNIQUE = "UNIQUE"        // 0.1% drop rate - one-of-a-kind
}

interface RarityEffects {
  common: { statBonus: 1-3, specialEffects: false };
  uncommon: { statBonus: 2-5, specialEffects: false };
  rare: { statBonus: 4-8, specialEffects: 'minor' };
  epic: { statBonus: 6-12, specialEffects: 'moderate' };
  legendary: { statBonus: 10-18, specialEffects: 'major' };
  unique: { statBonus: 15-25, specialEffects: 'game_changing' };
}
```

#### Race-Specific Equipment
```typescript
interface RaceRestrictions {
  // Sylvan-only equipment (agility focused)
  sylvan: {
    'Windweaver Boots': { speed: +8, agility: +12 },
    'Forest Guardian Helmet': { catching: +6, leadership: +4 },
    'Thornweave Armor': { stamina: +10, injury_resistance: +15 }
  };
  
  // Gryll-exclusive gear (power focused)  
  gryll: {
    'Ironhide Plating': { power: +15, injury_resistance: +20 },
    'Crusher Gauntlets': { power: +10, kicking: +8 },
    'Warhammer Boots': { power: +8, speed: -2 } // Trade-offs exist
  };
  
  // Human equipment (balanced)
  human: {
    'Versatile Training Gear': { all_stats: +3 },
    'Champion\'s Crown': { leadership: +12, morale_boost: true }
  };
}
```

### Consumable Systems

#### Recovery Items
```typescript
interface RecoveryConsumables {
  // Injury healing
  'Minor Recovery Potion': {
    effect: 'heal_minor_injury',
    recoveryPoints: 25,
    creditCost: 1500,
    usageLimit: '3_per_day'
  };
  
  'Major Recovery Serum': {
    effect: 'heal_moderate_injury',
    recoveryPoints: 75,
    creditCost: 5000,
    usageLimit: '1_per_day'
  };
  
  // Stamina restoration
  'Energy Drink': {
    effect: 'restore_stamina',
    staminaPoints: 30,
    creditCost: 500,
    usageLimit: '5_per_day'
  };
}
```

#### Performance Boosters
```typescript
interface PerformanceBoosters {
  // Match-specific enhancements
  'Speed Enhancer': {
    statBoost: { speed: +10 },
    duration: 'one_match',
    matchTypes: ['LEAGUE', 'TOURNAMENT_DAILY'],
    cost: { credits: 2000 }
  };
  
  'Power Amplifier': {
    statBoost: { power: +12, stamina: +5 },
    duration: 'one_match',
    matchTypes: ['TOURNAMENT_MIDSEASON'],
    cost: { gems: 5 }
  };
  
  // Team-wide boosters
  'Team Motivation Pack': {
    effect: 'camaraderie_boost',
    boost: '+10 team chemistry for 3 games',
    cost: { credits: 8000 }
  };
}
```

#### Usage Limitations & Balance
```typescript
interface ConsumableBalance {
  dailyUsageLimits: {
    perPlayer: 3;               // Maximum items per player per day
    perTeam: 15;                // Total team consumption limit
    cooldowns: 'item_specific'; // Some items have individual cooldowns
  };
  
  matchRestrictions: {
    leagueGames: 'unlimited',        // No restrictions for regular season
    tournaments: 'limited_boosts',   // Only specific items allowed
    exhibitions: 'testing_allowed'   // Full access for practice
  };
  
  economicBalance: {
    preventPayToWin: true,      // Limits on premium consumables
    creditSinks: 'moderate',    // Remove credits from economy
    strategicChoices: true      // Force decisions on usage timing
  };
}
```

---

## Advanced Features

### Camaraderie System (Deep Dive)

#### Individual Player Chemistry
```typescript
interface PlayerCamaraderie {
  personalScore: number;        // 0-100 individual rating
  factorsInfluencing: {
    teamTenure: number;         // Length of time with team
    playingTime: number;        // Minutes received per game
    roleClarity: boolean;       // Clear position expectations
    contractSatisfaction: number; // Salary vs. market value
    teamSuccess: number;        // Win/loss record impact
    coachingRelationship: number; // Staff interaction quality
  };
  
  relationships: {
    [playerId: number]: {
      chemistry: number;        // -50 to +50 with specific players  
      sharedExperiences: number; // Games played together
      complementarySkills: boolean; // Position synergy
    }
  };
}
```

#### Team-Wide Chemistry Effects
```typescript
interface TeamCamaraderieEffects {
  excellent: {
    matchPerformance: '+5% all stats',
    injuryReduction: '-25% injury risk', 
    contractWillingness: '+15% extension likelihood',
    developmentSpeed: '+10% skill progression',
    homeFieldAdvantage: '+2 atmosphere points'
  };
  
  poor: {
    matchPerformance: '-5% all stats',
    injuryIncrease: '+30% injury risk',
    contractResistance: '-20% extension likelihood', 
    developmentDelay: '-10% skill progression',
    awayDisadvantage: '-3 performance points'
  };
}
```

#### Chemistry Management Strategies
```typescript
interface CamaraderieManagement {
  buildingStrategies: {
    consistentLineups: 'reward_chemistry_for_stable_combinations',
    teamActivities: 'optional_chemistry_boosting_events',
    conflictResolution: 'address_negative_relationships',
    successMomentum: 'wins_improve_overall_chemistry'
  };
  
  riskFactors: {
    benchWarming: 'unused_players_develop_negativity',
    payrollDisparity: 'salary_gaps_cause_jealousy', 
    tradeRumors: 'uncertainty_damages_chemistry',
    coachingChanges: 'staff_turnover_disrupts_relationships'
  };
}
```

### Injury & Recovery System

#### Injury Categories & Severity
```typescript
enum InjuryStatus {
  HEALTHY = "HEALTHY",
  MINOR_INJURY = "MINOR_INJURY",      // 1-3 days recovery
  MODERATE_INJURY = "MODERATE_INJURY", // 4-7 days recovery  
  SEVERE_INJURY = "SEVERE_INJURY"     // 8-14 days recovery
}

interface InjuryMechanics {
  causes: {
    gameplayCollision: 'random_chance_during_matches',
    fatigueRelated: 'low_stamina_increases_risk',
    overuse: 'excessive_minutes_accumulation',
    ageRelated: 'older_players_more_susceptible'
  };
  
  recoveryFactors: {
    playerAge: 'younger_recovers_faster',
    previousInjuries: 'history_slows_recovery',
    teamCamaraderie: 'good_chemistry_aids_healing',
    recoverySpecialist: 'staff_accelerates_process',
    consumableItems: 'recovery_potions_speed_healing'
  };
}
```

#### Recovery Point System
```typescript
interface RecoverySystem {
  recoveryPointsNeeded: {
    minor: 25,              // Points required for full healing
    moderate: 75,
    severe: 150
  };
  
  dailyRecovery: {
    baseRate: 10,           // Points recovered naturally per day
    bonuses: {
      recoverySpecialist: +5,   // Staff bonus
              excellentCamaraderie: +3,    // Team chemistry
      consumables: 'variable',  // Item-dependent
      restDay: +2              // No match played
    }
  };
  
  playingInjured: {
    allowed: true,              // Can play through injury
    performancePenalty: {
      minor: '-10% all stats',
      moderate: '-25% all stats',
      severe: 'cannot_play'
    },
    reinjuryRisk: {
      minor: '+50% chance of worsening',
      moderate: '+75% chance of worsening'
    }
  };
}
```

### Contract & Salary System

#### Contract Structure
```typescript
interface PlayerContract {
  salary: number;             // Annual salary in credits
  length: number;             // Contract duration in seasons
  signingBonus: number;       // Upfront payment
  startDate: Date;            // Contract commencement
  
  // Performance clauses
  performanceBonuses?: {
    gamesPlayed: { threshold: number, bonus: number },
    teamSuccess: { playoffs: number, championship: number },
    individualStats: { targets: StatThreshold[], rewards: number[] }
  };
  
  // Contract options
  extensions?: {
    teamOption: { seasons: number, salary: number },
    playerOption: { seasons: number, salary: number },
    mutualOption: { seasons: number, salary: number }
  };
}
```


### Scouting & Player Discovery

#### Scout Accuracy System
```typescript
interface ScoutingSystem {
  scoutAccuracy: {
    attributes: {
      visible: ['speed', 'power', 'agility'], // Always accurate
      estimated: ['throwing', 'catching', 'kicking'], // ±15% margin
      hidden: ['potential', 'injury_prone', 'chemistry_fit'] // Requires elite scouts
    };
  };
  
  scoutLevels: {
    basic: { accuracy: 70, cost: 'included_in_staff_salary' },
    advanced: { accuracy: 85, cost: '10000_credits_per_report' },
    elite: { accuracy: 95, cost: '25000_credits_plus_gems' }
  };
  
  discoveryMechanics: {
    tryoutPacks: 'guaranteed_player_acquisition',
    marketplaceScouting: 'evaluate_listed_players',
    competitorAnalysis: 'study_opponent_rosters'
  };
}
```

#### Talent Generation Algorithm
```typescript
interface TalentGeneration {
  playerCreation: {
    raceDistribution: 'equal_probability',  // 20% each race
    roleDistribution: 'positional_needs',   // Based on market demand
    attributeRanges: {
      rookies: '35-65 in primary stats',
      veterans: '45-85 in primary stats',
      elites: '70-95 in primary stats'
    }
  };
  
  potentialAssignment: {
    distribution: 'bell_curve',
    average: 2.5,               // 2.5 out of 5 stars
    exceptional: 5,             // Rare 5-star potential
    generationConfigs: {
      basicTryout: 'standard_distribution',
      eliteScouting: 'higher_average_potential',
      hiddenGems: 'unknown_potential_revealed_slowly'
    }
  };
}
```

---

## Mobile & PWA Features

### Progressive Web App Implementation

#### Service Worker Architecture
```typescript
// sw.js - Service Worker for offline functionality
interface ServiceWorkerConfig {
  cachingStrategy: {
    staticAssets: 'cache_first',      // CSS, JS, images
    apiResponses: 'network_first',    // Fresh data preferred
    fallbackPages: 'cache_only'       // Offline experience
  };
  
  updateStrategy: {
    checkInterval: '1_hour',          // Check for updates
    userPrompt: 'notify_on_update',   // Inform user of updates
    forceUpdate: false                // Allow manual control
  };
  
  backgroundSync: {
    enabled: true,                    // Sync when online
    actions: ['marketplace_bids', 'lineup_changes'],
    retryPolicy: 'exponential_backoff'
  };
}
```

#### App Manifest Configuration
```json
{
  "name": "Realm Rivalry",
  "short_name": "RReply",
  "description": "Fantasy Dome Ball Management Game",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#1a1a1a",
  "background_color": "#ffffff",
  "categories": ["games", "sports", "entertainment"],
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png", 
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### Touch-Optimized Interface Design

#### Gesture Navigation
```typescript
interface GestureSystem {
  hubSwitching: {
    swipeLeft: 'next_hub',
    swipeRight: 'previous_hub',
    tabBar: 'direct_navigation',
    sensitivity: 'configurable'
  };
  
  listInteractions: {
    pullToRefresh: 'update_data',
    longPress: 'context_menu',
    swipeActions: {
      left: 'quick_action_1',      // e.g., 'bid_on_player'
      right: 'quick_action_2'      // e.g., 'view_details'
    }
  };
  
  matchViewing: {
    pinchZoom: 'field_view_scaling',
    doubleTap: 'center_on_action',
    swipeUp: 'detailed_stats'
  };
}
```

#### Responsive Breakpoint System
```css
/* Mobile-first responsive design */
.container {
  --padding-mobile: 1rem;
  --padding-tablet: 1.5rem;
  --padding-desktop: 2rem;
  
  padding: var(--padding-mobile);
}

/* Tablet breakpoint (768px+) */
@media (min-width: 48rem) {
  .container {
    padding: var(--padding-tablet);
  }
  
  .hub-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Desktop breakpoint (1024px+) */
@media (min-width: 64rem) {
  .container {
    padding: var(--padding-desktop);
    max-width: 80rem;
    margin: 0 auto;
  }
  
  .hub-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

#### Safe Area Handling
```css
/* iOS safe area support */
.app-container {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

/* Android notch handling */
.header {
  padding-top: max(1rem, env(safe-area-inset-top));
}

.bottom-navigation {
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
}
```

### Performance Optimization

#### Lazy Loading Strategy
```typescript
// Component lazy loading with suspense
const LazyRosterHQ = lazy(() => 
  import('@/components/hubs/RosterHQ').then(module => ({
    default: module.RosterHQ
  }))
);

const LazyMarketDistrict = lazy(() => 
  import('@/components/hubs/MarketDistrict')
);

// Usage with loading states
<Suspense fallback={<HubLoadingSkeleton />}>
  <LazyRosterHQ />
</Suspense>
```

#### Image Optimization
```typescript
interface ImageOptimization {
  formats: ['webp', 'avif', 'png'];     // Progressive format support
  sizes: {
    thumbnail: '64x64',
    small: '128x128', 
    medium: '256x256',
    large: '512x512'
  };
  
  lazyLoading: {
    enabled: true,
    threshold: '100px',                 // Load when 100px from viewport
    placeholder: 'blurred_thumbnail'
  };
  
  caching: {
    browser: '1_year',                  // Long-term caching
    cdn: 'cloudflare_images'            // Global distribution
  };
}
```

#### Network Optimization
```typescript
interface NetworkStrategy {
  dataFetching: {
    critical: 'preload',                // Essential data loaded first
    deferred: 'lazy_load',             // Non-critical data on-demand
    background: 'service_worker_sync'   // Updates when possible
  };
  
  bundleSplitting: {
    vendor: 'react_libraries',          // Third-party code
    common: 'shared_utilities',         // Reused across routes
    routes: 'per_hub_chunks'           // Hub-specific code
  };
  
  compressionStrategy: {
    text: 'gzip_brotli',               // Text content compression
    images: 'webp_avif_fallback',      // Image format optimization
    fonts: 'woff2_subsetting'          // Font optimization
  };
}
```

---

## Deployment & Production

### Google Cloud Infrastructure

#### Cloud Run Deployment
```dockerfile
# Multi-stage Dockerfile for optimized production builds
FROM node:18-alpine AS base
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

# Build stage  
FROM base AS builder
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build:all

# Production stage
FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
EXPOSE 8080
CMD ["node", "dist/server/index.js"]
```

#### Cloud Build Pipeline
```yaml
# cloudbuild.yaml - Automated CI/CD pipeline
steps:
  # Build optimized Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/realmrivalry:$SHORT_SHA', '.']
    
  # Push to Artifact Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/realmrivalry:$SHORT_SHA']
    
  # Deploy to Cloud Run with zero downtime
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'realmrivalry-backend'
      - '--image=gcr.io/$PROJECT_ID/realmrivalry:$SHORT_SHA'
      - '--region=us-central1'
      - '--platform=managed'
      - '--allow-unauthenticated'
      - '--memory=2Gi'
      - '--cpu=1'
      - '--min-instances=1'
      - '--max-instances=10'
      
# Health check integration
substitutions:
  _SERVICE_URL: 'https://realmrivalry-backend-abc123.uc.a.run.app'
  
options:
  machineType: 'E2_HIGHCPU_8'
  logging: 'CLOUD_LOGGING_ONLY'
```

#### Infrastructure as Code
```typescript
// Terraform configuration for reproducible infrastructure
interface CloudInfrastructure {
  cloudRun: {
    service: 'realmrivalry-backend',
    region: 'us-central1',
    memory: '2Gi',
    cpu: '1000m',
    scaling: {
      minInstances: 1,        // Always warm
      maxInstances: 10,       // Handle traffic spikes
      concurrency: 80         // Requests per instance
    }
  };
  
  cloudSQL: {
    instance: 'realmrivalry-db',
    tier: 'db-custom-2-8192',  // 2 vCPUs, 8GB RAM
    storage: '100GB',
    backups: {
      enabled: true,
      startTime: '03:00',     // 3 AM UTC daily backup
      retainDays: 30
    }
  };
  
  secretManager: {
    secrets: [
      'DATABASE_URL',
      'FIREBASE_PROJECT_ID', 
      'SESSION_SECRET',
      'STRIPE_SECRET_KEY'
    ],
    access: 'cloud_run_service_account'
  };
}
```

### Environment Management

#### Environment Variables Strategy
```typescript
// Environment variable organization
interface EnvironmentConfig {
  // Cloud Run managed (DO NOT SET MANUALLY)
  PORT: 'auto_assigned_by_cloud_run',
  
  // Secrets (Cloud Secret Manager)
  DATABASE_URL: 'secret:database-url',
  SESSION_SECRET: 'secret:session-secret',
  FIREBASE_PROJECT_ID: 'secret:firebase-project',
  
  // Configuration (Cloud Run environment)
  NODE_ENV: 'production',
  LOG_LEVEL: 'info',
  CORS_ORIGIN: 'https://realmrivalry.com',
  
  // Feature flags
  ENABLE_TOURNAMENTS: 'true',
  ENABLE_MARKETPLACE: 'true',
  MAINTENANCE_MODE: 'false'
}
```

#### Blue-Green Deployment Strategy
```typescript
interface DeploymentStrategy {
  blueGreen: {
    currentVersion: 'blue',    // Live production traffic
    newVersion: 'green',       // Staged for testing
    
    deploymentProcess: [
      'build_new_version',
      'deploy_to_green_environment',
      'run_health_checks',
      'smoke_test_critical_paths',
      'gradual_traffic_migration',  // 0% → 50% → 100%
      'monitor_error_rates',
      'rollback_if_issues'
    ],
    
    rollbackCapability: {
      triggerThreshold: '5%_error_rate_increase',
      rollbackTime: '< 30_seconds',
      dataConsistency: 'maintained'
    }
  };
}
```

### Monitoring & Observability

#### Application Performance Monitoring
```typescript
// Sentry integration for error tracking
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,      // 10% performance monitoring
  
  integrations: [
    new Sentry.Integrations.Prisma(),
    new Sentry.Integrations.Express()
  ],
  
  beforeSend(event) {
    // Filter sensitive data
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
    }
    return event;
  }
});
```

#### Health Check Implementation
```typescript
// /health endpoint for load balancer
app.get('/health', async (req, res) => {
  const checks = await Promise.allSettled([
    // Database connectivity
    prisma.$queryRaw`SELECT 1`,
    
    // External service status
    admin.auth().verifyIdToken('dummy_token').catch(() => 'ok'),
    
    // Critical business logic
    checkSeasonalAutomation(),
    checkTournamentScheduling()
  ]);
  
  const healthy = checks.every(check => 
    check.status === 'fulfilled'
  );
  
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks: checks.map(check => ({
      status: check.status,
      name: check.name || 'unknown'
    }))
  });
});
```

#### Performance Metrics Dashboard
```typescript
interface MetricsDashboard {
  applicationMetrics: {
    responseTime: 'p95_under_500ms',
    errorRate: 'under_1_percent',
    throughput: 'requests_per_minute',
    availabilityTarget: '99.9_percent'
  };
  
  businessMetrics: {
    activeUsers: 'daily_active_teams',
    matchesSimulated: 'per_day_count',
    marketplaceActivity: 'listings_and_sales',
    revenueTracking: 'virtual_currency_flow'
  };
  
  infrastructureMetrics: {
    containerHealth: 'cloud_run_instances',
    databasePerformance: 'query_execution_time',
    cacheHitRatio: 'redis_performance',
    storageUsage: 'database_size_growth'
  };
}
```

---

## Development Guidelines

### Zero Technical Debt Policy

#### Code Quality Standards
```typescript
// Example of proper error handling (REQUIRED)
async function updatePlayerStats(playerId: number, stats: Partial<Player>) {
  try {
    // Input validation
    if (!playerId || playerId <= 0) {
      throw new Error('Invalid player ID provided');
    }
    
    // Business logic validation
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: { team: true }
    });
    
    if (!player) {
      throw new Error(`Player with ID ${playerId} not found`);
    }
    
    // Atomic update with proper transaction handling
    const updatedPlayer = await prisma.$transaction(async (tx) => {
      const result = await tx.player.update({
        where: { id: playerId },
        data: {
          ...stats,
          updatedAt: new Date()
        },
        include: {
          team: true,
          skills: true
        }
      });
      
      // Update related data if needed
      await tx.playerMarketValue.upsert({
        where: { playerId },
        update: { lastUpdated: new Date() },
        create: {
          playerId,
          carRating: calculateCAR(result),
          lastUpdated: new Date()
        }
      });
      
      return result;
    });
    
    return { success: true, player: updatedPlayer };
    
  } catch (error) {
    // Proper error logging and handling
    console.error('Error updating player stats:', {
      playerId,
      stats,
      error: error.message,
      stack: error.stack
    });
    
    throw new Error(`Failed to update player stats: ${error.message}`);
  }
}
```

#### Type Safety Requirements
```typescript
// Comprehensive type definitions (REQUIRED)
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

interface PlayerUpdateRequest {
  playerId: number;
  stats: {
    speed?: number;
    power?: number;
    agility?: number;
    throwing?: number;
    catching?: number;
    kicking?: number;
    leadership?: number;
    staminaAttribute?: number;
  };
}

// Type guards for runtime validation
function isValidPlayerStats(obj: any): obj is PlayerUpdateRequest['stats'] {
  return (
    typeof obj === 'object' &&
    Object.keys(obj).every(key => 
      ['speed', 'power', 'agility', 'throwing', 'catching', 'kicking', 'leadership', 'staminaAttribute'].includes(key)
    ) &&
    Object.values(obj).every(value => 
      typeof value === 'number' && value >= 0 && value <= 100
    )
  );
}
```

#### Database Best Practices
```typescript
// Proper indexing and query optimization (REQUIRED)
interface DatabaseOptimization {
  indexStrategy: {
    // Composite indexes for common query patterns
    teamDivision: 'CREATE INDEX idx_team_division ON Team(division, subdivision)',
    playerRole: 'CREATE INDEX idx_player_role ON Player(teamId, role, isOnMarket)',
    marketActive: 'CREATE INDEX idx_market_active ON MarketplaceListing(isActive, expiryTimestamp)',
    
    // Performance monitoring
    slowQueryThreshold: '100ms',
    explainAnalysis: 'required_for_complex_queries'
  };
  
  transactionPattern: {
    financial: 'always_use_transactions',
    dataConsistency: 'atomic_operations',
    errorHandling: 'proper_rollback_on_failure'
  };
}
```

### Architecture Patterns

#### Domain-Driven Service Structure
```typescript
// server/domains/matches/service.ts
export class MatchService {
  private prisma = getPrismaClient();
  private logger = getLogger('MatchService');
  
  async simulateMatch(matchId: number): Promise<MatchResult> {
    this.logger.info('Starting match simulation', { matchId });
    
    try {
      // Comprehensive business logic
      const match = await this.getMatchWithTeams(matchId);
      const simulation = await this.runSimulation(match);
      const result = await this.processResults(match, simulation);
      
      // Emit real-time updates
      this.emitMatchComplete(matchId, result);
      
      return result;
    } catch (error) {
      this.logger.error('Match simulation failed', { matchId, error });
      throw new MatchSimulationError(error.message);
    }
  }
  
  private async getMatchWithTeams(matchId: number) {
    // Optimized query with proper includes
    return await this.prisma.game.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: {
          include: {
            players: {
              where: { isOnMarket: false, isRetired: false },
              include: { skills: true, currentEquipment: true }
            },
            staff: true,
            stadium: true
          }
        },
        awayTeam: {
          include: {
            players: {
              where: { isOnMarket: false, isRetired: false },
              include: { skills: true, currentEquipment: true }
            },
            staff: true
          }
        }
      }
    });
  }
}
```

#### API Route Organization
```typescript
// Consistent route structure across all domains
// server/domains/economy/routes.ts
const router = Router();

// GET endpoints (data retrieval)
router.get('/marketplace', requireAuth, async (req, res) => {
  try {
    const { division, maxPrice, playerRole } = req.query;
    
    const listings = await economyService.getMarketplaceListings({
      division: division ? parseInt(division as string) : undefined,
      maxPrice: maxPrice ? BigInt(maxPrice as string) : undefined,
      playerRole: playerRole as PlayerRole | undefined
    });
    
    res.json({ success: true, data: listings });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// POST endpoints (data modification)
router.post('/marketplace/bid', requireAuth, async (req, res) => {
  try {
    const { listingId, bidAmount } = req.body;
    const teamId = req.user.teamId;
    
    const result = await economyService.placeBid(teamId, listingId, bidAmount);
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;
```

### Testing Strategy

#### Comprehensive Test Coverage
```typescript
// tests/services/economyService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EconomyService } from '@/server/domains/economy/service';

describe('EconomyService', () => {
  let economyService: EconomyService;
  
  beforeEach(() => {
    economyService = new EconomyService();
    vi.clearAllMocks();
  });
  
  describe('placeBid', () => {
    it('should successfully place a valid bid', async () => {
      // Arrange
      const mockTeam = createMockTeam({ credits: 100000n });
      const mockListing = createMockListing({ currentBid: 50000n });
      
      vi.mocked(prisma.team.findUnique).mockResolvedValue(mockTeam);
      vi.mocked(prisma.marketplaceListing.findUnique).mockResolvedValue(mockListing);
      
      // Act
      const result = await economyService.placeBid(1, 1, 60000n);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.bidAmount).toBe(60000n);
    });
    
    it('should reject bid if team has insufficient credits', async () => {
      // Arrange
      const mockTeam = createMockTeam({ credits: 40000n });
      const mockListing = createMockListing({ currentBid: 50000n });
      
      // Act & Assert
      await expect(
        economyService.placeBid(1, 1, 60000n)
      ).rejects.toThrow('Insufficient credits');
    });
    
    it('should handle concurrent bids atomically', async () => {
      // Test transaction isolation and race conditions
      const mockTeam = createMockTeam({ credits: 100000n });
      const mockListing = createMockListing({ currentBid: 50000n });
      
      // Simulate concurrent bids
      const bid1 = economyService.placeBid(1, 1, 60000n);
      const bid2 = economyService.placeBid(2, 1, 65000n);
      
      const results = await Promise.allSettled([bid1, bid2]);
      
      // Only one should succeed
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful).toHaveLength(1);
    });
  });
});
```

#### Integration Testing
```typescript
// tests/integration/marketplace.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/testApp';

describe('Marketplace Integration', () => {
  it('should handle complete bid-to-purchase flow', async () => {
    const app = await createTestApp();
    
    // Create test data
    const seller = await createTestTeam('seller');
    const bidder = await createTestTeam('bidder', { credits: 100000n });
    const player = await createTestPlayer(seller.id);
    
    // Create listing
    const listingResponse = await request(app)
      .post('/api/economy/marketplace/list')
      .set('Authorization', `Bearer ${seller.token}`)
      .send({
        playerId: player.id,
        startBid: 10000,
        buyNowPrice: 50000
      });
    
    expect(listingResponse.status).toBe(201);
    
    // Place bid
    const bidResponse = await request(app)
      .post('/api/economy/marketplace/bid')
      .set('Authorization', `Bearer ${bidder.token}`)
      .send({
        listingId: listingResponse.body.data.id,
        bidAmount: 25000
      });
    
    expect(bidResponse.status).toBe(200);
    
    // Verify escrow system
    const updatedBidder = await getTeamFinances(bidder.id);
    expect(updatedBidder.credits).toBe(75000n); // 100k - 25k
    expect(updatedBidder.escrowCredits).toBe(25000n);
  });
});
```

---

## API Reference

### Authentication Endpoints

#### POST /api/auth/login
```typescript
interface LoginRequest {
  idToken: string;        // Firebase ID token
}

interface LoginResponse {
  success: boolean;
  user: {
    id: string;
    email: string;
    displayName: string;
    teamId?: number;
  };
  sessionToken: string;
}

// Example usage
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ idToken })
});
```

#### POST /api/auth/logout
```typescript
interface LogoutResponse {
  success: boolean;
  message: string;
}

// Clears server-side session
const response = await fetch('/api/auth/logout', {
  method: 'POST'
});
```

### Team Management Endpoints

#### GET /api/teams/:teamId
```typescript
interface TeamResponse {
  id: number;
  name: string;
  logoUrl?: string;
  division: number;
  subdivision: string;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  camaraderie: number;
  fanLoyalty: number;
  homeField: FieldSize;
  tacticalFocus: TacticalFocus;
  
  players: Player[];
  staff: Staff[];
  finances: TeamFinances;
  stadium: Stadium;
}

// Authentication required
const response = await fetch(`/api/teams/${teamId}`, {
  headers: { 'Authorization': `Bearer ${sessionToken}` }
});
```

#### PATCH /api/teams/:teamId/tactics
```typescript
interface TacticsUpdateRequest {
  homeField?: FieldSize;
  tacticalFocus?: TacticalFocus;
  formation?: FormationData;
}

const response = await fetch(`/api/teams/${teamId}/tactics`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    homeField: 'LARGE',
    tacticalFocus: 'ALL_OUT_ATTACK'
  })
});
```

### Player Management Endpoints

#### GET /api/players/:playerId
```typescript
interface PlayerDetailResponse {
  id: number;
  firstName: string;
  lastName: string;
  race: Race;
  role: PlayerRole;
  age: number;
  
  // Core attributes
  speed: number;
  power: number;
  agility: number;
  throwing: number;
  catching: number;
  kicking: number;
  staminaAttribute: number;
  leadership: number;
  
  // Dynamic stats
  potentialRating: number;
  dailyStaminaLevel: number;
  injuryStatus: InjuryStatus;
  camaraderieScore: number;
  
  // Relationships
  contract?: Contract;
  skills: PlayerSkillLink[];
  currentEquipment: PlayerEquipment[];
}
```

#### POST /api/players/:playerId/use-consumable
```typescript
interface ConsumabeUseRequest {
  itemId: number;
  quantity?: number;
}

interface ConsumableUseResponse {
  success: boolean;
  effect: {
    type: string;
    description: string;
    duration?: string;
  };
  playerUpdates: Partial<Player>;
  remainingUsages: number;
}
```

### Marketplace Endpoints

#### GET /api/economy/marketplace
```typescript
interface MarketplaceQuery {
  division?: number;
  race?: Race;
  role?: PlayerRole;
  maxPrice?: number;
  minPotential?: number;
  sortBy?: 'price' | 'expiry' | 'potential' | 'age';
  page?: number;
  limit?: number;
}

interface MarketplaceResponse {
  listings: {
    id: number;
    player: Player;
    startBid: number;
    buyNowPrice?: number;
    currentBid?: number;
    currentHighBidder?: string;
    expiryTimestamp: string;
    timeRemaining: number;
    listingStatus: MarketplaceStatus;
  }[];
  pagination: {
    total: number;
    pages: number;
    current: number;
  };
}
```

#### POST /api/economy/marketplace/bid
```typescript
interface BidRequest {
  listingId: number;
  bidAmount: number;
}

interface BidResponse {
  success: boolean;
  bid: {
    id: number;
    bidAmount: number;
    placedAt: string;
    isWinningBid: boolean;
  };
  listing: {
    currentBid: number;
    expiryTimestamp: string;
    auctionExtensions: number;
  };
  escrow: {
    creditsLocked: number;
    previousBidRefunded?: number;
  };
}
```

#### POST /api/economy/marketplace/buy-now
```typescript
interface BuyNowRequest {
  listingId: number;
}

interface BuyNowResponse {
  success: boolean;
  purchase: {
    player: Player;
    pricePaid: number;
    marketTax: number;
    netCost: number;
  };
  transaction: {
    id: string;
    timestamp: string;
    status: 'completed';
  };
}
```

### Tournament Endpoints

#### GET /api/tournaments/available
```typescript
interface AvailableTournamentsResponse {
  tournaments: {
    id: number;
    name: string;
    type: TournamentType;
    division?: number;
    status: TournamentStatus;
    startTime: string;
    registrationEndTime?: string;
    entryFeeCredits?: number;
    entryFeeGems?: number;
    prizePool: any;
    participantCount: number;
    maxParticipants: number;
    canRegister: boolean;
  }[];
}
```

#### POST /api/tournaments/:tournamentId/register
```typescript
interface TournamentRegisterRequest {
  teamId: number;
}

interface TournamentRegisterResponse {
  success: boolean;
  entry: {
    tournamentId: number;
    teamId: number;
    registeredAt: string;
    seedPosition?: number;
  };
  feeDeducted: {
    credits?: number;
    gems?: number;
  };
}
```

#### GET /api/tournaments/:tournamentId/bracket
```typescript
interface TournamentBracketResponse {
  tournament: {
    id: number;
    name: string;
    status: TournamentStatus;
    currentRound: number;
    totalRounds: number;
  };
  bracket: {
    rounds: {
      roundNumber: number;
      matches: {
        id: number;
        homeTeam: { id: number, name: string };
        awayTeam: { id: number, name: string };
        homeScore?: number;
        awayScore?: number;
        status: GameStatus;
        scheduledTime?: string;
      }[];
    }[];
  };
  userTeam?: {
    id: number;
    status: 'active' | 'eliminated' | 'champion';
    currentRound?: number;
    nextMatch?: number;
  };
}
```

### Match Simulation Endpoints

#### POST /api/matches/:matchId/simulate
```typescript
interface SimulateMatchRequest {
  speed?: 'normal' | 'quick';        // Simulation speed
  liveUpdates?: boolean;             // WebSocket streaming
}

interface SimulateMatchResponse {
  success: boolean;
  match: {
    id: number;
    homeScore: number;
    awayScore: number;
    status: GameStatus;
    simulationLog: MatchEvent[];
    statistics: MatchStatistics;
  };
  seasonImpact?: {
    standingsChange: boolean;
    playoffImplications: string[];
  };
}
```

#### GET /api/matches/:matchId/live-updates
WebSocket endpoint for real-time match updates:
```typescript
interface MatchUpdate {
  type: 'score' | 'event' | 'stat' | 'complete';
  timestamp: string;
  minute?: number;
  data: {
    homeScore?: number;
    awayScore?: number;
    event?: MatchEvent;
    finalStats?: MatchStatistics;
  };
}

// WebSocket usage
const socket = io('/matches');
socket.emit('join-match', matchId);
socket.on('match-update', (update: MatchUpdate) => {
  // Handle real-time update
});
```

### Stadium Management Endpoints

#### GET /api/teams/:teamId/stadium
```typescript
interface StadiumResponse {
  id: number;
  capacity: number;
  concessionsLevel: number;
  parkingLevel: number;
  vipSuitesLevel: number;
  merchandisingLevel: number;
  lightingScreensLevel: number;
  
  // Calculated values
  atmosphereRating: number;
  revenueProjection: StadiumRevenue;
  upgradeOptions: FacilityUpgrade[];
}
```

#### POST /api/teams/:teamId/stadium/upgrade
```typescript
interface StadiumUpgradeRequest {
  facility: 'concessions' | 'parking' | 'vip' | 'merchandising' | 'lighting';
  targetLevel: number;
}

interface StadiumUpgradeResponse {
  success: boolean;
  upgrade: {
    facility: string;
    oldLevel: number;
    newLevel: number;
    cost: number;
  };
  stadium: Stadium;
  finances: {
    creditsRemaining: number;
    creditsSpent: number;
  };
}
```

---

## Game Balance & Economics

### Economic Balance Philosophy
Realm Rivalry employs sophisticated economic balancing to ensure competitive fairness while maintaining strategic depth:

#### Credit Distribution System
```typescript
interface EconomicBalance {
  seasonStartCredits: 50000;           // Base starting credits
  divisionModifiers: {
    division1: 1.0,                    // No bonus for top division
    division2: 1.05,                   // 5% credit bonus
    division3: 1.10,                   // 10% credit bonus
    // ...continuing to division8: 1.35 (35% bonus)
  };
  
  performanceRewards: {
    tournamentWin: 25000,              // Daily tournament victory
    leaguePromotion: 40000,            // Moving up division
    seasonPlayoffs: 60000,             // Playoff qualification
  };
}
```

#### Marketplace Anti-Manipulation
- **Anti-Sniping System**: 15-minute bid extensions prevent last-second wins
- **Credit Escrow**: All bids immediately reserve credits to prevent overbidding
- **Market Velocity Controls**: Player listing limits prevent market flooding
- **Value Protection**: Minimum bid increases protect legitimate transactions

### Competitive Balance Mechanisms

#### Division-Based Advantages
Lower divisions receive progressive advantages to accelerate competitive improvement:
- Enhanced credit generation (5-35% bonus by division)
- Reduced facility maintenance costs
- Bonus gem rewards for achievements
- Extended roster flexibility

#### Performance Equalization
```typescript
interface PerformanceBalance {
  strengthOfSchedule: {
    calculation: "Opponent average rating weighted by games played",
    impact: "Affects playoff seeding and tournament brackets",
    adjustment: "Weaker schedules receive slight rating penalties"
  };
  
  camaraderieBoosts: {
    newTeams: "+10% camaraderie gain rate for first 3 seasons",
    strugglingTeams: "Bonus development for teams below .400 win rate",
    veteranPenalty: "Established teams have stricter chemistry requirements"
  };
}
```

---

## Commentary & Narrative Systems

### Dynamic Commentary Engine
The game features a sophisticated commentary system that creates unique narratives for every match, incorporating team history, player personalities, and current context.

#### Commentary Components
```typescript
interface CommentarySystem {
  scriptDatabase: {
    preGameAnalysis: string[];         // 200+ unique opening scenarios
    playByPlay: string[];              // 500+ situational descriptions  
    playerSpotlights: string[];        // Individual player achievements
    teamDynamics: string[];            // Camaraderie and chemistry notes
    postGameSummary: string[];         // Result analysis and implications
  };
  
  contextualFactors: {
    rivalryIntensity: number;          // Historical team matchup data
    seasonImportance: number;          // Playoff implications weight
    playerMilestones: object[];        // Career achievements and records
    weatherConditions: string;         // Environmental match factors
    crowdEnergy: number;              // Stadium atmosphere calculation
  };
}
```

#### Narrative Generation Algorithm
1. **Pre-Match Analysis**: Historical performance, team news, key player status
2. **Live Commentary**: Real-time play description with statistical context
3. **Player Spotlights**: Individual achievements and milestone tracking
4. **Post-Match Summary**: Result implications and season narrative impact

#### Commentary Personalization
- **Team-Specific**: Commentary references team history and achievements
- **Player-Focused**: Individual player storylines and development arcs  
- **Season Context**: Playoff races, championship implications, rivalry games
- **Achievement Recognition**: Milestone celebrations and record-breaking performances

---

## Advanced UI/UX Specifications

### Mobile-First 5-Hub Design System

#### Hub-Specific Design Language
```typescript
interface HubDesignSystem {
  commandCenter: {
    primaryColor: '#1a365d',          // Deep blue
    accentColor: '#3182ce',           // Bright blue
    gradient: 'linear-gradient(135deg, #1a365d, #2b77ad)',
    iconStyle: 'command and control',
    spacing: 'compact for quick actions'
  };
  
  rosterHQ: {
    primaryColor: '#22543d',          // Forest green
    accentColor: '#38a169',           // Vibrant green
    gradient: 'linear-gradient(135deg, #22543d, #48bb78)',
    iconStyle: 'player and team focused',
    spacing: 'expanded for detailed player cards'
  };
  
  competitionCenter: {
    primaryColor: '#742a2a',          // Deep red
    accentColor: '#e53e3e',           // Bright red
    gradient: 'linear-gradient(135deg, #742a2a, #f56565)',
    iconStyle: 'competitive and dynamic',
    spacing: 'tournament bracket optimized'
  };
  
  marketDistrict: {
    primaryColor: '#553c9a',          // Royal purple
    accentColor: '#805ad5',           // Light purple
    gradient: 'linear-gradient(135deg, #553c9a, #9f7aea)',
    iconStyle: 'commerce and trading',
    spacing: 'grid layouts for browsing'
  };
  
  settingsHub: {
    primaryColor: '#4a5568',          // Neutral gray
    accentColor: '#718096',           // Light gray
    gradient: 'linear-gradient(135deg, #4a5568, #a0aec0)',
    iconStyle: 'configuration and management',
    spacing: 'form-optimized layouts'
  };
}
```

#### Responsive Breakpoints
```css
/* Mobile First Approach */
.mobile-base    { width: 320px; }  /* Minimum mobile */
.mobile-large   { width: 375px; }  /* iPhone standard */
.tablet-small   { width: 768px; }  /* iPad portrait */
.tablet-large   { width: 1024px; } /* iPad landscape */
.desktop-small  { width: 1200px; } /* Small laptop */
.desktop-large  { width: 1440px; } /* Standard desktop */
```

#### Touch Target Specifications
- **Minimum Touch Target**: 44x44px (iOS standard)
- **Preferred Touch Target**: 48x48px (Android standard)
- **Button Spacing**: Minimum 8px between interactive elements
- **Gesture Support**: Swipe navigation, pull-to-refresh, pinch-to-zoom on charts

### Component Design Patterns

#### Player Card System
```typescript
interface PlayerCardDesign {
  compactView: {
    dimensions: '280px x 120px',
    elements: ['name', 'position', 'key stats', 'status'],
    interaction: 'tap to expand'
  };
  
  expandedView: {
    dimensions: '320px x 240px',
    elements: ['full stats', 'equipment', 'development', 'actions'],
    interaction: 'detailed management interface'
  };
  
  listView: {
    dimensions: '100% x 80px',
    elements: ['name', 'position', 'rating', 'quick actions'],
    interaction: 'swipe for additional actions'
  };
}
```

#### Match Visualization Components
- **Live Match View**: Real-time score updates with animated player movements
- **Statistics Dashboard**: Interactive charts showing team performance metrics
- **Player Performance Tracking**: Individual contribution visualization during matches
- **Tactical Overlay**: Field positioning and strategy visualization

---

## Mathematical Formulas & Algorithms

### Player Performance Calculations

#### Overall Rating Formula
```typescript
function calculateOverallRating(player: Player): number {
  const roleWeights = {
    PASSER: { speed: 0.3, power: 0.1, throwing: 0.4, catching: 0.2 },
    RUNNER: { speed: 0.4, power: 0.2, throwing: 0.1, catching: 0.3 },
    BLOCKER: { speed: 0.1, power: 0.5, throwing: 0.1, catching: 0.3 }
  };
  
  const weights = roleWeights[player.role];
  const baseRating = (
    player.speed * weights.speed +
    player.power * weights.power +
    player.throwing * weights.throwing +
    player.catching * weights.catching
  );
  
  // Apply age and experience modifiers
  const ageModifier = calculateAgeModifier(player.age);
  const experienceBonus = Math.min(player.gamesPlayed * 0.1, 5);
  const camaraderieModifier = player.team.camaraderie / 100;
  
  return Math.round(baseRating * ageModifier * camaraderieModifier + experienceBonus);
}

function calculateAgeModifier(age: number): number {
  if (age <= 22) return 0.95; // Young player penalty
  if (age <= 26) return 1.0;  // Prime years
  if (age <= 30) return 0.98; // Early decline
  if (age <= 34) return 0.95; // Significant decline
  return 0.90; // Late career
}
```

#### Match Simulation Core Algorithm
```typescript
interface MatchSimulationEngine {
  possessionCalculation: {
    formula: "(homeStrength / (homeStrength + awayStrength)) * 100",
    factors: ["team overall rating", "camaraderie bonus", "stadium advantage", "fatigue penalties"],
    randomization: "±5% variance for unpredictability"
  };
  
  scoringProbability: {
    baseChance: 0.15, // 15% per possession
    modifiers: {
      offensiveStrength: "±0.05 per 10 rating points difference",
      defensiveResistance: "±0.03 per 10 rating points difference", 
      situationalBonus: "±0.02 for game importance",
      randomEvents: "±0.01 for weather/luck factors"
    }
  };
  
  injuryRisk: {
    baseRate: 0.001, // 0.1% per player per game
    modifiers: {
      age: "+0.0002 per year over 30",
      stamina: "-0.0001 per stamina point over 80",
      camaraderie: "-0.0003 for Excellent chemistry",
      intensity: "+0.0002 for playoff games"
    }
  };
}
```

#### Stadium Revenue Calculation
```typescript
function calculateGameRevenue(
  stadium: Stadium, 
  attendance: number, 
  fanLoyalty: number
): RevenueBreakdown {
  const baseTicketPrice = 15;
  const loyaltyMultiplier = fanLoyalty / 100;
  
  return {
    tickets: attendance * baseTicketPrice * loyaltyMultiplier,
    concessions: attendance * 12 * (stadium.concessionsLevel * 0.1 + 0.8) * loyaltyMultiplier,
    parking: Math.floor(attendance * 0.7) * 8 * (stadium.parkingLevel * 0.05 + 0.9),
    merchandise: attendance * 6 * (stadium.merchandisingLevel * 0.2 + 0.6) * loyaltyMultiplier,
    vip: stadium.vipSuitesLevel * 200 * loyaltyMultiplier,
    
    get total() {
      return this.tickets + this.concessions + this.parking + this.merchandise + this.vip;
    }
  };
}
```

### Tournament Seeding Algorithms
```typescript
interface TournamentSeeding {
  strengthOfRecord: {
    calculation: "wins / (wins + losses)",
    tiebreaker1: "head-to-head record",
    tiebreaker2: "strength of schedule",
    tiebreaker3: "point differential"
  };
  
  bracketBalance: {
    method: "Snake seeding to prevent bracket imbalance",
    example: "Seeds 1,4,5,8 vs 2,3,6,7 in quarterfinals",
    reseeding: "After each round for fairness"
  };
}
```

---

## Season & Tournament Scheduling

### 17-Day Season Cycle Structure

#### Season Calendar System
```typescript
interface SeasonCalendar {
  seasonLength: 17; // Real-world days
  
  dailySchedule: {
    day1: 'Season start - roster finalization',
    day2to14: 'Daily league matches + tournaments',
    day15: 'Regular season finale',
    day16: 'Playoff semifinals',
    day17: 'Championship finals + awards',
    day18: 'Off-season begins (player development)'
  };
  
  matchScheduling: {
    leagueGames: '1 per team per day (days 2-15)',
    tournaments: 'Daily bracket tournaments',
    playoffs: 'Top 4 teams per division qualify',
    championships: 'Cross-division finals'
  };
}
```

#### Automated Season Progression
```typescript
interface SeasonAutomation {
  midnightTasks: [
    'Process all scheduled league matches',
    'Generate tournament brackets',
    'Update standings and statistics',
    'Process player development',
    'Handle contract negotiations',
    'Distribute daily rewards'
  ];
  
  playerDevelopment: {
    frequency: 'Daily during season',
    method: 'Skill point allocation based on performance',
    factors: ['age', 'potential', 'coaching', 'camaraderie', 'playing time']
  };
  
  economicCycles: {
    dailyIncome: 'Stadium revenue from games',
    weeklySalaries: 'Player contract payments (every 7 days)',
    seasonBonus: 'Performance-based rewards at season end'
  };
}
```

#### Division Management
```typescript
interface DivisionSystem {
  structure: {
    totalDivisions: 8,
    teamsPerDivision: 'Dynamic based on player population',
    division1: 'Elite tier - best teams',
    division8: 'Entry tier - new teams and strugglers'
  };
  
  promotionRelegation: {
    endOfSeason: 'Top 2 teams promote, bottom 2 teams relegate',
    newTeamPlacement: 'Division 8 automatic placement',
    lateSeasonJoining: 'Division 8 with catch-up bonuses'
  };
  
  competitiveBalance: {
    schedulingVariance: 'Teams play opponents within ±1 division when possible',
    crossDivisionPlay: 'Tournament brackets mix all divisions',
    strengthOfSchedule: 'Tracked for playoff seeding adjustments'
  };
}
```

---

## Troubleshooting Guide

### Common Issues & Solutions

#### Database Connection Issues
```typescript
// Problem: "P1001: Can't reach database server"
// Solution: Check connection string and network access

interface DatabaseTroubleshooting {
  symptoms: [
    'Connection timeout errors',
    'P1001 Prisma error codes',  
    'Slow query performance'
  ];
  
  diagnostics: {
    checkConnection: 'npx prisma db pull',
    validateSchema: 'npx prisma validate',  
    queryPerformance: 'EXPLAIN ANALYZE in psql'
  };
  
  solutions: [
    'Verify DATABASE_URL format',
    'Check Google Cloud SQL firewall rules',
    'Validate SSL certificate configuration',
    'Monitor connection pool exhaustion'
  ];
}
```

#### Authentication Problems
```typescript
// Problem: Firebase Auth token validation failing
// Solution: Verify Firebase project configuration

interface AuthTroubleshooting {
  commonErrors: {
    'invalid_token': 'Firebase ID token expired or malformed',
    'project_not_found': 'Firebase project ID mismatch',
    'network_error': 'Firebase service unavailable'
  };
  
  diagnostics: [
    'Check FIREBASE_PROJECT_ID environment variable',
    'Verify Firebase Admin SDK credentials',
    'Test token generation in frontend',
    'Validate CORS configuration'
  ];
  
  preventiveChecks: [
    'Token expiration handling (1 hour default)',
    'Refresh token implementation',
    'Session persistence strategy'
  ];
}
```

#### Performance Issues
```typescript
interface PerformanceTroubleshooting {
  serverSide: {
    slowQueries: {
      detection: 'Monitor query execution times > 100ms',
      solution: 'Add database indexes, optimize JOIN queries',
      tools: 'Prisma query logging, PostgreSQL pg_stat_statements'
    };
    
    memoryLeaks: {
      detection: 'Monitor heap usage growth',
      solution: 'Check for unclosed database connections',
      prevention: 'Use connection pooling, proper error handling'
    };
    
    highCPU: {
      detection: 'Cloud Run CPU utilization > 80%',
      solution: 'Optimize calculation-heavy operations',
      scaling: 'Increase Cloud Run CPU allocation or instances'
    };
  };
  
  clientSide: {
    bundleSize: {
      detection: 'Lighthouse performance audit',
      solution: 'Code splitting, lazy loading, tree shaking',
      monitoring: 'webpack-bundle-analyzer reports'
    };
    
    renderingPerformance: {
      detection: 'React DevTools Profiler',
      solution: 'Memoization, virtualization, proper key props',
      prevention: 'Avoid inline functions in JSX'
    };
  };
}
```

#### Marketplace Edge Cases
```typescript
interface MarketplaceTroubleshooting {
  auctionIssues: {
    'bid_race_conditions': {
      problem: 'Multiple bids placed simultaneously',
      solution: 'Database-level locking in bid transactions',
      prevention: 'Atomic operations with proper error handling'
    };
    
    'escrow_inconsistencies': {
      problem: 'Credits locked but bid not recorded',
      solution: 'Transaction rollback and manual reconciliation',
      prevention: 'Single atomic transaction for bid placement'
    };
    
    'expired_auctions': {
      problem: 'Auctions not closing at expiry time',
      solution: 'Background job monitoring and manual closure',
      prevention: 'Redundant expiry checks and automated cleanup'
    };
  };
  
  antiSnipingProblems: {
    'infinite_extensions': {
      problem: 'Auctions extending indefinitely',
      solution: 'Implement maximum extension limit (5)',
      monitoring: 'Alert on auctions > 10 extensions'
    };
  };
}
```

#### Tournament Management Issues
```typescript
interface TournamentTroubleshooting {
  bracketGeneration: {
    'uneven_participants': {
      problem: 'Odd number of tournament entries',
      solution: 'Automatic bye assignment to random teams',
      handling: 'Ensure balanced bracket progression'
    };
    
    'late_dropouts': {
      problem: 'Teams withdrawing after registration closes',
      solution: 'Forfeit handling with automatic advancement',
      prevention: 'Entry fee penalties for withdrawals'
    };
  };
  
  schedulingConflicts: {
    'overlapping_tournaments': {
      problem: 'Teams in multiple simultaneous tournaments',
      solution: 'Stagger tournament start times',
      prevention: 'Registration validation checks'
    };
  };
}
```

### Emergency Procedures

#### Production Incident Response
```typescript
interface IncidentResponse {
  severityLevels: {
    critical: {
      definition: 'Complete service outage or data corruption',
      responseTime: '< 15 minutes',
      actions: [
        'Activate incident commander',
        'Create incident war room',
        'Implement immediate rollback if possible',
        'Communicate with stakeholders'
      ]
    };
    
    high: {
      definition: 'Major feature unavailable or significant performance degradation',
      responseTime: '< 1 hour',
      actions: [
        'Assess impact scope',
        'Implement workaround if possible',
        'Begin root cause analysis',
        'Monitor error rates'
      ]
    };
  };
  
  rollbackProcedure: [
    'Identify last known good deployment',
    'Execute blue-green traffic switch',
    'Verify service health restoration',
    'Communicate resolution status'
  ];
}
```

#### Data Recovery Procedures
```typescript
interface DataRecovery {
  backupStrategy: {
    automated: 'Daily full backups at 3 AM UTC',
    retention: '30 days point-in-time recovery',
    testing: 'Monthly restore verification'
  };
  
  recoveryScenarios: {
    accidentalDeletion: {
      steps: [
        'Identify deletion timestamp',
        'Create recovery database from backup',
        'Export affected records',
        'Merge data back to production'
      ],
      timeWindow: '< 4 hours'
    };
    
    dataCorruption: {
      steps: [
        'Stop write operations immediately',
        'Assess corruption scope',
        'Restore from last clean backup',
        'Replay transaction logs if possible'
      ],
      priority: 'Data integrity over availability'
    };
  };
}
```

### Monitoring & Alerting

#### Key Performance Indicators
```typescript
interface MonitoringKPIs {
  availability: {
    target: '99.9%',
    measurement: 'Uptime over 30-day rolling window',
    alerts: 'Page when < 99.5%'
  };
  
  performance: {
    responseTime: 'p95 < 500ms',
    errorRate: '< 1% of all requests',
    throughput: 'Monitor requests per minute trends'
  };
  
  business: {
    activeUsers: 'Daily active teams',
    gameplayEngagement: 'Matches simulated per day',
    economicHealth: 'Marketplace transaction volume'
  };
}
```

#### Alert Configuration
```typescript
interface AlertRules {
  infrastructure: [
    'Cloud Run instance health < 2 healthy instances',
    'Database connection pool > 80% utilization',
    'Response time p95 > 1000ms for 5 minutes',
    'Error rate > 5% for 2 minutes'
  ];
  
  application: [
    'Failed authentication rate > 10% for 5 minutes',
    'Tournament registration system down',
    'Match simulation queue backing up',
    'Marketplace bid processing delays'
  ];
  
  business: [
    'Zero tournament registrations for 2 hours during peak',
    'Marketplace listing creation rate drops > 50%',
    'User session duration drops significantly'
  ];
}
```

---

## GitHub Actions Guardian Agents (September 4th, 2025)

### Automated Code Quality Monitoring

The platform now features 4 comprehensive Guardian Agents that provide continuous code quality monitoring and automated maintenance:

#### 🛡️ TypeScript Guardian Agent
- **Purpose**: Ensures TypeScript compilation and type safety
- **Schedule**: Daily at 2 AM UTC + push/PR events
- **Key Features**:
  - Production-aligned server compilation (generates JavaScript despite TypeScript errors)
  - Client-side TypeScript validation
  - Prisma integration pattern checking
  - Auto-fix: Missing Prisma imports and initialization patterns

#### 🔍 Code Quality Guardian Agent  
- **Purpose**: Comprehensive code quality analysis and scoring
- **Schedule**: Weekly Sundays at 4 AM UTC + push/PR events
- **Key Features**:
  - TypeScript quality metrics (any types, return annotations)
  - Database code patterns (async/await, transactions)
  - Security analysis (hardcoded secrets, SQL injection risks)
  - Performance patterns (N+1 queries, pagination)
  - Dependency vulnerability scanning
  - Auto-fix: Console.log removal, semicolon addition, import organization

#### 🗄️ Prisma Database Guardian Agent
- **Purpose**: Database schema and integration validation
- **Schedule**: Weekly Sundays at 3 AM UTC + database file changes
- **Key Features**:
  - Prisma schema validation (CI environment compatible)
  - Client generation testing
  - Database integration pattern analysis
  - Critical database file verification
  - Auto-fix: Prisma client import patterns and initialization

#### 🚀 Deployment Readiness Agent
- **Purpose**: Pre-deployment validation and testing
- **Schedule**: Push/PR events only (deployment-focused)
- **Key Features**:
  - Critical path compilation testing
  - Deployment file validation
  - Environment configuration checks
  - Docker build testing
  - Database connection pattern validation
  - Performance and security checks

### Guardian Agent Configuration

All agents feature:
- **Production-Realistic Thresholds**: Won't fail on issues that don't block deployment
- **Auto-Fix Capabilities**: Safe, automated fixes for common patterns
- **Comprehensive Reporting**: Detailed analysis with actionable insights
- **Pull Request Integration**: Automatic comments with results and recommendations
- **Artifact Preservation**: 30-day retention of logs and analysis results

### Impact on Development Workflow

The Guardian Agents provide:
1. **Continuous Quality Assurance**: Automated detection of technical debt and issues
2. **Deployment Confidence**: Pre-deployment validation ensures stable releases
3. **Knowledge Transfer**: Comprehensive reports help maintain code quality standards
4. **Proactive Maintenance**: Scheduled runs catch issues before they impact production
5. **Developer Productivity**: Auto-fixes handle routine maintenance tasks

---

## Conclusion

Realm Rivalry represents a comprehensive, production-ready fantasy sports management game that combines sophisticated game mechanics with modern web technologies. The system demonstrates:

### Technical Excellence
- **Zero Technical Debt**: Industry-standard implementations throughout
- **Scalable Architecture**: Domain-driven design with proper separation of concerns
- **Production Operations**: Automated CI/CD, monitoring, and incident response
- **Mobile-First Design**: Revolutionary 5-hub interface optimized for all devices

### Game Innovation
- **Deep Strategic Gameplay**: Multi-layered systems creating meaningful decisions
- **Economic Complexity**: Sophisticated marketplace with anti-manipulation features
- **Real-Time Competition**: WebSocket-powered match simulation and tournaments
- **Player Development**: Long-term investment strategies with aging and chemistry systems

### Operational Maturity
- **Live Production**: Fully operational at https://realmrivalry.com
- **Automated Seasons**: Self-managing 17-day competitive cycles
- **Financial Systems**: Secure multi-currency economy with escrow protection
- **Community Features**: Tournament system fostering competitive community

This documentation serves as the definitive reference for understanding, maintaining, and extending the Realm Rivalry platform. The system's architecture, implementation patterns, and automated quality assurance provide a foundation for continued growth and feature development while maintaining the high quality standards established from the beginning.