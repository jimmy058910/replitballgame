import { db } from "../db";
import {
    playerAuctions,
    auctionBids,
    players,
    teams,
    type PlayerAuction,
    type InsertPlayerAuction,
    type AuctionBid,
    type InsertAuctionBid
} from "@shared/schema";
import { eq, and, or, desc, asc, lte, not } from "drizzle-orm"; // Added lte and not

export class AuctionStorage {
  async createAuction(auctionData: InsertPlayerAuction): Promise<PlayerAuction> {
    const dataToInsert = {
        ...auctionData,
        status: auctionData.status || 'active',
        currentBid: auctionData.currentBid || auctionData.startingBid || 0,
        bidsCount: 0, // Initialize bids count
        // Ensure other non-nullable fields like auctionType have defaults if not provided
        auctionType: auctionData.auctionType || 'standard',
    };
    const [newAuction] = await db.insert(playerAuctions).values(dataToInsert).returning();
    return newAuction;
  }

  async getAuctionById(id: string): Promise<PlayerAuction | undefined> {
    const [auction] = await db.select().from(playerAuctions).where(eq(playerAuctions.id, id)).limit(1);
    return auction;
  }

  async getActiveAuctions(limit: number = 50, offset: number = 0): Promise<PlayerAuction[]> {
    return await db
      .select({
          id: playerAuctions.id,
          playerId: playerAuctions.playerId,
          sellerId: playerAuctions.sellerId,
          startingBid: playerAuctions.startingBid,
          currentBid: playerAuctions.currentBid,
          buyoutPrice: playerAuctions.buyoutPrice,
          highestBidderId: playerAuctions.highestBidderId,
          auctionType: playerAuctions.auctionType,
          reservePrice: playerAuctions.reservePrice,
          startTime: playerAuctions.startTime,
          endTime: playerAuctions.endTime,
          status: playerAuctions.status,
          bidsCount: playerAuctions.bidsCount,
          playerName: players.name,
          playerRace: players.race,
          // sellerTeamName: teams.name, // Requires another join for seller team name
      })
      .from(playerAuctions)
      .leftJoin(players, eq(playerAuctions.playerId, players.id))
      // .leftJoin(teams, eq(playerAuctions.sellerId, teams.id)) // For seller team name
      .where(eq(playerAuctions.status, "active"))
      .orderBy(desc(playerAuctions.endTime))
      .limit(limit)
      .offset(offset);
  }

  async getAuctionsBySeller(sellerId: string): Promise<PlayerAuction[]> {
    return await db
      .select()
      .from(playerAuctions)
      .where(eq(playerAuctions.sellerId, sellerId))
      .orderBy(desc(playerAuctions.createdAt));
  }

  async getAuctionsByPlayer(playerId: string, activeOnly: boolean = false): Promise<PlayerAuction[]> {
    const conditions = [eq(playerAuctions.playerId, playerId)];
    if (activeOnly) {
        conditions.push(eq(playerAuctions.status, 'active'));
    }
    return await db
      .select()
      .from(playerAuctions)
      .where(and(...conditions))
      .orderBy(desc(playerAuctions.createdAt));
  }

  async updateAuction(id: string, updates: Partial<InsertPlayerAuction>): Promise<PlayerAuction | undefined> {
    const existing = await this.getAuctionById(id);
    if (!existing) {
        console.warn(`Auction with ID ${id} not found for update.`);
        return undefined;
    }

    const [updatedAuction] = await db
      .update(playerAuctions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(playerAuctions.id, id))
      .returning();
    return updatedAuction;
  }

  // Bid operations
  async createBid(bidData: InsertAuctionBid): Promise<AuctionBid> {
    const dataToInsert: InsertAuctionBid = {
        auctionId: bidData.auctionId,
        bidderId: bidData.bidderId,
        bidAmount: bidData.bidAmount,
        bidType: bidData.bidType || 'standard',
        maxAutoBid: bidData.maxAutoBid, // Can be null
        isWinning: bidData.isWinning === undefined ? false : bidData.isWinning,
        timestamp: bidData.timestamp || new Date(),
        // id: bidData.id, // Handled by DB
        // createdAt: bidData.createdAt, // Handled by DB
    };
    const [newBid] = await db.insert(auctionBids).values(dataToInsert).returning();
    return newBid;
  }

