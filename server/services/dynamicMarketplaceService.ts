import { prisma } from '../db.js';

export class DynamicMarketplaceService {
  
  /**
   * Calculate the minimum buy-now price for a player
   * Formula: (Player's CAR * 1000) + (Player's Potential * 2000)
   */
  static calculateMinimumBuyNowPrice(player: any): number {
    // CAR = Core Athleticism Rating: Average(Speed, Power, Agility, Throwing, Catching, Kicking)
    const car = (player.speed + player.power + player.agility + player.throwing + player.catching + player.kicking) / 6;
    const potentialStars = player.overallPotentialStars || 0;
    return Math.floor((car * 1000) + (potentialStars * 2000));
  }

  /**
   * Calculate listing fee (2% of starting bid)
   */
  static calculateListingFee(startBid: number): number {
    return Math.floor(startBid * 0.02);
  }

  /**
   * Check if auction duration is valid for current season day
   * Prevents auctions from ending after Day 17 3AM reset
   */
  static isValidAuctionDuration(durationHours: number): boolean {
    // This would need to integrate with your season system
    // For now, return true - implement season validation later
    const currentTime = new Date();
    const endTime = new Date(currentTime.getTime() + (durationHours * 60 * 60 * 1000));
    
    // Basic validation - auction must end within 7 days
    const maxEndTime = new Date(currentTime.getTime() + (7 * 24 * 60 * 60 * 1000));
    return endTime <= maxEndTime;
  }

  /**
   * Get team's active listing count
   */
  static async getTeamActiveListings(teamId: string): Promise<number> {
    const result = await prisma.marketplaceListing.count({
      where: {
        sellerTeamId: parseInt(teamId),
        isActive: true
      }
    });

    return result || 0;
  }

  /**
   * Get team's player count
   */
  static async getTeamPlayerCount(teamId: string): Promise<number> {
    const result = await prisma.player.count({
      where: {
        teamId: parseInt(teamId)
      }
    });

    return result || 0;
  }

  /**
   * List a player for auction
   */
  static async listPlayer(
    teamId: number,
    playerId: number,
    startBid: number,
    durationHours: number,
    buyNowPrice?: number
  ): Promise<{
    success: boolean;
    listingId?: number;
    error?: string;
  }> {
    try {
      // Validation 1: Check if player belongs to team
      const player = await prisma.player.findFirst({
        where: {
          id: playerId,
          teamId: teamId
        }
      });

      if (!player) {
        return { success: false, error: 'Player not found or does not belong to your team' };
      }

      // Validation 1.5: Check if player is a taxi squad member (beyond main 12-player roster)
      const teamPlayers = await prisma.player.findMany({
        where: { teamId: teamId },
        orderBy: { id: 'asc' } // Consistent ordering - first 12 are main roster
      });

      // Find player's position in roster (0-indexed)
      const playerIndex = teamPlayers.findIndex(p => p.id === playerId);
      const isTaxiSquadPlayer = playerIndex >= 12; // Players at index 12+ are taxi squad

      if (isTaxiSquadPlayer) {
        return { success: false, error: 'Cannot list taxi squad players on the marketplace. Only main roster players can be listed.' };
      }

      // Validation 2: Check team has > 10 players
      const playerCount = await this.getTeamPlayerCount(teamId.toString());
      if (playerCount <= 10) {
        return { success: false, error: 'Cannot list player - must maintain at least 10 players on roster' };
      }

      // Validation 3: Check team has < 3 active listings
      const activeListings = await this.getTeamActiveListings(teamId.toString());
      if (activeListings >= 3) {
        return { success: false, error: 'Cannot list player - maximum 3 active listings allowed' };
      }

      // Validation 4: Check auction duration is valid
      if (!this.isValidAuctionDuration(durationHours)) {
        return { success: false, error: 'Invalid auction duration for current season timing' };
      }

      // Validation 5: Check buy-now price if provided
      if (buyNowPrice) {
        const minimumBuyNow = this.calculateMinimumBuyNowPrice(player);
        if (buyNowPrice < minimumBuyNow) {
          return { 
            success: false, 
            error: `Buy-now price too low. Minimum: ${minimumBuyNow} credits` 
          };
        }
      }

      // Calculate listing fee and check team can afford it
      const listingFee = this.calculateListingFee(startBid);
      const teamFinance = await prisma.teamFinances.findFirst({
        where: { teamId: teamId }
      });

      if (!teamFinance || (teamFinance.credits ?? 0) < listingFee) {
        return { success: false, error: 'Insufficient credits for listing fee' };
      }

      // Calculate expiry timestamp
      const expiryTimestamp = new Date(Date.now() + (durationHours * 60 * 60 * 1000));

      // Deduct listing fee
      await prisma.teamFinances.update({
        where: { teamId: teamId },
        data: { credits: (teamFinance.credits ?? 0) - BigInt(listingFee) }
      });

      // Create listing
      const listing = await prisma.marketplaceListing.create({
        data: {
          playerId,
          sellerTeamId: teamId,
          startBid: BigInt(startBid),
          buyNowPrice: buyNowPrice ? BigInt(buyNowPrice) : null,
          currentBid: BigInt(startBid),
          expiryTimestamp,
          listingFee: BigInt(listingFee),
        },
        select: { id: true }
      });

      return { 
        success: true, 
        listingId: listing.id 
      };

    } catch (error) {
      console.error('Error listing player:', error);
      return { success: false, error: 'Database error occurred' };
    }
  }

