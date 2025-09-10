/**
 * LEAGUE TEAMS ROUTES
 * Extracted from monolithic leagueRoutes.ts
 * Handles: Team management within leagues, AI team creation
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../../middleware/firebaseAuth.js';
import { ErrorCreators, asyncHandler } from '../../services/errorService.js';
import { logger } from '../../services/loggingService.js';
import { storage } from '../../storage/index.js';

const router = Router();

/**
 * Get teams in a division
 * GET /teams/:division
 */
router.get('/teams/:division', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const division = parseInt(req.params.division);
    
    logger.info('Getting teams in division', { division });
    
    const teams = await storage.leagues.getTeamsByDivision(division);
    
    res.json({
      success: true,
      teams
    });
  } catch (error) {
    logger.error('Failed to get teams in division', { 
      division: req.params.division, 
      error: error instanceof Error ? error.message : String(error) 
    });
    next(error);
  }
});

/**
 * Create AI teams for league
 * POST /create-ai-teams
 */
router.post('/create-ai-teams', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.adminOperation('CREATE_AI_TEAMS', 'Creating AI teams for league');
    
    const result = await storage.leagues.createAITeams(req.body);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Failed to create AI teams', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    next(error);
  }
});

export default router;