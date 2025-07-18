/**
 * Daily Progression System Tests
 * Tests automated daily player progression, aging, and retirement systems
 */

const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const { PrismaClient } = require('@prisma/client');
const { DailyPlayerProgressionService } = require('../../server/services/dailyPlayerProgressionService');
const { PlayerAgingRetirementService } = require('../../server/services/playerAgingRetirementService');

// Mock database
const mockPrisma = {
  player: {
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  season: {
    findFirst: jest.fn(),
  },
  team: {
    findMany: jest.fn(),
  },
};

// Mock services
jest.mock('../../server/services/errorService', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
}));

describe('Daily Progression System', () => {
  let dailyProgressionService;
  let agingService;

  beforeEach(() => {
    jest.clearAllMocks();
    dailyProgressionService = new DailyPlayerProgressionService();
    agingService = new PlayerAgingRetirementService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Daily Player Progression', () => {
    it('should process all active players for progression', async () => {
      // Mock active players
      const mockPlayers = [
        { id: 'player1', age: 25, speed: 20, power: 25, potentialRating: 3.5 },
        { id: 'player2', age: 28, speed: 30, power: 20, potentialRating: 4.0 },
        { id: 'player3', age: 22, speed: 15, power: 35, potentialRating: 2.5 },
      ];

      mockPrisma.player.findMany.mockResolvedValue(mockPlayers);
      mockPrisma.player.update.mockResolvedValue({});

      // Mock the service to use our mock prisma
      dailyProgressionService.prisma = mockPrisma;

      const result = await dailyProgressionService.processAllPlayers();

      expect(mockPrisma.player.findMany).toHaveBeenCalledWith({
        where: { isRetired: false },
        include: { team: true },
      });
      expect(result).toEqual({ totalPlayers: 3, progressedPlayers: expect.any(Number) });
    });

    it('should calculate progression chance correctly', async () => {
      const player = { age: 24, potentialRating: 3.5 };
      const baseChance = 15;
      const progressionChance = dailyProgressionService.calculateProgressionChance(player, baseChance);

      expect(progressionChance).toBeGreaterThanOrEqual(0);
      expect(progressionChance).toBeLessThanOrEqual(100);
    });

    it('should apply age modifiers correctly', async () => {
      const youngPlayer = { age: 20 };
      const primePlayer = { age: 25 };
      const oldPlayer = { age: 32 };

      const youngModifier = dailyProgressionService.getAgeModifier(youngPlayer.age);
      const primeModifier = dailyProgressionService.getAgeModifier(primePlayer.age);
      const oldModifier = dailyProgressionService.getAgeModifier(oldPlayer.age);

      expect(youngModifier).toBeGreaterThanOrEqual(0);
      expect(primeModifier).toBeGreaterThanOrEqual(0);
      expect(oldModifier).toBeLessThanOrEqual(0); // Older players have negative modifiers
    });
  });

  describe('Player Aging System', () => {
    it('should age players correctly at season end', async () => {
      const mockPlayers = [
        { id: 'player1', age: 25, isRetired: false },
        { id: 'player2', age: 34, isRetired: false },
        { id: 'player3', age: 40, isRetired: false },
      ];

      mockPrisma.player.findMany.mockResolvedValue(mockPlayers);
      mockPrisma.player.update.mockResolvedValue({});

      // Mock the service to use our mock prisma
      agingService.prisma = mockPrisma;

      const result = await agingService.processAllPlayers();

      expect(mockPrisma.player.findMany).toHaveBeenCalledWith({
        where: { isRetired: false },
        include: { team: true },
      });
      expect(result).toEqual({ totalPlayers: 3, agedPlayers: 3, retiredPlayers: expect.any(Number) });
    });

    it('should handle player retirement correctly', async () => {
      const oldPlayer = { id: 'player1', age: 42, isRetired: false };

      const shouldRetire = agingService.shouldPlayerRetire(oldPlayer);
      expect(shouldRetire).toBe(true);

      const youngPlayer = { id: 'player2', age: 25, isRetired: false };
      const shouldYoungRetire = agingService.shouldPlayerRetire(youngPlayer);
      expect(shouldYoungRetire).toBe(false);
    });

    it('should apply stat decline for older players', async () => {
      const oldPlayer = { id: 'player1', age: 33, speed: 30, agility: 25, power: 35 };

      const declineChance = agingService.calculateDeclineChance(oldPlayer.age);
      expect(declineChance).toBeGreaterThan(0);
      expect(declineChance).toBeLessThanOrEqual(100);
    });
  });

  describe('Season Timing Integration', () => {
    it('should only run during offseason (Day 15→16)', async () => {
      const mockSeason = { currentDay: 15, phase: 'REGULAR_SEASON' };
      mockPrisma.season.findFirst.mockResolvedValue(mockSeason);

      // Mock the service to use our mock prisma
      dailyProgressionService.prisma = mockPrisma;

      const shouldRun = await dailyProgressionService.shouldRunProgression();
      expect(shouldRun).toBe(true);

      // Test regular season day
      mockSeason.currentDay = 10;
      const shouldNotRun = await dailyProgressionService.shouldRunProgression();
      expect(shouldNotRun).toBe(false);
    });

    it('should handle day advancement correctly', async () => {
      const mockSeason = { currentDay: 6, phase: 'REGULAR_SEASON' };
      mockPrisma.season.findFirst.mockResolvedValue(mockSeason);

      // Mock the service to use our mock prisma
      dailyProgressionService.prisma = mockPrisma;

      const currentDay = await dailyProgressionService.getCurrentSeasonDay();
      expect(currentDay).toBe(6);
    });
  });
});

module.exports = {
  // Export test utilities for integration tests
  mockPrisma,
  createMockPlayer: (overrides = {}) => ({
    id: 'test-player',
    age: 25,
    speed: 20,
    power: 25,
    agility: 20,
    potentialRating: 3.0,
    isRetired: false,
    ...overrides,
  }),
};