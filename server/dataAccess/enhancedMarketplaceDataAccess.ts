/**
 * ENHANCED MARKETPLACE DATA ACCESS LAYER
 * 
 * Production-grade data access facade for all marketplace and trading operations.
 * Implements caching, query optimization, and standardized error handling.
 * 
 * This consolidates functionality from:
 * - marketplaceStorage.ts
 * - bidStorage.ts
 * - listingHistoryStorage.ts
 * - playerMarketValueStorage.ts
 */

import {
  PrismaClient,
  MarketplaceListing,
  Bid,
  ListingHistory,
  PlayerMarketValue,
  Player,
  Team,
  Prisma,
  MarketplaceStatus,
  ListingActionType
} from '../../prisma/generated/client';

import {
  getPrismaClient,
  executePrismaOperation,
  executePrismaTransaction,
  PrismaError
} from '../utils/prismaUtils';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface CachedResult<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface ListingQueryOptions {
  status?: MarketplaceStatus;
  sellerId?: number;
  buyerId?: number;
  minPrice?: bigint;
  maxPrice?: bigint;
  includePlayer?: boolean;
  includeTeams?: boolean;
  includeBids?: boolean;
}

interface CreateListingData {
  playerId: number;
  sellerTeamId: number;
  startBid: bigint;
  buyNowPrice?: bigint;
  minBuyNowPrice: bigint;
  duration?: number; // hours
  listingFee: bigint;
}

interface PlaceBidData {
  listingId: number;
  bidderTeamId: number;
  bidAmount: bigint;
  maxAutoBid?: bigint;
}

interface PaginationOptions {
  page?: number;
  limit?: number;
  cursor?: string;
  orderBy?: any;
}

interface MarketValueUpdate {
  playerId: number;
  baseValue: bigint;
  currentValue: bigint;
  peakValue?: bigint;
  marketTrend?: number;
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

class CacheManager {
  private static cache = new Map<string, CachedResult<any>>();
  private static DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private static SHORT_TTL = 30 * 1000; // 30 seconds for active listings

  static get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  static set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL
    });
  }

  static invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  static invalidateListing(listingId: number): void {
    this.invalidate(`listing-${listingId}`);
  }

  static invalidatePlayerMarket(playerId: number): void {
    this.invalidate(`player-market-${playerId}`);
  }
}

// ============================================================================
// QUERY HELPERS
// ============================================================================

class QueryHelpers {
  static getListingIncludes(options: ListingQueryOptions = {}): any {
    return {
      player: options.includePlayer && {
        include: {
          team: { select: { id: true, name: true } },
          contract: true
        }
      },
      sellerTeam: options.includeTeams && {
        select: {
          id: true,
          name: true,
          logoUrl: true
        }
      },
      currentHighBidderTeam: options.includeTeams && {
        select: {
          id: true,
          name: true,
          logoUrl: true
        }
      },
      bids: options.includeBids && {
        orderBy: { bidAmount: 'desc' as const },
        take: 5,
        include: {
          bidderTeam: {
            select: { id: true, name: true }
          }
        }
      }
    };
  }

  static getPaginationParams(options: PaginationOptions = {}) {
    const { page = 1, limit = 20, cursor, orderBy } = options;
    
    if (cursor) {
      return {
        take: limit,
        skip: 1,
        cursor: { id: parseInt(cursor) },
        orderBy: orderBy || { id: 'asc' }
      };
    }

    return {
      skip: (page - 1) * limit,
      take: limit,
      orderBy: orderBy || { id: 'asc' }
    };
  }

  static serializeBigInt(obj: any): any {
    if (!obj) return obj;
    
    const serialized = { ...obj };
    const bigIntFields = [
      'startBid', 'buyNowPrice', 'minBuyNowPrice', 'currentBid',
      'listingFee', 'bidAmount', 'maxAutoBid', 'baseValue',
      'currentValue', 'peakValue'
    ];
    
    bigIntFields.forEach(field => {
      if (serialized[field] !== undefined && serialized[field] !== null) {
        serialized[field] = serialized[field].toString();
      }
    });
    
    return serialized;
  }
}

// ============================================================================
// ENHANCED MARKETPLACE DATA ACCESS
// ============================================================================

export class EnhancedMarketplaceDataAccess {
  