  /**
   * Place a bid on a listing
   */
  static async placeBid(
    teamId: number,
    listingId: number,
    bidAmount: number
  ): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    newExpiryTime?: Date;
  }> {
    try {
      // Get listing details
      const listing = await prisma.marketplaceListing.findFirst({
        where: {
          id: listingId,
          isActive: true
        }
      });

      if (!listing) {
        return { success: false, error: 'Listing not found or auction has ended' };
      }

      // Check if auction has expired
      if (new Date() > listing.expiryTimestamp) {
        return { success: false, error: 'Auction has expired' };
      }

      // Check if bid is higher than current bid
      if (bidAmount <= Number(listing.currentBid)) {
        return { success: false, error: `Bid must be higher than current bid of ${listing.currentBid}` };
      }

      // Check if bidder is not the seller
      if (teamId === listing.sellerTeamId) {
        return { success: false, error: 'Cannot bid on your own listing' };
      }

      // Check team has enough credits
      const teamFinance = await prisma.teamFinances.findFirst({
        where: { teamId }
      });

      if (!teamFinance || (teamFinance.credits ?? 0) < bidAmount) {
        return { success: false, error: 'Insufficient credits for bid' };
      }

      // Release previous bidder's escrow if exists
      if (listing.currentHighBidderTeamId) {
        await this.releaseEscrow(listing.currentHighBidderTeamId, listingId);
      }

      // Create new escrow for this bid
      await prisma.escrow.create({
        data: {
          teamId,
          listingId,
          amount: BigInt(bidAmount),
          type: 'BID',
        }
      });

      // Deduct credits from bidder (escrow)
      await prisma.teamFinances.update({
        where: { teamId: teamId },
        data: { credits: (teamFinance.credits ?? 0) - BigInt(bidAmount) }
      });

      // Anti-sniping: Check if bid is in final 5 minutes
      const timeUntilExpiry = listing.expiryTimestamp.getTime() - Date.now();
      const fiveMinutesMs = 5 * 60 * 1000;
      let newExpiryTime = listing.expiryTimestamp;

      if (timeUntilExpiry <= fiveMinutesMs) {
        // Extend auction by 5 minutes
        newExpiryTime = new Date(Date.now() + fiveMinutesMs);
        
        await prisma.marketplaceListing.update({
          where: { id: listingId },
          data: { 
            auctionExtensions: (listing.auctionExtensions || 0) + 1,
            expiryTimestamp: newExpiryTime
          }
        });
      }

      // Update listing with new bid
      await prisma.marketplaceListing.update({
        where: { id: listingId },
        data: {
          currentBid: BigInt(bidAmount),
          currentHighBidderTeamId: teamId,
        }
      });

      // Record bid
      await prisma.bid.create({
        data: {
          listingId,
          bidderTeamId: teamId,
          bidAmount: BigInt(bidAmount),
        }
      });

      return { 
        success: true, 
        message: 'Bid placed successfully',
        newExpiryTime 
      };

    } catch (error) {
      console.error('Error placing bid:', error);
      return { success: false, error: 'Database error occurred' };
    }
  }

  /**
   * Buy now - instant purchase
   */
  static async buyNow(
    teamId: number,
    listingId: number
  ): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      // Get listing details
      const listing = await prisma.marketplaceListing.findFirst({
        where: {
          id: listingId,
          isActive: true
        }
      });

      if (!listing || !listing.buyNowPrice) {
        return { success: false, error: 'Buy-now not available for this listing' };
      }

      // Check if auction has expired
      if (new Date() > listing.expiryTimestamp) {
        return { success: false, error: 'Auction has expired' };
      }

      // Check if buyer is not the seller
      if (teamId === listing.sellerTeamId) {
        return { success: false, error: 'Cannot buy your own listing' };
      }

      // Check buyer has enough credits
      const buyerFinance = await prisma.teamFinances.findFirst({
        where: { teamId }
      });

      if (!buyerFinance || (buyerFinance.credits ?? 0) < listing.buyNowPrice) {
        return { success: false, error: 'Insufficient credits for buy-now purchase' };
      }

      // Calculate market tax (5% default)
      const taxAmount = Number(listing.buyNowPrice) * 0.05;
      const sellerAmount = Number(listing.buyNowPrice) - taxAmount;

      // Process the transaction
      await this.completeAuction(listingId, teamId, Number(listing.buyNowPrice), sellerAmount, true);

      return { 
        success: true, 
        message: 'Purchase completed successfully' 
      };

    } catch (error) {
      console.error('Error with buy-now:', error);
      return { success: false, error: 'Database error occurred' };
    }
  }

  /**
   * Complete an auction (used by both buy-now and expired auction processing)
   */
  static async completeAuction(
    listingId: number,
    winnerTeamId: number,
    finalPrice: number,
    sellerAmount: number,
    isBuyNow: boolean = false
  ): Promise<void> {
    const listing = await prisma.marketplaceListing.findFirst({
      where: { id: listingId }
    });

    if (!listing) return;

    // Transfer player to winner
    await prisma.player.update({
      where: { id: listing.playerId },
      data: { teamId: winnerTeamId }
    });

    // Pay seller (minus tax)
    const sellerFinance = await prisma.teamFinances.findFirst({
      where: { teamId: listing.sellerTeamId }
    });

    if (sellerFinance) {
      await prisma.teamFinances.update({
        where: { teamId: listing.sellerTeamId },
        data: { credits: (sellerFinance.credits ?? 0) + BigInt(sellerAmount) }
      });
    }

    // If not buy-now, release escrow for winner
    if (!isBuyNow) {
      await this.releaseEscrow(winnerTeamId, listingId);
    } else {
      // For buy-now, deduct credits from buyer
      const buyerFinance = await prisma.teamFinances.findFirst({
        where: { teamId: winnerTeamId }
      });

      if (buyerFinance) {
        await prisma.teamFinances.update({
          where: { teamId: winnerTeamId },
          data: { credits: (buyerFinance.credits ?? 0) - BigInt(finalPrice) }
        });
      }
    }

    // Release any other bidders' escrow
    if (listing.currentHighBidderTeamId && listing.currentHighBidderTeamId !== winnerTeamId) {
      await this.releaseEscrow(listing.currentHighBidderTeamId, listingId);
    }

    // Mark listing as completed
    await prisma.marketplaceListing.update({
      where: { id: listingId },
      data: { 
        isActive: false,
      }
    });

    // Mark all bids as inactive
    await prisma.bid.updateMany({
      where: { listingId },
      data: { isWinningBid: false }
    });
  }

  /**
   * Release escrow for a team
   */
  static async releaseEscrow(teamId: number, listingId: number): Promise<void> {
    // Get active escrow
    const escrow = await prisma.escrow.findFirst({
      where: {
        teamId,
        listingId,
        isReleased: false
      }
    });

    if (!escrow) return;

    // Return credits to team
    const teamFinance = await prisma.teamFinances.findFirst({
      where: { teamId: teamId }
    });

    if (teamFinance) {
      await prisma.teamFinances.update({
        where: { teamId: teamId },
        data: { credits: (teamFinance.credits ?? 0) + escrow.amount }
      });
    }

    // Mark escrow as released
    await prisma.escrow.update({
      where: { id: escrow.id },
      data: { 
        isReleased: true,
      }
    });
  }

  /**
   * Process expired auctions (called by daily server process)
   */
  static async processExpiredAuctions(): Promise<{
    processedCount: number;
    completedSales: number;
    returnedListings: number;
  }> {
    const now = new Date();
    
    // Get all expired active listings
    const expiredListings = await prisma.marketplaceListing.findMany({
      where: {
        isActive: true,
        expiryTimestamp: {
          lt: now
        }
      }
    });

    let completedSales = 0;
    let returnedListings = 0;

    for (const listing of expiredListings) {
      if (listing.currentHighBidderTeamId && listing.currentBid > listing.startBid) {
        // Auction had bids - complete the sale
        const taxAmount = Math.floor(listing.currentBid * (listing.marketTax / 100));
        const sellerAmount = listing.currentBid - taxAmount;
        
        await this.completeAuction(
          listing.id,
          listing.currentHighBidderTeamId,
          listing.currentBid,
          sellerAmount,
          false
        );
        
        completedSales++;
      } else {
        // No bids or only starting bid - return player to seller
        await prisma.marketplaceListing.update({
          where: { id: listing.id },
          data: { 
            isActive: false,
            completedAt: new Date()
          }
        });
        
        returnedListings++;
      }
    }

    return {
      processedCount: expiredListings.length,
      completedSales,
      returnedListings
    };
  }

  /**
   * Get active marketplace listings with player details
   */
  static async getActiveListings(limit: number = 50, offset: number = 0): Promise<any[]> {
    const listings = await prisma.marketplaceListing.findMany({
      where: { isActive: true },
      include: {
        player: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            race: true,
            speed: true,
            power: true,
            throwing: true,
            catching: true,
            kicking: true
          }
        },
        sellerTeam: {
          select: {
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    return listings.map(listing => ({
      listingId: listing.id,
      playerId: listing.playerId,
      sellerTeamId: listing.sellerTeamId,
      startBid: listing.startBid,
      buyNowPrice: listing.buyNowPrice,
      currentBid: listing.currentBid,
      expiryTimestamp: listing.expiryTimestamp,
      auctionExtensions: listing.auctionExtensions,
      createdAt: listing.createdAt,
      playerName: `${listing.player.firstName} ${listing.player.lastName}`,
      race: listing.player.race,
      speed: listing.player.speed,
      power: listing.player.power,
      throwing: listing.player.throwing,
      catching: listing.player.catching,
      kicking: listing.player.kicking,
      sellerTeamName: listing.sellerTeam.name
    }));
  }

  /**
   * Get team's listings (both active and completed)
   */
  static async getTeamListings(teamId: string): Promise<any[]> {
    const listings = await prisma.marketplaceListing.findMany({
      where: { sellerTeamId: teamId },
      include: {
        player: {
          select: {
            firstName: true,
            lastName: true,
            race: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return listings.map(listing => ({
      listingId: listing.id,
      playerId: listing.playerId,
      startBid: listing.startBid,
      buyNowPrice: listing.buyNowPrice,
      currentBid: listing.currentBid,
      expiryTimestamp: listing.expiryTimestamp,
      isActive: listing.isActive,
      listingFee: listing.listingFee,
      createdAt: listing.createdAt,
      completedAt: listing.completedAt,
      playerName: `${listing.player.firstName} ${listing.player.lastName}`,
      race: listing.player.race
    }));
  }

  /**
   * Get listing details with bid history
   */
  static async getListingDetails(listingId: number): Promise<any> {
    const listing = await prisma.marketplaceListing.findFirst({
      where: { id: listingId },
      include: {
        player: {
          select: {
            firstName: true,
            lastName: true,
            race: true,
            speed: true,
            power: true,
            throwing: true,
            catching: true,
            kicking: true
          }
        },
        sellerTeam: {
          select: {
            name: true
          }
        }
      }
    });

    if (!listing) return null;

    // Get bid history
    const bidHistory = await prisma.marketplaceBid.findMany({
      where: { listingId },
      include: {
        bidderTeam: {
          select: {
            name: true
          }
        }
      },
      orderBy: { placedAt: 'desc' }
    });

    return {
      listingId: listing.id,
      playerId: listing.playerId,
      sellerTeamId: listing.sellerTeamId,
      startBid: listing.startBid,
      buyNowPrice: listing.buyNowPrice,
      currentBid: listing.currentBid,
      currentHighBidderTeamId: listing.currentHighBidderTeamId,
      expiryTimestamp: listing.expiryTimestamp,
      isActive: listing.isActive,
      auctionExtensions: listing.auctionExtensions,
      createdAt: listing.createdAt,
      playerName: `${listing.player.firstName} ${listing.player.lastName}`,
      race: listing.player.race,
      speed: listing.player.speed,
      power: listing.player.power,
      throwing: listing.player.throwing,
      catching: listing.player.catching,
      kicking: listing.player.kicking,
      sellerTeamName: listing.sellerTeam.name,
      bidHistory: bidHistory.map(bid => ({
        bidAmount: bid.bidAmount,
        bidTimestamp: bid.placedAt,
        bidderTeamName: bid.bidderTeam.name
      }))
    };
  }

  /**
   * Get general marketplace statistics
   */
  static async getMarketplaceStats(): Promise<any> {
    try {
      // Get total active listings
      const totalActiveListings = await prisma.marketplaceListing.count({
        where: { isActive: true }
      });

      // Get total bids placed
      const totalBidsPlaced = await prisma.bid.count();

      // Get average and highest current bid
      const bidStats = await prisma.marketplaceListing.aggregate({
        where: { isActive: true },
        _avg: {
          currentBid: true
        },
        _max: {
          currentBid: true
        }
      });

      return {
        totalActiveListings: totalActiveListings || 0,
        totalBidsPlaced: totalBidsPlaced || 0,
        averageCurrentBid: Math.round(bidStats._avg.currentBid || 0),
        highestBid: bidStats._max.currentBid || 0,
        myActiveListings: 0, // This would be calculated per user in the route
        myActiveBids: 0 // This would be calculated per user in the route
      };
    } catch (error) {
      console.error('Error getting marketplace stats:', error);
      return {
        totalActiveListings: 0,
        totalBidsPlaced: 0,
        averageCurrentBid: 0,
        highestBid: 0,
        myActiveListings: 0,
        myActiveBids: 0
      };
    }
  }

  /**
   * Get user's bid history
   */
  static async getUserBids(teamId: string): Promise<any[]> {
    try {
      const bids = await prisma.bid.findMany({
        where: { bidderTeamId: teamId },
        include: {
          listing: {
            include: {
              player: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        },
        orderBy: { placedAt: 'desc' }
      });

      return bids.map(bid => ({
        id: bid.id,
        listingId: bid.listingId,
        bidAmount: bid.bidAmount,
        bidTimestamp: bid.placedAt,
        isActive: bid.listing.isActive,
        playerName: `${bid.listing.player.firstName} ${bid.listing.player.lastName}`,
        currentBid: bid.listing.currentBid,
        expiryTimestamp: bid.listing.expiryTimestamp
      }));
    } catch (error) {
      console.error('Error getting user bids:', error);
      return [];
    }
  }
}