/**
 * ENHANCED TOURNAMENT ROUTES - Clean Delegating Structure
 * 
 * This file has been refactored from a 1,609-line monolith into a 
 * clean modular architecture with focused, maintainable components.
 * 
 * Original monolithic structure: 1,609 lines
 * New modular structure: ~30 lines (this file) + 4 focused modules
 * 
 * Modules:
 * - tournamentRegistrationRoutes.ts: Registration, status, availability
 * - tournamentMatchesRoutes.ts: Match management and simulation
 * - tournamentRewardsRoutes.ts: Reward claiming and history
 * - tournamentAdminRoutes.ts: Administrative and debug operations
 * 
 * All functionality preserved with improved maintainability.
 */

import { Router } from 'express';

// Import the modular tournament routes coordinator
import tournamentsIndexRoutes from './tournaments/index.js';

const router = Router();

console.log('🏗️ [enhancedTournamentRoutes] Loading modular tournament architecture...');

// Delegate all enhanced tournament routes to the modular structure
router.use('/', tournamentsIndexRoutes);

console.log('✅ [enhancedTournamentRoutes] Modular tournament routes loaded successfully');

export default router;