/**
 * FINANCE TRANSACTIONS ROUTES
 * Extracted from monolithic enhancedFinanceRoutes.ts
 * Handles: Transaction processing, history, validation
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../../middleware/firebaseAuth.js';
import { ErrorCreators, asyncHandler } from '../../services/errorService.js';
import { logger } from '../../services/loggingService.js';
import { storage } from '../../storage/index.js';

const router = Router();

/**
 * Get transaction history
 * GET /transactions
 */
router.get('/transactions', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    
    logger.info('Getting transaction history', { userId });
    
    const transactions = await storage.finance.getTransactionHistory(userId);
    
    res.json({
      success: true,
      transactions
    });
  } catch (error) {
    logger.error('Failed to get transaction history', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

/**
 * Create new transaction
 * POST /transactions
 */
router.post('/transactions', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const transactionData = req.body;
    
    logger.info('Creating new transaction', { userId, type: transactionData.type });
    
    const result = await storage.finance.createTransaction(userId, transactionData);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Failed to create transaction', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

/**
 * Validate transaction
 * POST /transactions/validate
 */
router.post('/transactions/validate', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const transactionData = req.body;
    
    logger.info('Validating transaction', { type: transactionData.type });
    
    const validation = await storage.finance.validateTransaction(transactionData);
    
    res.json({
      success: true,
      ...validation
    });
  } catch (error) {
    logger.error('Failed to validate transaction', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

export default router;