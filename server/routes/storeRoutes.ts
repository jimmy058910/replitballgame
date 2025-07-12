import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from "../storage/index";
import { teamFinancesStorage } from "../storage/teamFinancesStorage";
import { adSystemStorage } from "../storage/adSystemStorage";
import { consumableStorage } from "../storage/consumableStorage";
import { prisma } from "../db";
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

    // Filter items for credit store (items that can be bought with credits, excluding entries)
    const creditItems = [...allEquipment, ...allConsumables].filter(item => item.price > 0);
    
    // Filter items for gem store (items that can ONLY be bought with gems - no credit price)
    const gemOnlyItems = [...allEquipment, ...allConsumables, ...allEntries].filter(item => 
      item.priceGems > 0 && (!item.price || item.price === 0)
    );

    const shuffledCreditItems = [...creditItems].sort(() => 0.5 - seededRandom());
    const shuffledGemItems = [...gemOnlyItems].sort(() => 0.5 - seededRandom());

    // Credit Store: 6 items with rarity distribution (4 common/uncommon, 2 rare/epic)
    const commonCreditItems = shuffledCreditItems.filter(item => item.rarity === 'common' || item.rarity === 'uncommon');
    const rareCreditItems = shuffledCreditItems.filter(item => item.rarity === 'rare' || item.rarity === 'epic');
    
    const dailyEquipment = [
      ...commonCreditItems.slice(0, 4),
      ...rareCreditItems.slice(0, 2)
    ].slice(0, 6);
    
    // Gem Store: 4 gem-only items
    const dailyConsumables = shuffledGemItems.slice(0, 4);

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

    // Filter items for gem store (items that can ONLY be bought with gems - no credit price)
    const gemOnlyItems = [...allEquipment, ...allConsumables, ...allEntries].filter(item => 
      item.priceGems > 0 && (!item.price || item.price === 0)
    );

    const shuffledGemItems = [...gemOnlyItems].sort(() => 0.5 - seededRandom());

    // Select a subset for daily rotation, ensure not to select more than available
    const dailyGemCount = Math.min(4, shuffledGemItems.length); // Gem Store: 4 gem-only items

    const dailyGemItems = shuffledGemItems.slice(0, dailyGemCount);
    // const creditPackagesForGems = [ /* ... these are for REAL money purchases, handled by /payments endpoint ... */ ];

    const resetTime = new Date(rotationDate);
    resetTime.setUTCDate(rotationDate.getUTCDate() + 1);
    resetTime.setUTCHours(8, 0, 0, 0); // Next 8 AM UTC

    res.json({
      equipment: [],
      consumables: dailyGemItems,
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

    const dailyWatchLimit = 10; // Updated to 10 ads per day limit

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
    const { adType, placement, unityAdsResult } = req.body; // Client might indicate context
    
    // Log Unity Ads result for debugging
    if (unityAdsResult) {
      console.log('Unity Ads Result:', unityAdsResult);
    }

    // Updated ad rewards system: 500-10,000 credits averaging 2,000
    // Check daily limit first
    const dailyLimit = 10;
    const dailyAdsWatched = Number(await storage.adSystem.getDailyAdViewsCountByUser(userId)) || 0;
    
    if (dailyAdsWatched >= dailyLimit) {
      return res.status(400).json({ 
        success: false, 
        message: "Daily ad limit reached. You can watch up to 10 ads per day." 
      });
    }
    
    // Halftime ads don't give rewards but count towards daily limit
    let rewardAmount = 0;
    let rewardType = 'credits';
    
    if (placement !== 'halftimeVideo') {
      // Generate random credits between 500-10,000 with weighted distribution to average ~2,000
      const random = Math.random();
      
      if (random < 0.4) {
        // 40% chance: 500-1,500 credits
        rewardAmount = Math.floor(500 + Math.random() * 1000);
      } else if (random < 0.8) {
        // 40% chance: 1,500-3,000 credits
        rewardAmount = Math.floor(1500 + Math.random() * 1500);
      } else if (random < 0.95) {
        // 15% chance: 3,000-7,000 credits
        rewardAmount = Math.floor(3000 + Math.random() * 4000);
      } else {
        // 5% chance: 7,000-10,000 credits
        rewardAmount = Math.floor(7000 + Math.random() * 3000);
      }
    }

    const finances = await teamFinancesStorage.getTeamFinances(team.id);
    if (!finances) return res.status(404).json({ message: "Team finances not found." });

    if (rewardType === 'credits' && rewardAmount > 0) {
        await teamFinancesStorage.updateTeamFinances(team.id, { credits: (finances.credits || 0) + rewardAmount });
    } else if (rewardType === 'premium_currency' && rewardAmount > 0) {
        await teamFinancesStorage.updateTeamFinances(team.id, { premiumCurrency: (finances.premiumCurrency || 0) + rewardAmount });
    }

    await adSystemStorage.createAdView({
        userId, adType: adType || 'rewarded_video', placement: placement || (unityAdsResult?.placementId || 'generic_watch'),
        rewardType, rewardAmount, completed: true, completedAt: new Date()
    });

    const message = placement === 'halftimeVideo' 
      ? "Halftime break complete! Continuing to second half..."
      : rewardAmount > 0 
        ? `+${rewardAmount} ${rewardType.replace('_', ' ')} earned!` 
        : "Thanks for watching!";
    
    res.json({
      success: true,
      rewardMessage: message,
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

    let itemId = req.params.itemId;
    const { currency, expectedPrice } = req.body;

    // Handle special exhibition game item IDs
    if (itemId === 'exhibition_gem' || itemId === 'exhibition_credit') {
      itemId = 'exhibition_match_entry';
    }

    // Check daily purchase limits (3 per day)
    const today = new Date().toISOString().split('T')[0];
    const dailyPurchases = await prisma.inventoryItem.count({
      where: {
        teamId: team.id,
        acquiredAt: {
          gte: new Date(today + 'T00:00:00.000Z'),
          lt: new Date(today + 'T23:59:59.999Z')
        }
      }
    });
    
    if (dailyPurchases >= 3) {
      return res.status(400).json({ message: "Daily purchase limit reached (3 items per day)." });
    }

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
    
    if (actualPrice === undefined || actualPrice === null) return res.status(400).json({ message: `Item not available for ${currency}.` });

    // Skip price validation for now to avoid conflicts
    // if (expectedPrice !== undefined && expectedPrice !== actualPrice) {
    //   return res.status(409).json({ message: "Price mismatch. Please refresh store data."});
    // }

    let message = "";
    if (currency === "credits") {
        const currentCredits = typeof finances.credits === 'string' ? parseInt(finances.credits) : (finances.credits || 0);
        if (currentCredits < actualPrice) return res.status(400).json({ message: "Insufficient credits." });
        await teamFinancesStorage.updateTeamFinances(team.id, { credits: BigInt(currentCredits - actualPrice) });
        message = `Purchased ${itemId} for ${actualPrice} credits.`;
    } else if (currency === "gems" || currency === "premium_currency") {
        const currentGems = finances.gems || finances.premiumCurrency || 0;
        console.log(`Debug: User has ${currentGems} gems, trying to purchase for ${actualPrice} gems`);
        if (currentGems < actualPrice) {
            return res.status(400).json({ 
                message: "Not enough gems or item unavailable.", 
                debug: { currentGems, actualPrice, itemId, currency } 
            });
        }
        await teamFinancesStorage.updateTeamFinances(team.id, { gems: currentGems - actualPrice });
        message = `Purchased ${itemId} for ${actualPrice} gems.`;
    } else {
        return res.status(400).json({ message: "Unsupported currency type for this item." });
    }

    // Add item to appropriate inventory system
    const storeItems = [...storeConfig.storeSections.equipment, ...storeConfig.storeSections.consumables, ...storeConfig.storeSections.entries];
    const purchasedItem = storeItems.find((item: any) => item.id === itemId);
    
    if (purchasedItem) {
      const isConsumable = purchasedItem.category === "recovery" || purchasedItem.category === "performance";
      const isEquipment = purchasedItem.category === "helmet" || purchasedItem.category === "armor" || purchasedItem.category === "footwear" || purchasedItem.category === "gloves";
      const isEntry = purchasedItem.category === "entry";
      
      if (isConsumable) {
        // Find or create the Item record first
        let item = await prisma.item.findFirst({
          where: { name: purchasedItem.name || itemId }
        });
        
        if (!item) {
          item = await prisma.item.create({
            data: {
              name: purchasedItem.name || itemId,
              description: purchasedItem.description || "Store purchased item",
              type: 'CONSUMABLE_RECOVERY',
              rarity: (purchasedItem.rarity || "common").toUpperCase() as any,
              creditPrice: purchasedItem.price ? BigInt(purchasedItem.price) : null,
              gemPrice: purchasedItem.priceGems || null,
              effectValue: purchasedItem.effectValue || purchasedItem.statBoosts || {}
            }
          });
        }
        
        // Add consumable to team inventory using the Item ID
        await prisma.inventoryItem.create({
          data: {
            teamId: team.id,
            itemId: item.id,
            quantity: 1
          }
        });
        message += " Consumable added to your inventory.";
      } else if (isEquipment) {
        // Find or create the Item record first
        let item = await prisma.item.findFirst({
          where: { name: purchasedItem.name || itemId }
        });
        
        if (!item) {
          item = await prisma.item.create({
            data: {
              name: purchasedItem.name || itemId,
              description: purchasedItem.description || "Store purchased item",
              type: 'EQUIPMENT',
              rarity: (purchasedItem.rarity || "common").toUpperCase() as any,
              creditPrice: purchasedItem.price ? BigInt(purchasedItem.price) : null,
              gemPrice: purchasedItem.priceGems || null,
              statEffects: purchasedItem.statBoosts || {}
            }
          });
        }
        
        // Add equipment to team inventory using the Item ID
        await prisma.inventoryItem.create({
          data: {
            teamId: team.id,
            itemId: item.id,
            quantity: 1
          }
        });
        message += " Equipment added to your inventory.";
      } else if (isEntry) {
        // Find or create the Item record first
        let item = await prisma.item.findFirst({
          where: { name: purchasedItem.name || itemId }
        });
        
        if (!item) {
          item = await prisma.item.create({
            data: {
              name: purchasedItem.name || itemId,
              description: purchasedItem.description || "Store purchased item",
              type: 'GAME_ENTRY',
              rarity: (purchasedItem.rarity || "common").toUpperCase() as any,
              creditPrice: purchasedItem.price ? BigInt(purchasedItem.price) : null,
              gemPrice: purchasedItem.priceGems || null,
              effectValue: {}
            }
          });
        }
        
        // Add entry to team inventory using the Item ID
        await prisma.inventoryItem.create({
          data: {
            teamId: team.id,
            itemId: item.id,
            quantity: 1
          }
        });
        message += " Entry added to your available entries.";
      }
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
