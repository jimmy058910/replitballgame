# TODO Audit & Critical Technical Debt Analysis

## Executive Summary
Systematic analysis of 50+ TODO items reveals critical infrastructure gaps that are blocking core functionality. The TODOs fall into 4 main categories with clear implementation priorities.

## CATEGORY 1: CRITICAL DATABASE SCHEMA GAPS (BLOCKING - HIGHEST PRIORITY)

### 1.1 Missing Match Statistics Tables
**Files Affected**: `server/storage.ts`
**Issue**: PlayerMatchStats and TeamMatchStats tables missing from Prisma schema
**Impact**: Match statistics not being stored, affecting game progression and analytics
**Business Impact**: HIGH - Core game functionality compromised

**TODOs Found**:
- Line 54: `// TODO: Create PlayerMatchStats table in Prisma schema if needed`
- Line 65: `// TODO: Create TeamMatchStats table in Prisma schema if needed`

**Current Workaround**: Placeholder functions that only log warnings
**Required Action**: Implement full Prisma schema for match statistics

### 1.2 Missing Role-Based Access Control
**Files Affected**: `server/services/rbacService.ts`
**Issue**: UserProfile table missing 'role' field for admin/user roles
**Impact**: No admin users, no role-based security
**Business Impact**: HIGH - Security vulnerability

**TODOs Found**:
- Line 263: `// TODO: Add role field to UserProfile table to support role system`
- Line 275: `// TODO: Add role field to UserProfile table to support admin promotion`

**Current State**: All users have same permissions
**Required Action**: Add role enum and field to UserProfile model

### 1.3 Missing Inventory System
**Files Affected**: `server/services/enhancedGameEconomyService.ts`
**Issue**: No inventory table for equipment and consumables
**Impact**: Equipment rewards not stored, consumables not tracked
**Business Impact**: MEDIUM - Game economy features incomplete

**TODOs Found**:
- Line 713: `// TODO: Add consumable to inventory - inventory table doesn't exist`
- Line 734: `// TODO: Add equipment to inventory - inventory table doesn't exist`
- Line 839: `// TODO: Apply item rewards - inventory table doesn't exist`

### 1.4 Missing Gems Currency
**Files Affected**: `server/services/enhancedGameEconomyService.ts`
**Issue**: TeamFinances missing gems field for premium currency
**Impact**: Premium currency system not functional
**Business Impact**: MEDIUM - Monetization features incomplete

**TODOs Found**:
- Line 826: `// TODO: Apply gem rewards - gems property doesn't exist`
- Line 1254: `// TODO: gems property doesn't exist in Team schema`
- Line 1340: `// TODO: implement gems in TeamFinances schema`

## CATEGORY 2: AUTHENTICATION & SECURITY GAPS (HIGH PRIORITY)

### 2.1 Firebase Token Verification Missing
**Files Affected**: `server/routes/authRoutes.ts`
**Issue**: No proper Firebase token verification implemented
**Impact**: Authentication bypass vulnerability
**Business Impact**: HIGH - Critical security issue

**TODO Found**:
- Line 242: `// TODO: Implement proper Firebase token verification`

**Current State**: Mock authentication in place
**Required Action**: Implement Firebase Admin SDK token verification

### 2.2 Admin Access Controls Missing
**Files Affected**: `server/routes/matchRoutes.ts`, `server/routes/paymentRoutes.ts`, `server/routes/seasonRoutes.ts`
**Issue**: Admin-only operations lack proper authorization checks
**Impact**: Unauthorized access to admin functions
**Business Impact**: HIGH - Security vulnerability

**TODOs Found**:
- `matchRoutes.ts:870`: `// TODO: Add SuperUser/Admin check`
- `paymentRoutes.ts:117`: `// TODO: Add SuperUser/Admin check for this endpoint`
- `seasonRoutes.ts:235`: `// TODO: Add SuperUser/Admin check for starting playoffs`

## CATEGORY 3: BUSINESS LOGIC COMPLETIONS (MEDIUM PRIORITY)

### 3.1 Statistics Calculations Missing
**Files Affected**: `server/repositories/leagues/standings.repository.ts`
**Issue**: Points calculations hardcoded to 0
**Impact**: League standings incorrect
**Business Impact**: MEDIUM - Core game features incomplete

**TODOs Found**:
- Line 90: `const pointsFor = 0; // TODO: Calculate from games`
- Line 91: `const pointsAgainst = 0; // TODO: Calculate from games`

