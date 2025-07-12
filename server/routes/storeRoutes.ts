import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from "../storage/index";
import { teamFinancesStorage } from "../storage/teamFinancesStorage";
import { adSystemStorage } from "../storage/adSystemStorage";
import { consumableStorage } from "../storage/consumableStorage";
// import { itemStorage } from "../storage/itemStorage"; // For fetching actual item details
import { isAuthenticated } from "../replitAuth";
import { z } from "zod";
import storeConfig from "../config/store_config.json";

const router = Router();

// Simple seeded random function for daily rotation
function seededRandom(seed: number) {
  return function() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

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
router.get('/items', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
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

    // Create stateful seeded random function
    let randomState = seed;
    const seededRandom = () => {
      randomState = (randomState * 9301 + 49297) % 233280;
      return randomState / 233280;
    };

    // Load items from config
    const allEquipment = storeConfig.storeSections.equipment || [];
    const allConsumables = storeConfig.storeSections.consumables || [];
    const allEntries = storeConfig.storeSections.entries || [];
    const gemPackages = storeConfig.storeSections.gemPackages || [];

    const shuffledEquipment = [...allEquipment].sort(() => 0.5 - seededRandom());
    const shuffledConsumables = [...allConsumables].sort(() => 0.5 - seededRandom());

    // Select a subset for daily rotation, ensure not to select more than available
    const dailyEquipmentCount = Math.min(6, shuffledEquipment.length); // Credit Store: 6 items
    const dailyConsumablesCount = Math.min(4, shuffledConsumables.length); // Gem Store: 4 items

    const dailyEquipment = shuffledEquipment.slice(0, dailyEquipmentCount);
    const dailyConsumables = shuffledConsumables.slice(0, dailyConsumablesCount);

    const resetTime = new Date(rotationDate);
    resetTime.setUTCDate(rotationDate.getUTCDate() + 1);
    resetTime.setUTCHours(8, 0, 0, 0); // Next 8 AM UTC

    res.json({
      equipment: dailyEquipment,
      consumables: dailyConsumables,
      entries: allEntries,
      gemPackages: gemPackages,
      resetTime: resetTime.toISOString(),
      storeType: 'credit' // Credit Store: 6 items
    });
  } catch (error) {
    console.error("Error fetching store items:", error);
    next(error);
  }
});

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

    // Create stateful seeded random function
    let randomState = seed;
    const seededRandom = () => {
      randomState = (randomState * 9301 + 49297) % 233280;
      return randomState / 233280;
    };

    // Load items from config
    const allEquipment = storeConfig.storeSections.equipment || [];
    const allConsumables = storeConfig.storeSections.consumables || [];
    const allEntries = storeConfig.storeSections.entries || [];
    const gemPackages = storeConfig.storeSections.gemPackages || [];

    const shuffledEquipment = [...allEquipment].sort(() => 0.5 - seededRandom());
    const shuffledConsumables = [...allConsumables].sort(() => 0.5 - seededRandom());

    // Select a subset for daily rotation, ensure not to select more than available
    const dailyEquipmentCount = Math.min(6, shuffledEquipment.length); // Credit Store: 6 items
    const dailyConsumablesCount = Math.min(4, shuffledConsumables.length); // Gem Store: 4 items

    const dailyEquipment = shuffledEquipment.slice(0, dailyEquipmentCount);
    const dailyConsumables = shuffledConsumables.slice(0, dailyConsumablesCount);
    // const creditPackagesForGems = [ /* ... these are for REAL money purchases, handled by /payments endpoint ... */ ];

    const resetTime = new Date(rotationDate);
    resetTime.setUTCDate(rotationDate.getUTCDate() + 1);
    resetTime.setUTCHours(8, 0, 0, 0); // Next 8 AM UTC

    res.json({
      equipment: dailyEquipment,
      consumables: dailyConsumables,
      entries: allEntries,
      gemPackages: gemPackages,
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
    
    // Check if adSystem exists
    if (!storage.adSystem) {
      console.error("adSystem storage not available");
      return res.json({
        adsWatchedToday: 0,
        rewardedAdsCompletedToday: 0,
        adsRemainingToday: 10,
        rewardedAdsRemainingToday: 10,
      });
    }
    
    const dailyAdsWatched = Number(await storage.adSystem.getDailyAdViewsCountByUser(userId)) || 0;
    const dailyRewardedCompleted = Number(await storage.adSystem.getDailyCompletedRewardedAdViewsCountByUser(userId)) || 0;

    const dailyWatchLimit = storeConfig.adSystem?.dailyWatchLimit || 10;

    res.json({
      adsWatchedToday: dailyAdsWatched,
      rewardedAdsCompletedToday: dailyRewardedCompleted,
      adsRemainingToday: Math.max(0, dailyWatchLimit - dailyAdsWatched),
      rewardedAdsRemainingToday: Math.max(0, dailyWatchLimit - dailyRewardedCompleted),
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

    // Use new ad rewards system with randomization
    const adRewards = storeConfig.adSystem.adRewards;
    const random = Math.random() * 100;
    let cumulativeChance = 0;
    let rewardAmount = 250; // Default fallback
    
    for (const reward of adRewards) {
      cumulativeChance += reward.chance;
      if (random <= cumulativeChance) {
        rewardAmount = reward.credits;
        break;
      }
    }
    let rewardType = 'credits'; // Assuming credits for now, can be expanded in config

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

router.post('/purchase/:itemId', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) return res.status(404).json({ message: "Team not found." });

    const itemId = req.params.itemId;
    const { currency, expectedPrice } = req.body;

    const finances = await teamFinancesStorage.getTeamFinances(team.id);
    if (!finances) return res.status(404).json({ message: "Team finances not found." });

    // Find the item in store sections first
    const allStoreItems = [
      ...(storeConfig.storeSections.equipment || []),
      ...(storeConfig.storeSections.consumables || []),
      ...(storeConfig.storeSections.entries || [])
    ];
    
    const storeItem = allStoreItems.find((item: any) => item.id === itemId) as any;
    
    // If not found in store sections, fall back to itemPrices
    let actualPrice;
    if (storeItem) {
      // Get price from store item directly (use type assertion for flexible property access)
      const item = storeItem as any;
      if (currency === "credits") {
        actualPrice = item.price || item.credits;
      } else if (currency === "gems" || currency === "premium_currency") {
        actualPrice = item.priceGems || item.gems;
      }
    } else {
      // Fall back to itemPrices section
      const itemPriceInfo = (storeConfig.itemPrices as any)[itemId];
      if (!itemPriceInfo) return res.status(404).json({ message: "Item not found in store configuration." });
      actualPrice = itemPriceInfo[currency === "premium_currency" ? "gems" : currency];
    }
    
    if (actualPrice === undefined) return res.status(400).json({ message: `Item not available for ${currency}.` });

    if (expectedPrice !== undefined && expectedPrice !== actualPrice) {
      // Optional: could log this attempt or handle differently
      return res.status(409).json({ message: "Price mismatch. Please refresh store data."});
    }

    let message = "";
    if (currency === "credits") {
        if ((finances.credits || 0) < actualPrice) return res.status(400).json({ message: "Insufficient credits." });
        await teamFinancesStorage.updateTeamFinances(team.id, { credits: (finances.credits || 0) - actualPrice });
        message = `Purchased ${itemId} for ${actualPrice} credits.`;
    } else if (currency === "gems" || currency === "premium_currency") {
         if ((finances.gems || 0) < actualPrice) return res.status(400).json({ message: "Insufficient premium currency (gems)." });
        await teamFinancesStorage.updateTeamFinances(team.id, { gems: (finances.gems || 0) - actualPrice });
        message = `Purchased ${itemId} for ${actualPrice} gems.`;
    } else {
        return res.status(400).json({ message: "Unsupported currency type for this item." });
    }

    // Check if the item is a consumable and add to inventory
    const storeItems = [...storeConfig.storeSections.equipment, ...storeConfig.storeSections.consumables, ...storeConfig.storeSections.entries];
    const purchasedItem = storeItems.find((item: any) => item.id === itemId);
    const isConsumable = purchasedItem?.category === "recovery" || purchasedItem?.category === "performance";
    
    if (isConsumable) {
      // Add consumable to team inventory
      await consumableStorage.addConsumableToInventory(
        team.id,
        itemId,
        purchasedItem.name || itemId,
        purchasedItem.description || "Store purchased item",
        purchasedItem.rarity || "common",
        purchasedItem.statBoosts || {},
        1
      );
      message += " Consumable added to your inventory.";
    }
    
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
    if ((finances.gems || 0) < gemsAmount) return res.status(400).json({ message: "Insufficient Premium Gems." });

    const creditsPerGem = storeConfig.creditsPerGem || 1000; // Fallback if not in config
    const creditsToAdd = gemsAmount * creditsPerGem;

    await teamFinancesStorage.updateTeamFinances(team.id, {
      gems: (finances.gems || 0) - gemsAmount,
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
