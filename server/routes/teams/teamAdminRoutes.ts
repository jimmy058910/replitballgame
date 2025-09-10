/**
 * TEAM ADMIN ROUTES
 * Extracted from monolithic teamRoutes.ts
 * Handles: Debug endpoints, data fixes, admin operations
 */

import { Router, type Request, type Response } from 'express';
import { requireAuth } from '../../middleware/firebaseAuth.js';
import { RBACService, Permission } from '../../services/rbacService.js';
import { ErrorCreators, asyncHandler } from '../../services/errorService.js';
import { logger } from '../../services/loggingService.js';
import { storage } from '../../storage/index.js';

const router = Router();

// TODO: Extract admin/debug routes from teamRoutes.ts
// - fix-opponent-debug
// - fix-financial-balance
// - set-all-players-camaraderie
// - fix-day9-dates
// - reset-test-games
// - fix-day8-status-and-standings
// - debug-games-status
// - reset-all-standings
// - fix-completed-standings
// - fix-day8-games
// - fix-oakland-stats

export default router;