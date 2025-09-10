# Oakland Cougars - Development Complexity Analysis

## Search Results Summary (24 files found)
Oakland Cougars appears across the entire codebase with special development handling:

### Key Problem Areas Identified:
1. **Emergency/Alpha Testing Fixes**: Multiple "emergency" and "alpha fix" code sections
2. **Development-Specific Logic**: Special handling for Oakland Cougars in dev mode
3. **Schedule Issues**: Multiple schedule automation fixes and overrides
4. **Authentication Issues**: Dev token mapping and user profile associations
5. **Statistics Synchronization**: Multiple scripts for fixing Oakland Cougars stats

### Critical Files with Oakland Cougars Logic:
- `server/routes/leagueRoutes.ts` (2600+ lines, 19 references)
- `server/routes/enhancedLeagueRoutes.ts` (dev user setup)
- `server/routes/seasonRoutes.ts` (emergency schedule fix endpoint)
- `server/services/seasonTimingAutomationService.ts` (alpha testing fixes)
- `server/scripts/fixOaklandCougarsStats.ts` (dedicated fix script)

### Architecture Concerns:
- Oakland Cougars has become a "special case" throughout the codebase
- Multiple emergency fix endpoints specifically for this team
- Development authentication tied to Oakland Cougars
- Schedule automation has Oakland Cougars-specific logic

### Recommendations:
1. **Consolidate Oakland Cougars Logic**: Extract to dedicated service
2. **Remove Emergency Fixes**: Replace with proper data migration
3. **Generalize Dev Environment**: Decouple from specific team
4. **Statistics Integrity**: Implement proper sync without team-specific scripts