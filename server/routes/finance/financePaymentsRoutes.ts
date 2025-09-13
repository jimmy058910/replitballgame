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

/**
 * FINANCE PAYMENTS ROUTES
 * Extracted from monolithic enhancedFinanceRoutes.ts
 * Handles: Payment processing, Stripe integration, billing, gem exchange, store purchases
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/firebaseAuth.js';
import { ErrorCreators, asyncHandler } from '../../services/errorService.js';
import { logger } from '../../services/loggingService.js';
import { storage } from '../../storage/index.js';
import { DatabaseService } from '../../database/DatabaseService.js';

// Validation schemas
const exchangeGemsSchema = z.object({
  gemsAmount: z.number().positive().max(10000),
  idempotencyKey: z.string().min(1)
});

const purchaseGemsSchema = z.object({
  packageId: z.string(),
  idempotencyKey: z.string().min(1)
});

/**
 * Helper function to get user's team with financial data
 */
async function getUserTeamWithFinances(userId: string) {
  const prisma = await DatabaseService.getInstance();
  
  const userProfile = await prisma.userProfile.findFirst({
    where: { userId },
    include: {
      Team: {
        include: {
          finances: true
        }
      }
    }
  });
  
  if (!userProfile?.Team) {
    throw new Error("No team found for user");
  }
  
  const team = userProfile.Team;
  
  // Ensure finances exist
  if (!team.finances) {
    const finances = await prisma.teamFinances.create({
      data: {
        teamId: team.id,
        credits: 100000,
        gems: 100,
        updatedAt: new Date()
      }
    });
    team.finances = finances;
  }
  
  return { team, userProfile, finances: team.finances };
}

/**
 * Helper to serialize BigInt values for JSON response
 */
function serializeNumber(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(serializeNumber);
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      result[key] = serializeNumber(obj[key]);
    }
    return result;
  }
  return obj;
}

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

/**
 * Exchange gems for credits
 * POST /store/exchange-gems
 */
router.post('/store/exchange-gems', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const data = exchangeGemsSchema.parse(req.body);
    
    const { team, finances } = await getUserTeamWithFinances(userId);
    
    // Check gem balance
    if (finances.gems < data.gemsAmount) {
      return res.status(400).json({ error: 'Insufficient gems' });
    }
    
    // Use the exchange rates from your specification (1:200 to 1:275)
    // Start with the base rate of 1:200
    let exchangeRate = 200;
    let creditsToAdd = data.gemsAmount * exchangeRate;
    
    // Apply bonus rates based on amount (from specification)
    if (data.gemsAmount >= 1000) {
      exchangeRate = 275; // 1:275 ratio - Bulk
      creditsToAdd = data.gemsAmount * exchangeRate;
    } else if (data.gemsAmount >= 300) {
      exchangeRate = 250; // 1:250 ratio - Best Value
      creditsToAdd = data.gemsAmount * exchangeRate;
    } else if (data.gemsAmount >= 50) {
      exchangeRate = 225; // 1:225 ratio - Popular
      creditsToAdd = data.gemsAmount * exchangeRate;
    }
    
    const prisma = await DatabaseService.getInstance();
    
    // Process exchange in transaction
    await prisma.$transaction(async (tx) => {
      await tx.teamFinances.update({
        where: { teamId: team.id },
        data: {
          gems: { decrement: data.gemsAmount },
          credits: { increment: creditsToAdd }
        }
      });
    });
    
    logger.info('Gem exchange completed', {
      userId,
      teamId: team.id,
      gemsExchanged: data.gemsAmount,
      creditsReceived: creditsToAdd,
      exchangeRate
    });
    
    res.json({
      success: true,
      message: `Exchanged ${data.gemsAmount}💎 for ${creditsToAdd.toLocaleString()}₡`,
      exchange: {
        gemsExchanged: data.gemsAmount,
        creditsReceived: creditsToAdd,
        exchangeRate: `1:${exchangeRate}`
      },
      newBalances: {
        gems: finances.gems - data.gemsAmount,
        credits: Number(finances.credits) + creditsToAdd
      }
    });
  } catch (error) {
    logger.error('Failed to exchange gems', {
      error: error instanceof Error ? error.message : String(error)
    });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    next(error);
  }
});

/**
 * Get gem exchange rates
 * GET /store/gem-exchange-rates
 */
