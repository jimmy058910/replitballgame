/**
 * FINANCE ADMIN ROUTES
 * Extracted from monolithic enhancedFinanceRoutes.ts
 * Handles: Administrative financial operations, auditing, system management
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../../middleware/firebaseAuth.js';
import { RBACService, Permission } from '../../services/rbacService.js';
import { ErrorCreators, asyncHandler } from '../../services/errorService.js';
import { logger } from '../../services/loggingService.js';
import { storage } from '../../storage/index.js';

const router = Router();

/**
 * Get financial system status
 * GET /admin/status
 */
router.get('/admin/status', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    
    logger.adminOperation('GET_FINANCE_STATUS', 'Getting financial system status', { userId });
    
    const status = await storage.finance.getSystemStatus();
    
    res.json({ success: true, status });
  } catch (error) {
    logger.error('Failed to get financial system status', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

export default router;