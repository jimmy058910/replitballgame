/**
 * FINANCE PAYMENTS ROUTES
 * Extracted from monolithic enhancedFinanceRoutes.ts
 * Handles: Payment processing, Stripe integration, billing
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../../middleware/firebaseAuth.js';
import { ErrorCreators, asyncHandler } from '../../services/errorService.js';
import { logger } from '../../services/loggingService.js';
import { storage } from '../../storage/index.js';

const router = Router();

/**
 * Process payment
 * POST /payments/process
 */
router.post('/payments/process', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const paymentData = req.body;
    
    logger.info('Processing payment', { userId, amount: paymentData.amount });
    
    const result = await storage.finance.processPayment(userId, paymentData);
    
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Failed to process payment', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

export default router;