  async getBidsByAuctionId(auctionId: string): Promise<AuctionBid[]> {
    return await db
      .select()
      .from(auctionBids)
      .where(eq(auctionBids.auctionId, auctionId))
      .orderBy(desc(auctionBids.bidAmount), asc(auctionBids.timestamp));
  }

  async getTopBidForAuction(auctionId: string): Promise<AuctionBid | undefined> {
    const [topBid] = await db
      .select()
      .from(auctionBids)
      .where(eq(auctionBids.auctionId, auctionId)) // No longer relying on isWinning here for fetching absolute top
      .orderBy(desc(auctionBids.bidAmount), asc(auctionBids.timestamp))
      .limit(1);
    return topBid;
  }

  async getWinningBidForAuction(auctionId: string): Promise<AuctionBid | undefined> {
    const [winningBid] = await db
      .select()
      .from(auctionBids)
      .where(and(eq(auctionBids.auctionId, auctionId), eq(auctionBids.isWinning, true)))
      .limit(1); // Should only be one
    return winningBid;
  }


  async getBidsByBidder(bidderId: string, auctionId?: string): Promise<AuctionBid[]> {
    const conditions = [eq(auctionBids.bidderId, bidderId)];
    if (auctionId) {
      conditions.push(eq(auctionBids.auctionId, auctionId));
    }
    return await db
      .select()
      .from(auctionBids)
      .where(and(...conditions))
      .orderBy(desc(auctionBids.timestamp));
  }

  async markBidsAsNotWinningForAuction(auctionId: string, excludingBidId?: string): Promise<number> {
    const conditions = [eq(auctionBids.auctionId, auctionId), eq(auctionBids.isWinning, true)];
    if (excludingBidId) {
        conditions.push(not(eq(auctionBids.id, excludingBidId)));
    }
    const result = await db.update(auctionBids).set({ isWinning: false })
                  .where(and(...conditions)).returning({id: auctionBids.id});
    return result.length;
  }

  async markBidAsWinning(bidId: string): Promise<AuctionBid | undefined> {
      const [updatedBid] = await db.update(auctionBids).set({ isWinning: true }).where(eq(auctionBids.id, bidId)).returning();
      return updatedBid;
  }

  async processExpiredAuctions(): Promise<{ completed: number, failedProcessing: number, noSale: number }> {
    const now = new Date();
    const expired = await db.select().from(playerAuctions)
        .where(and(eq(playerAuctions.status, 'active'), lte(playerAuctions.endTime, now)));

    let completedCount = 0;
    let failedProcessingCount = 0;
    let noSaleCount = 0;

    for (const auction of expired) {
        const topBid = await this.getTopBidForAuction(auction.id); // Gets the highest bid amount

        if (topBid && (!auction.reservePrice || topBid.bidAmount >= auction.reservePrice)) {
            const playerToTransfer = await db.select().from(players).where(eq(players.id, auction.playerId)).limit(1);
            // Further checks for sellerTeam and buyerTeam existence would be good here.

            if (playerToTransfer.length > 0 && topBid.bidderId) {
                // TODO: Implement fund transfer logic using teamFinancesStorage.
                // For now, assume funds are handled elsewhere or logging is sufficient.
                // console.log(`Auction ${auction.id} for ${playerToTransfer[0].name} won by team ID ${topBid.bidderId} for ${topBid.bidAmount}`);

                // Transfer player
                await db.update(players).set({ teamId: topBid.bidderId, isMarketplace: false, marketplacePrice: null, updatedAt: new Date() }).where(eq(players.id, auction.playerId));
                await this.updateAuction(auction.id, { status: 'completed', topBidderId: topBid.bidderId, currentBid: topBid.bidAmount });
                completedCount++;
            } else {
                console.error(`Could not complete auction ${auction.id} due to missing player, or bidderId on topBid.`);
                await this.updateAuction(auction.id, { status: 'failed_processing' });
                failedProcessingCount++;
            }
        } else {
            await this.updateAuction(auction.id, { status: 'expired_no_sale' });
            // Player remains with original team. If they were marked 'inAuction', revert that.
            // await db.update(players).set({ isInAuction: false }).where(eq(players.id, auction.playerId));
            noSaleCount++;
        }
    }
    return { completed: completedCount, failedProcessing: failedProcessingCount, noSale: noSaleCount };
  }
}

export const auctionStorage = new AuctionStorage();
