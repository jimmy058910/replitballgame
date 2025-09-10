/**
 * ENHANCED LEAGUE ROUTES - Clean Delegating Structure
 * 
 * This file has been refactored from a 1,772-line monolith into a 
 * clean modular architecture by delegating to the leagues/ modules.
 * 
 * Original monolithic structure: 1,772 lines
 * New modular structure: ~30 lines (this file) + reusing leagues/ modules
 * 
 * Delegates to existing modular structure in leagues/ directory:
 * - leagueStandingsRoutes.ts: Division standings and rankings
 * - leagueTeamsRoutes.ts: Team management within leagues  
 * - leagueScheduleRoutes.ts: Schedule generation and management
 * - leagueAdminRoutes.ts: Administrative and debug operations
 * 
 * All enhanced functionality preserved through the modular structure.
 */

import { Router } from 'express';

// Import the modular league routes coordinator
import leaguesIndexRoutes from './leagues/index.js';

const router = Router();

console.log('🏗️ [enhancedLeagueRoutes] Loading modular league architecture...');

// Delegate all enhanced league routes to the modular structure
router.use('/', leaguesIndexRoutes);

console.log('✅ [enhancedLeagueRoutes] Modular league routes loaded successfully');

export default router;