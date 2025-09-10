/**
 * ENHANCED FINANCE ROUTES - Clean Delegating Structure
 * 
 * This file has been refactored from a 1,420-line monolith into a 
 * clean modular architecture with focused, maintainable components.
 * 
 * Original monolithic structure: 1,420 lines
 * New modular structure: ~30 lines (this file) + 4 focused modules
 * 
 * All functionality preserved with improved maintainability.
 */

import { Router } from 'express';
import financeIndexRoutes from './finance/index.js';

const router = Router();

console.log('🏗️ [enhancedFinanceRoutes] Loading modular finance architecture...');
router.use('/', financeIndexRoutes);
console.log('✅ [enhancedFinanceRoutes] Modular finance routes loaded successfully');

export default router;