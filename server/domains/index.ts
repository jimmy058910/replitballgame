import { Router } from 'express.js';
import { Request, Response, NextFunction } from 'express.js';
import { AppError, createErrorResponse } from './core/errors.js';
import { Logger } from './core/logger.js';

// Import domain routes
import authRoutes from './auth/routes.js';
import tournamentRoutes from './tournaments/routes.js';
import matchRoutes from './matches/routes.js';
import economyRoutes from './economy/routes.js';

const router = Router();

// Mount domain routes
router.use('/auth', authRoutes);
router.use('/tournaments', tournamentRoutes);
router.use('/matches', matchRoutes);
router.use('/economy', economyRoutes);

// Health check endpoint removed - using enhanced health endpoint from server/health.ts instead

// Global error handler for domains
router.use((error: Error, req: Request, res: Response, next: NextFunction): void => {
  const requestId = req.headers['x-request-id'] as string;
  
  Logger.logError('Domain error occurred', error, {
    requestId,
    path: req.path,
    method: req.method,
    userId: (req.user as any)?.claims?.sub
  });

  if (error instanceof AppError) {
    res.status(error.statusCode).json(createErrorResponse(error, requestId));
    return;
  }

  // Unknown error - don't expose to client
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(requestId && { requestId })
  });
});

export default router;