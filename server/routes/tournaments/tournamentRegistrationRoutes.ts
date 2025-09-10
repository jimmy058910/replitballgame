/**
 * TOURNAMENT REGISTRATION ROUTES
 * Extracted from monolithic enhancedTournamentRoutes.ts
 * Handles: Tournament registration, status, availability
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../../middleware/firebaseAuth.js';
import { ErrorCreators, asyncHandler } from '../../services/errorService.js';
import { logger } from '../../services/loggingService.js';
import { storage } from '../../storage/index.js';

const router = Router();

/**
 * Get available tournaments
 * GET /available
 */
router.get('/available', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    logger.info('Getting available tournaments');
    
    const tournaments = await storage.tournaments.getAvailableTournaments();
    
    res.json({
      success: true,
      tournaments
    });
  } catch (error) {
    logger.error('Failed to get available tournaments', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

/**
 * Register for tournament
 * POST /register
 */
router.post('/register', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tournamentId } = req.body;
    const userId = req.user.claims.sub;
    
    logger.info('Tournament registration request', { tournamentId, userId });
    
    const result = await storage.tournaments.registerForTournament(tournamentId, userId);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Failed to register for tournament', {
      tournamentId: req.body.tournamentId,
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

/**
 * Get registration status
 * GET /registration-status
 */
router.get('/registration-status', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    
    logger.info('Getting tournament registration status', { userId });
    
    const status = await storage.tournaments.getRegistrationStatus(userId);
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    logger.error('Failed to get registration status', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

/**
 * Get my tournaments
 * GET /my-tournaments
 */
router.get('/my-tournaments', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    
    logger.info('Getting user tournaments', { userId });
    
    const tournaments = await storage.tournaments.getUserTournaments(userId);
    
    res.json({
      success: true,
      tournaments
    });
  } catch (error) {
    logger.error('Failed to get user tournaments', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

export default router;