router.get('/store/gem-exchange-rates', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Exchange rates from your Master Economy specification (anti-pay-to-win)
    const rates = [
      { gems: 10, credits: 2000, ratio: '1:200', label: 'Starter' },
      { gems: 50, credits: 11250, ratio: '1:225', label: 'Popular' },
      { gems: 300, credits: 75000, ratio: '1:250', label: 'Best Value' },
      { gems: 1000, credits: 275000, ratio: '1:275', label: 'Bulk' }
    ];
    
    res.json({
      success: true,
      rates,
      baseRate: '1:200', // Minimum exchange rate
      note: 'Anti-pay-to-win exchange rates - better rates for larger exchanges'
    });
  } catch (error) {
    logger.error('Failed to fetch exchange rates', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

/**
 * Purchase gems (simplified for development)
 * POST /payments/purchase-gems
 */
router.post('/payments/purchase-gems', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const data = purchaseGemsSchema.parse(req.body);
    
    const { team, finances } = await getUserTeamWithFinances(userId);
    const prisma = await DatabaseService.getInstance();
    
    // Get package details from store config
    // For development, use simplified package structure
    const packageMap: Record<string, { gems: number, usd: number, bonus: number }> = {
      'starter': { gems: 20, usd: 1.99, bonus: 5 },
      'value': { gems: 60, usd: 4.99, bonus: 15 },
      'premium': { gems: 135, usd: 9.99, bonus: 40 },
      'elite': { gems: 300, usd: 19.99, bonus: 100 },
      'champion': { gems: 650, usd: 39.99, bonus: 250 },
      'ultimate': { gems: 2000, usd: 99.99, bonus: 750 }
    };
    
    const packageData = packageMap[data.packageId];
    if (!packageData) {
      return res.status(404).json({ error: 'Package not found' });
    }
    
    const totalGems = packageData.gems + packageData.bonus;
    
    // For development mode - instant completion
    await prisma.$transaction(async (tx) => {
      await tx.teamFinances.update({
        where: { teamId: team.id },
        data: {
          gems: { increment: totalGems }
        }
      });
      
      // Create transaction record
      await tx.paymentTransaction.create({
        data: {
          userId,
          teamId: team.id,
          amount: packageData.usd,
          currency: 'usd',
          status: 'completed',
          itemName: `${data.packageId}_gem_package`,
          transactionType: 'purchase',
          metadata: { gemsAmount: totalGems },
          updatedAt: new Date()
        }
      });
    });
    
    logger.info('Gem purchase completed', {
      userId,
      teamId: team.id,
      packageId: data.packageId,
      gemsAdded: totalGems,
      usdAmount: packageData.usd
    });
    
    res.json({
      success: true,
      message: `${totalGems}💎 added to your account!`,
      purchase: {
        package: data.packageId,
        baseGems: packageData.gems,
        bonusGems: packageData.bonus,
        totalGems: totalGems,
        usdPrice: packageData.usd
      },
      newBalance: finances.gems + totalGems
    });
  } catch (error) {
    logger.error('Failed to purchase gems', {
      error: error instanceof Error ? error.message : String(error)
    });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    next(error);
  }
});

/**
 * Get gem packages
 * GET /payments/packages
 */
router.get('/payments/packages', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Gem packages from your Master Economy specification
    const packages = [
      { id: 'starter', name: 'Starter Pack', usdPrice: 1.99, baseGems: 20, bonusGems: 5, totalGems: 25, popular: false },
      { id: 'value', name: 'Value Pack', usdPrice: 4.99, baseGems: 60, bonusGems: 15, totalGems: 75, popular: false },
      { id: 'premium', name: 'Premium Pack', usdPrice: 9.99, baseGems: 135, bonusGems: 40, totalGems: 175, popular: true },
      { id: 'elite', name: 'Elite Pack', usdPrice: 19.99, baseGems: 300, bonusGems: 100, totalGems: 400, popular: false },
      { id: 'champion', name: 'Champion Pack', usdPrice: 39.99, baseGems: 650, bonusGems: 250, totalGems: 900, popular: false },
      { id: 'ultimate', name: 'Ultimate Pack', usdPrice: 99.99, baseGems: 2000, bonusGems: 750, totalGems: 2750, popular: false }
    ];
    
    res.json({
      success: true,
      packages: serializeNumber(packages)
    });
  } catch (error) {
    logger.error('Failed to fetch gem packages', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

/**
 * Get current financial balance
 * GET /balance
 */
router.get('/balance', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const { team, finances } = await getUserTeamWithFinances(userId);
    
    res.json({
      success: true,
      balance: {
        credits: Number(finances.credits),
        gems: finances.gems,
        lastUpdated: finances.updatedAt
      }
    });
  } catch (error) {
    logger.error('Failed to fetch balance', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

export default router;