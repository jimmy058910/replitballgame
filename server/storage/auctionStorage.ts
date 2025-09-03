import { getPrismaClient } from '../db';
import { PrismaClient, MarketplaceListing, Bid } from "../db";

export class AuctionStorage {
  async createAuction(auctionData: {
    teamId: number;
    playerId: number;
    startingBid: bigint;
    buyNowPrice?: bigint;
    duration: number;
  }): Promise<MarketplaceListing> {
    const prisma = await getPrismaClient();
    const endTime = new Date();
    endTime.setHours(endTime.getHours() + auctionData.duration);

    const newAuction = await prisma.marketplaceListing.create({
      data: {
        sellerTeamId: auctionData.teamId,
        playerId: auctionData.playerId,
        startBid: auctionData.startingBid,
        currentBid: auctionData.startingBid,
        buyNowPrice: auctionData.buyNowPrice,
        expiryTimestamp: endTime,
        originalExpiryTimestamp: endTime,
        listingFee: BigInt(0), // Calculate based on buyNowPrice * 0.03
        minBuyNowPrice: auctionData.startingBid * BigInt(2), // Default minimum
        isActive: true,
      },
      include: {
        player: { select: { firstName: true, lastName: true, race: true } },
        sellerTeam: { select: { name: true } },
        bids: {
          include: {
            bidderTeam: { select: { name: true } }
          },
          orderBy: { bidAmount: 'desc' }
        }
      }
    });
    return newAuction;
  }

  async getAuctionById(id: number): Promise<MarketplaceListing | null> {
    const prisma = await getPrismaClient();
    const auction = await prisma.marketplaceListing.findUnique({
      where: { id },
      include: {
        player: { select: { firstName: true, lastName: true, race: true } },
        sellerTeam: { select: { name: true } },
        bids: {
          include: {
            bidderTeam: { select: { name: true } }
          },
          orderBy: { bidAmount: 'desc' }
        }
      }
    });
    return auction;
  }

  async getActiveAuctions(limit: number = 50, offset: number = 0): Promise<MarketplaceListing[]> {
    const prisma = await getPrismaClient();
    return await prisma.marketplaceListing.findMany({
      where: { isActive: true },
      include: {
        player: { select: { firstName: true, lastName: true, race: true } },
        sellerTeam: { select: { name: true } },
        bids: {
          include: {
            bidderTeam: { select: { name: true } }
          },
          orderBy: { bidAmount: 'desc' }
        }
      },
      orderBy: { expiryTimestamp: 'desc' },
      take: limit,
      skip: offset
    });
  }

  async getAuctionsBySeller(teamId: number): Promise<MarketplaceListing[]> {
    const prisma = await getPrismaClient();
    return await prisma.marketplaceListing.findMany({
      where: { sellerTeamId: teamId },
      include: {
        player: { select: { firstName: true, lastName: true, race: true } },
        sellerTeam: { select: { name: true } },
        bids: {
          include: {
            bidderTeam: { select: { name: true } }
          },
          orderBy: { bidAmount: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getAuctionsByPlayer(playerId: number, activeOnly: boolean = false): Promise<MarketplaceListing[]> {
    const prisma = await getPrismaClient();
    return await prisma.marketplaceListing.findMany({
      where: {
        playerId,
        ...(activeOnly ? { isActive: true } : {})
      },
      include: {
        player: { select: { firstName: true, lastName: true, race: true } },
        sellerTeam: { select: { name: true } },
        bids: {
          include: {
            bidderTeam: { select: { name: true } }
          },
          orderBy: { bidAmount: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateAuction(id: number, updates: Partial<MarketplaceListing>): Promise<MarketplaceListing | null> {
    try {
      const prisma = await getPrismaClient();
      const updatedAuction = await prisma.marketplaceListing.update({
        where: { id },
        data: updates,
        include: {
          player: { select: { firstName: true, lastName: true, race: true } },
          sellerTeam: { select: { name: true } },
          bids: {
            include: {
              bidderTeam: { select: { name: true } }
            },
            orderBy: { bidAmount: 'desc' }
          }
        }
      });
      return updatedAuction;
    } catch (error) {
      console.warn(`Auction with ID ${id} not found for update.`);
      return null;
    }
  }

  async createBid(bidData: {
    listingId: number;
    teamId: number;
    amount: bigint;
  }): Promise<Bid> {
    const prisma = await getPrismaClient();
    const newBid = await prisma.bid.create({
      data: {
        listingId: bidData.listingId,
        bidderTeamId: bidData.teamId,
        bidAmount: bidData.amount,
      },
      include: {
        listing: {
          include: {
            player: { select: { firstName: true, lastName: true } }
          }
        },
        bidderTeam: { select: { name: true } }
      }
    });
    
    // Update the current bid on the listing
    await prisma.marketplaceListing.update({
      where: { id: bidData.listingId },
      data: { 
        currentBid: bidData.amount,
        currentHighBidderTeamId: bidData.teamId
      }
    });

    return newBid;
  }

  async getBidsByListing(listingId: number): Promise<Bid[]> {
    const prisma = await getPrismaClient();
    return await prisma.bid.findMany({
      where: { listingId },
      include: {
        listing: {
          include: {
            player: { select: { firstName: true, lastName: true } }
          }
        },
        bidderTeam: { select: { name: true } }
      },
      orderBy: { bidAmount: 'desc' }
    });
  }

  async getBidsByTeam(teamId: number): Promise<Bid[]> {
    const prisma = await getPrismaClient();
    return await prisma.bid.findMany({
      where: { bidderTeamId: teamId },
      include: {
        listing: {
          include: {
            player: { select: { firstName: true, lastName: true } }
          }
        },
        bidderTeam: { select: { name: true } }
      },
      orderBy: { placedAt: 'desc' }
    });
  }

  async closeAuction(id: number): Promise<MarketplaceListing | null> {
    return await this.updateAuction(id, { listingStatus: 'SOLD' });
  }

  async getExpiredAuctions(): Promise<MarketplaceListing[]> {
    const now = new Date();
    return await prisma.marketplaceListing.findMany({
      where: {
        listingStatus: 'ACTIVE',
        expiryTimestamp: { lte: now }
      },
      include: {
        player: { select: { firstName: true, lastName: true, race: true } },
        sellerTeam: { select: { name: true } },
        bids: {
          include: {
            bidderTeam: { select: { name: true } }
          },
          orderBy: { bidAmount: 'desc' }
        }
      }
    });
  }
}

export const auctionStorage = new AuctionStorage();