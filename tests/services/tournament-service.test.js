/**
 * Tournament Service Tests
 * Tests tournament logic and bracket generation
 */

const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const { TournamentService } = require('../../server/services/tournamentService');

const mockPrisma = {
  tournament: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  tournamentEntry: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  game: {
    create: jest.fn(),
  },
};

describe('Tournament Service', () => {
  let tournamentService;

  beforeEach(() => {
    jest.clearAllMocks();
    tournamentService = new TournamentService();
    tournamentService.prisma = mockPrisma;
  });

  describe('Bracket Generation', () => {
    it('should generate 8-team bracket correctly', async () => {
      const mockEntries = Array.from({ length: 8 }, (_, i) => ({
        id: `entry${i + 1}`,
        teamId: `team${i + 1}`,
        team: { name: `Team ${i + 1}` },
      }));

      mockPrisma.tournamentEntry.findMany.mockResolvedValue(mockEntries);
      mockPrisma.game.create.mockResolvedValue({ id: 'match1' });

      const bracket = await tournamentService.generateBracket('tournament1');

      expect(bracket.quarterfinals).toHaveLength(4);
      expect(mockPrisma.game.create).toHaveBeenCalledTimes(4);
    });

    it('should handle winner advancement', async () => {
      const mockMatches = [
        { id: 'match1', homeScore: 3, awayScore: 1, homeTeamId: 'team1', awayTeamId: 'team2' },
        { id: 'match2', homeScore: 2, awayScore: 4, homeTeamId: 'team3', awayTeamId: 'team4' },
      ];

      const winners = tournamentService.getMatchWinners(mockMatches);
      expect(winners).toEqual(['team1', 'team4']);
    });
  });

  describe('Tournament Completion', () => {
    it('should assign final rankings correctly', async () => {
      const mockTournament = { id: 'tournament1', status: 'IN_PROGRESS' };
      const mockFinalsMatch = {
        homeScore: 3,
        awayScore: 1,
        homeTeamId: 'team1',
        awayTeamId: 'team2',
      };

      const rankings = tournamentService.calculateFinalRankings(mockTournament, mockFinalsMatch);

      expect(rankings).toEqual({
        champion: 'team1',
        runnerUp: 'team2',
        third: expect.any(String),
        fourth: expect.any(String),
      });
    });
  });
});

module.exports = {};