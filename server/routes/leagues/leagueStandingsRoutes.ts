/**
 * LEAGUE STANDINGS ROUTES
 * Extracted from monolithic leagueRoutes.ts
 * Handles: Division standings, rankings, team statistics
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../../middleware/firebaseAuth.js';
import { ErrorCreators, asyncHandler } from '../../services/errorService.js';
import { logger } from '../../services/loggingService.js';
import { storage } from '../../storage/index.js';

const router = Router();

/**
 * Get division standings
 * GET /:division/standings
 */
router.get('/:division/standings', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const division = parseInt(req.params.division);
    
    logger.info('Getting division standings', { division });
    
    const standings = await storage.leagues.getDivisionStandings(division);
    
    res.json({
      success: true,
      standings
    });
  } catch (error) {
    logger.error('Failed to get division standings', { 
      division: req.params.division, 
      error: error instanceof Error ? error.message : String(error) 
    });
    next(error);
  }
});

export default router;