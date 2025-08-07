import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EconomyDomainService } from '../../domains/economy/service';
import { prisma } from '../../db';

// Mock Prisma
vi.mock('../../db', () => ({
  prisma: {
    team: {
      findUnique: vi.fn(),
    },
    marketplaceListing: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

// Mock Logger
vi.mock('../../domains/core/logger', () => ({
  Logger: {
    logInfo: vi.fn(),
    logError: vi.fn(),
    logWarn: vi.fn(),
  },
}));

describe('EconomyDomainService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDailyStoreItems', () => {
    it('should return daily store items', async () => {
      const result = await EconomyDomainService.getDailyStoreItems();
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      const firstItem = result[0];
      expect(firstItem).toHaveProperty('id');
      expect(firstItem).toHaveProperty('name');
      expect(firstItem).toHaveProperty('priceCredits');
      expect(firstItem).toHaveProperty('category');
      expect(firstItem).toHaveProperty('rarity');
    });
  });

  describe('purchaseItem', () => {
    it('should purchase item successfully', async () => {
      const mockTeam = {
        id: BigInt(132),
        name: 'Test Team',
        finances: {
          credits: BigInt(10000),
          gems: BigInt(50),
        },
      };
      
      vi.mocked(prisma.team.findUnique).mockResolvedValue(mockTeam);
      
      const result = await EconomyDomainService.purchaseItem(132, {
        itemId: 'helmet_basic',
        quantity: 1,
        paymentMethod: 'credits',
      });
      
      expect(result).toBe(true);
      expect(prisma.team.findUnique).toHaveBeenCalledWith({
        where: { id: 132 },
        include: { finances: true },
      });
    });

    it('should throw error if team not found', async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue(null);
      
      await expect(
        EconomyDomainService.purchaseItem(999, {
          itemId: 'helmet_basic',
          quantity: 1,
          paymentMethod: 'credits',
        })
      ).rejects.toThrow('Team not found');
    });
  });

  describe('getMarketplaceListings', () => {
    it('should return marketplace listings', async () => {
      const mockListings = [
        {
          id: BigInt(1),
          playerId: BigInt(100),
          teamId: BigInt(132),
          startingBid: BigInt(1000),
          buyNowPrice: BigInt(5000),
          currentBid: BigInt(1500),
          highestBidderId: BigInt(133),
          endsAt: new Date(),
          status: 'active',
          player: {
            id: BigInt(100),
            firstName: 'John',
            lastName: 'Doe',
            position: 'Passer',
            race: 'Human',
            overall: 75,
            age: 25,
            potential: 85,
          },
        },
      ];
      
      vi.mocked(prisma.marketplaceListing.findMany).mockResolvedValue(mockListings);
      
      const result = await EconomyDomainService.getMarketplaceListings(1, 20);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('player');
      expect(result[0].player.firstName).toBe('John');
      expect(result[0].status).toBe('active');
    });
  });

  describe('placeBid', () => {
    it('should place bid successfully', async () => {
      const mockListing = {
        id: BigInt(1),
        currentBid: BigInt(1000),
        status: 'active',
      };
      
      const mockTeam = {
        id: BigInt(132),
        finances: {
          credits: BigInt(10000),
          gems: BigInt(50),
        },
      };
      
      vi.mocked(prisma.marketplaceListing.findUnique).mockResolvedValue(mockListing);
      vi.mocked(prisma.team.findUnique).mockResolvedValue(mockTeam);
      
      const result = await EconomyDomainService.placeBid(132, {
        listingId: 1,
        amount: 1500,
      });
      
      expect(result).toBe(true);
    });

    it('should throw error if listing not found', async () => {
      vi.mocked(prisma.marketplaceListing.findUnique).mockResolvedValue(null);
      
      await expect(
        EconomyDomainService.placeBid(132, {
          listingId: 999,
          amount: 1500,
        })
      ).rejects.toThrow('Marketplace listing not found');
    });

    it('should throw error if bid not higher than current', async () => {
      const mockListing = {
        id: BigInt(1),
        currentBid: BigInt(2000),
        status: 'active',
      };
      
      vi.mocked(prisma.marketplaceListing.findUnique).mockResolvedValue(mockListing);
      
      await expect(
        EconomyDomainService.placeBid(132, {
          listingId: 1,
          amount: 1500,
        })
      ).rejects.toThrow('Bid must be higher than current bid');
    });
  });

  describe('getFinancialSummary', () => {
    it('should return financial summary', async () => {
      const mockTeam = {
        id: BigInt(132),
        finances: {
          credits: BigInt(50000),
          gems: BigInt(100),
        },
        stadium: {
          capacity: 5000,
        },
        players: [
          {
            contract: {
              salary: 2000,
            },
          },
        ],
        staff: [
          {
            salary: 1000,
          },
        ],
      };
      
      vi.mocked(prisma.team.findUnique).mockResolvedValue(mockTeam);
      
      const result = await EconomyDomainService.getFinancialSummary(132);
      
      expect(result).toBeDefined();
      expect(result.teamId).toBe(132);
      expect(result.credits).toBe(50000);
      expect(result.gems).toBe(100);
      expect(result.playerSalaries).toBe(2000);
      expect(result.staffSalaries).toBe(1000);
    });
  });

  describe('watchAd', () => {
    it('should generate ad reward', async () => {
      const result = await EconomyDomainService.watchAd(132);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('credits');
      expect(result).toHaveProperty('gems');
      expect(result).toHaveProperty('type');
      expect(result.credits).toBeGreaterThan(0);
      expect(['basic', 'premium', 'milestone']).toContain(result.type);
    });
  });
});