import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from "../storage/index";
import { teamFinancesStorage } from "../storage/teamFinancesStorage";
import { adSystemStorage } from "../storage/adSystemStorage";
// import { itemStorage } from "../storage/itemStorage"; // For fetching actual item details
import { isAuthenticated } from "../replitAuth";
import { z } from "zod";

const router = Router();

const storePurchaseSchema = z.object({
    itemId: z.string().min(1),
    currency: z.enum(["credits", "gems", "premium_currency"]), // Allow "premium_currency" as alias for "gems"
    expectedPrice: z.number().min(0).optional(), // Optional: client sends what it expects price to be
    // quantity: z.number().min(1).optional().default(1), // For items that can be bought in bulk
});

const convertGemsSchema = z.object({
    gemsAmount: z.number().int().min(1, "Must convert at least 1 gem."),
});

// Store routes
router.get('/', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const rotationDate = new Date(now);
    if (now.getUTCHours() < 8) { // Example: Rotate at 8 AM UTC (3 AM EST if EST is UTC-5)
      rotationDate.setUTCDate(now.getUTCDate() - 1);
    }
    const dayKey = rotationDate.toISOString().split('T')[0]; // YYYY-MM-DD format for daily seed
    let seed = 0;
    for (let i = 0; i < dayKey.length; i++) {
        seed = (seed * 31 + dayKey.charCodeAt(i)) & 0xFFFFFFFF; // Simple hash for seed
    }

    const seededRandom = (s: number) => {
      let_ = (s * 9301 + 49297) % 233280; // Corrected simple LCG
      return _ / 233280;
    };

    // TODO: Fetch actual item definitions from itemStorage or a game config service
    // For now, using placeholder structure from original file
    const allPremiumItems = [ /* ... as defined before ... */ ];
    const allEquipment = [ /* ... as defined before ... */ ];

    const rng = seededRandom(seed);
    const shuffledPremium = [...allPremiumItems].sort(() => 0.5 - rng()); // Use rng()
    const shuffledEquipment = [...allEquipment].sort(() => 0.5 - rng()); // Use rng()

    const dailyPremiumItems = shuffledPremium.slice(0, 3);
    const dailyEquipment = shuffledEquipment.slice(0, 4);
    const staticStoreItems = [ /* ... */ ];
    const tournamentEntriesItems = [ /* ... */ ];
    const creditPackagesForGems = [ /* ... these are for REAL money purchases, handled by /payments endpoint ... */ ];

    const resetTime = new Date(rotationDate);
    resetTime.setUTCDate(rotationDate.getUTCDate() + 1);
    resetTime.setUTCHours(8, 0, 0, 0); // Next 8 AM UTC

    res.json({
      items: staticStoreItems, premiumItems: dailyPremiumItems, equipment: dailyEquipment,
      tournamentEntries: tournamentEntriesItems,
      // creditPackages: creditPackagesForGems, // This lists "gem for USD" packages, payments route handles actual purchase
      resetTime: resetTime.toISOString(),
      rotationInfo: { currentDayKey: dayKey, nextRotationTime: resetTime.toISOString() }
    });
  } catch (error) {
    console.error("Error fetching store items:", error);
    next(error);
  }
});

router.get('/ads', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const dailyAdsWatched = await adSystemStorage.getDailyAdViewsCountByUser(userId);
    const dailyRewardedCompleted = await adSystemStorage.getDailyCompletedRewardedAdViewsCountByUser(userId);

    // Example limits (these should be configurable)
    const dailyTotalAdsLimit = 10;
    const dailyRewardedAdsLimit = 3;

    res.json({
      adsWatchedToday: dailyAdsWatched,
      rewardedAdsCompletedToday: dailyRewardedCompleted,
      adsRemainingToday: Math.max(0, dailyTotalAdsLimit - dailyAdsWatched),
      rewardedAdsRemainingToday: Math.max(0, dailyRewardedAdsLimit - dailyRewardedCompleted),
    });
  } catch (error) {
    console.error("Error fetching ad data:", error);
    next(error);
  }
});

