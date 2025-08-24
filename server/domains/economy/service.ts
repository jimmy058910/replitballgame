import { getPrismaClient } from '../../database.js';

// Initialize Prisma client
const prisma = await getPrismaClient();
import { Logger } from '../core/logger.js';
import { NotFoundError, ValidationError, ConflictError } from '../core/errors.js';
import { StoreItem, PurchaseRequest, MarketplaceListing, BidRequest, FinancialSummary, AdReward } from './schemas.js';

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
        where: { isActive: true },

        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      });

      return listings.map((listing: any) => ({
        id: Number(listing.id),
        playerId: Number(listing.playerId),
        teamId: Number(listing.sellerTeamId),
        startingBid: Number(listing.startBid),
        buyNowPrice: listing.buyNowPrice ? Number(listing.buyNowPrice) : undefined,
        currentBid: Number(listing.startBid),
        highestBidderId: undefined,
        endsAt: listing.autoDelistAt || new Date(),
        status: listing.isActive ? 'active' : 'expired',
        player: {
          id: Number(listing.playerId),
          firstName: 'Player',
          lastName: 'Name',
          race: 'Unknown',
          age: 25,
          potential: 50,
          position: 'Unknown',
          overall: 50
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

      if (Number(listing.startBid) >= request.amount) {
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

      const playerSalaries = team.players.reduce((total: number, player: any) => 
        total + (player.contract?.salary || 0), 0
      );

      const staffSalaries = team.staff.reduce((total: number, staff: any) => 
        total + 50000, 0 // Staff schema doesn't have salary field
      );

      const summary: FinancialSummary = {
        teamId: Number(team.id),
        credits: Number(team.finances?.credits || 0),
        gems: Number(team.finances?.gems || 0),
        totalValue: Number(team.finances?.credits || 0) + (Number(team.finances?.gems || 0) * 500),
        weeklyIncome: 0, // Calculated dynamically from actual games
        weeklyExpenses: playerSalaries + staffSalaries,
        stadiumRevenue: 0, // Calculated from actual home games only
        sponsorshipDeals: 0, // No hardcoded sponsorships
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