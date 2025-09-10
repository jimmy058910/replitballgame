/**
 * LEAGUE ROUTES INDEX - Main Router
 * Coordinates all league-related route modules
 * Replaces the monolithic leagueRoutes.ts (2,717 lines)
 */

import { Router } from 'express';

// Import modular route components
import leagueStandingsRoutes from './leagueStandingsRoutes.js';
import leagueScheduleRoutes from './leagueScheduleRoutes.js';
import leagueTeamsRoutes from './leagueTeamsRoutes.js';
import leagueAdminRoutes from './leagueAdminRoutes.js';

const router = Router();

console.log('🏗️ [Leagues] Loading modular league routes...');

// Mount sub-routers
router.use('/', leagueStandingsRoutes);    // Standings and rankings
router.use('/', leagueScheduleRoutes);     // Schedule generation and management
router.use('/', leagueTeamsRoutes);        // Team management within leagues
router.use('/', leagueAdminRoutes);        // Administrative operations

console.log('✅ [Leagues] All modular league routes loaded successfully');

export default router;