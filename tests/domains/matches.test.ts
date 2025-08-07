import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MatchDomainService } from '../../domains/matches/service';
import { prisma } from '../../db';

// Mock Prisma
vi.mock('../../db', () => ({
  prisma: {
    game: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
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

describe('MatchDomainService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createMatch', () => {
    it('should create match successfully', async () => {
      const mockMatch = {
        id: 1,
        homeTeamId: BigInt(132),
        awayTeamId: BigInt(133),
        homeScore: 0,
        awayScore: 0,
        gameTime: 0,
        status: 'SCHEDULED',
        matchType: 'EXHIBITION',
        gameDate: new Date(),
        homeTeam: {
          id: BigInt(132),
          name: 'Home Team',
          division: 8,
        },
        awayTeam: {
          id: BigInt(133),
          name: 'Away Team',
          division: 8,
        },
      };
      
      vi.mocked(prisma.game.create).mockResolvedValue(mockMatch);
      
      const result = await MatchDomainService.createMatch({
        homeTeamId: 132,
        awayTeamId: 133,
        matchType: 'EXHIBITION',
      });
      
      expect(result).toBeDefined();
      expect(result.homeTeamId).toBe(132);
      expect(result.awayTeamId).toBe(133);
      expect(result.status).toBe('SCHEDULED');
      expect(prisma.game.create).toHaveBeenCalledWith({
        data: {
          homeTeamId: BigInt(132),
          awayTeamId: BigInt(133),
          homeScore: 0,
          awayScore: 0,
          gameTime: 0,
          status: 'SCHEDULED',
          matchType: 'EXHIBITION',
          gameDate: expect.any(Date),
        },
        include: {
          homeTeam: {
            select: {
              id: true,
              name: true,
              division: true,
            },
          },
          awayTeam: {
            select: {
              id: true,
              name: true,
              division: true,
            },
          },
        },
      });
    });
  });

  describe('getMatchById', () => {
    it('should return match by ID', async () => {
      const mockMatch = {
        id: 1,
        homeTeamId: BigInt(132),
        awayTeamId: BigInt(133),
        homeScore: 2,
        awayScore: 1,
        gameTime: 1800,
        status: 'COMPLETED',
        matchType: 'EXHIBITION',
        gameDate: new Date(),
        homeTeam: {
          id: BigInt(132),
          name: 'Home Team',
          division: 8,
        },
        awayTeam: {
          id: BigInt(133),
          name: 'Away Team',
          division: 8,
        },
      };
      
      vi.mocked(prisma.game.findUnique).mockResolvedValue(mockMatch);
      
      const result = await MatchDomainService.getMatchById(1);
      
      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.homeScore).toBe(2);
      expect(result.awayScore).toBe(1);
      expect(result.status).toBe('COMPLETED');
    });

    it('should throw error if match not found', async () => {
      vi.mocked(prisma.game.findUnique).mockResolvedValue(null);
      
      await expect(
        MatchDomainService.getMatchById(999)
      ).rejects.toThrow('Match not found');
    });
  });

  describe('getLiveMatches', () => {
    it('should return live matches', async () => {
      const mockMatches = [
        {
          id: 1,
          homeTeamId: BigInt(132),
          awayTeamId: BigInt(133),
          homeScore: 1,
          awayScore: 0,
          gameTime: 900,
          status: 'IN_PROGRESS',
          matchType: 'EXHIBITION',
          gameDate: new Date(),
          homeTeam: {
            id: BigInt(132),
            name: 'Home Team',
            division: 8,
          },
          awayTeam: {
            id: BigInt(133),
            name: 'Away Team',
            division: 8,
          },
        },
      ];
      
      vi.mocked(prisma.game.findMany).mockResolvedValue(mockMatches);
      
      const result = await MatchDomainService.getLiveMatches();
      
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('IN_PROGRESS');
      expect(result[0].homeScore).toBe(1);
      expect(prisma.game.findMany).toHaveBeenCalledWith({
        where: {
          status: 'IN_PROGRESS',
        },
        include: {
          homeTeam: {
            select: {
              id: true,
              name: true,
              division: true,
            },
          },
          awayTeam: {
            select: {
              id: true,
              name: true,
              division: true,
            },
          },
        },
        orderBy: {
          gameDate: 'desc',
        },
      });
    });
  });

  describe('startMatch', () => {
    it('should start match successfully', async () => {
      const mockMatch = {
        id: 1,
        homeTeamId: BigInt(132),
        awayTeamId: BigInt(133),
        homeScore: 0,
        awayScore: 0,
        gameTime: 0,
        status: 'IN_PROGRESS',
        matchType: 'EXHIBITION',
        gameDate: new Date(),
        homeTeam: {
          id: BigInt(132),
          name: 'Home Team',
          division: 8,
        },
        awayTeam: {
          id: BigInt(133),
          name: 'Away Team',
          division: 8,
        },
      };
      
      vi.mocked(prisma.game.update).mockResolvedValue(mockMatch);
      
      const result = await MatchDomainService.startMatch(1);
      
      expect(result).toBeDefined();
      expect(result.status).toBe('IN_PROGRESS');
      expect(result.gameTime).toBe(0);
      expect(prisma.game.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          status: 'IN_PROGRESS',
          gameTime: 0,
        },
        include: {
          homeTeam: {
            select: {
              id: true,
              name: true,
              division: true,
            },
          },
          awayTeam: {
            select: {
              id: true,
              name: true,
              division: true,
            },
          },
        },
      });
    });
  });

  describe('updateMatchState', () => {
    it('should update match state successfully', async () => {
      const mockMatch = {
        id: 1,
        homeTeamId: BigInt(132),
        awayTeamId: BigInt(133),
        homeScore: 2,
        awayScore: 1,
        gameTime: 1800,
        status: 'COMPLETED',
        matchType: 'EXHIBITION',
        gameDate: new Date(),
        homeTeam: {
          id: BigInt(132),
          name: 'Home Team',
          division: 8,
        },
        awayTeam: {
          id: BigInt(133),
          name: 'Away Team',
          division: 8,
        },
      };
      
      vi.mocked(prisma.game.update).mockResolvedValue(mockMatch);
      
      const result = await MatchDomainService.updateMatchState(1, {
        homeScore: 2,
        awayScore: 1,
        gameTime: 1800,
        status: 'COMPLETED',
      });
      
      expect(result).toBeDefined();
      expect(result.homeScore).toBe(2);
      expect(result.awayScore).toBe(1);
      expect(result.status).toBe('COMPLETED');
    });
  });
});