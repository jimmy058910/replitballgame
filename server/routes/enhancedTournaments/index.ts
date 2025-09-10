/**
 * ENHANCED TOURNAMENT ROUTES INDEX  
 * Coordinates all enhanced tournament route modules
 * Replaces the monolithic enhancedTournamentRoutes.ts (1,609 lines)
 */

import { Router } from 'express';

// Import modular enhanced tournament components
import tournamentManagementRoutes from './tournamentManagementRoutes.js';
import tournamentBracketRoutes from './tournamentBracketRoutes.js';
import tournamentMatchRoutes from './tournamentMatchRoutes.js';
import tournamentRewardsRoutes from './tournamentRewardsRoutes.js';

const router = Router();

console.log('🏗️ [EnhancedTournaments] Loading modular enhanced tournament routes...');

// Mount enhanced tournament sub-routers
router.use('/', tournamentManagementRoutes);    // Tournament creation and management
router.use('/', tournamentBracketRoutes);       // Bracket generation and management
router.use('/', tournamentMatchRoutes);         // Tournament match handling
router.use('/', tournamentRewardsRoutes);       // Rewards and prize distribution

console.log('✅ [EnhancedTournaments] All modular enhanced tournament routes loaded successfully');

export default router;