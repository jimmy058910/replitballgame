import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from "../storage"; // Adjusted path
import { isAuthenticated } from "../googleAuth"; // Adjusted path
import { adSystemStorage } from "../storage/adSystemStorage";
import { z } from "zod"; // For validation

const router = Router();

// Zod Schema for ad view logging
const adViewSchema = z.object({
  adType: z.enum(['interstitial', 'rewarded_video', 'banner', 'other']),
  placement: z.string().min(1).max(50).optional(), // e.g., 'halftime', 'store_bonus', 'match_reward'
  rewardType: z.enum(['credits', 'premium_currency', 'item', 'none']).optional(),
  rewardAmount: z.number().int().min(0).optional(),
  completed: z.boolean(),
  // adNetwork: z.string().optional(), // If tracking different ad networks
  // durationWatched: z.number().optional(), // In seconds, for video ads
});


// Ad System Routes
router.post('/view', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const adData = adViewSchema.parse(req.body);

    // Use the enhanced tracking system
    const result = await adSystemStorage.processAdWatch(
      userId,
      adData.adType,
      adData.placement || 'unknown',
      adData.rewardType || 'none',
      adData.rewardAmount || 0
    );

    // Note: All ad reward processing now handled by adSystemStorage.processAdWatch()
    
    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error processing ad view:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid ad view data", errors: error.errors });
    }
    next(error);
  }
});

// Get user ad statistics with enhanced tracking
router.get('/stats', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const stats = await adSystemStorage.getUserAdStats(userId);
    
    res.json({
      dailyCount: stats.dailyCount,
      totalCount: stats.totalCount,
      premiumProgress: stats.premiumProgress,
      canWatchMore: stats.canWatchMore,
      dailyLimit: 20,
      premiumThreshold: 50,
      resetTime: stats.resetTime
    });
  } catch (error) {
    console.error('Error fetching ad stats:', error);
    next(error);
  }
});

// Manual ad watch endpoint (for additional watch button)
router.post('/watch', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    
    // Check if user can watch more ads
    const stats = await adSystemStorage.getUserAdStats(userId);
    if (!stats.canWatchMore) {
      return res.status(429).json({ 
        success: false, 
        message: "Daily ad limit reached (20/20). Reset in a few hours." 
      });
    }

    // Process ad watch with standard rewards
    const rewardAmount = Math.floor(Math.random() * 500) + 250; // 250-750 credits
    const result = await adSystemStorage.processAdWatch(
      userId,
      'rewarded_video',
      'manual_watch', 
      'credits',
      rewardAmount
    );

    // Award credits to team
    const team = await storage.teams.getTeamByUserId(userId);
    if (team) {
      const finances = await storage.teamFinances.getTeamFinances(team.id);
      if (finances) {
        const currentCredits = BigInt(finances.credits);
        const newCredits = currentCredits + BigInt(rewardAmount);
        await storage.teamFinances.updateTeamFinances(team.id, { credits: newCredits });
      }
    }

    // Handle premium reward
    let message = `Earned ${rewardAmount} credits! Daily: ${result.dailyCount}/20`;
    
    if (result.premiumRewardEarned && result.premiumReward) {
      if (team && result.premiumReward.type === 'credits') {
        const finances = await storage.teamFinances.getTeamFinances(team.id);
        if (finances) {
          const currentCredits = BigInt(finances.credits);
          const newCredits = currentCredits + BigInt(result.premiumReward.amount);
          await storage.teamFinances.updateTeamFinances(team.id, { credits: newCredits });
          message += ` | PREMIUM REWARD: ${result.premiumReward.amount} Credits!`;
        }
      } else if (team && result.premiumReward.type === 'premium_currency') {
        const finances = await storage.teamFinances.getTeamFinances(team.id);
        if (finances) {
          const currentGems = finances.gems || 0;
          const newGems = currentGems + result.premiumReward.amount;
          await storage.teamFinances.updateTeamFinances(team.id, { gems: newGems });
          message += ` | PREMIUM REWARD: ${result.premiumReward.amount} Gems!`;
        }
      }
    } else {
      message += ` | Premium: ${result.premiumRewardProgress}/50`;
    }

    res.json({ 
      success: true, 
      message,
      tracking: {
        dailyCount: result.dailyCount,
        totalCount: result.totalCount,
        premiumProgress: result.premiumRewardProgress,
        premiumRewardEarned: result.premiumRewardEarned,
        premiumReward: result.premiumReward
      }
    });
  } catch (error) {
    console.error('Error processing manual ad watch:', error);
    next(error);
  }
});

export default router;
