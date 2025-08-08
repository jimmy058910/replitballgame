import { Router, type Request, type Response, type NextFunction } from "express";
import { cacheMiddleware } from "../middleware/cache";
import { storage } from "../storage/index";
import { teamFinancesStorage } from "../storage/teamFinancesStorage";
// import { adSystemStorage } from "../storage/adSystemStorage";
import { consumableStorage } from "../storage/consumableStorage";
import { prisma } from "../db";
// import { itemStorage } from "../storage/itemStorage"; // For fetching actual item details
import { isAuthenticated } from "../googleAuth";
import { z } from "zod";
import storeConfig from "../config/store_config.json" with { type: "json" };
import { EnhancedGameEconomyService } from "../services/enhancedGameEconomyService";
import { PaymentHistoryService } from "../services/paymentHistoryService";
import fs from "fs";

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

// Store routes - Master Economy v5 Combined 8-item Store System with 10-minute cache
router.get('/items', cacheMiddleware({ ttl: 600 }), isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    // Master Economy v5: Return 8-item daily rotation instead of separate stores
    const dailyRotation = EnhancedGameEconomyService.generateDailyRotationStore();
    console.log('🏪 Daily rotation generated:', dailyRotation.length, 'items');
    
    // Get today's purchase counts for each item
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    const purchaseLimits = {
      'common': 3,
      'uncommon': 3,
      'rare': 2,
      'epic': 2,
      'legendary': 1
    };
    
    // Add purchase count and limit information to each item
    const itemsWithPurchaseInfo = await Promise.all(dailyRotation.map(async (item: any) => {
      const dailyPurchases = await prisma.paymentTransaction.count({
        where: {
          userId: userId,
          itemName: item.name,
          transactionType: "purchase",
          status: "completed",
          createdAt: {
            gte: todayStart,
            lte: todayEnd
          }
        }
      });
      
      const itemRarity = item.tier?.toLowerCase() || 'common';
      const maxPurchases = (purchaseLimits as any)[itemRarity] || 1;
      
      return {
        ...item,
        purchased: dailyPurchases,
        dailyLimit: maxPurchases,
        canPurchase: dailyPurchases < maxPurchases
      };
    }));
    
    const now = new Date();
    const resetTime = new Date(now);
    resetTime.setUTCDate(now.getUTCDate() + 1);
    resetTime.setUTCHours(8, 0, 0, 0); // Next 8 AM UTC

    res.json({
      dailyItems: itemsWithPurchaseInfo,
      resetTime: resetTime.toISOString(),
      storeType: 'combined', // Master Economy v5 Combined Store
      totalItems: 8
    });
  } catch (error) {
    console.error("Error fetching store items:", error);
    next(error);
  }
});

// Master Economy v5 New Endpoints
router.get('/gem-packages', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gemPackages = storeConfig.storeSections.gemPackages || [];
    res.json({ success: true, data: gemPackages });
  } catch (error) {
    console.error('Error fetching gem packages:', error);
    next(error);
  }
});

router.get('/realm-pass', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const realmPassData = {
      ...storeConfig.realmPassSubscription,
      monthlyPrice: storeConfig.realmPassSubscription.price
    };
    res.json({ success: true, data: realmPassData });
  } catch (error) {
    console.error('Error fetching Realm Pass info:', error);
    next(error);
  }
});

router.get('/gem-exchange-rates', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: storeConfig.gemExchangeRates || [] });
  } catch (error) {
    console.error('Error fetching gem exchange rates:', error);
    next(error);
  }
});

// Store categories endpoint - returns all available item categories
router.get('/categories', cacheMiddleware({ ttl: 3600 }), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = {
      equipment: {
        helmet: { name: "Helmets", icon: "helmet", description: "Protective headgear for all races" },
        armor: { name: "Armor", icon: "shield", description: "Chest protection and body armor" },
        gloves: { name: "Gloves", icon: "hand", description: "Hand protection and grip enhancement" },
        footwear: { name: "Footwear", icon: "boot", description: "Speed and agility enhancing footwear" }
      },
      consumables: {
        recovery: { name: "Recovery Items", icon: "heart", description: "Healing and stamina restoration" },
        performance: { name: "Performance Boosters", icon: "zap", description: "Temporary stat enhancements" },
        team_boosts: { name: "Team Boosts", icon: "users", description: "Team-wide performance improvements" }
      },
      currency: {
        gems: { name: "Gem Packages", icon: "gem", description: "Premium currency for enhanced gameplay" },
        subscriptions: { name: "Realm Pass", icon: "crown", description: "Monthly subscription benefits" }
      },
      tournament_entries: {
        exhibition: { name: "Exhibition Matches", icon: "play", description: "Extra practice match opportunities" },
        tournaments: { name: "Tournament Entries", icon: "trophy", description: "Competitive tournament participation" }
      }
    };
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error("Error in /api/store/categories endpoint:", error);
    res.status(500).json({ error: "Failed to fetch store categories" });
  }
});

