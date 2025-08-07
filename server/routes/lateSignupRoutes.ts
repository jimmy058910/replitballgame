import express from 'express';
import { isAuthenticated } from '../googleAuth';
import { LateSignupService } from '../services/lateSignupService';
import { asyncHandler } from '../services/errorService';

const router = express.Router();

/**
 * GET /api/late-signup/status
 * Get current late signup window status and statistics
 */
import { Request, Response } from 'express';

router.get('/status', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
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
router.get('/window', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
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

export default router;