router.post('/watch-ad', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) return res.status(404).json({ message: "Team not found to process ad reward." });

    // Reward logic should be server-defined based on placement/adType, not client-sent.
    const { adType, placement } = req.body; // Client might indicate context
    let rewardAmount = 0;
    let rewardType = 'none';

    // Example server-defined rewards
    if (placement === 'stamina_boost') { rewardAmount = 200; rewardType = 'credits'; }
    else if (placement === 'daily_bonus') { rewardAmount = 500; rewardType = 'credits'; }
    else { rewardAmount = 100; rewardType = 'credits'; } // Default fallback

    const finances = await teamFinancesStorage.getTeamFinances(team.id);
    if (!finances) return res.status(404).json({ message: "Team finances not found." });

    if (rewardType === 'credits' && rewardAmount > 0) {
        await teamFinancesStorage.updateTeamFinances(team.id, { credits: (finances.credits || 0) + rewardAmount });
    } else if (rewardType === 'premium_currency' && rewardAmount > 0) {
        await teamFinancesStorage.updateTeamFinances(team.id, { premiumCurrency: (finances.premiumCurrency || 0) + rewardAmount });
    }

    await adSystemStorage.createAdView({
        userId, adType: adType || 'rewarded_video', placement: placement || 'generic_watch',
        rewardType, rewardAmount, completed: true, completedAt: new Date()
    });

    res.json({
      success: true,
      rewardMessage: rewardAmount > 0 ? `+${rewardAmount} ${rewardType.replace('_', ' ')} earned!` : "Thanks for watching!",
      reward: { type: rewardType, amount: rewardAmount }
    });
  } catch (error) {
    console.error("Error processing ad reward:", error);
    next(error);
  }
});

router.post('/purchase', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) return res.status(404).json({ message: "Team not found." });

    const { itemId, currency, expectedPrice } = storePurchaseSchema.parse(req.body);

    const finances = await teamFinancesStorage.getTeamFinances(team.id);
    if (!finances) return res.status(404).json({ message: "Team finances not found." });

    // TODO: Fetch actual item details from itemStorage or config service using itemId
    // const itemDetails = await itemStorage.getStoreItemDetails(itemId);
    // if (!itemDetails) return res.status(404).json({ message: "Item not found in store."});
    // const actualPrice = itemDetails.prices[currency]; // Assuming itemDetails has price for each currency
    // if (actualPrice === undefined) return res.status(400).json({ message: `Item not available for ${currency}.`});
    // if (expectedPrice !== undefined && expectedPrice !== actualPrice) return res.status(409).json({ message: "Price mismatch. Please refresh store."});

    const MOCK_ITEM_PRICES:any = { "helmet_basic": {credits: 5000}, "training_credits": {gems: 10} };
    const itemDetails = MOCK_ITEM_PRICES[itemId];
    if(!itemDetails) return res.status(404).json({message: "Mock item not found"});
    const actualPrice = itemDetails[currency === "premium_currency" ? "gems" : currency];
    if(actualPrice === undefined) return res.status(400).json({message: `Item not available for ${currency}`});


    let message = "";
    if (currency === "credits") {
        if ((finances.credits || 0) < actualPrice) return res.status(400).json({ message: "Insufficient credits." });
        await teamFinancesStorage.updateTeamFinances(team.id, { credits: (finances.credits || 0) - actualPrice });
        message = `Purchased ${itemId} for ${actualPrice} credits.`;
    } else if (currency === "gems" || currency === "premium_currency") {
         if ((finances.premiumCurrency || 0) < actualPrice) return res.status(400).json({ message: "Insufficient premium currency (gems)." });
        await teamFinancesStorage.updateTeamFinances(team.id, { premiumCurrency: (finances.premiumCurrency || 0) - actualPrice });
        message = `Purchased ${itemId} for ${actualPrice} gems.`;
    } else {
        return res.status(400).json({ message: "Unsupported currency type for this item." });
    }

    // TODO: Add item to teamInventory using itemStorage.addItemToInventory(team.id, itemId, quantity);
    res.json({ success: true, message });
  } catch (error) {
    console.error("Error purchasing item:", error);
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid purchase data.", errors: error.errors });
    next(error);
  }
});


router.post('/convert-gems', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const { gemsAmount } = convertGemsSchema.parse(req.body);

    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) return res.status(404).json({ message: "Team not found." });

    const finances = await teamFinancesStorage.getTeamFinances(team.id);
    if (!finances) return res.status(404).json({ message: "Team finances not found." });
    if ((finances.premiumCurrency || 0) < gemsAmount) return res.status(400).json({ message: "Insufficient Premium Gems." });

    const CREDITS_PER_GEM = 1000; // TODO: Move to a game config file
    const creditsToAdd = gemsAmount * CREDITS_PER_GEM;

    await teamFinancesStorage.updateTeamFinances(team.id, {
      premiumCurrency: (finances.premiumCurrency || 0) - gemsAmount,
      credits: (finances.credits || 0) + creditsToAdd
    });

    res.json({
      success: true, gemsSpent: gemsAmount, creditsGained: creditsToAdd,
      message: `Successfully converted ${gemsAmount} Premium Gems to ${creditsToAdd.toLocaleString()} Credits.`
    });
  } catch (error) {
    console.error("Error converting gems to credits:", error);
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid gems amount.", errors: error.errors });
    next(error);
  }
});

export default router;
