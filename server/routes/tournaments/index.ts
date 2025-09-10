/**
 * TOURNAMENT ROUTES INDEX - Main Router
 * Coordinates all tournament-related route modules
 * Replaces the monolithic enhancedTournamentRoutes.ts (1,609 lines)
 */

import { Router } from 'express';

// Import modular route components
import tournamentRegistrationRoutes from './tournamentRegistrationRoutes.js';
import tournamentMatchesRoutes from './tournamentMatchesRoutes.js';
import tournamentRewardsRoutes from './tournamentRewardsRoutes.js';
import tournamentAdminRoutes from './tournamentAdminRoutes.js';

const router = Router();

console.log('🏗️ [Tournaments] Loading modular tournament routes...');

// Mount sub-routers
router.use('/', tournamentRegistrationRoutes); // Registration and status
router.use('/', tournamentMatchesRoutes);       // Match management and simulation
router.use('/', tournamentRewardsRoutes);       // Rewards and claims
router.use('/', tournamentAdminRoutes);         // Administrative operations

console.log('✅ [Tournaments] All modular tournament routes loaded successfully');

export default router;