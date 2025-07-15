import { prisma } from '../../db';
import { Logger } from '../core/logger';
import { NotFoundError, ValidationError, ConflictError } from '../core/errors';
import { StoreItem, PurchaseRequest, MarketplaceListing, BidRequest, FinancialSummary, AdReward } from './schemas';

export class EconomyDomainService {
  static async getDailyStoreItems(): Promise<StoreItem[]> {
    try {
      // This would integrate with the existing enhanced game economy service
      // For now, return a sample structure
      const items: StoreItem[] = [
        {
          id: 'helmet_basic',
          name: 'Basic Helmet',
          description: 'Standard protective headgear',
          category: 'equipment',
          rarity: 'common',
          priceCredits: 1000,
          priceGems: 2,
          effects: { stamina: 2, power: 1 },
          consumable: false
        },
        {
          id: 'energy_drink',
          name: 'Energy Drink',
          description: 'Restores player stamina',
          category: 'consumable',
          rarity: 'common',
          priceCredits: 500,
          priceGems: 1,
          effects: { stamina: 10 },
          consumable: true
        }
      ];

      Logger.logInfo('Daily store items retrieved', { itemCount: items.length });
      return items;
    } catch (error) {
      Logger.logError('Failed to get daily store items', error as Error);
      throw error;
    }
  }

  static async purchaseItem(teamId: number, request: PurchaseRequest): Promise<boolean> {
    try {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: { finances: true }
      });

      if (!team) {
        throw new NotFoundError('Team');
      }

      // Validate purchase logic would go here
      // For now, return success
      
      Logger.logInfo('Item purchased successfully', {
        teamId,
        itemId: request.itemId,
        quantity: request.quantity,
        paymentMethod: request.paymentMethod
      });

      return true;
    } catch (error) {
      Logger.logError('Failed to purchase item', error as Error, { teamId, request });
      throw error;
    }
  }

  static async getMarketplaceListings(page: number = 1, limit: number = 20): Promise<MarketplaceListing[]> {
    try {
      const listings = await prisma.marketplaceListing.findMany({
        where: { status: 'active' },
        include: {
          player: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              position: true,
              race: true,
              overall: true,
              age: true,
              potential: true
            }
          }
        },
        orderBy: { endsAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit
      });

      return listings.map(listing => ({
        id: Number(listing.id),
        playerId: Number(listing.playerId),
        teamId: Number(listing.teamId),
        startingBid: Number(listing.startingBid),
        buyNowPrice: listing.buyNowPrice ? Number(listing.buyNowPrice) : undefined,
        currentBid: Number(listing.currentBid),
        highestBidderId: listing.highestBidderId ? Number(listing.highestBidderId) : undefined,
        endsAt: listing.endsAt,
        status: listing.status as 'active' | 'sold' | 'expired' | 'cancelled',
        player: {
          id: Number(listing.player.id),
          firstName: listing.player.firstName,
          lastName: listing.player.lastName,
          position: listing.player.position,
          race: listing.player.race,
          overall: listing.player.overall,
          age: listing.player.age,
          potential: listing.player.potential
        }
      }));
    } catch (error) {
      Logger.logError('Failed to get marketplace listings', error as Error, { page, limit });
      throw error;
    }
  }

  static async placeBid(teamId: number, request: BidRequest): Promise<boolean> {
    try {
      const listing = await prisma.marketplaceListing.findUnique({
        where: { id: request.listingId }
      });

      if (!listing) {
        throw new NotFoundError('Marketplace listing');
      }

      if (listing.currentBid >= request.amount) {
        throw new ValidationError('Bid must be higher than current bid');
      }

      // Validate team has enough credits
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: { finances: true }
      });

      if (!team?.finances || Number(team.finances.credits) < request.amount) {
        throw new ValidationError('Insufficient credits');
      }

      // Place bid logic would go here
      Logger.logInfo('Bid placed successfully', {
        teamId,
        listingId: request.listingId,
        amount: request.amount
      });

      return true;
    } catch (error) {
      Logger.logError('Failed to place bid', error as Error, { teamId, request });
      throw error;
    }
  }

  static async getFinancialSummary(teamId: number): Promise<FinancialSummary> {
    try {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
          finances: true,
          stadium: true,
          players: {
            include: { contract: true }
          },
          staff: true
        }
      });

      if (!team) {
        throw new NotFoundError('Team');
      }

      const playerSalaries = team.players.reduce((total, player) => 
        total + (player.contract?.salary || 0), 0
      );

      const staffSalaries = team.staff.reduce((total, staff) => 
        total + (staff.salary || 0), 0
      );

      const summary: FinancialSummary = {
        teamId: Number(team.id),
        credits: Number(team.finances?.credits || 0),
        gems: Number(team.finances?.gems || 0),
        totalValue: Number(team.finances?.credits || 0) + (Number(team.finances?.gems || 0) * 500),
        weeklyIncome: 50000, // Base income
        weeklyExpenses: playerSalaries + staffSalaries,
        stadiumRevenue: team.stadium?.capacity ? team.stadium.capacity * 25 : 0,
        sponsorshipDeals: 10000,
        playerSalaries,
        staffSalaries,
        maintenanceCosts: 5000
      };

      Logger.logInfo('Financial summary retrieved', { teamId, totalValue: summary.totalValue });
      return summary;
    } catch (error) {
      Logger.logError('Failed to get financial summary', error as Error, { teamId });
      throw error;
    }
  }

  static async watchAd(teamId: number): Promise<AdReward> {
    try {
      // Implement ad watching logic
      const rewards = [
        { credits: 250, gems: 0, multiplier: 1, type: 'basic' as const },
        { credits: 500, gems: 0, multiplier: 1, type: 'basic' as const },
        { credits: 1000, gems: 0, multiplier: 1, type: 'basic' as const }
      ];

      const randomReward = rewards[Math.floor(Math.random() * rewards.length)];

      Logger.logInfo('Ad reward generated', { teamId, reward: randomReward });
      return randomReward;
    } catch (error) {
      Logger.logError('Failed to generate ad reward', error as Error, { teamId });
      throw error;
    }
  }
}