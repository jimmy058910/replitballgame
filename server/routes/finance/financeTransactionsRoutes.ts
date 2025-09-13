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

/**
 * FINANCE TRANSACTIONS ROUTES
 * Extracted from monolithic enhancedFinanceRoutes.ts
 * Handles: Transaction processing, history, validation, ad rewards system
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/firebaseAuth.js';
import { ErrorCreators, asyncHandler } from '../../services/errorService.js';
import { logger } from '../../services/loggingService.js';
import { storage } from '../../storage/index.js';
import { DatabaseService } from '../../database/DatabaseService.js';

// Validation schemas
const watchAdSchema = z.object({
  adType: z.enum(['banner', 'interstitial', 'rewarded', 'native']).default('rewarded'),
  duration: z.number().positive().optional(),
  placement: z.string().optional()
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
 * Get transaction history
 * GET /transactions
 */
router.get('/transactions', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const { type, startDate, endDate, limit = 50, offset = 0 } = req.query;
    
    const { team } = await getUserTeamWithFinances(userId);
    const prisma = await DatabaseService.getInstance();
    
    const where: any = { teamId: team.id };
    
    if (type) where.transactionType = type;
    if (startDate) where.createdAt = { ...where.createdAt, gte: new Date(startDate as string) };
    if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate as string) };
    
    const [transactions, total] = await Promise.all([
      prisma.paymentTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string)
      }),
      prisma.paymentTransaction.count({ where })
    ]);
    
    logger.info('Retrieved transaction history', { userId, count: transactions.length });
    
    res.json({
      success: true,
      transactions: transactions.map(t => ({
        ...t,
        amount: Number(t.amount)
      })),
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });
  } catch (error) {
    logger.error('Failed to get transaction history', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

/**
 * Ad rewards system - Watch ad for rewards
 * POST /ads/watch
 */
router.post('/ads/watch', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const adData = watchAdSchema.parse(req.body);
    
    const { team, finances } = await getUserTeamWithFinances(userId);
    const prisma = await DatabaseService.getInstance();
    
    // Check daily ad limit (5 ads per day from specification)
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    const dailyAdCount = await prisma.paymentTransaction.count({
      where: {
        userId,
        transactionType: 'ad_reward',
        createdAt: {
          gte: todayStart,
          lte: todayEnd
        }
      }
    });
    
    if (dailyAdCount >= 5) {
      return res.status(429).json({ 
        success: false, 
        message: "Daily ad limit reached (5/5). Try again tomorrow!" 
      });
    }
    
    // Get total ads watched for premium box milestone (70 from specification)
    const totalAdsWatched = await prisma.paymentTransaction.count({
      where: {
        userId,
        transactionType: 'ad_reward'
      }
    });
    
    // Standard ad reward (250-750 credits)
    const baseReward = Math.floor(Math.random() * 501) + 250; // 250-750 credits
    
    // Check for premium box milestone (every 70 ads)
    const adsUntilPremium = 70 - (totalAdsWatched % 70);
    const premiumBoxEarned = adsUntilPremium === 70; // Just reached milestone
    
    let premiumReward = 0;
    let premiumGems = 0;
    
    if (premiumBoxEarned) {
      // Premium box rewards: 5,000-15,000 credits + 25-75 gems
      premiumReward = Math.floor(Math.random() * 10001) + 5000;
      premiumGems = Math.floor(Math.random() * 51) + 25;
    }
    
    const totalCredits = baseReward + premiumReward;
    
    // Process rewards in transaction
    await prisma.$transaction(async (tx) => {
      // Update team finances
      await tx.teamFinances.update({
        where: { teamId: team.id },
        data: {
          credits: { increment: totalCredits },
          gems: premiumGems > 0 ? { increment: premiumGems } : undefined
        }
      });
      
      // Create transaction record
      await tx.paymentTransaction.create({
        data: {
          userId,
          teamId: team.id,
          amount: totalCredits,
          currency: 'credits',
          status: 'completed',
          transactionType: 'ad_reward',
          itemName: `${adData.adType}_ad_reward`,
          metadata: {
            adType: adData.adType,
            baseReward,
            premiumReward,
            premiumGems,
            premiumBoxEarned,
            dailyCount: dailyAdCount + 1,
            totalAdsWatched: totalAdsWatched + 1
          },
          updatedAt: new Date()
        }
      });
    });
    
    let message = `Earned ${baseReward}₡! Daily: ${dailyAdCount + 1}/5`;
    
    if (premiumBoxEarned) {
      message += ` | 🎁 PREMIUM BOX: +${premiumReward}₡ + ${premiumGems}💎!`;
    } else {
      message += ` | Premium Box: ${69 - adsUntilPremium + 1}/70`;
    }
    
    logger.info('Ad reward processed', {
      userId,
      teamId: team.id,
      baseReward,
      premiumReward,
      premiumGems,
      premiumBoxEarned,
      dailyCount: dailyAdCount + 1,
      totalAdsWatched: totalAdsWatched + 1
    });
    
    res.json({
      success: true,
      message,
      rewards: {
        baseCredits: baseReward,
        premiumCredits: premiumReward,
        premiumGems: premiumGems,
        totalCredits: totalCredits
      },
      tracking: {
        dailyCount: dailyAdCount + 1,
        dailyLimit: 5,
        totalAdsWatched: totalAdsWatched + 1,
        premiumBoxProgress: (totalAdsWatched + 1) % 70,
        premiumBoxEarned,
        adsUntilNextPremium: adsUntilPremium === 70 ? 70 : adsUntilPremium - 1
      },
      newBalances: {
        credits: Number(finances.credits) + totalCredits,
        gems: finances.gems + premiumGems
      }
    });
  } catch (error) {
    logger.error('Failed to process ad reward', {
      error: error instanceof Error ? error.message : String(error)
    });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid ad data', details: error.errors });
    }
    next(error);
  }
});

/**
 * Get ad statistics
 * GET /ads/stats
 */
router.get('/ads/stats', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const prisma = await DatabaseService.getInstance();
    
    // Get today's ad count
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    const [dailyCount, totalCount] = await Promise.all([
      prisma.paymentTransaction.count({
        where: {
          userId,
          transactionType: 'ad_reward',
          createdAt: {
            gte: todayStart,
            lte: todayEnd
          }
        }
      }),
      prisma.paymentTransaction.count({
        where: {
          userId,
          transactionType: 'ad_reward'
        }
      })
    ]);
    
    const premiumProgress = totalCount % 70;
    const canWatchMore = dailyCount < 5;
    
    // Calculate reset time (next midnight)
    const resetTime = new Date(today);
    resetTime.setUTCDate(today.getUTCDate() + 1);
    resetTime.setUTCHours(0, 0, 0, 0);
    
    res.json({
      success: true,
      stats: {
        dailyCount,
        dailyLimit: 5,
        totalCount,
        premiumProgress,
        premiumThreshold: 70,
        canWatchMore,
        resetTime: resetTime.toISOString(),
        adsUntilPremium: 70 - premiumProgress
      }
    });
  } catch (error) {
    logger.error('Failed to get ad stats', {
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
    
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Failed to create transaction', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(error);
  }
});

export default router;