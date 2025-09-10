/**
 * TEAM ROUTES - Clean Delegating Structure
 * 
 * This file has been refactored from a 2,744-line monolith into a 
 * clean modular architecture with focused, maintainable components.
 * 
 * Original monolithic structure: 2,744 lines
 * New modular structure: ~50 lines (this file) + 5 focused modules
 * 
 * Modules:
 * - teamCoreRoutes.ts: Core team operations (auth test, team retrieval, creation)
 * - teamFinancesRoutes.ts: Financial operations (finances, balances)  
 * - teamContractsRoutes.ts: Contracts & transactions
 * - teamMatchesRoutes.ts: Match & scheduling operations
 * - teamManagementRoutes.ts: Staff, players, formation, tryouts
 * 
 * All functionality preserved with improved maintainability.
 */

import { Router } from 'express';

// Import the modular team routes coordinator
import teamsIndexRoutes from './teams/index.js';

const router = Router();

console.log('🏗️ [teamRoutes] Loading modular team architecture...');

// Delegate all team routes to the modular structure
router.use('/', teamsIndexRoutes);

console.log('✅ [teamRoutes] Modular team routes loaded successfully');

export default router;