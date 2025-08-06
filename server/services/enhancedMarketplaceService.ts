import { prisma } from '../db.js';
import { MarketplaceStatus, ListingActionType } from '../../generated/prisma/index.js';

export class EnhancedMarketplaceService {
  
  /**
   * ROSTER VALIDATION SYSTEM
   * Ensures teams maintain minimum 12 players after selling
   */
  static async validateRosterRequirements(teamId: number, excludePlayerId?: number): Promise<{ isValid: boolean; message?: string }> {
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
   * SEASON VALIDATION SYSTEM
   * Prevents auctions from ending after Day 17 3AM reset
   */
  static async validateAuctionDuration(durationHours: number): Promise<{ isValid: boolean; message?: string }> {
    // Get current season day from database
    const currentSeason = await prisma.season.findFirst({
      orderBy: { startDate: 'desc' }
    });

    if (!currentSeason) {
      return { isValid: false, message: 'Season information not available' };
    }

    const currentTime = new Date();
    const auctionEndTime = new Date(currentTime.getTime() + (durationHours * 60 * 60 * 1000));
    
    // Calculate Day 17 3AM deadline
    const seasonStartDate = new Date(currentSeason.startDate);
    const day17Deadline = new Date(seasonStartDate);
    day17Deadline.setDate(day17Deadline.getDate() + 16); // Day 17 is 16 days after Day 1
    day17Deadline.setHours(3, 0, 0, 0); // 3 AM

    if (auctionEndTime > day17Deadline) {
      return {
        isValid: false,
        message: `Auction would end after Day 17 3AM deadline. Maximum duration: ${Math.floor((day17Deadline.getTime() - currentTime.getTime()) / (1000 * 60 * 60))} hours`
      };
    }

    return { isValid: true };
  }

  /**
   * COMPREHENSIVE LISTING CREATION
   * Creates listing with all validation and escrow handling
   */
  static async createListing(teamId: number, playerId: number, startBid: number, buyNowPrice: number, durationHours: number): Promise<any> {
    // Validate all requirements
    const rosterValidation = await this.validateRosterRequirements(teamId, playerId);
    if (!rosterValidation.isValid) {
      throw new Error(rosterValidation.message);
    }

    const listingValidation = await this.validateListingLimits(teamId);
    if (!listingValidation.isValid) {
      throw new Error(listingValidation.message);
    }

    const durationValidation = await this.validateAuctionDuration(durationHours);
    if (!durationValidation.isValid) {
      throw new Error(durationValidation.message);
    }

    // Get player data for calculations
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: { team: true }
    });

    if (!player || player.teamId !== teamId) {
      throw new Error('Player not found or not owned by team');
    }

    if (player.isOnMarket) {
      throw new Error('Player is already listed on marketplace');
    }

    // Calculate server-side minimum buy-now price
    const minBuyNowPrice = this.calculateMinimumBuyNowPrice(player);
    if (buyNowPrice < minBuyNowPrice) {
      throw new Error(`Buy-now price too low. Minimum: ₡${minBuyNowPrice.toLocaleString()}`);
    }

    // Calculate listing fee
    const listingFee = this.calculateListingFee(buyNowPrice);

    // Check team finances for listing fee
    const teamFinances = await prisma.teamFinances.findUnique({
      where: { teamId }
    });

    if (!teamFinances || teamFinances.credits < BigInt(listingFee)) {
      throw new Error(`Insufficient credits for listing fee: ₡${listingFee.toLocaleString()}`);
    }

