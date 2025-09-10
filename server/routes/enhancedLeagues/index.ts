/**
 * ENHANCED LEAGUE ROUTES INDEX
 * Coordinates all enhanced league route modules
 * Replaces the monolithic enhancedLeagueRoutes.ts (1,772 lines)
 */

import { Router } from 'express';

// Import modular enhanced league components
import enhancedLeagueManagementRoutes from './enhancedLeagueManagementRoutes.js';
import enhancedLeagueStandingsRoutes from './enhancedLeagueStandingsRoutes.js';
import enhancedLeagueMatchesRoutes from './enhancedLeagueMatchesRoutes.js';
import enhancedLeagueAnalyticsRoutes from './enhancedLeagueAnalyticsRoutes.js';

const router = Router();

console.log('🏗️ [EnhancedLeagues] Loading modular enhanced league routes...');

// Mount enhanced league sub-routers
router.use('/', enhancedLeagueManagementRoutes);    // League management operations
router.use('/', enhancedLeagueStandingsRoutes);     // Enhanced standings and rankings  
router.use('/', enhancedLeagueMatchesRoutes);       // Enhanced match management
router.use('/', enhancedLeagueAnalyticsRoutes);     // League analytics and insights

console.log('✅ [EnhancedLeagues] All modular enhanced league routes loaded successfully');

export default router;