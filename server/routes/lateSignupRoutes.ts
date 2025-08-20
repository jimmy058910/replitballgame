import express from 'express';
import { requireAuth } from "../middleware/firebaseAuth.js";
import { LateSignupService } from '../services/lateSignupService.js';
import { asyncHandler } from '../services/errorService.js';

const router = express.Router();

/**
 * GET /api/late-signup/status
 * Get current late signup window status and statistics
 */
import { Request, Response } from 'express';

router.get('/status', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const stats = await LateSignupService.getLateSignupStats();
  
  res.json({
    success: true,
    data: stats
  });
}));

/**
 * GET /api/late-signup/window
 * Check if currently in late signup window
 */
router.get('/window', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const isLateSignupWindow = await LateSignupService.isLateSignupWindow();
  
  res.json({
    success: true,
    data: {
      isLateSignupWindow,
      message: isLateSignupWindow 
        ? "Late signup is currently available (Day 1 3PM - Day 9 3PM)" 
        : "Late signup window is currently closed"
        }
  });
}));

/**
 * POST /api/late-signup/test-daily-processing
 * TESTING ENDPOINT: Manually trigger daily late signup processing
 */
router.post('/test-daily-processing', asyncHandler(async (req: Request, res: Response) => {
  try {
    console.log('🧪 Manual test trigger for daily late signup processing');
    await LateSignupService.processDailyLateSignups();
    
    res.json({
      success: true,
      message: 'Daily late signup processing completed successfully'
    });
  } catch (error) {
    console.error('Error in test daily processing:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}));

export default router;