router.post('/exchange-gems', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { gemAmount } = req.body;
    const userId = req.user?.claims?.sub;
    
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const team = await prisma.team.findFirst({
      where: { userProfileId: userId }
    });

    if (!team) {
      return res.status(404).json({ success: false, error: 'Team not found' });
    }

    const result = await EnhancedGameEconomyService.exchangeGemsForCredits(team.id, gemAmount);
    
    if (result.success) {
      res.json({ success: true, data: { creditsReceived: result.creditsReceived } });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Error exchanging gems:', error);
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
    if (!(storage as any).adView) {
      console.error("adSystem storage not available");
      return res.json({
        adsWatchedToday: 0,
        rewardedAdsCompletedToday: 0,
        adsRemainingToday: 10,
        rewardedAdsRemainingToday: 10,
      });
    }
    
    const dailyAdsWatched = 0; // Simplified: no ad tracking for now
    const dailyRewardedCompleted = 0; // Simplified: no ad tracking for now

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

    // Updated ad rewards system per Master Economy specification
    // Check daily limit first
    const dailyLimit = 10;
    const dailyAdsWatched = 0; // Simplified: no daily limit checking for now
    
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
      // New Master Economy ad reward structure
      const random = Math.random();
      
      if (random < 0.70) {
        // 70% chance: 250 credits
        rewardAmount = 250;
      } else if (random < 0.95) {
        // 25% chance: 500 credits
        rewardAmount = 500;
      } else {
        // 5% chance: 1,000 credits
        rewardAmount = 1000;
      }
    }

    const finances = await teamFinancesStorage.getTeamFinances(team.id);
    if (!finances) return res.status(404).json({ message: "Team finances not found." });

    if (rewardType === 'credits' && rewardAmount > 0) {
        // Ensure credits are parsed as numbers to prevent string concatenation
        const currentCredits = parseInt(finances.credits?.toString() || '0', 10);
        await teamFinancesStorage.updateTeamFinances(team.id, { credits: BigInt(currentCredits + rewardAmount) });
    } else if (rewardType === 'premium_currency' && rewardAmount > 0) {
        const currentPremium = parseInt(finances.premiumCurrency?.toString() || '0', 10);
        await teamFinancesStorage.updateTeamFinances(team.id, { premiumCurrency: currentPremium + rewardAmount });
    }

    // TODO: Add AdView tracking once schema is updated
    // await adSystemStorage.createAdView({
    //     userId, 
    //     teamId: team.id,
    //     placement: placement || (unityAdsResult?.placementId || 'generic_watch'),
    //     rewardType, 
    //     rewardAmount, 
    //     completed: true, 
    //     completedAt: new Date()
    // });

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

    const finances = await teamFinancesStorage.getTeamFinances(team.id);
    if (!finances) return res.status(404).json({ message: "Team finances not found." });

    let storeItem;
    
    // Handle special exhibition tokens - always available (bypass daily rotation)
    if (itemId === 'exhibition_gem' || itemId === 'exhibition_credit') {
      const exhibitionPricing = storeConfig.itemPrices.exhibition_credit || storeConfig.itemPrices.exhibition_match_entry;
      if (!exhibitionPricing) {
        return res.status(404).json({ message: "Exhibition token pricing not configured." });
      }
      
      storeItem = {
        id: 'exhibition_credit',
        name: 'Exhibition Game Entry',
        credits: exhibitionPricing.credits || 500,
        gems: exhibitionPricing.gems || 2,
        tier: 'common',
        type: 'entry',
        statEffects: null,
        effect: null
      };
    } else {
      // Find the item in enhanced game economy service daily rotation
      const dailyItems = EnhancedGameEconomyService.generateDailyRotationStore();
      storeItem = dailyItems.find((item: any) => item.id === itemId);
      
      if (!storeItem) {
        return res.status(404).json({ message: "Item not found in today's daily rotation." });
      }
    }
    
    // Check daily purchase limits based on rarity tiers (skip for exhibition tokens)
    if (itemId !== 'exhibition_credit' && itemId !== 'exhibition_gem') {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      
      const dailyPurchases = await prisma.paymentTransaction.count({
        where: {
          userId: userId,
          itemName: storeItem.name,
          transactionType: "purchase",
          status: "completed",
          createdAt: {
            gte: todayStart,
            lte: todayEnd
          }
        }
      });
      
      // Define purchase limits by rarity
      const purchaseLimits: Record<string, number> = {
        'common': 3,
        'uncommon': 3,
        'rare': 2,
        'epic': 2,
        'legendary': 1
      };
      
      const itemRarity = storeItem.tier?.toLowerCase() || 'common';
      const maxPurchases = purchaseLimits[itemRarity] || 1;
      
      if (dailyPurchases >= maxPurchases) {
        return res.status(400).json({ 
          message: `Daily purchase limit reached for this item. (${dailyPurchases}/${maxPurchases})`,
          currentPurchases: dailyPurchases,
          maxPurchases: maxPurchases
        });
      }
    }
    
    // Get price based on currency
    let actualPrice;
    if (currency === "credits") {
      actualPrice = storeItem.credits;
    } else if (currency === "gems" || currency === "premium_currency") {
      actualPrice = storeItem.gems;
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
        message = `Purchased ${storeItem.name} for ${actualPrice} credits.`;
        
        // Record transaction using the helper method
        await PaymentHistoryService.recordItemPurchase(
          userId,
          team.id,
          storeItem.name,
          storeItem.statEffects ? "equipment" : (storeItem.type === "entry" ? "entry" : "consumable"),
          actualPrice,
          0,
          { itemId, storeType: (itemId === 'exhibition_credit' || itemId === 'exhibition_gem') ? "permanent" : "daily_rotation" }
        );
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
        message = `Purchased ${storeItem.name} for ${actualPrice} gems.`;
        
        // Record transaction using the helper method
        await PaymentHistoryService.recordItemPurchase(
          userId,
          team.id,
          storeItem.name,
          storeItem.statEffects ? "equipment" : (storeItem.type === "entry" ? "entry" : "consumable"),
          0,
          actualPrice,
          { itemId, storeType: (itemId === 'exhibition_credit' || itemId === 'exhibition_gem') ? "permanent" : "daily_rotation" }
        );
    } else {
        return res.status(400).json({ message: "Unsupported currency type for this item." });
    }

    // Add item to appropriate inventory system
    const isConsumable = !storeItem.statEffects && storeItem.effect;
    const isEquipment = storeItem.statEffects && storeItem.slot;
    const isExhibitionEntry = itemId === 'exhibition_credit' || itemId === 'exhibition_gem';
    const isEntry = (storeItem.id && storeItem.id.includes('tournament')) || storeItem.id === 'exhibition_match' || isExhibitionEntry;
    
    if (isConsumable) {
      // Find or create the Item record first
      let item = await prisma.item.findFirst({
        where: { name: storeItem.name }
      });
      
      if (!item) {
        item = await prisma.item.create({
          data: {
            name: storeItem.name,
            description: storeItem.description || "Store purchased consumable",
            type: 'CONSUMABLE_RECOVERY',
            rarity: (storeItem.tier || "common").toUpperCase() as any,
            creditPrice: storeItem.credits ? BigInt(storeItem.credits) : null,
            gemPrice: storeItem.gems || null,
            effectValue: { effect: storeItem.effect }
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
        where: { name: storeItem.name }
      });
      
      if (!item) {
        item = await prisma.item.create({
          data: {
            name: storeItem.name,
            description: storeItem.description || "Store purchased equipment",
            type: 'EQUIPMENT',
            rarity: (storeItem.tier || "common").toUpperCase() as any,
            creditPrice: storeItem.credits ? BigInt(storeItem.credits) : null,
            gemPrice: storeItem.gems || null,
            statEffects: storeItem.statEffects || {}
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
          where: { name: storeItem.name }
        });
        
        if (!item) {
          item = await prisma.item.create({
            data: {
              name: storeItem.name,
              description: isExhibitionEntry ? "Allows playing additional exhibition matches beyond the daily limit" : (storeItem.description || "Store purchased entry"),
              type: isExhibitionEntry ? 'CONSUMABLE_RECOVERY' : 'GAME_ENTRY',
              rarity: (storeItem.tier || "common").toUpperCase() as any,
              creditPrice: storeItem.credits ? BigInt(storeItem.credits) : null,
              gemPrice: storeItem.gems || null,
              effectValue: isExhibitionEntry ? { type: 'exhibition_entry' } : {}
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

// Premium Box eligibility check
router.get('/premium-box/eligibility', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) return res.status(404).json({ message: "Team not found." });
    
    const eligibility = await EnhancedGameEconomyService.checkPremiumBoxEligibility(team.id);
    res.json({ success: true, data: eligibility });
    
  } catch (error) {
    console.error("Premium Box eligibility error:", error);
    next(error);
  }
});

// Open Premium Box
router.post('/premium-box/open', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) return res.status(404).json({ message: "Team not found." });
    
    // Check eligibility first
    const eligibility = await EnhancedGameEconomyService.checkPremiumBoxEligibility(team.id);
    if (!eligibility.eligible) {
      return res.status(400).json({ 
        message: 'Not eligible for Premium Box',
        adsWatched: eligibility.adsWatched,
        adsRequired: eligibility.adsRequired
      });
    }
    
    const result = await EnhancedGameEconomyService.openPremiumBox(team.id);
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Premium Box opened successfully!',
        rewards: result.rewards
      });
    } else {
      res.status(400).json({ message: result.error });
    }
    
  } catch (error) {
    console.error("Premium Box opening error:", error);
    next(error);
  }
});

// Get Premium Box loot tables (for display purposes)
router.get('/premium-box/loot-tables', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const lootTables = EnhancedGameEconomyService.PREMIUM_BOX_LOOT;
    res.json({ success: true, data: lootTables });
  } catch (error) {
    console.error("Premium Box loot tables error:", error);
    next(error);
  }
});

export default router;
