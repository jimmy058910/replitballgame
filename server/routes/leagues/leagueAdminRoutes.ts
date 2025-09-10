/**
 * LEAGUE ADMIN ROUTES
 * Extracted from monolithic leagueRoutes.ts
 * Handles: Administrative operations, debug endpoints, emergency fixes
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../../middleware/firebaseAuth.js';
import { RBACService, Permission } from '../../services/rbacService.js';
import { ErrorCreators, asyncHandler } from '../../services/errorService.js';
import { logger } from '../../services/loggingService.js';
import { storage } from '../../storage/index.js';

const router = Router();

/**
 * Debug games status
 * GET /debug-games-status
 */
router.get('/debug-games-status', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.adminOperation('DEBUG_GAMES', 'Checking games status');
    
    const gamesStatus = await storage.leagues.getGamesDebugStatus();
    
    res.json({
      success: true,
      gamesStatus
    });
  } catch (error) {
    logger.error('Failed to get games debug status', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    next(error);
  }
});

/**
 * Clear and regenerate league data
 * POST /clear-and-regenerate
 */
router.post('/clear-and-regenerate', requireAuth, async (req: Request, res: Response) => {
  try {
    logger.adminOperation('CLEAR_REGENERATE', 'Clearing and regenerating league data');
    
    const result = await storage.leagues.clearAndRegenerate();
    
    res.json({
      success: true,
      message: 'League data cleared and regenerated successfully',
      ...result
    });
  } catch (error) {
    logger.error('Failed to clear and regenerate', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    res.status(500).json({ success: false, error: 'Failed to clear and regenerate' });
  }
});

/**
 * Emergency reset division
 * POST /reset-division-7-alpha
 */
router.post('/reset-division-7-alpha', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.adminOperation('RESET_DIVISION', 'Emergency reset division 7 alpha');
    
    const result = await storage.leagues.resetDivision(7, 'alpha');
    
    res.json({
      success: true,
      message: 'Division reset successfully',
      ...result
    });
  } catch (error) {
    logger.error('Failed to reset division', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    next(error);
  }
});

/**
 * Emergency debug division
 * GET /emergency-debug-division-7-alpha
 */
router.get('/emergency-debug-division-7-alpha', async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.adminOperation('DEBUG_DIVISION', 'Emergency debug division 7 alpha');
    
    const debugInfo = await storage.leagues.debugDivision(7, 'alpha');
    
    res.json({
      success: true,
      debugInfo
    });
  } catch (error) {
    logger.error('Failed to debug division', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    next(error);
  }
});

/**
 * Emergency test global rankings
 * GET /emergency-test-global-rankings
 */
router.get('/emergency-test-global-rankings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.adminOperation('TEST_RANKINGS', 'Emergency test global rankings');
    
    const rankings = await storage.leagues.testGlobalRankings();
    
    res.json({
      success: true,
      rankings
    });
  } catch (error) {
    logger.error('Failed to test global rankings', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    next(error);
  }
});

/**
 * Emergency simple daily schedule
 * GET /emergency-simple-daily-schedule
 */
router.get('/emergency-simple-daily-schedule', async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.adminOperation('SIMPLE_SCHEDULE', 'Emergency simple daily schedule');
    
    const schedule = await storage.leagues.getSimpleDailySchedule();
    
    res.json({
      success: true,
      schedule
    });
  } catch (error) {
    logger.error('Failed to get simple daily schedule', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    next(error);
  }
});

/**
 * Analyze team associations
 * GET /dev-analyze-team-associations
 */
router.get('/dev-analyze-team-associations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.adminOperation('ANALYZE_TEAMS', 'Analyzing team associations');
    
    const analysis = await storage.leagues.analyzeTeamAssociations();
    
    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    logger.error('Failed to analyze team associations', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    next(error);
  }
});

export default router;