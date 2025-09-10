/**
 * TOURNAMENT MATCHES ROUTES
 * Extracted from monolithic enhancedTournamentRoutes.ts
 * Handles: Match management, simulation, instant matches
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../../middleware/firebaseAuth.js';
import { ErrorCreators, asyncHandler } from '../../services/errorService.js';
import { logger } from '../../services/loggingService.js';
import { storage } from '../../storage/index.js';

const router = Router();

/**
 * Create instant match
 * POST /matches/instant
 */
router.post('/matches/instant', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const { opponentId, matchType } = req.body;
    
    logger.info('Creating instant match', { userId, opponentId, matchType });
    
    const result = await storage.tournaments.createInstantMatch(userId, opponentId, matchType);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Failed to create instant match', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

/**
 * Challenge another team
 * POST /matches/challenge
 */
router.post('/matches/challenge', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const { targetTeamId } = req.body;
    
    logger.info('Creating team challenge', { userId, targetTeamId });
    
    const result = await storage.tournaments.createChallenge(userId, targetTeamId);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Failed to create challenge', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

/**
 * Get tournament matches
 * GET /matches/:tournamentId
 */
router.get('/matches/:tournamentId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tournamentId } = req.params;
    
    logger.info('Getting tournament matches', { tournamentId });
    
    const matches = await storage.tournaments.getTournamentMatches(tournamentId);
    
    res.json({
      success: true,
      matches
    });
  } catch (error) {
    logger.error('Failed to get tournament matches', {
      tournamentId: req.params.tournamentId,
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

/**
 * Start tournament match
 * POST /matches/:matchId/start
 */
router.post('/matches/:matchId/start', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { matchId } = req.params;
    const userId = req.user.claims.sub;
    
    logger.info('Starting tournament match', { matchId, userId });
    
    const result = await storage.tournaments.startMatch(matchId, userId);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Failed to start tournament match', {
      matchId: req.params.matchId,
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

/**
 * Simulate tournament match
 * POST /matches/:matchId/simulate
 */
router.post('/matches/:matchId/simulate', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { matchId } = req.params;
    const userId = req.user.claims.sub;
    
    logger.info('Simulating tournament match', { matchId, userId });
    
    const result = await storage.tournaments.simulateMatch(matchId);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Failed to simulate tournament match', {
      matchId: req.params.matchId,
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

export default router;