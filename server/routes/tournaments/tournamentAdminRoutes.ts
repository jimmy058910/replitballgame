/**
 * TOURNAMENT ADMIN ROUTES
 * Extracted from monolithic enhancedTournamentRoutes.ts
 * Handles: Administrative operations, tournament creation, debugging
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../../middleware/firebaseAuth.js';
import { RBACService, Permission } from '../../services/rbacService.js';
import { ErrorCreators, asyncHandler } from '../../services/errorService.js';
import { logger } from '../../services/loggingService.js';
import { storage } from '../../storage/index.js';

const router = Router();

/**
 * Create tournament (admin)
 * POST /admin/create/:type/:division
 */
router.post('/admin/create/:type/:division', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { type, division } = req.params;
    const userId = req.user.claims.sub;
    
    logger.adminOperation('CREATE_TOURNAMENT', `Creating ${type} tournament for division ${division}`, { userId });
    
    const result = await storage.tournaments.createTournament(type, parseInt(division), req.body);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Failed to create tournament', {
      type: req.params.type,
      division: req.params.division,
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

/**
 * Force start tournament (admin)
 * POST /admin/force-start/:tournamentId
 */
router.post('/admin/force-start/:tournamentId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tournamentId } = req.params;
    const userId = req.user.claims.sub;
    
    logger.adminOperation('FORCE_START_TOURNAMENT', `Force starting tournament ${tournamentId}`, { userId });
    
    const result = await storage.tournaments.forceStartTournament(tournamentId);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Failed to force start tournament', {
      tournamentId: req.params.tournamentId,
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

/**
 * Force complete tournament (admin)
 * POST /admin/force-complete/:tournamentId
 */
router.post('/admin/force-complete/:tournamentId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tournamentId } = req.params;
    const userId = req.user.claims.sub;
    
    logger.adminOperation('FORCE_COMPLETE_TOURNAMENT', `Force completing tournament ${tournamentId}`, { userId });
    
    const result = await storage.tournaments.forceCompleteTournament(tournamentId);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Failed to force complete tournament', {
      tournamentId: req.params.tournamentId,
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

/**
 * Emergency match creation (admin)
 * POST /admin/emergency-match/:tournamentId
 */
router.post('/admin/emergency-match/:tournamentId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tournamentId } = req.params;
    const userId = req.user.claims.sub;
    
    logger.adminOperation('EMERGENCY_MATCH', `Creating emergency match for tournament ${tournamentId}`, { userId });
    
    const result = await storage.tournaments.createEmergencyMatch(tournamentId, req.body);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Failed to create emergency match', {
      tournamentId: req.params.tournamentId,
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

/**
 * Debug tournament (admin)
 * GET /admin/debug/:tournamentId
 */
router.get('/admin/debug/:tournamentId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tournamentId } = req.params;
    const userId = req.user.claims.sub;
    
    logger.adminOperation('DEBUG_TOURNAMENT', `Debugging tournament ${tournamentId}`, { userId });
    
    const debugInfo = await storage.tournaments.debugTournament(tournamentId);
    
    res.json({
      success: true,
      debugInfo
    });
  } catch (error) {
    logger.error('Failed to debug tournament', {
      tournamentId: req.params.tournamentId,
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

/**
 * Get tournament status by ID
 * GET /status/:tournamentId
 */
router.get('/status/:tournamentId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tournamentId } = req.params;
    
    logger.info('Getting tournament status', { tournamentId });
    
    const status = await storage.tournaments.getTournamentStatus(tournamentId);
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    logger.error('Failed to get tournament status', {
      tournamentId: req.params.tournamentId,
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

export default router;