### 3.2 Contract Management Incomplete
**Files Affected**: `server/routes/criticalAlertsRoutes.ts`
**Issue**: Contract expiration tracking not implemented
**Impact**: No contract alerts for users
**Business Impact**: MEDIUM - User experience degraded

**TODO Found**:
- Line 41: `const expiringContracts = 0; // TODO: Implement contract expiration logic`

### 3.3 Tournament System Gaps
**Files Affected**: `server/dataAccess/enhancedTournamentDataAccess.ts`
**Issue**: Tournament bracket advancement not implemented
**Impact**: Tournaments cannot progress properly
**Business Impact**: MEDIUM - Tournament features incomplete

**TODO Found**:
- Line 703: `// TODO: Implement proper tournament bracket advancement`

## CATEGORY 4: CODE QUALITY & ARCHITECTURE (LOW PRIORITY)

### 4.1 Service Layer Violations
**Files Affected**: Multiple route files
**Issue**: Direct storage access instead of service layer
**Impact**: Poor separation of concerns
**Business Impact**: LOW - Technical debt

**Examples Found**:
- `server/routes.ts`: Functions moved to routes with TODOs to move to services
- Multiple routes importing storage directly

### 4.2 Hardcoded Values & Placeholders
**Files Affected**: Various service files
**Issue**: Placeholder implementations and hardcoded values
**Impact**: Features not fully functional
**Business Impact**: LOW-MEDIUM - Depends on specific feature

## IMPLEMENTATION PRIORITY MATRIX

### IMMEDIATE (Week 1) - BLOCKING CORE FUNCTIONALITY
1. **PlayerMatchStats & TeamMatchStats tables** - Core game data storage
2. **Firebase token verification** - Critical security
3. **Role field in UserProfile** - Admin access system

### HIGH PRIORITY (Week 2) - SECURITY & CORE FEATURES  
4. **Admin authorization checks** - Security hardening
5. **Points calculation logic** - League standings accuracy
6. **Inventory system schema** - Equipment/consumables storage

### MEDIUM PRIORITY (Week 3-4) - ENHANCED FEATURES
7. **Gems currency system** - Premium currency
8. **Contract expiration tracking** - User alerts
9. **Tournament bracket advancement** - Tournament completion

### LOW PRIORITY (Future Sprints) - TECHNICAL DEBT
10. **Service layer refactoring** - Architecture cleanup
11. **Hardcoded value elimination** - Code quality

## SCHEMA CHANGES REQUIRED

### Immediate Prisma Schema Updates Needed:
```prisma
// Add to UserProfile model
model UserProfile {
  // ... existing fields
  role Role @default(USER)
}

enum Role {
  USER
  ADMIN
  SUPERUSER
}

// Add new models
model PlayerMatchStats {
  id          Int     @id @default(autoincrement())
  playerId    Int
  gameId      Int
  goals       Int     @default(0)
  assists     Int     @default(0)
  tackles     Int     @default(0)
  // ... other stats
  player      Player  @relation(fields: [playerId], references: [id])
  game        Game    @relation(fields: [gameId], references: [id])
}

model TeamMatchStats {
  id              Int     @id @default(autoincrement())
  teamId          Int
  gameId          Int
  possession      Float   @default(0)
  passingAccuracy Float   @default(0)
  // ... other stats
  team            Team    @relation(fields: [teamId], references: [id])
  game            Game    @relation(fields: [gameId], references: [id])
}

model Inventory {
  id          Int           @id @default(autoincrement())
  teamId      Int
  itemType    InventoryType
  itemId      String
  quantity    Int           @default(1)
  team        Team          @relation(fields: [teamId], references: [id])
}

enum InventoryType {
  EQUIPMENT
  CONSUMABLE
  UPGRADE
}

// Add to TeamFinances model
model TeamFinances {
  // ... existing fields
  gems        Int     @default(0)
}
```

## SUCCESS METRICS
- [ ] Zero TODO comments related to missing schema
- [ ] Firebase authentication properly implemented
- [ ] Role-based access control functional
- [ ] Match statistics storing correctly
- [ ] League standings calculating accurately
- [ ] Admin operations properly protected

## RISK ASSESSMENT
- **High Risk**: Delaying schema changes will compound technical debt
- **Security Risk**: Authentication gaps create immediate vulnerabilities  
- **Business Risk**: Core features remain incomplete without statistics storage

## NEXT STEPS
1. Implement critical schema changes first
2. Add Firebase token verification
3. Implement role-based security
4. Systematically address remaining TODOs by priority