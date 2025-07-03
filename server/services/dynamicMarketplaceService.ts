import { db } from '../db.js';
import { 
  marketplaceListings, 
  marketplaceBids, 
  marketplaceEscrow, 
  players, 
  teams, 
  teamFinances 
} from '../../shared/schema.js';
import { eq, and, desc, count, lt, gt, sql } from 'drizzle-orm';

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
    const result = await db
      .select({ count: count() })
      .from(marketplaceListings)
      .where(and(
        eq(marketplaceListings.sellerTeamId, teamId),
        eq(marketplaceListings.isActive, true)
      ));

    return result[0]?.count || 0;
  }

  /**
   * Get team's player count
   */
  static async getTeamPlayerCount(teamId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(players)
      .where(eq(players.teamId, teamId));

    return result[0]?.count || 0;
  }

  /**
   * List a player for auction
   */
  static async listPlayer(
    teamId: string,
    playerId: string,
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
      const [player] = await db
        .select()
        .from(players)
        .where(and(
          eq(players.id, playerId),
          eq(players.teamId, teamId)
        ));

      if (!player) {
        return { success: false, error: 'Player not found or does not belong to your team' };
      }

      // Validation 2: Check team has > 10 players
      const playerCount = await this.getTeamPlayerCount(teamId);
      if (playerCount <= 10) {
        return { success: false, error: 'Cannot list player - must maintain at least 10 players on roster' };
      }

      // Validation 3: Check team has < 3 active listings
      const activeListings = await this.getTeamActiveListings(teamId);
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
      const [teamFinance] = await db
        .select()
        .from(teamFinances)
        .where(eq(teamFinances.teamId, teamId));

      if (!teamFinance || (teamFinance.credits ?? 0) < listingFee) {
        return { success: false, error: 'Insufficient credits for listing fee' };
      }

      // Calculate expiry timestamp
      const expiryTimestamp = new Date(Date.now() + (durationHours * 60 * 60 * 1000));

      // Deduct listing fee
      await db
        .update(teamFinances)
        .set({ credits: (teamFinance.credits ?? 0) - listingFee })
        .where(eq(teamFinances.teamId, teamId));

      // Create listing
      const [listing] = await db
        .insert(marketplaceListings)
        .values({
          playerId,
          sellerTeamId: teamId,
          startBid,
          buyNowPrice,
          currentBid: startBid,
          expiryTimestamp,
          listingFee,
        })
        .returning({ id: marketplaceListings.id });

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
    teamId: string,
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
      const [listing] = await db
        .select()
        .from(marketplaceListings)
        .where(and(
          eq(marketplaceListings.id, listingId),
          eq(marketplaceListings.isActive, true)
        ));

      if (!listing) {
        return { success: false, error: 'Listing not found or auction has ended' };
      }

      // Check if auction has expired
      if (new Date() > listing.expiryTimestamp) {
        return { success: false, error: 'Auction has expired' };
      }

      // Check if bid is higher than current bid
      if (bidAmount <= listing.currentBid) {
        return { success: false, error: `Bid must be higher than current bid of ${listing.currentBid}` };
      }

      // Check if bidder is not the seller
      if (teamId === listing.sellerTeamId) {
        return { success: false, error: 'Cannot bid on your own listing' };
      }

      // Check team has enough credits
      const [teamFinance] = await db
        .select()
        .from(teamFinances)
        .where(eq(teamFinances.teamId, teamId));

      if (!teamFinance || (teamFinance.credits ?? 0) < bidAmount) {
        return { success: false, error: 'Insufficient credits for bid' };
      }

      // Release previous bidder's escrow if exists
      if (listing.currentHighBidderTeamId) {
        await this.releaseEscrow(listing.currentHighBidderTeamId, listingId);
      }

      // Create new escrow for this bid
      await db.insert(marketplaceEscrow).values({
        teamId,
        listingId,
        escrowAmount: bidAmount,
        escrowType: 'bid',
      });

      // Deduct credits from bidder (escrow)
      await db
        .update(teamFinances)
        .set({ credits: (teamFinance.credits ?? 0) - bidAmount })
        .where(eq(teamFinances.teamId, teamId));

      // Anti-sniping: Check if bid is in final 5 minutes
      const timeUntilExpiry = listing.expiryTimestamp.getTime() - Date.now();
      const fiveMinutesMs = 5 * 60 * 1000;
      let newExpiryTime = listing.expiryTimestamp;

      if (timeUntilExpiry <= fiveMinutesMs) {
        // Extend auction by 5 minutes
        newExpiryTime = new Date(Date.now() + fiveMinutesMs);
        
        await db
          .update(marketplaceListings)
          .set({ 
            auctionExtensions: listing.auctionExtensions + 1,
            expiryTimestamp: newExpiryTime
          })
          .where(eq(marketplaceListings.id, listingId));
      }

      // Update listing with new bid
      await db
        .update(marketplaceListings)
        .set({
          currentBid: bidAmount,
          currentHighBidderTeamId: teamId,
        })
        .where(eq(marketplaceListings.id, listingId));

      // Record bid
      await db.insert(marketplaceBids).values({
        listingId,
        bidderTeamId: teamId,
        bidAmount,
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
    teamId: string,
    listingId: number
  ): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      // Get listing details
      const [listing] = await db
        .select()
        .from(marketplaceListings)
        .where(and(
          eq(marketplaceListings.id, listingId),
          eq(marketplaceListings.isActive, true)
        ));

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
      const [buyerFinance] = await db
        .select()
        .from(teamFinances)
        .where(eq(teamFinances.teamId, teamId));

      if (!buyerFinance || (buyerFinance.credits ?? 0) < listing.buyNowPrice) {
        return { success: false, error: 'Insufficient credits for buy-now purchase' };
      }

      // Calculate market tax (5% default)
      const taxAmount = Math.floor(listing.buyNowPrice * (listing.marketTax / 100));
      const sellerAmount = listing.buyNowPrice - taxAmount;

      // Process the transaction
      await this.completeAuction(listingId, teamId, listing.buyNowPrice, sellerAmount, true);

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
    winnerTeamId: string,
    finalPrice: number,
    sellerAmount: number,
    isBuyNow: boolean = false
  ): Promise<void> {
    const [listing] = await db
      .select()
      .from(marketplaceListings)
      .where(eq(marketplaceListings.id, listingId));

    if (!listing) return;

    // Transfer player to winner
    await db
      .update(players)
      .set({ teamId: winnerTeamId })
      .where(eq(players.id, listing.playerId));

    // Pay seller (minus tax)
    const [sellerFinance] = await db
      .select()
      .from(teamFinances)
      .where(eq(teamFinances.teamId, listing.sellerTeamId));

    if (sellerFinance) {
      await db
        .update(teamFinances)
        .set({ credits: (sellerFinance.credits ?? 0) + sellerAmount })
        .where(eq(teamFinances.teamId, listing.sellerTeamId));
    }

    // If not buy-now, release escrow for winner
    if (!isBuyNow) {
      await this.releaseEscrow(winnerTeamId, listingId);
    } else {
      // For buy-now, deduct credits from buyer
      const [buyerFinance] = await db
        .select()
        .from(teamFinances)
        .where(eq(teamFinances.teamId, winnerTeamId));

      if (buyerFinance) {
        await db
          .update(teamFinances)
          .set({ credits: (buyerFinance.credits ?? 0) - finalPrice })
          .where(eq(teamFinances.teamId, winnerTeamId));
      }
    }

    // Release any other bidders' escrow
    if (listing.currentHighBidderTeamId && listing.currentHighBidderTeamId !== winnerTeamId) {
      await this.releaseEscrow(listing.currentHighBidderTeamId, listingId);
    }

    // Mark listing as completed
    await db
      .update(marketplaceListings)
      .set({ 
        isActive: false,
        completedAt: new Date()
      })
      .where(eq(marketplaceListings.id, listingId));

    // Mark all bids as inactive
    await db
      .update(marketplaceBids)
      .set({ isActive: false })
      .where(eq(marketplaceBids.listingId, listingId));
  }

  /**
   * Release escrow for a team
   */
  static async releaseEscrow(teamId: string, listingId: number): Promise<void> {
    // Get active escrow
    const [escrow] = await db
      .select()
      .from(marketplaceEscrow)
      .where(and(
        eq(marketplaceEscrow.teamId, teamId),
        eq(marketplaceEscrow.listingId, listingId),
        eq(marketplaceEscrow.isReleased, false)
      ));

    if (!escrow) return;

    // Return credits to team
    const [teamFinance] = await db
      .select()
      .from(teamFinances)
      .where(eq(teamFinances.teamId, teamId));

    if (teamFinance) {
      await db
        .update(teamFinances)
        .set({ credits: (teamFinance.credits ?? 0) + escrow.escrowAmount })
        .where(eq(teamFinances.teamId, teamId));
    }

    // Mark escrow as released
    await db
      .update(marketplaceEscrow)
      .set({ 
        isReleased: true,
        releasedAt: new Date()
      })
      .where(eq(marketplaceEscrow.id, escrow.id));
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
    const expiredListings = await db
      .select()
      .from(marketplaceListings)
      .where(and(
        eq(marketplaceListings.isActive, true),
        lt(marketplaceListings.expiryTimestamp, now)
      ));

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
        await db
          .update(marketplaceListings)
          .set({ 
            isActive: false,
            completedAt: new Date()
          })
          .where(eq(marketplaceListings.id, listing.id));
        
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
    const listings = await db
      .select({
        listingId: marketplaceListings.id,
        playerId: marketplaceListings.playerId,
        sellerTeamId: marketplaceListings.sellerTeamId,
        startBid: marketplaceListings.startBid,
        buyNowPrice: marketplaceListings.buyNowPrice,
        currentBid: marketplaceListings.currentBid,
        expiryTimestamp: marketplaceListings.expiryTimestamp,
        auctionExtensions: marketplaceListings.auctionExtensions,
        createdAt: marketplaceListings.createdAt,
        // Player details
        playerName: sql<string>`CONCAT(${players.firstName}, ' ', ${players.lastName})`,
        race: players.race,
        speed: players.speed,
        power: players.power,
        throwing: players.throwing,
        catching: players.catching,
        kicking: players.kicking,
        // Seller team name
        sellerTeamName: teams.name,
      })
      .from(marketplaceListings)
      .innerJoin(players, eq(marketplaceListings.playerId, players.id))
      .innerJoin(teams, eq(marketplaceListings.sellerTeamId, teams.id))
      .where(eq(marketplaceListings.isActive, true))
      .orderBy(desc(marketplaceListings.createdAt))
      .limit(limit)
      .offset(offset);

    return listings;
  }

  /**
   * Get team's listings (both active and completed)
   */
  static async getTeamListings(teamId: string): Promise<any[]> {
    const listings = await db
      .select({
        listingId: marketplaceListings.id,
        playerId: marketplaceListings.playerId,
        startBid: marketplaceListings.startBid,
        buyNowPrice: marketplaceListings.buyNowPrice,
        currentBid: marketplaceListings.currentBid,
        expiryTimestamp: marketplaceListings.expiryTimestamp,
        isActive: marketplaceListings.isActive,
        listingFee: marketplaceListings.listingFee,
        createdAt: marketplaceListings.createdAt,
        completedAt: marketplaceListings.completedAt,
        // Player details
        playerName: sql<string>`CONCAT(${players.firstName}, ' ', ${players.lastName})`,
        race: players.race,
      })
      .from(marketplaceListings)
      .innerJoin(players, eq(marketplaceListings.playerId, players.id))
      .where(eq(marketplaceListings.sellerTeamId, teamId))
      .orderBy(desc(marketplaceListings.createdAt));

    return listings;
  }

  /**
   * Get listing details with bid history
   */
  static async getListingDetails(listingId: number): Promise<any> {
    const [listing] = await db
      .select({
        listingId: marketplaceListings.id,
        playerId: marketplaceListings.playerId,
        sellerTeamId: marketplaceListings.sellerTeamId,
        startBid: marketplaceListings.startBid,
        buyNowPrice: marketplaceListings.buyNowPrice,
        currentBid: marketplaceListings.currentBid,
        currentHighBidderTeamId: marketplaceListings.currentHighBidderTeamId,
        expiryTimestamp: marketplaceListings.expiryTimestamp,
        isActive: marketplaceListings.isActive,
        auctionExtensions: marketplaceListings.auctionExtensions,
        createdAt: marketplaceListings.createdAt,
        // Player details
        playerName: sql<string>`CONCAT(${players.firstName}, ' ', ${players.lastName})`,
        race: players.race,
        speed: players.speed,
        power: players.power,
        throwing: players.throwing,
        catching: players.catching,
        kicking: players.kicking,
        // Seller team name
        sellerTeamName: teams.name,
      })
      .from(marketplaceListings)
      .innerJoin(players, eq(marketplaceListings.playerId, players.id))
      .innerJoin(teams, eq(marketplaceListings.sellerTeamId, teams.id))
      .where(eq(marketplaceListings.id, listingId));

    if (!listing) return null;

    // Get bid history
    const bidHistory = await db
      .select({
        bidAmount: marketplaceBids.bidAmount,
        bidTimestamp: marketplaceBids.bidTimestamp,
        bidderTeamName: teams.name,
      })
      .from(marketplaceBids)
      .innerJoin(teams, eq(marketplaceBids.bidderTeamId, teams.id))
      .where(eq(marketplaceBids.listingId, listingId))
      .orderBy(desc(marketplaceBids.bidTimestamp));

    return {
      ...listing,
      bidHistory
    };
  }

  /**
   * Get general marketplace statistics
   */
  static async getMarketplaceStats(): Promise<any> {
    try {
      // Get total active listings
      const [totalActiveListingsResult] = await db
        .select({ count: count() })
        .from(marketplaceListings)
        .where(eq(marketplaceListings.isActive, true));

      // Get total bids placed
      const [totalBidsResult] = await db
        .select({ count: count() })
        .from(marketplaceBids);

      // Get average and highest current bid
      const [bidStatsResult] = await db
        .select({
          avgBid: sql<number>`AVG(${marketplaceListings.currentBid})`,
          maxBid: sql<number>`MAX(${marketplaceListings.currentBid})`
        })
        .from(marketplaceListings)
        .where(eq(marketplaceListings.isActive, true));

      return {
        totalActiveListings: totalActiveListingsResult?.count || 0,
        totalBidsPlaced: totalBidsResult?.count || 0,
        averageCurrentBid: Math.round(bidStatsResult?.avgBid || 0),
        highestBid: bidStatsResult?.maxBid || 0,
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
      const bids = await db
        .select({
          id: marketplaceBids.id,
          listingId: marketplaceBids.listingId,
          bidAmount: marketplaceBids.bidAmount,
          bidTimestamp: marketplaceBids.bidTimestamp,
          isActive: marketplaceListings.isActive,
          playerName: sql<string>`${players.firstName} || ' ' || ${players.lastName}`,
          currentBid: marketplaceListings.currentBid,
          expiryTimestamp: marketplaceListings.expiryTimestamp
        })
        .from(marketplaceBids)
        .innerJoin(marketplaceListings, eq(marketplaceBids.listingId, marketplaceListings.id))
        .innerJoin(players, eq(marketplaceListings.playerId, players.id))
        .where(eq(marketplaceBids.bidderTeamId, teamId))
        .orderBy(desc(marketplaceBids.bidTimestamp));

      return bids;
    } catch (error) {
      console.error('Error getting user bids:', error);
      return [];
    }
  }
}