  // ==========================================================================
  // LISTING OPERATIONS
  // ==========================================================================

  /**
   * Get active marketplace listings with filters
   */
  static async getActiveListings(
    options: ListingQueryOptions & PaginationOptions = {}
  ): Promise<any[]> {
    const cacheKey = `listings-active-${JSON.stringify(options)}`;
    const cached = CacheManager.get<any[]>(cacheKey);
    if (cached) return cached;

    const where: any = {
      listingStatus: options.status || 'ACTIVE',
      expiryTimestamp: { gt: new Date() }
    };

    if (options.sellerId) {
      where.sellerTeamId = options.sellerId;
    }
    if (options.minPrice || options.maxPrice) {
      where.buyNowPrice = {};
      if (options.minPrice) where.buyNowPrice.gte = options.minPrice;
      if (options.maxPrice) where.buyNowPrice.lte = options.maxPrice;
    }

    const result = await executePrismaOperation(
      async (prisma) => {
        const listings = await prisma.marketplaceListing.findMany({
          where,
          ...QueryHelpers.getPaginationParams(options),
          include: QueryHelpers.getListingIncludes(options),
          orderBy: options.orderBy || { createdAt: 'desc' }
        });

        return listings.map(QueryHelpers.serializeBigInt);
      },
      'getActiveListings'
    );

    CacheManager.set(cacheKey, result, CacheManager.SHORT_TTL);
    return result;
  }

  /**
   * Get specific listing by ID
   */
  static async getListing(
    listingId: number,
    includeDetails = true
  ): Promise<any | null> {
    const cacheKey = `listing-${listingId}-${includeDetails}`;
    const cached = CacheManager.get(cacheKey);
    if (cached) return cached;

    const result = await executePrismaOperation(
      async (prisma) => {
        const listing = await prisma.marketplaceListing.findUnique({
          where: { id: listingId },
          include: includeDetails ? {
            player: {
              include: {
                team: { select: { id: true, name: true } },
                contract: true,
                skills: { include: { skill: true } }
              }
            },
            sellerTeam: true,
            currentHighBidderTeam: true,
            bids: {
              orderBy: { bidAmount: 'desc' },
              take: 10,
              include: {
                bidderTeam: { select: { id: true, name: true } }
              }
            },
            history: {
              orderBy: { timestamp: 'desc' },
              take: 20
            }
          } : undefined
        });

        return listing ? QueryHelpers.serializeBigInt(listing) : null;
      },
      `getListing(${listingId})`
    );

    if (result) {
      const ttl = result.listingStatus === 'ACTIVE' ? CacheManager.SHORT_TTL : CacheManager.DEFAULT_TTL;
      CacheManager.set(cacheKey, result, ttl);
    }

    return result;
  }

  /**
   * Create new marketplace listing
   */
  static async createListing(data: CreateListingData): Promise<any> {
    const result = await executePrismaTransaction(async (tx) => {
      // Check if player is already listed
      const existingListing = await tx.marketplaceListing.findUnique({
        where: { playerId: data.playerId }
      });

      if (existingListing) {
        throw new PrismaError('Player is already listed on marketplace');
      }

      // Create listing
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + (data.duration || 24));

      const listing = await tx.marketplaceListing.create({
        data: {
          playerId: data.playerId,
          sellerTeamId: data.sellerTeamId,
          startBid: data.startBid,
          buyNowPrice: data.buyNowPrice,
          minBuyNowPrice: data.minBuyNowPrice,
          listingFee: data.listingFee,
          expiryTimestamp: expiryDate,
          originalExpiryTimestamp: expiryDate,
          listingStatus: 'ACTIVE',
          isActive: true
        }
      });

      // Update player market status
      await tx.player.update({
        where: { id: data.playerId },
        data: { isOnMarket: true }
      });

      // Deduct listing fee from seller
      await tx.teamFinances.update({
        where: { teamId: data.sellerTeamId },
        data: {
          credits: { decrement: data.listingFee }
        }
      });

      // Create history entry
      await tx.listingHistory.create({
        data: {
          listingId: listing.id,
          teamId: data.sellerTeamId,
          actionType: 'LISTED',
          details: `Listed for ${data.startBid} starting bid`
        }
      });

      return listing;
    });

    CacheManager.invalidate('listings-active');
    CacheManager.invalidatePlayerMarket(data.playerId);

