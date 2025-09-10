/**
 * LEAGUE SCHEDULE ROUTES
 * Extracted from monolithic leagueRoutes.ts
 * Handles: Schedule generation, daily schedules, match planning
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../../middleware/firebaseAuth.js';
import { ErrorCreators, asyncHandler } from '../../services/errorService.js';
import { logger } from '../../services/loggingService.js';
import { storage } from '../../storage/index.js';

const router = Router();

/**
 * Get next available schedule slot
 * GET /next-slot
 */
router.get('/next-slot', requireAuth, (req: Request, res: Response) => {
  try {
    logger.info('Getting next schedule slot');
    
    // Return next available slot
    res.json({
      success: true,
      nextSlot: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get next slot', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    res.status(500).json({ success: false, error: 'Failed to get next slot' });
  }
});

/**
 * Create/update schedule
 * POST /schedule
 */
router.post('/schedule', requireAuth, (req: Request, res: Response) => {
  try {
    logger.adminOperation('UPDATE_SCHEDULE', 'Updating league schedule');
    
    res.json({
      success: true,
      message: 'Schedule updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update schedule', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    res.status(500).json({ success: false, error: 'Failed to update schedule' });
  }
});

/**
 * Get daily schedule
 * GET /daily-schedule
 */
router.get('/daily-schedule', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info('Getting daily schedule');
    
    const schedule = await storage.leagues.getDailySchedule();
    
    res.json({
      success: true,
      schedule
    });
  } catch (error) {
    logger.error('Failed to get daily schedule', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    next(error);
  }
});

/**
 * Get division schedule
 * GET /:division/schedule
 */
router.get('/:division/schedule', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const division = parseInt(req.params.division);
    
    logger.info('Getting division schedule', { division });
    
    const schedule = await storage.leagues.getDivisionSchedule(division);
    
    res.json({
      success: true,
      schedule
    });
  } catch (error) {
    logger.error('Failed to get division schedule', { 
      division: req.params.division, 
      error: error instanceof Error ? error.message : String(error) 
    });
    next(error);
  }
});

/**
 * Generate new schedule
 * POST /generate-schedule
 */
router.post('/generate-schedule', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.adminOperation('GENERATE_SCHEDULE', 'Generating new league schedule');
    
    const result = await storage.leagues.generateSchedule(req.body);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Failed to generate schedule', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    next(error);
  }
});

export default router;