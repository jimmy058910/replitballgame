/**
 * TOURNAMENT REWARDS ROUTES
 * Extracted from monolithic enhancedTournamentRoutes.ts
 * Handles: Reward claiming, unclaimed rewards, division rewards
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../../middleware/firebaseAuth.js';
import { ErrorCreators, asyncHandler } from '../../services/errorService.js';
import { logger } from '../../services/loggingService.js';
import { storage } from '../../storage/index.js';

const router = Router();

/**
 * Get unclaimed rewards
 * GET /rewards/unclaimed
 */
router.get('/rewards/unclaimed', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    
    logger.info('Getting unclaimed tournament rewards', { userId });
    
    const rewards = await storage.tournaments.getUnclaimedRewards(userId);
    
    res.json({
      success: true,
      rewards
    });
  } catch (error) {
    logger.error('Failed to get unclaimed rewards', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

/**
 * Claim tournament rewards
 * POST /rewards/claim
 */
router.post('/rewards/claim', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const { rewardIds } = req.body;
    
    logger.info('Claiming tournament rewards', { userId, rewardCount: rewardIds?.length });
    
    const result = await storage.tournaments.claimRewards(userId, rewardIds);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Failed to claim rewards', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

/**
 * Claim specific tournament reward
 * POST /rewards/claim/:tournamentId
 */
router.post('/rewards/claim/:tournamentId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tournamentId } = req.params;
    const userId = req.user.claims.sub;
    
    logger.info('Claiming tournament-specific reward', { userId, tournamentId });
    
    const result = await storage.tournaments.claimTournamentReward(userId, tournamentId);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Failed to claim tournament reward', {
      tournamentId: req.params.tournamentId,
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

/**
 * Get division rewards
 * GET /rewards/division/:division
 */
router.get('/rewards/division/:division', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { division } = req.params;
    const userId = req.user.claims.sub;
    
    logger.info('Getting division rewards', { userId, division });
    
    const rewards = await storage.tournaments.getDivisionRewards(userId, parseInt(division));
    
    res.json({
      success: true,
      rewards
    });
  } catch (error) {
    logger.error('Failed to get division rewards', {
      division: req.params.division,
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

/**
 * Get tournament history
 * GET /history
 */
router.get('/history', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    
    logger.info('Getting tournament history', { userId });
    
    const history = await storage.tournaments.getTournamentHistory(userId);
    
    res.json({
      success: true,
      history
    });
  } catch (error) {
    logger.error('Failed to get tournament history', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

/**
 * Get tournament stats
 * GET /stats
 */
router.get('/stats', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    
    logger.info('Getting tournament stats', { userId });
    
    const stats = await storage.tournaments.getTournamentStats(userId);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Failed to get tournament stats', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

export default router;