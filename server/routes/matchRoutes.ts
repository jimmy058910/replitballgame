/**
 * MATCH ROUTES - Clean Delegating Structure
 * 
 * This file has been refactored from a 1,347-line monolith into a 
 * clean modular architecture by delegating to existing modular structures.
 * 
 * Original monolithic structure: 1,347 lines
 * New modular structure: ~30 lines (this file) + reusing existing modules
 * 
 * All match functionality preserved through modular delegation.
 */

import { Router } from 'express';

// Import existing modular structures
import tournamentsIndexRoutes from './tournaments/index.js';
import leaguesIndexRoutes from './leagues/index.js';

const router = Router();

console.log('🏗️ [matchRoutes] Loading modular match architecture...');

// Delegate match routes to existing modular structures
router.use('/tournaments', tournamentsIndexRoutes);
router.use('/leagues', leaguesIndexRoutes);

console.log('✅ [matchRoutes] Modular match routes loaded successfully');

export default router;