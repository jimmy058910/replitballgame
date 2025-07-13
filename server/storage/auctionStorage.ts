import { prisma } from '../db';
import { PrismaClient, MarketplaceListing, Bid } from '../../generated/prisma';

export class AuctionStorage {
  async createAuction(auctionData: {
    teamId: number;
    playerId: number;
    startingBid: bigint;
    buyNowPrice?: bigint;
    duration: number;
  }): Promise<MarketplaceListing> {
    const endTime = new Date();
    endTime.setHours(endTime.getHours() + auctionData.duration);

    const newAuction = await prisma.marketplaceListing.create({
      data: {
        teamId: auctionData.teamId,
        playerId: auctionData.playerId,
        startingBid: auctionData.startingBid,
        currentBid: auctionData.startingBid,
        buyNowPrice: auctionData.buyNowPrice,
        endTime,
        isActive: true,
      },
      include: {
        player: { select: { firstName: true, lastName: true, race: true } },
        team: { select: { name: true } },
        bids: {
          include: {
            team: { select: { name: true } }
          },
          orderBy: { amount: 'desc' }
        }
      }
    });
    return newAuction;
  }

  async getAuctionById(id: number): Promise<MarketplaceListing | null> {
    const auction = await prisma.marketplaceListing.findUnique({
      where: { id },
      include: {
        player: { select: { firstName: true, lastName: true, race: true } },
        team: { select: { name: true } },
        bids: {
          include: {
            team: { select: { name: true } }
          },
          orderBy: { amount: 'desc' }
        }
      }
    });
    return auction;
  }

  async getActiveAuctions(limit: number = 50, offset: number = 0): Promise<MarketplaceListing[]> {
    return await prisma.marketplaceListing.findMany({
      where: { isActive: true },
      include: {
        player: { select: { firstName: true, lastName: true, race: true } },
        team: { select: { name: true } },
        bids: {
          include: {
            team: { select: { name: true } }
          },
          orderBy: { amount: 'desc' }
        }
      },
      orderBy: { endTime: 'desc' },
      take: limit,
      skip: offset
    });
  }

  async getAuctionsBySeller(teamId: number): Promise<MarketplaceListing[]> {
    return await prisma.marketplaceListing.findMany({
      where: { teamId },
      include: {
        player: { select: { firstName: true, lastName: true, race: true } },
        team: { select: { name: true } },
        bids: {
          include: {
            team: { select: { name: true } }
          },
          orderBy: { amount: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getAuctionsByPlayer(playerId: number, activeOnly: boolean = false): Promise<MarketplaceListing[]> {
    return await prisma.marketplaceListing.findMany({
      where: {
        playerId,
        ...(activeOnly ? { isActive: true } : {})
      },
      include: {
        player: { select: { firstName: true, lastName: true, race: true } },
        team: { select: { name: true } },
        bids: {
          include: {
            team: { select: { name: true } }
          },
          orderBy: { amount: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateAuction(id: number, updates: Partial<MarketplaceListing>): Promise<MarketplaceListing | null> {
    try {
      const updatedAuction = await prisma.marketplaceListing.update({
        where: { id },
        data: updates,
        include: {
          player: { select: { firstName: true, lastName: true, race: true } },
          team: { select: { name: true } },
          bids: {
            include: {
              team: { select: { name: true } }
            },
            orderBy: { amount: 'desc' }
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
    const newBid = await prisma.bid.create({
      data: {
        listingId: bidData.listingId,
        teamId: bidData.teamId,
        amount: bidData.amount,
      },
      include: {
        listing: {
          include: {
            player: { select: { firstName: true, lastName: true } }
          }
        },
        team: { select: { name: true } }
      }
    });
    
    // Update the current bid on the listing
    await prisma.marketplaceListing.update({
      where: { id: bidData.listingId },
      data: { 
        currentBid: bidData.amount,
        highBidderId: bidData.teamId
      }
    });

    return newBid;
  }

  async getBidsByListing(listingId: number): Promise<Bid[]> {
    return await prisma.bid.findMany({
      where: { listingId },
      include: {
        listing: {
          include: {
            player: { select: { firstName: true, lastName: true } }
          }
        },
        team: { select: { name: true } }
      },
      orderBy: { amount: 'desc' }
    });
  }

  async getBidsByTeam(teamId: number): Promise<Bid[]> {
    return await prisma.bid.findMany({
      where: { teamId },
      include: {
        listing: {
          include: {
            player: { select: { firstName: true, lastName: true } }
          }
        },
        team: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async closeAuction(id: number): Promise<MarketplaceListing | null> {
    return await this.updateAuction(id, { isActive: false });
  }

  async getExpiredAuctions(): Promise<MarketplaceListing[]> {
    const now = new Date();
    return await prisma.marketplaceListing.findMany({
      where: {
        isActive: true,
        endTime: { lte: now }
      },
      include: {
        player: { select: { firstName: true, lastName: true, race: true } },
        team: { select: { name: true } },
        bids: {
          include: {
            team: { select: { name: true } }
          },
          orderBy: { amount: 'desc' }
        }
      }
    });
  }
}

export const auctionStorage = new AuctionStorage();