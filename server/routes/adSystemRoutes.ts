import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from "../storage"; // Adjusted path
import { isAuthenticated } from "../replitAuth"; // Adjusted path
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

    // Create ad view record
    const adView = await storage.createAdView({
      userId,
      adType: adData.adType,
      placement: adData.placement || 'unknown',
      rewardType: adData.rewardType || 'none',
      rewardAmount: adData.rewardAmount || 0,
      completed: adData.completed,
      completedAt: adData.completed ? new Date() : null,
    });

    let rewardMessage = "Ad view recorded.";
    // Award rewards if ad was completed and reward is specified
    if (adData.completed && adData.rewardType && adData.rewardType !== 'none' && adData.rewardAmount && adData.rewardAmount > 0) {
      const team = await storage.getTeamByUserId(userId);
      if (team) {
        const finances = await storage.getTeamFinances(team.id);
        if (finances) {
          let updatePerformed = false;
          if (adData.rewardType === 'credits') {
            await storage.updateTeamFinances(team.id, {
              credits: (finances.credits || 0) + adData.rewardAmount
            });
            updatePerformed = true;
          } else if (adData.rewardType === 'premium_currency') {
            await storage.updateTeamFinances(team.id, {
              premiumCurrency: (finances.premiumCurrency || 0) + adData.rewardAmount
            });
            updatePerformed = true;
          }
          // TODO: Handle 'item' rewardType - would need item ID and logic to add to inventory

          if (updatePerformed) {
            rewardMessage = `Ad completed! You earned ${adData.rewardAmount} ${adData.rewardType.replace('_', ' ')}.`;
          }
        } else {
            console.warn(`Ad reward: User ${userId} team ${team.id} has no finances record.`);
        }
      } else {
          console.warn(`Ad reward: User ${userId} has no team to apply rewards to.`);
      }
    }

    res.status(201).json({ success: true, adViewId: adView.id, message: rewardMessage });
  } catch (error) {
    console.error('Error processing ad view:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid ad view data", errors: error.errors });
    }
    next(error);
  }
});

router.get('/stats', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;

    const dailyViewsCount = await storage.getDailyAdViews(userId); // Total ads viewed today
    const allUserViews = await storage.getAdViewsByUser(userId); // All ads ever viewed by user

    // Example: Calculate remaining ad opportunities based on some limits
    const dailyRewardedLimit = 5; // Max 5 rewarded ads per day
    const rewardedAdsWatchedToday = allUserViews.filter(v =>
        v.completed && v.rewardType !== 'none' &&
        v.completedAt && new Date(v.completedAt).toDateString() === new Date().toDateString()
    ).length;

    res.json({
      dailyTotalViews: dailyViewsCount,
      totalViewsAllTime: allUserViews.length,
      totalCompletedViews: allUserViews.filter(v => v.completed).length,
      rewardedAdsWatchedToday: rewardedAdsWatchedToday,
      rewardedAdsRemainingToday: Math.max(0, dailyRewardedLimit - rewardedAdsWatchedToday),
    });
  } catch (error) {
    console.error('Error fetching ad stats:', error);
    next(error);
  }
});

export default router;
