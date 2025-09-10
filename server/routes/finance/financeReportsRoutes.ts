/**
 * FINANCE REPORTS ROUTES
 * Extracted from monolithic enhancedFinanceRoutes.ts
 * Handles: Financial reporting, analytics, insights
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../../middleware/firebaseAuth.js';
import { ErrorCreators, asyncHandler } from '../../services/errorService.js';
import { logger } from '../../services/loggingService.js';
import { storage } from '../../storage/index.js';

const router = Router();

/**
 * Get financial reports
 * GET /reports
 */
router.get('/reports', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    
    logger.info('Getting financial reports', { userId });
    
    const reports = await storage.finance.getFinancialReports(userId);
    
    res.json({ success: true, reports });
  } catch (error) {
    logger.error('Failed to get financial reports', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

export default router;