    return QueryHelpers.serializeBigInt(result);
  }

  /**
   * Cancel listing
   */
  static async cancelListing(
    listingId: number,
    teamId: number
  ): Promise<void> {
    await executePrismaTransaction(async (tx) => {
      const listing = await tx.marketplaceListing.findUnique({
        where: { id: listingId },
        include: { bids: true }
      });

      if (!listing) {
        throw new PrismaError('Listing not found');
      }

      if (listing.sellerTeamId !== teamId) {
        throw new PrismaError('Only seller can cancel listing');
      }

      if (listing.listingStatus !== 'ACTIVE') {
        throw new PrismaError('Listing is not active');
      }

      // Refund all bids
      for (const bid of listing.bids) {
        if (!bid.isRefunded) {
          await tx.teamFinances.update({
            where: { teamId: bid.bidderTeamId },
            data: {
              credits: { increment: bid.bidAmount },
              escrowCredits: { decrement: bid.bidAmount }
            }
          });

          await tx.bid.update({
            where: { id: bid.id },
            data: { isRefunded: true }
          });
        }
      }

      // Update listing status
      await tx.marketplaceListing.update({
        where: { id: listingId },
        data: {
          listingStatus: 'CANCELLED',
          isActive: false
        }
      });

      // Update player market status
      await tx.player.update({
        where: { id: listing.playerId },
        data: { isOnMarket: false }
      });

      // Create history entry
      await tx.listingHistory.create({
        data: {
          listingId,
          teamId,
          actionType: 'CANCELLED',
          details: 'Listing cancelled by seller'
        }
      });
    });

    CacheManager.invalidateListing(listingId);
    CacheManager.invalidate('listings-active');
  }

  // ==========================================================================
  // BID OPERATIONS
  // ==========================================================================

  /**
   * Place a bid on a listing
   */
  static async placeBid(data: PlaceBidData): Promise<any> {
    const result = await executePrismaTransaction(async (tx) => {
      // Get listing with current bids
      const listing = await tx.marketplaceListing.findUnique({
        where: { id: data.listingId },
        include: {
          bids: {
            where: { bidderTeamId: data.bidderTeamId },
            orderBy: { bidAmount: 'desc' },
            take: 1
          }
        }
      });

      if (!listing || listing.listingStatus !== 'ACTIVE') {
        throw new PrismaError('Listing not available');
      }

      if (listing.sellerTeamId === data.bidderTeamId) {
        throw new PrismaError('Cannot bid on own listing');
      }

      // Check if bid is higher than current
      const minBid = listing.currentBid || listing.startBid;
      if (data.bidAmount <= minBid) {
        throw new PrismaError(`Bid must be higher than ${minBid}`);
      }

      // Check bidder has sufficient funds
      const bidderFinances = await tx.teamFinances.findUnique({
        where: { teamId: data.bidderTeamId }
      });

      if (!bidderFinances || bidderFinances.credits < data.bidAmount) {
        throw new PrismaError('Insufficient funds');
      }

      // Refund previous highest bidder if exists
      if (listing.currentHighBidderTeamId && listing.currentHighBidderTeamId !== data.bidderTeamId) {
        await tx.teamFinances.update({
          where: { teamId: listing.currentHighBidderTeamId },
          data: {
            credits: { increment: listing.currentBid! },
            escrowCredits: { decrement: listing.currentBid! }
          }
        });

        // Mark previous winning bid as not winning
        await tx.bid.updateMany({
          where: {
            listingId: data.listingId,
            bidderTeamId: listing.currentHighBidderTeamId,
            isWinningBid: true
          },
          data: { isWinningBid: false }
        });
      }

      // Refund bidder's previous bid if exists
      const previousBid = listing.bids[0];
      if (previousBid && !previousBid.isRefunded) {
        await tx.teamFinances.update({
          where: { teamId: data.bidderTeamId },
          data: {
            credits: { increment: previousBid.bidAmount },
            escrowCredits: { decrement: previousBid.bidAmount }
          }
        });

        await tx.bid.update({
          where: { id: previousBid.id },
          data: { isRefunded: true }
        });
      }

      // Place new bid in escrow
      await tx.teamFinances.update({
        where: { teamId: data.bidderTeamId },
        data: {
          credits: { decrement: data.bidAmount },
          escrowCredits: { increment: data.bidAmount }
        }
      });

      // Create bid record
      const bid = await tx.bid.create({
        data: {
          listingId: data.listingId,
          bidderTeamId: data.bidderTeamId,
          bidAmount: data.bidAmount,
          maxAutoBid: data.maxAutoBid,
          isWinningBid: true
        }
      });

      // Update listing
      await tx.marketplaceListing.update({
        where: { id: data.listingId },
        data: {
          currentBid: data.bidAmount,
          currentHighBidderTeamId: data.bidderTeamId
        }
      });

      // Anti-sniping: Extend auction if bid placed in last 2 minutes
      const timeRemaining = listing.expiryTimestamp.getTime() - Date.now();
      if (timeRemaining < 2 * 60 * 1000 && listing.auctionExtensions < 3) {
        const newExpiry = new Date(listing.expiryTimestamp);
        newExpiry.setMinutes(newExpiry.getMinutes() + 2);
        
        await tx.marketplaceListing.update({
          where: { id: data.listingId },
          data: {
            expiryTimestamp: newExpiry,
            auctionExtensions: { increment: 1 }
          }
        });
      }

      // Create history entry
      await tx.listingHistory.create({
        data: {
          listingId: data.listingId,
          teamId: data.bidderTeamId,
          actionType: 'BID_PLACED',
          details: `Bid placed: ${data.bidAmount}`,
          amount: data.bidAmount
        }
      });

      return bid;
    });

    CacheManager.invalidateListing(data.listingId);
    CacheManager.invalidate('listings-active');

    return QueryHelpers.serializeBigInt(result);
  }

  /**
   * Buy now - immediate purchase
   */
  static async buyNow(
    listingId: number,
    buyerTeamId: number
  ): Promise<void> {
    await executePrismaTransaction(async (tx) => {
      const listing = await tx.marketplaceListing.findUnique({
        where: { id: listingId },
        include: { bids: true }
      });

      if (!listing || listing.listingStatus !== 'ACTIVE') {
        throw new PrismaError('Listing not available');
      }

      if (!listing.buyNowPrice) {
        throw new PrismaError('Buy now not available for this listing');
      }

      if (listing.sellerTeamId === buyerTeamId) {
        throw new PrismaError('Cannot buy own listing');
      }

      // Check buyer has funds
      const buyerFinances = await tx.teamFinances.findUnique({
        where: { teamId: buyerTeamId }
      });

      if (!buyerFinances || buyerFinances.credits < listing.buyNowPrice) {
        throw new PrismaError('Insufficient funds');
      }

      // Refund all existing bids
      for (const bid of listing.bids) {
        if (!bid.isRefunded) {
          await tx.teamFinances.update({
            where: { teamId: bid.bidderTeamId },
            data: {
              credits: { increment: bid.bidAmount },
              escrowCredits: { decrement: bid.bidAmount }
            }
          });

          await tx.bid.update({
            where: { id: bid.id },
            data: { isRefunded: true, isWinningBid: false }
          });
        }
      }

      // Process payment
      await tx.teamFinances.update({
        where: { teamId: buyerTeamId },
        data: { credits: { decrement: listing.buyNowPrice } }
      });

      await tx.teamFinances.update({
        where: { teamId: listing.sellerTeamId },
        data: { credits: { increment: listing.buyNowPrice } }
      });

      // Transfer player
      await tx.player.update({
        where: { id: listing.playerId },
        data: {
          teamId: buyerTeamId,
          isOnMarket: false
        }
      });

      // Update listing
      await tx.marketplaceListing.update({
        where: { id: listingId },
        data: {
          listingStatus: 'SOLD',
          isActive: false,
          finalPrice: listing.buyNowPrice
        }
      });

      // Create history entries
      await tx.listingHistory.create({
        data: {
          listingId,
          teamId: buyerTeamId,
          actionType: 'BOUGHT_NOW',
          details: `Bought for ${listing.buyNowPrice}`,
          amount: listing.buyNowPrice
        }
      });
    });

    CacheManager.invalidateListing(listingId);
    CacheManager.invalidate('listings-active');
  }

  // ==========================================================================
  // MARKET VALUE OPERATIONS
  // ==========================================================================

  /**
   * Get player market value
   */
  static async getPlayerMarketValue(playerId: number): Promise<any | null> {
    const cacheKey = `market-value-${playerId}`;
    const cached = CacheManager.get(cacheKey);
    if (cached) return cached;

    const result = await executePrismaOperation(
      async (prisma) => {
        const value = await prisma.playerMarketValue.findUnique({
          where: { playerId }
        });
        return value ? QueryHelpers.serializeBigInt(value) : null;
      },
      `getPlayerMarketValue(${playerId})`
    );

    if (result) {
      CacheManager.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Update player market values
   */
  static async updateMarketValues(
    updates: MarketValueUpdate[]
  ): Promise<void> {
    await executePrismaTransaction(async (tx) => {
      for (const update of updates) {
        await tx.playerMarketValue.upsert({
          where: { playerId: update.playerId },
          create: {
            playerId: update.playerId,
            baseValue: update.baseValue,
            currentValue: update.currentValue,
            peakValue: update.peakValue || update.currentValue,
            marketTrend: update.marketTrend || 0
          },
          update: {
            baseValue: update.baseValue,
            currentValue: update.currentValue,
            peakValue: update.peakValue,
            marketTrend: update.marketTrend,
            lastUpdated: new Date()
          }
        });
      }
    });

    // Invalidate cache for updated players
    updates.forEach(update => {
      CacheManager.invalidatePlayerMarket(update.playerId);
    });
  }

  /**
   * Calculate suggested price based on market history
   */
  static async calculateSuggestedPrice(playerId: number): Promise<bigint> {
    const result = await executePrismaOperation(
      async (prisma) => {
        // Get player with stats
        const player = await prisma.player.findUnique({
          where: { id: playerId },
          include: { contract: true }
        });

        if (!player) {
          throw new PrismaError('Player not found');
        }

        // Get recent similar sales
        const recentSales = await prisma.marketplaceListing.findMany({
          where: {
            listingStatus: 'SOLD',
            player: {
              role: player.role,
              overallRating: {
                gte: player.overallRating - 5,
                lte: player.overallRating + 5
              }
            }
          },
          select: { finalPrice: true },
          orderBy: { updatedAt: 'desc' },
          take: 10
        });

        // Calculate base price
        let basePrice = BigInt(player.overallRating * 1000);
        
        // Adjust for age
        if (player.age < 25) {
          basePrice = basePrice * BigInt(120) / BigInt(100); // +20%
        } else if (player.age > 30) {
          basePrice = basePrice * BigInt(80) / BigInt(100); // -20%
        }

        // Adjust for contract
        if (player.contract) {
          basePrice += BigInt(player.contract.salary * player.contract.length);
        }

        // Adjust based on recent sales
        if (recentSales.length > 0) {
          const avgSale = recentSales.reduce((sum, s) => 
            sum + (s.finalPrice || BigInt(0)), BigInt(0)
          ) / BigInt(recentSales.length);
          
          basePrice = (basePrice + avgSale) / BigInt(2);
        }

        return basePrice;
      },
      `calculateSuggestedPrice(${playerId})`
    );

    return result;
  }

  // ==========================================================================
  // LISTING HISTORY OPERATIONS
  // ==========================================================================

  /**
   * Get listing history
   */
  static async getListingHistory(
    listingId: number,
    limit = 50
  ): Promise<ListingHistory[]> {
    const cacheKey = `history-${listingId}-${limit}`;
    const cached = CacheManager.get<ListingHistory[]>(cacheKey);
    if (cached) return cached;

    const result = await executePrismaOperation(
      async (prisma) => {
        return await prisma.listingHistory.findMany({
          where: { listingId },
          include: {
            team: { select: { id: true, name: true } }
          },
          orderBy: { timestamp: 'desc' },
          take: limit
        });
      },
      `getListingHistory(${listingId})`
    );

    CacheManager.set(cacheKey, result);
    return result;
  }

  /**
   * Get team marketplace activity
   */
  static async getTeamMarketActivity(
    teamId: number,
    options: PaginationOptions = {}
  ): Promise<any[]> {
    const cacheKey = `team-activity-${teamId}-${JSON.stringify(options)}`;
    const cached = CacheManager.get<any[]>(cacheKey);
    if (cached) return cached;

    const result = await executePrismaOperation(
      async (prisma) => {
        const history = await prisma.listingHistory.findMany({
          where: { teamId },
          include: {
            listing: {
              include: {
                player: { select: { id: true, firstName: true, lastName: true } }
              }
            }
          },
          ...QueryHelpers.getPaginationParams(options),
          orderBy: { timestamp: 'desc' }
        });

        return history.map(QueryHelpers.serializeBigInt);
      },
      `getTeamMarketActivity(${teamId})`
    );

    CacheManager.set(cacheKey, result);
    return result;
  }

  // ==========================================================================
  // AUTOMATED OPERATIONS
  // ==========================================================================

  /**
   * Process expired listings
   */
  static async processExpiredListings(): Promise<number> {
    const result = await executePrismaTransaction(async (tx) => {
      // Find expired active listings
      const expiredListings = await tx.marketplaceListing.findMany({
        where: {
          listingStatus: 'ACTIVE',
          expiryTimestamp: { lte: new Date() }
        },
        include: { bids: true }
      });

      let processed = 0;

      for (const listing of expiredListings) {
        if (listing.currentHighBidderTeamId && listing.currentBid) {
          // Complete sale to highest bidder
          await tx.teamFinances.update({
            where: { teamId: listing.currentHighBidderTeamId },
            data: { escrowCredits: { decrement: listing.currentBid } }
          });

          await tx.teamFinances.update({
            where: { teamId: listing.sellerTeamId },
            data: { credits: { increment: listing.currentBid } }
          });

          await tx.player.update({
            where: { id: listing.playerId },
            data: {
              teamId: listing.currentHighBidderTeamId,
              isOnMarket: false
            }
          });

          await tx.marketplaceListing.update({
            where: { id: listing.id },
            data: {
              listingStatus: 'SOLD',
              isActive: false,
              finalPrice: listing.currentBid
            }
          });

          // Refund non-winning bids
          for (const bid of listing.bids) {
            if (!bid.isWinningBid && !bid.isRefunded) {
              await tx.teamFinances.update({
                where: { teamId: bid.bidderTeamId },
                data: {
                  credits: { increment: bid.bidAmount },
                  escrowCredits: { decrement: bid.bidAmount }
                }
              });

              await tx.bid.update({
                where: { id: bid.id },
                data: { isRefunded: true }
              });
            }
          }
        } else {
          // No bids - expire listing
          await tx.marketplaceListing.update({
            where: { id: listing.id },
            data: {
              listingStatus: 'EXPIRED',
              isActive: false
            }
          });

          await tx.player.update({
            where: { id: listing.playerId },
            data: { isOnMarket: false }
          });
        }

        processed++;
      }

      return processed;
    });

    if (result > 0) {
      CacheManager.invalidate('listings-active');
    }

    return result;
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Clear all cached data
   */
  static clearCache(): void {
    CacheManager.invalidate();
  }

  /**
   * Clear cache for specific patterns
   */
  static clearCachePattern(pattern: string): void {
    CacheManager.invalidate(pattern);
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; keys: string[] } {
    const cache = (CacheManager as any).cache as Map<string, any>;
    return {
      size: cache.size,
      keys: Array.from(cache.keys())
    };
  }
}

// ============================================================================
// BACKWARD COMPATIBILITY EXPORTS
// ============================================================================

export const marketplaceStorage = {
  getActiveListings: EnhancedMarketplaceDataAccess.getActiveListings,
  getListing: EnhancedMarketplaceDataAccess.getListing,
  createListing: EnhancedMarketplaceDataAccess.createListing,
  cancelListing: EnhancedMarketplaceDataAccess.cancelListing,
  buyNow: EnhancedMarketplaceDataAccess.buyNow,
  processExpiredListings: EnhancedMarketplaceDataAccess.processExpiredListings
};

export const bidStorage = {
  placeBid: EnhancedMarketplaceDataAccess.placeBid
};

export const marketValueStorage = {
  getPlayerMarketValue: EnhancedMarketplaceDataAccess.getPlayerMarketValue,
  updateMarketValues: EnhancedMarketplaceDataAccess.updateMarketValues,
  calculateSuggestedPrice: EnhancedMarketplaceDataAccess.calculateSuggestedPrice
};

export const listingHistoryStorage = {
  getListingHistory: EnhancedMarketplaceDataAccess.getListingHistory,
  getTeamMarketActivity: EnhancedMarketplaceDataAccess.getTeamMarketActivity
};