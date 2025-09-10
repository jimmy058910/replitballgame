# Oakland Cougars Refactoring Plan

## Executive Summary
Comprehensive 3-phase plan to eliminate Oakland Cougars technical debt from the Realm Rivalry codebase, transforming hardcoded development fixtures into proper, maintainable architecture.

## Phase 1: Isolation & Service Extraction (Priority: HIGH)

### 1.1 Create OaklandCougarsDevService
**Location**: `server/services/development/oaklandCougarsDevService.ts`
**Purpose**: Consolidate all Oakland Cougars-specific logic

```typescript
export class OaklandCougarsDevService {
  static async findOaklandCougarsAcrossSubdivisions(division: number): Promise<Team | null>
  static async createDevUserProfile(): Promise<UserProfile>
  static async linkDevUserToOaklandCougars(): Promise<void>
  static async isOaklandCougarsGame(gameId: number): Promise<boolean>
}
```

### 1.2 Extract UserSubdivisionService Logic
**Current Issue**: Oakland Cougars special case handling in core service
**Solution**: 
- Move Oakland Cougars lookup to OaklandCougarsDevService
- Restore UserSubdivisionService to standard user → team → subdivision flow
- Add development environment check before Oakland Cougars fallback

### 1.3 Development Route Consolidation
**Target**: Create `server/routes/development/devRoutes.ts`
**Move From leagueRoutes.ts**:
- `POST /dev-setup-test-user` endpoint
- Any other development-only endpoints discovered during analysis

## Phase 2: Data Migration & Standardization (Priority: MEDIUM)

### 2.1 Oakland Cougars Data Normalization
**Goal**: Convert Oakland Cougars from hardcoded fixture to standard team data

**Steps**:
1. Create proper UserProfile for Oakland Cougars owner
2. Link via standard userProfileId relationship
3. Remove hardcoded 'Oakland Cougars' string matching
4. Use standard team lookup by ID, not name

### 2.2 Development Seed Data System
**Create**: `server/utils/development/seedData.ts`
**Features**:
- Standardized development team creation
- Proper UserProfile → Team associations
- Greek alphabet subdivision handling
- Environment-specific configuration

### 2.3 Authentication Flow Standardization
**Current Problem**: Special Oakland Cougars authentication bypasses
**Solution**:
- Remove hardcoded firebaseUid: 'oakland-cougars-owner'
- Implement standard Firebase Auth development tokens
- Use proper JWT token validation for all teams

## Phase 3: Emergency Endpoint Cleanup (Priority: LOW)

### 3.1 Emergency Route Analysis
**Action Required**: Analyze all emergency endpoints in leagueRoutes.ts
**Identified Patterns**:
- `/admin/move-storm-breakers`
- `/clear-and-regenerate`
- `/create-additional-teams`
- `/fix-existing-players/:teamId`
- `/fix-team-contracts/:teamId`
- `/reset-division-7-alpha`

**Strategy**: Determine if these represent:
1. **Production Hotfixes**: Convert to proper admin tools
2. **Development Utilities**: Move to development routes
3. **Obsolete Code**: Remove entirely after validation

### 3.2 Route File Restructuring
**Goal**: Separate concerns properly

```
server/routes/
├── leagues/
│   ├── standingsRoutes.ts    # League standings, subdivisions
│   ├── scheduleRoutes.ts     # Game scheduling
│   └── adminRoutes.ts        # Production admin tools
├── development/
│   ├── devRoutes.ts          # Development-only endpoints
│   └── seedRoutes.ts         # Database seeding utilities
└── emergency/
    └── emergencyRoutes.ts    # Temporary production fixes (to be eliminated)
```

## Implementation Strategy

### Rollout Approach: Gradual Migration
1. **Week 1**: Create OaklandCougarsDevService, move logic gradually
2. **Week 2**: Implement proper development authentication flow
3. **Week 3**: Data migration and testing with standard team relationships
4. **Week 4**: Emergency endpoint analysis and cleanup

### Risk Mitigation
1. **Backward Compatibility**: Maintain existing Oakland Cougars functionality during transition
2. **Feature Flags**: Use environment variables to control old vs new code paths
3. **Testing**: Comprehensive testing of development environment setup
4. **Documentation**: Update CLAUDE.md with new development patterns

### Success Criteria
- [ ] Zero hardcoded 'Oakland Cougars' references in core services
- [ ] Standard user → team → subdivision flow for all teams
- [ ] Development endpoints separated from production routes
- [ ] Emergency endpoints eliminated or properly categorized
- [ ] Development seed data system operational
- [ ] Comprehensive test coverage for new architecture

## Technical Dependencies

### Required Tools
- Serena MCP for systematic codebase refactoring
- Prisma schema updates for any data model changes
- TypeScript for type-safe service extraction

### File Modification Priority
1. **High**: `server/routes/leagueRoutes.ts` (main cleanup target)
2. **Medium**: `server/services/` (new service creation)
3. **Low**: Any additional files discovered during analysis

## Monitoring & Validation

### Development Environment Testing
- Verify Oakland Cougars team still accessible after each phase
- Ensure development authentication flow works correctly
- Test subdivision resolution across all Greek alphabet subdivisions

### Production Impact Assessment
- Confirm no production dependencies on Oakland Cougars hardcoding
- Validate emergency endpoints are truly development-only
- Monitor for any unexpected authentication issues

## Next Steps
1. Begin Phase 1 implementation with OaklandCougarsDevService creation
2. Use Serena to systematically identify all Oakland Cougars references across 24+ files
3. Implement gradual migration with feature flags for safety
4. Document new development patterns in CLAUDE.md