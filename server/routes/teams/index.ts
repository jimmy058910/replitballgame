/**
 * TEAM ROUTES INDEX - Main Router
 * Coordinates all team-related route modules
 * Replaces the monolithic teamRoutes.ts (2,744 lines)
 */

import { Router } from 'express';

// Import modular route components
import teamCoreRoutes from './teamCoreRoutes.js';
import teamFinancesRoutes from './teamFinancesRoutes.js';
import teamContractsRoutes from './teamContractsRoutes.js';
import teamMatchesRoutes from './teamMatchesRoutes.js';
import teamManagementRoutes from './teamManagementRoutes.js';

const router = Router();

console.log('🏗️ [Teams] Loading modular team routes...');

// Mount sub-routers with clear prefixes
router.use('/', teamCoreRoutes);           // Core team operations
router.use('/', teamFinancesRoutes);       // Financial operations  
router.use('/', teamContractsRoutes);      // Contracts & transactions
router.use('/', teamMatchesRoutes);        // Match & scheduling operations
router.use('/', teamManagementRoutes);      // Staff, players, formation, tryouts

console.log('✅ [Teams] All modular team routes loaded successfully');

export default router;