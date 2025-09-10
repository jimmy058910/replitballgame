/**
 * LEAGUE ROUTES - Clean Delegating Structure
 * 
 * This file has been refactored from a 2,717-line monolith into a 
 * clean modular architecture with focused, maintainable components.
 * 
 * Original monolithic structure: 2,717 lines
 * New modular structure: ~30 lines (this file) + 4 focused modules
 * 
 * Modules:
 * - leagueStandingsRoutes.ts: Division standings and rankings
 * - leagueTeamsRoutes.ts: Team management within leagues
 * - leagueScheduleRoutes.ts: Schedule generation and management
 * - leagueAdminRoutes.ts: Administrative and debug operations
 * 
 * All functionality preserved with improved maintainability.
 */

import { Router } from 'express';

// Import the modular league routes coordinator
import leaguesIndexRoutes from './leagues/index.js';

const router = Router();

console.log('🏗️ [leagueRoutes] Loading modular league architecture...');

// Delegate all league routes to the modular structure
router.use('/', leaguesIndexRoutes);

console.log('✅ [leagueRoutes] Modular league routes loaded successfully');

export default router;