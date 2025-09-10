/**
 * FINANCE ROUTES INDEX - Main Router
 * Coordinates all finance-related route modules
 * Replaces the monolithic enhancedFinanceRoutes.ts (1,420 lines)
 */

import { Router } from 'express';

// Import modular route components
import financeTransactionsRoutes from './financeTransactionsRoutes.js';
import financePaymentsRoutes from './financePaymentsRoutes.js';
import financeReportsRoutes from './financeReportsRoutes.js';
import financeAdminRoutes from './financeAdminRoutes.js';

const router = Router();

console.log('🏗️ [Finance] Loading modular finance routes...');

// Mount sub-routers
router.use('/', financeTransactionsRoutes); // Transaction management
router.use('/', financePaymentsRoutes);     // Payment processing
router.use('/', financeReportsRoutes);      // Financial reporting
router.use('/', financeAdminRoutes);        // Administrative operations

console.log('✅ [Finance] All modular finance routes loaded successfully');

export default router;