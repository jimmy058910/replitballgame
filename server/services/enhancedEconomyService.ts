/**
 * Enhanced Economy Service - Phase 4C Consolidation
 * 
 * Unified economic system that consolidates all financial, marketplace, and transaction
 * functionality into a single, comprehensive service following zero technical debt principles.
 * 
 * Consolidates:
 * - enhancedGameEconomyService.ts (currency, stadium revenue, rewards, store)
 * - enhancedMarketplaceService.ts (player trading marketplace)
 * - paymentHistoryService.ts (transaction tracking)
 */

import { getPrismaClient } from '../database.js';
import { MarketplaceStatus, ListingActionType, type Prisma, type PaymentTransaction } from '../db';
import { z } from 'zod';
import logger from '../utils/logger.js';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CurrencyExchangeSchema = z.object({
  teamId: z.number().int().positive(),
  gemAmount: z.number().int().min(10, 'Minimum 10 gems required for exchange')
});

const StadiumUpgradeSchema = z.object({
  teamId: z.string().transform(val => parseInt(val, 10)),
  upgradeType: z.enum(['capacity', 'concessions', 'parking', 'vip_suites', 'merchandising', 'lighting'])
});

const MarketplaceListingSchema = z.object({
  playerId: z.number().int().positive(),
  sellerTeamId: z.number().int().positive(),
  startingPrice: z.number().int().min(100),
  buyNowPrice: z.number().int().min(1000).optional(),
  durationHours: z.number().int().min(1).max(72)
});

const TransactionSchema = z.object({
  teamId: z.number().int().positive(),
  type: z.string(),
  amount: z.number().positive(),
  description: z.string().optional()
});

// ============================================================================
// ENHANCED ECONOMY SERVICE
// ============================================================================

export class EnhancedEconomyService {
  // Cache for frequently accessed data
  private static cache = new Map<string, { data: any; timestamp: number }>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // ============================================================================
  // CURRENCY SYSTEM
  // ============================================================================

  /**
   * Starting amounts for new teams - Master Economy Specification
   */
  static readonly STARTING_CREDITS = 50000;
  static readonly STARTING_GEMS = 0;

  /**
   * Gem to Credit exchange rates with bulk discounts - Master Economy v5
   */
  static readonly GEM_EXCHANGE_RATES = [
    { gems: 10, credits: 4000, ratio: 400 },
    { gems: 50, credits: 22500, ratio: 450 },
    { gems: 300, credits: 150000, ratio: 500 },
    { gems: 1000, credits: 550000, ratio: 550 }
  ];

  /**
   * Get best exchange rate for gem amount
   */
  static getBestExchangeRate(gemAmount: number): { gems: number; credits: number; ratio: number } | null {
    const validRates = this.GEM_EXCHANGE_RATES.filter(rate => gemAmount >= rate.gems);
    if (validRates.length === 0) return null;
    
    // Return highest ratio (best value)
    return validRates[validRates.length - 1];
  }