    // Begin transaction
    return await prisma.$transaction(async (tx) => {
      // Deduct listing fee
      await tx.teamFinances.update({
        where: { teamId },
        data: {
          credits: {
            decrement: BigInt(listingFee)
          }
        }
      });

      // Create listing
      const currentTime = new Date();
      const expiryTime = new Date(currentTime.getTime() + (durationHours * 60 * 60 * 1000));

      const listing = await tx.marketplaceListing.create({
        data: {
          playerId,
          sellerTeamId: teamId,
          startBid: BigInt(startBid),
          buyNowPrice: BigInt(buyNowPrice),
          minBuyNowPrice: BigInt(minBuyNowPrice),
          expiryTimestamp: expiryTime,
          originalExpiryTimestamp: expiryTime,
          listingFee: BigInt(listingFee),
          listingStatus: MarketplaceStatus.ACTIVE
        }
      });

      // Mark player as on market
      await tx.player.update({
        where: { id: playerId },
        data: { isOnMarket: true }
      });

      // Create history entry
      await tx.listingHistory.create({
        data: {
          listingId: listing.id,
          actionType: ListingActionType.LISTING_CREATED,
          teamId,
          amount: BigInt(startBid),
          description: `Listing created with starting bid ₡${startBid.toLocaleString()}`
        }
      });

      return listing;
    });
  }

  /**
   * ANTI-SNIPING BID SYSTEM
   * 5-minute extensions with maximum cap
   */
  static async placeBid(teamId: number, listingId: number, bidAmount: number): Promise<any> {
    const listing = await prisma.marketplaceListing.findUnique({
      where: { id: listingId },
      include: { 
        player: true,
        sellerTeam: true,
        currentHighBidderTeam: true
      }
    });

    if (!listing || !listing.isActive || listing.listingStatus !== MarketplaceStatus.ACTIVE) {
      throw new Error('Listing not found or not active');
    }

    if (listing.sellerTeamId === teamId) {
      throw new Error('Cannot bid on your own listing');
    }

    // Check if auction has expired
    if (new Date() > listing.expiryTimestamp) {
      throw new Error('Auction has expired');
    }

    // Validate bid amount
    const minBidIncrement = 100;
    const requiredBid = (listing.currentBid || listing.startBid) + BigInt(minBidIncrement);
    
    if (BigInt(bidAmount) < requiredBid) {
      throw new Error(`Bid must be at least ₡${Number(requiredBid).toLocaleString()}`);
    }

    // Check team finances (available credits - escrow)
    const teamFinances = await prisma.teamFinances.findUnique({
      where: { teamId }
    });

    if (!teamFinances) {
      throw new Error('Team finances not found');
    }

    const availableCredits = teamFinances.credits - teamFinances.escrowCredits;
    if (availableCredits < BigInt(bidAmount)) {
      throw new Error(`Insufficient credits. Available: ₡${Number(availableCredits).toLocaleString()}`);
    }

    // Check anti-sniping conditions
    const currentTime = new Date();
    const timeUntilExpiry = listing.expiryTimestamp.getTime() - currentTime.getTime();
    const fiveMinutesMs = 5 * 60 * 1000;
    const maxExtensions = 6; // Maximum 6 x 5-minute extensions = 30 minutes max
    
    let newExpiryTime = listing.expiryTimestamp;
    let auctionExtended = false;

    if (timeUntilExpiry < fiveMinutesMs && listing.auctionExtensions < maxExtensions) {
      // Extend auction by 5 minutes
      newExpiryTime = new Date(currentTime.getTime() + fiveMinutesMs);
      auctionExtended = true;
    }

    // Begin transaction
    return await prisma.$transaction(async (tx) => {
      // Release previous high bidder's escrow
      if (listing.currentHighBidderTeamId && listing.escrowAmount > 0) {
        await tx.teamFinances.update({
          where: { teamId: listing.currentHighBidderTeamId },
          data: {
            escrowCredits: {
              decrement: listing.escrowAmount
            }
          }
        });

        // Mark previous bid as outbid
        await tx.bid.updateMany({
          where: {
            listingId,
            isWinningBid: true
          },
          data: {
            isWinningBid: false
          }
        });
      }

      // Hold new bidder's credits in escrow
      await tx.teamFinances.update({
        where: { teamId },
        data: {
          escrowCredits: {
            increment: BigInt(bidAmount)
          }
        }
      });

      // Create bid record
      const bid = await tx.bid.create({
        data: {
          listingId,
          bidderTeamId: teamId,
          bidAmount: BigInt(bidAmount),
          escrowAmount: BigInt(bidAmount),
          isWinningBid: true
        }
      });

      // Update listing
      const updateData: any = {
        currentBid: BigInt(bidAmount),
        currentHighBidderTeamId: teamId,
        escrowAmount: BigInt(bidAmount),
        updatedAt: currentTime
      };

      if (auctionExtended) {
        updateData.expiryTimestamp = newExpiryTime;
        updateData.auctionExtensions = listing.auctionExtensions + 1;
      }

      await tx.marketplaceListing.update({
        where: { id: listingId },
        data: updateData
      });

      // Create history entries
      await tx.listingHistory.create({
        data: {
          listingId,
          actionType: ListingActionType.BID_PLACED,
          teamId,
          amount: BigInt(bidAmount),
          oldValue: listing.currentBid,
          newValue: BigInt(bidAmount),
          description: `Bid placed for ₡${bidAmount.toLocaleString()}`
        }
      });

      if (auctionExtended) {
        await tx.listingHistory.create({
          data: {
            listingId,
            actionType: ListingActionType.AUCTION_EXTENDED,
            description: `Auction extended by 5 minutes (extension ${listing.auctionExtensions + 1}/${maxExtensions})`
          }
        });
      }

      // Create outbid history for previous bidder
      if (listing.currentHighBidderTeamId) {
        await tx.listingHistory.create({
          data: {
            listingId,
            actionType: ListingActionType.BID_OUTBID,
            teamId: listing.currentHighBidderTeamId,
            amount: listing.currentBid,
            description: `Outbid by ₡${bidAmount.toLocaleString()}`
          }
        });
      }

      return { bid, auctionExtended, newExpiryTime };
    });
  }

  /**
   * BUY NOW SYSTEM
   * Instant purchase with market tax
   */
  static async buyNow(teamId: number, listingId: number): Promise<any> {
    const listing = await prisma.marketplaceListing.findUnique({
      where: { id: listingId },
      include: { 
        player: true,
        sellerTeam: true,
        currentHighBidderTeam: true
      }
    });

    if (!listing || !listing.isActive || listing.listingStatus !== MarketplaceStatus.ACTIVE) {
      throw new Error('Listing not found or not active');
    }

    if (!listing.buyNowPrice) {
      throw new Error('Buy-now option not available for this listing');
    }

    if (listing.sellerTeamId === teamId) {
      throw new Error('Cannot buy your own listing');
    }

    // Check team finances
    const teamFinances = await prisma.teamFinances.findUnique({
      where: { teamId }
    });

    if (!teamFinances) {
      throw new Error('Team finances not found');
    }

    const availableCredits = teamFinances.credits - teamFinances.escrowCredits;
    if (availableCredits < listing.buyNowPrice) {
      throw new Error(`Insufficient credits. Required: ₡${Number(listing.buyNowPrice).toLocaleString()}`);
    }

    const salePrice = Number(listing.buyNowPrice);
    const marketTax = this.calculateMarketTax(salePrice);
    const sellerReceives = salePrice - marketTax;

    // Begin transaction
    return await prisma.$transaction(async (tx) => {
      // Release current high bidder's escrow if exists
      if (listing.currentHighBidderTeamId && listing.escrowAmount > 0) {
        await tx.teamFinances.update({
          where: { teamId: listing.currentHighBidderTeamId },
          data: {
            escrowCredits: {
              decrement: listing.escrowAmount
            }
          }
        });
      }

      // Deduct buy-now price from buyer
      await tx.teamFinances.update({
        where: { teamId },
        data: {
          credits: {
            decrement: listing.buyNowPrice
          }
        }
      });

      // Pay seller (minus market tax)
      await tx.teamFinances.update({
        where: { teamId: listing.sellerTeamId },
        data: {
          credits: {
            increment: BigInt(sellerReceives)
          }
        }
      });

      // Transfer player ownership
      await tx.player.update({
        where: { id: listing.playerId },
        data: {
          teamId,
          isOnMarket: false
        }
      });

      // Update listing as sold
      await tx.marketplaceListing.update({
        where: { id: listingId },
        data: {
          listingStatus: MarketplaceStatus.SOLD,
          isActive: false,
          currentBid: listing.buyNowPrice,
          currentHighBidderTeamId: teamId,
          updatedAt: new Date()
        }
      });

      // Create history entry
      await tx.listingHistory.create({
        data: {
          listingId,
          actionType: ListingActionType.BUY_NOW_PURCHASE,
          teamId,
          amount: listing.buyNowPrice,
          description: `Buy-now purchase for ₡${salePrice.toLocaleString()} (seller receives ₡${sellerReceives.toLocaleString()}, tax: ₡${marketTax.toLocaleString()})`
        }
      });

      return { salePrice, marketTax, sellerReceives };
    });
  }

  /**
   * OFF-SEASON BEHAVIOR SYSTEM
   * Converts auctions to buy-now only during Days 16-17
   */
  static async processOffSeasonConversion(): Promise<void> {
    const currentSeason = await prisma.season.findFirst({
      orderBy: { startDate: 'desc' }
    });

    if (!currentSeason || currentSeason.currentDay < 16) {
      return; // Not in off-season
    }

    // Convert active auction listings to buy-now only
    const activeListings = await prisma.marketplaceListing.findMany({
      where: {
        listingStatus: MarketplaceStatus.ACTIVE,
        isActive: true,
        isOffSeasonConverted: false,
        buyNowPrice: { not: null }
      }
    });

    for (const listing of activeListings) {
      await prisma.$transaction(async (tx) => {
        // Release current high bidder's escrow
        if (listing.currentHighBidderTeamId && listing.escrowAmount > 0) {
          await tx.teamFinances.update({
            where: { teamId: listing.currentHighBidderTeamId },
            data: {
              escrowCredits: {
                decrement: listing.escrowAmount
              }
            }
          });
        }

        // Convert to buy-now only
        await tx.marketplaceListing.update({
          where: { id: listing.id },
          data: {
            listingStatus: MarketplaceStatus.BUY_NOW_ONLY,
            isOffSeasonConverted: true,
            currentHighBidderTeamId: null,
            currentBid: null,
            escrowAmount: BigInt(0),
            autoDelistAt: new Date(currentSeason.endDate) // Auto-delist at season end
          }
        });

        // Create history entry
        await tx.listingHistory.create({
          data: {
            listingId: listing.id,
            actionType: ListingActionType.OFF_SEASON_CONVERTED,
            description: 'Converted to buy-now only for off-season'
          }
        });
      });
    }
  }

  /**
   * AUTO-DELIST EXPIRED LISTINGS
   * Remove unsold players from market at season end
   */
  static async processAutoDelisting(): Promise<void> {
    const currentTime = new Date();
    
    const expiredListings = await prisma.marketplaceListing.findMany({
      where: {
        autoDelistAt: { lte: currentTime },
        isActive: true
      }
    });

    for (const listing of expiredListings) {
      await prisma.$transaction(async (tx) => {
        // Update listing as expired
        await tx.marketplaceListing.update({
          where: { id: listing.id },
          data: {
            listingStatus: MarketplaceStatus.EXPIRED,
            isActive: false
          }
        });

        // Remove player from market
        await tx.player.update({
          where: { id: listing.playerId },
          data: { isOnMarket: false }
        });

        // Create history entry
        await tx.listingHistory.create({
          data: {
            listingId: listing.id,
            actionType: ListingActionType.AUTO_DELISTED,
            description: 'Auto-delisted at season end'
          }
        });
      });
    }
  }

  /**
   * GET MARKETPLACE LISTINGS WITH FILTERS
   * Advanced filtering and pagination
   */
  static async getListings(filters: {
    page?: number;
    limit?: number;
    role?: string;
    race?: string;
    minAge?: number;
    maxAge?: number;
    minPower?: number;
    maxPower?: number;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<any> {
    const {
      page = 1,
      limit = 20,
      role,
      race,
      minAge,
      maxAge,
      minPower,
      maxPower,
      minPrice,
      maxPrice,
      sortBy = 'expiryTimestamp',
      sortOrder = 'asc'
    } = filters;

    const where: any = {
      isActive: true,
      listingStatus: { in: [MarketplaceStatus.ACTIVE, MarketplaceStatus.BUY_NOW_ONLY] }
    };

    // Player filters
    if (role || race || minAge || maxAge || minPower || maxPower) {
      where.player = {};
      
      if (role) where.player.role = role;
      if (race) where.player.race = race;
      if (minAge) where.player.age = { ...where.player.age, gte: minAge };
      if (maxAge) where.player.age = { ...where.player.age, lte: maxAge };
    }

    // Price filters
    if (minPrice) where.currentBid = { ...where.currentBid, gte: BigInt(minPrice) };
    if (maxPrice) where.currentBid = { ...where.currentBid, lte: BigInt(maxPrice) };

    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const listings = await prisma.marketplaceListing.findMany({
      where,
      include: {
        player: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            race: true,
            age: true,
            role: true,
            speed: true,
            power: true,
            throwing: true,
            catching: true,
            kicking: true,
            agility: true,
            leadership: true,
            staminaAttribute: true,
            potentialRating: true,
            injuryStatus: true,
            camaraderieScore: true
          }
        },
        sellerTeam: {
          select: { name: true }
        },
        currentHighBidderTeam: {
          select: { name: true }
        },
        _count: {
          select: { bids: true }
        }
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit
    });

    // Calculate CAR for each player
    const enhancedListings = listings.map(listing => ({
      ...listing,
      player: {
        ...listing.player,
        carRating: (listing.player.speed + listing.player.power + listing.player.agility + 
                   listing.player.throwing + listing.player.catching + listing.player.kicking) / 6
      },
      bidCount: listing._count.bids,
      timeRemaining: Math.max(0, listing.expiryTimestamp.getTime() - Date.now())
    }));

    const totalCount = await prisma.marketplaceListing.count({ where });

    return {
      listings: enhancedListings,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }

  /**
   * GET TEAM'S MARKETPLACE DASHBOARD
   * Personal listings, bids, and statistics
   */
  static async getTeamDashboard(teamId: number): Promise<any> {
    const [myListings, myBids, stats] = await Promise.all([
      // My active listings
      prisma.marketplaceListing.findMany({
        where: {
          sellerTeamId: teamId,
          isActive: true
        },
        include: {
          player: {
            select: {
              firstName: true,
              lastName: true,
              role: true,
              race: true
            }
          },
          _count: {
            select: { bids: true }
          }
        },
        orderBy: { expiryTimestamp: 'asc' }
      }),

      // My active bids
      prisma.bid.findMany({
        where: {
          bidderTeamId: teamId,
          isWinningBid: true,
          listing: {
            isActive: true
          }
        },
        include: {
          listing: {
            include: {
              player: {
                select: {
                  firstName: true,
                  lastName: true,
                  role: true,
                  race: true
                }
              }
            }
          }
        },
        orderBy: { placedAt: 'desc' }
      }),

      // Team marketplace statistics
      this.getTeamStats(teamId)
    ]);

    return {
      myListings,
      myBids,
      stats
    };
  }

  /**
   * GET TEAM MARKETPLACE STATISTICS
   */
  static async getTeamStats(teamId: number): Promise<any> {
    const [
      totalListings,
      totalBids,
      totalSales,
      totalPurchases,
      escrowAmount
    ] = await Promise.all([
      prisma.marketplaceListing.count({
        where: { sellerTeamId: teamId }
      }),
      prisma.bid.count({
        where: { bidderTeamId: teamId }
      }),
      prisma.marketplaceListing.count({
        where: {
          sellerTeamId: teamId,
          listingStatus: MarketplaceStatus.SOLD
        }
      }),
      prisma.marketplaceListing.count({
        where: {
          currentHighBidderTeamId: teamId,
          listingStatus: MarketplaceStatus.SOLD
        }
      }),
      prisma.teamFinances.findUnique({
        where: { teamId },
        select: { escrowCredits: true }
      })
    ]);

    return {
      totalListings,
      totalBids,
      totalSales,
      totalPurchases,
      escrowAmount: escrowAmount?.escrowCredits || BigInt(0)
    };
  }
}