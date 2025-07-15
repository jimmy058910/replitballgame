import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TournamentDomainService } from '../../domains/tournaments/service';
import { prisma } from '../../db';

// Mock Prisma
vi.mock('../../db', () => ({
  prisma: {
    tournamentEntry: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    tournament: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    team: {
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

describe('TournamentDomainService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerForTournament', () => {
    it('should register team for tournament successfully', async () => {
      // Mock no existing registration
      vi.mocked(prisma.tournamentEntry.findFirst).mockResolvedValue(null);
      
      // Mock tournament exists
      vi.mocked(prisma.tournament.findFirst).mockResolvedValue({
        id: 1,
        name: 'Test Tournament',
        division: 8,
        status: 'REGISTRATION_OPEN',
      });
      
      // Mock registration creation
      vi.mocked(prisma.tournamentEntry.create).mockResolvedValue({
        id: 1,
        teamId: 132,
        tournamentId: 1,
        registeredAt: new Date(),
        tournament: {
          id: 1,
          name: 'Test Tournament',
          type: 'DAILY_DIVISIONAL',
          division: 8,
          status: 'REGISTRATION_OPEN',
          createdAt: new Date(),
        },
      });
      
      const result = await TournamentDomainService.registerForTournament(132, {
        division: 8,
      });
      
      expect(result).toBeDefined();
      expect(result.teamId).toBe(132);
      expect(result.tournament.name).toBe('Test Tournament');
      expect(prisma.tournamentEntry.create).toHaveBeenCalledWith({
        data: {
          teamId: 132,
          tournamentId: 1,
          registeredAt: expect.any(Date),
        },
        include: {
          tournament: true,
        },
      });
    });

    it('should throw error if team already registered', async () => {
      // Mock existing registration
      vi.mocked(prisma.tournamentEntry.findFirst).mockResolvedValue({
        id: 1,
        teamId: 132,
        tournamentId: 1,
        tournament: {
          name: 'Existing Tournament',
        },
      });
      
      await expect(
        TournamentDomainService.registerForTournament(132, { division: 8 })
      ).rejects.toThrow('Team is already registered for Existing Tournament');
    });

    it('should throw error if no tournament available', async () => {
      // Mock no existing registration
      vi.mocked(prisma.tournamentEntry.findFirst).mockResolvedValue(null);
      
      // Mock no tournament available
      vi.mocked(prisma.tournament.findFirst).mockResolvedValue(null);
      
      await expect(
        TournamentDomainService.registerForTournament(132, { division: 8 })
      ).rejects.toThrow('Available tournament for this division not found');
    });
  });

  describe('getTournamentHistory', () => {
    it('should return tournament history for team', async () => {
      const mockHistory = [
        {
          id: 1,
          teamId: 132,
          tournamentId: 1,
          registeredAt: new Date(),
          finalRank: 1,
          tournament: {
            id: 1,
            name: 'Test Tournament',
            type: 'DAILY_DIVISIONAL',
            division: 8,
            status: 'COMPLETED',
            createdAt: new Date(),
          },
        },
      ];
      
      vi.mocked(prisma.tournamentEntry.findMany).mockResolvedValue(mockHistory);
      
      const result = await TournamentDomainService.getTournamentHistory(132);
      
      expect(result).toHaveLength(1);
      expect(result[0].teamId).toBe(132);
      expect(result[0].finalRank).toBe(1);
      expect(prisma.tournamentEntry.findMany).toHaveBeenCalledWith({
        where: {
          teamId: 132,
          finalRank: { not: null },
        },
        include: {
          tournament: {
            select: {
              id: true,
              name: true,
              type: true,
              division: true,
              status: true,
              seasonDay: true,
              tournamentId: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          registeredAt: 'desc',
        },
        take: 20,
      });
    });
  });

  describe('getTournamentStatus', () => {
    it('should return tournament status with participants', async () => {
      const mockTournament = {
        id: 1,
        tournamentId: 1,
        name: 'Test Tournament',
        type: 'DAILY_DIVISIONAL',
        division: 8,
        status: 'REGISTRATION_OPEN',
        participants: [
          {
            registeredAt: new Date(),
            team: {
              id: 132,
              name: 'Test Team',
              division: 8,
            },
          },
        ],
      };
      
      vi.mocked(prisma.tournament.findUnique).mockResolvedValue(mockTournament);
      
      const result = await TournamentDomainService.getTournamentStatus(1);
      
      expect(result).toBeDefined();
      expect(result.name).toBe('Test Tournament');
      expect(result.participantCount).toBe(1);
      expect(result.participants).toHaveLength(1);
      expect(result.participants[0].name).toBe('Test Team');
    });

    it('should throw error if tournament not found', async () => {
      vi.mocked(prisma.tournament.findUnique).mockResolvedValue(null);
      
      await expect(
        TournamentDomainService.getTournamentStatus(999)
      ).rejects.toThrow('Tournament not found');
    });
  });
});