  /**
   * Exchange gems for credits with comprehensive validation and transaction support
   */
  static async exchangeGemsForCredits(
    teamId: number, 
    gemAmount: number
  ): Promise<{ success: boolean; creditsReceived?: number; error?: string }> {
    logger.info('[EconomyService] Gem exchange requested', { teamId, gemAmount });
    
    try {
      // Validate input
      const validated = CurrencyExchangeSchema.parse({ teamId, gemAmount });
      
      const rate = this.getBestExchangeRate(validated.gemAmount);
      if (!rate) {
        return { success: false, error: 'Minimum 10 gems required for exchange' };
      }

      const prisma = await getPrismaClient();
      
      // Use transaction for atomic operation
      const result = await prisma.$transaction(async (tx) => {
        const team = await tx.team.findUnique({
          where: { id: validated.teamId }
        });
        
        if (!team) {
          throw new Error('Team not found');
        }

        const creditsReceived = Math.floor((validated.gemAmount / rate.gems) * rate.credits);

        // Update team finances
        const teamFinance = await tx.teamFinances.findUnique({
          where: { teamId: validated.teamId }
        });
        
        if (!teamFinance) {
          throw new Error('Team finances not found');
        }

        await tx.teamFinances.update({
          where: { teamId: validated.teamId },
          data: { credits: Number(teamFinance.credits || 0) + creditsReceived }
        });

        // Record transaction
        await tx.paymentTransaction.create({
          data: {
            teamId: validated.teamId,
            transactionType: 'GEM_EXCHANGE',
            creditsAmount: BigInt(creditsReceived),
            gemsAmount: validated.gemAmount,
            status: 'COMPLETED',
            description: `Exchanged ${validated.gemAmount} gems for ${creditsReceived} credits`
          }
        });

        return { creditsReceived };
      });

      logger.info('[EconomyService] Gem exchange completed', { 
        teamId: validated.teamId, 
        gemAmount: validated.gemAmount, 
        creditsReceived: result.creditsReceived 
      });

      return { success: true, creditsReceived: result.creditsReceived };
    } catch (error) {
      logger.error('[EconomyService] Gem exchange failed', { 
        teamId, 
        gemAmount, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      if (error instanceof z.ZodError) {
        return { success: false, error: error.errors[0].message };
      }
      
      return { success: false, error: error instanceof Error ? error.message : 'Database error' };
    }
  }

  // ============================================================================
  // STADIUM REVENUE SYSTEM
  // ============================================================================

  /**
   * Division modifiers for fan attendance
   */
  static readonly DIVISION_MODIFIERS = {
    1: 1.2,
    2: 1.1,
    3: 1.05,
    4: 1.0,
    5: 0.95,
    6: 0.9,
    7: 0.85,
    8: 0.8
  };

  /**
   * Calculate game attendance based on Master Economy algorithm
   */
  static calculateGameAttendance(
    baseCapacity: number,
    division: number,
    fanLoyalty: number, // 0-100%
    winStreak: number
  ): number {
    const divisionModifier = this.DIVISION_MODIFIERS[division as keyof typeof this.DIVISION_MODIFIERS] || 1.0;
    const fanLoyaltyModifier = Math.min(1.25, Math.max(0.75, 0.75 + (fanLoyalty * 0.005))); // 0.75x to 1.25x
    
    let winStreakModifier = 1.0;
    if (winStreak >= 8) {
      winStreakModifier = 1.5;
    } else if (winStreak >= 5) {
      winStreakModifier = 1.25;
    } else if (winStreak >= 3) {
      winStreakModifier = 1.1;
    }
    
    const attendance = baseCapacity * divisionModifier * fanLoyaltyModifier * winStreakModifier;
    return Math.floor(Math.min(attendance, baseCapacity)); // Cannot exceed capacity
  }

  /**
   * Calculate comprehensive stadium revenue with caching
   */
  static async calculateStadiumRevenue(teamId: string, isHomeGameDay: boolean = false): Promise<{
    totalRevenue: number;
    breakdown: {
      ticketSales: number;
      concessions: number;
      parking: number;
      vipSuites: number;
      apparelSales: number;
      atmosphereBonus: number;
    };
  }> {
    const cacheKey = `stadium-revenue-${teamId}-${isHomeGameDay}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const prisma = await getPrismaClient();
    const stadium = await prisma.stadium.findFirst({
      where: { teamId: parseInt(teamId, 10) }
    });
    
    if (!stadium) {
      const emptyResult = {
        totalRevenue: 0,
        breakdown: {
          ticketSales: 0,
          concessions: 0,
          parking: 0,
          vipSuites: 0,
          apparelSales: 0,
          atmosphereBonus: 0
        }
      };
      return emptyResult;
    }

    const capacity = stadium.capacity || 10000;
    const concessionsLevel = stadium.concessionsLevel || 1;
    const parkingLevel = stadium.parkingLevel || 1;
    const vipSuitesLevel = stadium.vipSuitesLevel || 0;
    const merchandisingLevel = stadium.merchandisingLevel || 1;

    // Revenue only applies on home game days
    const multiplier = isHomeGameDay ? 1 : 0;

    // Master Economy attendance calculation with division scaling
    const team = await prisma.team.findFirst({
      where: { id: parseInt(teamId, 10) }
    });
    const division = team?.division || 4;
    const fanLoyalty = team?.fanLoyalty || 50;
    const winStreak = 0; // TODO: Calculate actual win streak
    
    const actualAttendance = this.calculateGameAttendance(capacity, division, fanLoyalty, winStreak);
    
    // Division scaling: Higher divisions have higher per-fan revenue
    let divisionMultiplier = 1.0;
    if (division <= 2) divisionMultiplier = 1.5;
    else if (division <= 5) divisionMultiplier = 1.2;
    else if (division <= 7) divisionMultiplier = 1.1;
    
    const breakdown = {
      ticketSales: Math.floor(actualAttendance * 25 * divisionMultiplier * multiplier),
      concessions: Math.floor(actualAttendance * 8 * concessionsLevel * divisionMultiplier * multiplier),
      parking: Math.floor(actualAttendance * 0.3 * 10 * parkingLevel * divisionMultiplier * multiplier),
      vipSuites: Math.floor(vipSuitesLevel * 5000 * multiplier),
      apparelSales: Math.floor(actualAttendance * 3 * merchandisingLevel * divisionMultiplier * multiplier),
      atmosphereBonus: fanLoyalty > 80 ? Math.floor(actualAttendance * 2 * multiplier) : 0
    };

    const totalRevenue = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

    const result = { totalRevenue, breakdown };
    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Apply daily stadium revenue to team finances with transaction recording
   */
  static async applyDailyStadiumRevenue(teamId: string, isHomeGameDay: boolean = false): Promise<number> {
    const prisma = await getPrismaClient();
    const revenue = await this.calculateStadiumRevenue(teamId, isHomeGameDay);
    
    if (revenue.totalRevenue > 0) {
      await prisma.$transaction(async (tx) => {
        const teamFinance = await tx.teamFinances.findUnique({
          where: { teamId: parseInt(teamId, 10) }
        });
        
        if (teamFinance) {
          await tx.teamFinances.update({
            where: { teamId: parseInt(teamId, 10) },
            data: { credits: Number(teamFinance.credits || 0) + revenue.totalRevenue }
          });

          // Record transaction
          await tx.paymentTransaction.create({
            data: {
              teamId: parseInt(teamId, 10),
              transactionType: 'STADIUM_REVENUE',
              creditsAmount: BigInt(revenue.totalRevenue),
              status: 'COMPLETED',
              description: `Stadium revenue: ${isHomeGameDay ? 'Home game' : 'Daily'}`
            }
          });
        }
      });
    }

    return revenue.totalRevenue;
  }

  // ============================================================================
  // STADIUM UPGRADE SYSTEM
  // ============================================================================

  /**
   * Calculate cost for stadium upgrade
   */
  static calculateUpgradeCost(upgradeType: string, currentLevel: number, currentCapacity?: number): number {
    switch (upgradeType) {
      case 'capacity':
        return 15000; // ₡15k for +5k seats
      case 'concessions':
        return Math.floor(52500 * Math.pow(1.5, currentLevel));
      case 'parking':
        return Math.floor(43750 * Math.pow(1.5, currentLevel));
      case 'vip_suites':
        return Math.floor(100000 * Math.pow(1.5, currentLevel));
      case 'merchandising':
        return Math.floor(35000 * Math.pow(1.5, currentLevel));
      case 'lighting':
        return Math.floor(40000 * Math.pow(1.5, currentLevel));
      default:
        return 0;
    }
  }

  /**
   * Perform stadium upgrade with comprehensive validation and transaction support
   */
  static async upgradeStadium(
    teamId: string, 
    upgradeType: string
  ): Promise<{ success: boolean; cost?: number; error?: string; newLevel?: number }> {
    logger.info('[EconomyService] Stadium upgrade requested', { teamId, upgradeType });
    
    try {
      const validated = StadiumUpgradeSchema.parse({ teamId, upgradeType });
      const prisma = await getPrismaClient();
      
      const result = await prisma.$transaction(async (tx) => {
        const stadium = await tx.stadium.findUnique({
          where: { teamId: validated.teamId }
        });
        const teamFinance = await tx.teamFinances.findUnique({
          where: { teamId: validated.teamId }
        });

        if (!stadium || !teamFinance) {
          throw new Error('Stadium or team finances not found');
        }

        let cost: number;
        let newLevel: number;
        const updateData: any = {};

        switch (validated.upgradeType) {
          case 'capacity':
            cost = this.calculateUpgradeCost('capacity', stadium.capacity ?? 10000);
            updateData.capacity = (stadium.capacity || 10000) + 5000;
            newLevel = updateData.capacity;
            break;
          case 'concessions':
            cost = this.calculateUpgradeCost('concessions', stadium.concessionsLevel || 1);
            newLevel = (stadium.concessionsLevel || 1) + 1;
            updateData.concessionsLevel = newLevel;
            break;
          case 'parking':
            cost = this.calculateUpgradeCost('parking', stadium.parkingLevel || 1);
            newLevel = (stadium.parkingLevel || 1) + 1;
            updateData.parkingLevel = newLevel;
            break;
          case 'vip_suites':
            cost = this.calculateUpgradeCost('vip_suites', stadium.vipSuitesLevel || 0);
            newLevel = (stadium.vipSuitesLevel || 0) + 1;
            updateData.vipSuitesLevel = newLevel;
            break;
          case 'merchandising':
            cost = this.calculateUpgradeCost('merchandising', stadium.merchandisingLevel || 1);
            newLevel = (stadium.merchandisingLevel || 1) + 1;
            updateData.merchandisingLevel = newLevel;
            break;
          case 'lighting':
            cost = this.calculateUpgradeCost('lighting', stadium.lightingScreensLevel || 0);
            newLevel = (stadium.lightingScreensLevel || 0) + 1;
            updateData.lightingScreensLevel = newLevel;
            break;
          default:
            throw new Error('Invalid upgrade type');
        }

        if ((teamFinance.credits || 0) < cost) {
          throw new Error('Insufficient credits for upgrade');
        }

        // Deduct cost and apply upgrade
        await tx.teamFinances.update({
          where: { teamId: validated.teamId },
          data: { credits: Number(teamFinance.credits || 0) - cost }
        });

        await tx.stadium.update({
          where: { teamId: validated.teamId },
          data: updateData
        });

        // Record transaction
        await tx.paymentTransaction.create({
          data: {
            teamId: validated.teamId,
            transactionType: 'STADIUM_UPGRADE',
            creditsAmount: BigInt(-cost),
            status: 'COMPLETED',
            description: `Stadium upgrade: ${validated.upgradeType}`
          }
        });

        // Clear cache
        this.clearCache(`stadium-revenue-${teamId}`);

        return { cost, newLevel };
      });

      logger.info('[EconomyService] Stadium upgrade completed', { 
        teamId: validated.teamId, 
        upgradeType: validated.upgradeType, 
        cost: result.cost,
        newLevel: result.newLevel
      });

      return { success: true, cost: result.cost, newLevel: result.newLevel };
    } catch (error) {
      logger.error('[EconomyService] Stadium upgrade failed', { 
        teamId, 
        upgradeType, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      return { success: false, error: error instanceof Error ? error.message : 'Database error' };
    }
  }

  // ============================================================================
  // MARKETPLACE SYSTEM (from enhancedMarketplaceService)
  // ============================================================================

  /**
   * ROSTER VALIDATION SYSTEM
   * Ensures teams maintain minimum 12 players after selling
   */
  static async validateRosterRequirements(teamId: number, excludePlayerId?: number): Promise<{ isValid: boolean; message?: string }> {
    const prisma = await getPrismaClient();
    const playerCount = await prisma.player.count({
      where: {
        teamId,
        isRetired: false,
        id: excludePlayerId ? { not: excludePlayerId } : undefined
      }
    });

    const minimumRequired = 12;
    if (playerCount < minimumRequired) {
      return {
        isValid: false,
        message: `Cannot list player - team would have ${playerCount} players (minimum ${minimumRequired} required)`
      };
    }

    return { isValid: true };
  }

  /**
   * LISTING LIMITS ENFORCEMENT  
   * Maximum 3 active listings per team
   */
  static async validateListingLimits(teamId: number): Promise<{ isValid: boolean; message?: string }> {
    const prisma = await getPrismaClient();
    const activeListings = await prisma.marketplaceListing.count({
      where: {
        sellerTeamId: teamId,
        listingStatus: MarketplaceStatus.ACTIVE,
        isActive: true
      }
    });

    const maxListings = 3;
    if (activeListings >= maxListings) {
      return {
        isValid: false,
        message: `Cannot create listing - maximum ${maxListings} active listings per team (currently ${activeListings})`
      };
    }

    return { isValid: true };
  }

  /**
   * CAR + POTENTIAL BASED PRICING
   * Server-side minimum buy-now price calculation
   */
  static calculateMinimumBuyNowPrice(player: any): number {
    // CAR = Core Athleticism Rating: Average(Speed, Power, Agility, Throwing, Catching, Kicking)
    const car = (player.speed + player.power + player.agility + player.throwing + player.catching + player.kicking) / 6;
    const potentialStars = player.potentialRating || 0;
    
    // Formula: (CAR * 1000) + (Potential * 2000)
    const minPrice = Math.floor((car * 1000) + (potentialStars * 2000));
    
    // Ensure minimum price is at least 1000 credits
    return Math.max(minPrice, 1000);
  }

  /**
   * LISTING FEE CALCULATION
   * 3% of buy-now price, non-refundable
   */
  static calculateListingFee(buyNowPrice: number): number {
    return Math.floor(buyNowPrice * 0.03);
  }

  /**
   * MARKET TAX CALCULATION
   * 5% tax on successful sales
   */
  static calculateMarketTax(salePrice: number): number {
    return Math.floor(salePrice * 0.05);
  }

  /**
   * Create marketplace listing with comprehensive validation
   */
  static async createMarketplaceListing(
    playerId: number,
    sellerTeamId: number,
    startingPrice: number,
    buyNowPrice?: number,
    durationHours: number = 24
  ): Promise<{ success: boolean; listingId?: string; error?: string }> {
    logger.info('[EconomyService] Marketplace listing requested', { 
      playerId, 
      sellerTeamId, 
      startingPrice, 
      buyNowPrice 
    });

    try {
      const validated = MarketplaceListingSchema.parse({
        playerId,
        sellerTeamId,
        startingPrice,
        buyNowPrice,
        durationHours
      });

      const prisma = await getPrismaClient();

      // Perform all validations
      const rosterCheck = await this.validateRosterRequirements(validated.sellerTeamId, validated.playerId);
      if (!rosterCheck.isValid) {
        return { success: false, error: rosterCheck.message };
      }

      const limitCheck = await this.validateListingLimits(validated.sellerTeamId);
      if (!limitCheck.isValid) {
        return { success: false, error: limitCheck.message };
      }

      const result = await prisma.$transaction(async (tx) => {
        const player = await tx.player.findUnique({
          where: { id: validated.playerId }
        });

        if (!player || player.teamId !== validated.sellerTeamId) {
          throw new Error('Player not found or not owned by team');
        }

        // Calculate fees
        const minBuyNow = this.calculateMinimumBuyNowPrice(player);
        const finalBuyNow = validated.buyNowPrice ? Math.max(validated.buyNowPrice, minBuyNow) : minBuyNow * 2;
        const listingFee = this.calculateListingFee(finalBuyNow);

        // Check team can afford listing fee
        const teamFinance = await tx.teamFinances.findUnique({
          where: { teamId: validated.sellerTeamId }
        });

        if (!teamFinance || Number(teamFinance.credits || 0) < listingFee) {
          throw new Error(`Insufficient credits for listing fee (${listingFee} credits required)`);
        }

        // Deduct listing fee
        await tx.teamFinances.update({
          where: { teamId: validated.sellerTeamId },
          data: { credits: Number(teamFinance.credits || 0) - listingFee }
        });

        // Create listing
        const listing = await tx.marketplaceListing.create({
          data: {
            playerId: validated.playerId,
            sellerTeamId: validated.sellerTeamId,
            startingPrice: validated.startingPrice,
            currentPrice: validated.startingPrice,
            buyNowPrice: finalBuyNow,
            listingStatus: MarketplaceStatus.ACTIVE,
            isActive: true,
            listedAt: new Date(),
            expiresAt: new Date(Date.now() + validated.durationHours * 60 * 60 * 1000)
          }
        });

        // Record transaction
        await tx.paymentTransaction.create({
          data: {
            teamId: validated.sellerTeamId,
            transactionType: 'MARKETPLACE_LISTING_FEE',
            creditsAmount: BigInt(-listingFee),
            status: 'COMPLETED',
            description: `Listing fee for player ${player.firstName} ${player.lastName}`
          }
        });

        return { listingId: listing.id };
      });

      logger.info('[EconomyService] Marketplace listing created', { 
        listingId: result.listingId,
        playerId: validated.playerId
      });

      return { success: true, listingId: result.listingId };
    } catch (error) {
      logger.error('[EconomyService] Marketplace listing failed', { 
        playerId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return { success: false, error: error instanceof Error ? error.message : 'Database error' };
    }
  }

  // ============================================================================
  // TRANSACTION HISTORY SYSTEM (from paymentHistoryService)
  // ============================================================================

  /**
   * Record a new payment transaction and update team balance
   */
  static async recordTransaction(transaction: Prisma.PaymentTransactionCreateInput): Promise<any> {
    const prisma = await getPrismaClient();
    
    // Create the transaction
    const newTransaction = await prisma.paymentTransaction.create({
      data: transaction
    });
    
    // Update team balance if teamId is provided
    if (transaction.teamId) {
      await this.updateTeamBalanceFromTransactionHistory(transaction.teamId);
    }
    
    // Serialize BigInt fields for JSON response
    return {
      ...newTransaction,
      creditsAmount: newTransaction.creditsAmount?.toString() || '0',
    };
  }

  /**
   * Update team balance based on transaction history
   */
  static async updateTeamBalanceFromTransactionHistory(teamId: number): Promise<{
    totalCredits: number;
    totalGems: number;
    transactionCount: number;
  }> {
    const prisma = await getPrismaClient();
    
    // Get all completed transactions for this team
    const transactions = await prisma.paymentTransaction.findMany({
      where: {
        teamId,
        status: 'COMPLETED'
      }
    });

    // Calculate totals
    let totalCredits = 0;
    let totalGems = 0;

    for (const transaction of transactions) {
      if (transaction.creditsAmount) {
        totalCredits += Number(transaction.creditsAmount);
      }
      if (transaction.gemsAmount) {
        totalGems += transaction.gemsAmount;
      }
    }

    // Update team finances
    await prisma.teamFinances.update({
      where: { teamId },
      data: { 
        credits: BigInt(Math.max(0, totalCredits))
      }
    });

    return {
      totalCredits,
      totalGems,
      transactionCount: transactions.length
    };
  }

  /**
   * Get transaction history for a team
   */
  static async getTransactionHistory(
    teamId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<PaymentTransaction[]> {
    const prisma = await getPrismaClient();
    
    const transactions = await prisma.paymentTransaction.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    return transactions;
  }

  // ============================================================================
  // REWARDS SYSTEM
  // ============================================================================

  /**
   * Division-based reward structure
   */
  static readonly DIVISION_REWARDS = {
    1: {
      champion: { credits: 1000000, gems: 500 },
      runnerUp: { credits: 400000, gems: 150 },
      regularWinner: { credits: 100000, gems: 50 },
      promotion: { credits: 0, gems: 0 }
    },
    2: {
      champion: { credits: 400000, gems: 150 },
      runnerUp: { credits: 150000, gems: 50 },
      regularWinner: { credits: 40000, gems: 20 },
      promotion: { credits: 50000, gems: 0 }
    },
    3: {
      champion: { credits: 200000, gems: 75 },
      runnerUp: { credits: 75000, gems: 25 },
      regularWinner: { credits: 20000, gems: 10 },
      promotion: { credits: 25000, gems: 0 }
    },
    4: {
      champion: { credits: 100000, gems: 40 },
      runnerUp: { credits: 40000, gems: 15 },
      regularWinner: { credits: 10000, gems: 5 },
      promotion: { credits: 15000, gems: 0 }
    },
    5: {
      champion: { credits: 60000, gems: 25 },
      runnerUp: { credits: 25000, gems: 10 },
      regularWinner: { credits: 6000, gems: 0 },
      promotion: { credits: 10000, gems: 0 }
    },
    6: {
      champion: { credits: 40000, gems: 15 },
      runnerUp: { credits: 15000, gems: 5 },
      regularWinner: { credits: 4000, gems: 0 },
      promotion: { credits: 5000, gems: 0 }
    },
    7: {
      champion: { credits: 25000, gems: 10 },
      runnerUp: { credits: 10000, gems: 0 },
      regularWinner: { credits: 2500, gems: 0 },
      promotion: { credits: 2500, gems: 0 }
    },
    8: {
      champion: { credits: 15000, gems: 5 },
      runnerUp: { credits: 5000, gems: 0 },
      regularWinner: { credits: 1500, gems: 0 },
      promotion: { credits: 1500, gems: 0 }
    }
  };

  /**
   * Award division-based rewards with transaction recording
   */
  static async awardDivisionRewards(
    teamId: string, 
    division: number, 
    rewardType: 'champion' | 'runnerUp' | 'regularWinner' | 'promotion'
  ): Promise<{ success: boolean; rewards?: { credits: number; gems: number }; error?: string }> {
    logger.info('[EconomyService] Awarding division rewards', { teamId, division, rewardType });

    try {
      const prisma = await getPrismaClient();
      const divisionRewards = (this.DIVISION_REWARDS as Record<number, any>)[division];
      if (!divisionRewards) {
        return { success: false, error: 'Invalid division' };
      }

      const rewards = divisionRewards[rewardType];
      if (!rewards) {
        return { success: false, error: 'Invalid reward type' };
      }

      await prisma.$transaction(async (tx) => {
        const teamFinance = await tx.teamFinances.findUnique({
          where: { teamId: parseInt(teamId, 10) }
        });

        if (!teamFinance) {
          throw new Error('Team finances not found');
        }

        if (rewards.credits > 0) {
          await tx.teamFinances.update({
            where: { teamId: parseInt(teamId, 10) },
            data: { credits: Number(teamFinance.credits || 0) + rewards.credits }
          });

          // Record transaction
          await tx.paymentTransaction.create({
            data: {
              teamId: parseInt(teamId, 10),
              transactionType: 'REWARD',
              creditsAmount: BigInt(rewards.credits),
              gemsAmount: rewards.gems || 0,
              status: 'COMPLETED',
              description: `Division ${division} ${rewardType} reward`
            }
          });
        }
      });

      logger.info('[EconomyService] Division rewards awarded', { 
        teamId, 
        division, 
        rewardType, 
        rewards 
      });

      return { success: true, rewards };
    } catch (error) {
      logger.error('[EconomyService] Division rewards failed', { 
        teamId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return { success: false, error: error instanceof Error ? error.message : 'Database error' };
    }
  }

  // ============================================================================
  // MAINTENANCE COSTS
  // ============================================================================

  /**
   * Calculate daily facility maintenance costs
   */
  static async calculateMaintenanceCosts(teamId: string): Promise<number> {
    const prisma = await getPrismaClient();
    const stadium = await prisma.stadium.findFirst({
      where: { teamId: parseInt(teamId, 10) }
    });
    
    if (!stadium) return 0;

    // Calculate total facility value
    const baseValue = (stadium.capacity || 10000) * 2; // Base stadium value
    const upgradeValue = 
      ((stadium.concessionsLevel || 1) * 30000) +
      ((stadium.parkingLevel || 1) * 25000) +
      ((stadium.vipSuitesLevel || 0) * 75000) +
      ((stadium.merchandisingLevel || 1) * 30000) +
      ((stadium.lightingScreensLevel || 0) * 60000);

    const totalValue = baseValue + upgradeValue;
    
    // 0.5% daily maintenance cost
    return Math.floor(totalValue * 0.005);
  }

  /**
   * Apply daily maintenance costs with transaction recording
   */
  static async applyMaintenanceCosts(teamId: string): Promise<number> {
    const prisma = await getPrismaClient();
    try {
      const maintenanceCost = await this.calculateMaintenanceCosts(teamId);
      
      if (maintenanceCost > 0) {
        await prisma.$transaction(async (tx) => {
          const teamFinance = await tx.teamFinances.findUnique({
            where: { teamId: parseInt(teamId, 10) }
          });
          
          if (teamFinance) {
            await tx.teamFinances.update({
              where: { teamId: parseInt(teamId, 10) },
              data: { credits: Math.max(0, Number(teamFinance.credits || 0) - maintenanceCost) }
            });

            // Record transaction
            await tx.paymentTransaction.create({
              data: {
                teamId: parseInt(teamId, 10),
                transactionType: 'MAINTENANCE',
                creditsAmount: BigInt(-maintenanceCost),
                status: 'COMPLETED',
                description: 'Daily stadium maintenance'
              }
            });
          }
        });
      }

      return maintenanceCost;
    } catch (error) {
      logger.error('[EconomyService] Maintenance costs failed', { 
        teamId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return 0;
    }
  }

  // ============================================================================
  // COMPREHENSIVE STATUS
  // ============================================================================

  /**
   * Get comprehensive team economy status
   */
  static async getTeamEconomyStatus(teamId: string): Promise<{
    finances: { credits: number; gems: number };
    stadiumRevenue: any;
    maintenanceCosts: number;
    stadiumValue: number;
    nextUpgradeCosts: any;
    marketplaceActivity: {
      activeListings: number;
      activeBids: number;
    };
    recentTransactions: PaymentTransaction[];
  }> {
    const prisma = await getPrismaClient();
    
    const [teamFinance, team, stadium, stadiumRevenue, maintenanceCosts, activeListings, activeBids, recentTransactions] = await Promise.all([
      prisma.teamFinances.findFirst({ where: { teamId: parseInt(teamId, 10) } }),
      prisma.team.findFirst({ where: { id: parseInt(teamId, 10) } }),
      prisma.stadium.findFirst({ where: { teamId: parseInt(teamId, 10) } }),
      this.calculateStadiumRevenue(teamId, true),
      this.calculateMaintenanceCosts(teamId),
      prisma.marketplaceListing.count({
        where: {
          sellerTeamId: parseInt(teamId, 10),
          listingStatus: MarketplaceStatus.ACTIVE,
          isActive: true
        }
      }),
      prisma.marketplaceBid.count({
        where: {
          bidderId: parseInt(teamId, 10),
          isWinning: true
        }
      }),
      this.getTransactionHistory(parseInt(teamId, 10), 10)
    ]);

    const nextUpgradeCosts = stadium ? {
      capacity: this.calculateUpgradeCost('capacity', 0, stadium.capacity ?? 10000),
      concessions: this.calculateUpgradeCost('concessions', stadium.concessionsLevel || 1),
      parking: this.calculateUpgradeCost('parking', stadium.parkingLevel || 1),
      vipSuites: this.calculateUpgradeCost('vip_suites', stadium.vipSuitesLevel || 0),
      merchandising: this.calculateUpgradeCost('merchandising', stadium.merchandisingLevel || 1),
      lighting: this.calculateUpgradeCost('lighting', stadium.lightingScreensLevel || 0)
    } : {};

    // Calculate stadium value
    const stadiumValue = stadium ? 
      await import('../../shared/stadiumSystem.js').then(({ calculateFacilityQuality }) => {
        const facilityQuality = calculateFacilityQuality(stadium);
        return 100000 + (facilityQuality * 5000);
      }) : 0;

    return {
      finances: {
        credits: Number(teamFinance?.credits || 0),
        gems: 0 // TODO: Implement gems in TeamFinances schema
      },
      stadiumRevenue,
      maintenanceCosts,
      stadiumValue,
      nextUpgradeCosts,
      marketplaceActivity: {
        activeListings,
        activeBids
      },
      recentTransactions
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get cached data if still valid
   */
  private static getCached(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  /**
   * Set cache data
   */
  private static setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Clear cache entries matching pattern
   */
  private static clearCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

// ============================================================================
// BACKWARD COMPATIBILITY EXPORTS
// ============================================================================

// Export as EnhancedGameEconomyService for backward compatibility
export const EnhancedGameEconomyService = EnhancedEconomyService;

// Export as EnhancedMarketplaceService for backward compatibility
export const EnhancedMarketplaceService = {
  validateRosterRequirements: EnhancedEconomyService.validateRosterRequirements.bind(EnhancedEconomyService),
  validateListingLimits: EnhancedEconomyService.validateListingLimits.bind(EnhancedEconomyService),
  calculateMinimumBuyNowPrice: EnhancedEconomyService.calculateMinimumBuyNowPrice.bind(EnhancedEconomyService),
  calculateListingFee: EnhancedEconomyService.calculateListingFee.bind(EnhancedEconomyService),
  calculateMarketTax: EnhancedEconomyService.calculateMarketTax.bind(EnhancedEconomyService),
  createMarketplaceListing: EnhancedEconomyService.createMarketplaceListing.bind(EnhancedEconomyService)
};

// Export as PaymentHistoryService for backward compatibility
export const PaymentHistoryService = {
  recordTransaction: EnhancedEconomyService.recordTransaction.bind(EnhancedEconomyService),
  updateTeamBalanceFromTransactionHistory: EnhancedEconomyService.updateTeamBalanceFromTransactionHistory.bind(EnhancedEconomyService),
  fixTeamBalanceFromTransactionHistory: EnhancedEconomyService.updateTeamBalanceFromTransactionHistory.bind(EnhancedEconomyService),
  getTransactionHistory: EnhancedEconomyService.getTransactionHistory.bind(EnhancedEconomyService),
  // Add missing methods that tournamentService uses
  recordItemPurchase: async (
    userId: string,
    teamId: string | null,
    itemName: string,
    itemType: string,
    creditsSpent: number = 0,
    gemsSpent: number = 0,
    metadata?: any
  ) => {
    return EnhancedEconomyService.recordTransaction({
      userId,
      teamId: typeof teamId === 'string' ? parseInt(teamId, 10) : (teamId || 0),
      transactionType: "purchase",
      itemType,
      itemName,
      creditsAmount: BigInt(creditsSpent > 0 ? -creditsSpent : 0),
      gemsAmount: gemsSpent > 0 ? -gemsSpent : 0,
      status: "COMPLETED",
      metadata
    });
  },
  recordAdminGrant: async (
    userId: string,
    teamId: string | null,
    creditsGranted: number = 0,
    gemsGranted: number = 0,
    reason: string = "Admin Grant"
  ) => {
    return EnhancedEconomyService.recordTransaction({
      userId,
      teamId: typeof teamId === 'string' ? parseInt(teamId, 10) : (teamId || 0),
      transactionType: "admin_grant",
      itemType: creditsGranted > 0 ? "credits" : "gems",
      itemName: reason,
      creditsAmount: BigInt(creditsGranted),
      gemsAmount: gemsGranted,
      status: "COMPLETED"
    });
  },
  recordReward: async (
    userId: string,
    teamId: string | null,
    rewardType: string,
    creditsEarned: number = 0,
    gemsEarned: number = 0
  ) => {
    return EnhancedEconomyService.recordTransaction({
      userId,
      teamId: typeof teamId === 'string' ? parseInt(teamId, 10) : (teamId || 0),
      transactionType: "reward",
      itemType: creditsEarned > 0 ? "credits" : "gems",
      itemName: `${rewardType} Reward`,
      creditsAmount: BigInt(creditsEarned),
      gemsAmount: gemsEarned,
      status: "COMPLETED"
    });
  }
};

// Default export
export default EnhancedEconomyService;