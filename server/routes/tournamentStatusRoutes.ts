/**
 * TOURNAMENT STATUS ROUTES - Clean Delegating Structure
 * 
 * This file has been refactored from a 1,443-line monolith into a 
 * clean modular architecture by delegating to the tournaments/ modules.
 * 
 * Original monolithic structure: 1,443 lines
 * New modular structure: ~30 lines (this file) + reusing tournaments/ modules
 * 
 * Delegates to existing modular tournament structure.
 * All tournament status functionality preserved through modular delegation.
 */

import { Router } from 'express';

// Import the modular tournament routes coordinator
import tournamentsIndexRoutes from './tournaments/index.js';

const router = Router();

console.log('🏗️ [tournamentStatusRoutes] Loading modular tournament architecture...');

// Delegate all tournament status routes to the modular structure
router.use('/', tournamentsIndexRoutes);

console.log('✅ [tournamentStatusRoutes] Modular tournament routes loaded successfully');

export default router;