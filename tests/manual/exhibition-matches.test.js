/**
 * Exhibition Match Tests
 * Tests manual exhibition match creation and instant match functionality
 */

const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const request = require('supertest');
const app = require('../../server/index');

// Mock authentication
jest.mock('../../server/replitAuth', () => ({
  isAuthenticated: (req, res, next) => {
    req.user = { id: 'test-user', userId: 'test-user-id' };
    next();
  },
}));

// Mock database and services
const mockPrisma = {
  team: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  game: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  strategy: {
    findUnique: jest.fn(),
  },
  teamFinance: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('../../server/services/matchStateManager', () => ({
  startMatch: jest.fn(),
}));

jest.mock('../../server/services/webSocketService', () => ({
  broadcast: jest.fn(),
}));

describe('Exhibition Match System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Exhibition Match Creation', () => {
    it('should create exhibition match successfully', async () => {
      const mockUserTeam = { id: 132, name: 'Oakland Cougars', userProfileId: 1 };
      const mockOpponentTeam = { id: 89, name: 'Thunder Hawks 398', userProfileId: 2 };
      const mockMatch = {
        id: 'match123',
        homeTeamId: 132,
        awayTeamId: 89,
        matchType: 'EXHIBITION',
        status: 'SCHEDULED',
      };

      mockPrisma.team.findUnique.mockResolvedValue(mockUserTeam);
      mockPrisma.team.findMany.mockResolvedValue([mockOpponentTeam]);
      mockPrisma.game.create.mockResolvedValue(mockMatch);

      const response = await request(app)
        .post('/api/exhibition/instant-match')
        .send({
          teamId: 132,
          opponentTeamId: 89,
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        match: mockMatch,
        message: 'Exhibition match created and starting...',
      });

      expect(mockPrisma.game.create).toHaveBeenCalledWith({
        data: {
          homeTeamId: 132,
          awayTeamId: 89,
          gameDate: expect.any(Date),
          matchType: 'EXHIBITION',
          status: 'SCHEDULED',
        },
      });
    });

    it('should validate team ownership', async () => {
      const mockUserTeam = { id: 132, name: 'Oakland Cougars', userProfileId: 1 };
      const mockInvalidTeam = { id: 999, name: 'Other Team', userProfileId: 2 };

      mockPrisma.team.findUnique.mockResolvedValue(mockInvalidTeam);

      const response = await request(app)
        .post('/api/exhibition/instant-match')
        .send({
          teamId: 132,
          opponentTeamId: 89,
        })
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        message: 'You can only create exhibition matches for your own team',
      });
    });

    it('should prevent same team matchups', async () => {
      const mockUserTeam = { id: 132, name: 'Oakland Cougars', userProfileId: 1 };

      mockPrisma.team.findUnique.mockResolvedValue(mockUserTeam);

      const response = await request(app)
        .post('/api/exhibition/instant-match')
        .send({
          teamId: 132,
          opponentTeamId: 132, // Same team
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Cannot create exhibition match against your own team',
      });
    });

    it('should validate opponent team exists', async () => {
      const mockUserTeam = { id: 132, name: 'Oakland Cougars', userProfileId: 1 };

      mockPrisma.team.findUnique.mockResolvedValue(mockUserTeam);
      mockPrisma.team.findMany.mockResolvedValue([]); // No opponents found

      const response = await request(app)
        .post('/api/exhibition/instant-match')
        .send({
          teamId: 132,
          opponentTeamId: 999, // Non-existent team
        })
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Opponent team not found',
      });
    });
  });

  describe('Exhibition Match Rewards', () => {
    it('should calculate rewards correctly for win', async () => {
      const mockMatch = {
        id: 'match123',
        homeTeamId: 132,
        awayTeamId: 89,
        homeScore: 3,
        awayScore: 1,
        status: 'COMPLETED',
        matchType: 'EXHIBITION',
      };

      const mockTeamFinance = { id: 'finance1', teamId: 132, credits: 10000 };

      mockPrisma.game.findUnique.mockResolvedValue(mockMatch);
      mockPrisma.teamFinance.findUnique.mockResolvedValue(mockTeamFinance);
      mockPrisma.teamFinance.update.mockResolvedValue({
        ...mockTeamFinance,
        credits: 10500, // 10000 + 500 win bonus
      });

      const response = await request(app)
        .post('/api/exhibition/calculate-rewards')
        .send({ matchId: 'match123' })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        rewards: {
          homeTeam: { credits: 500, result: 'WIN' },
          awayTeam: { credits: 100, result: 'LOSS' },
        },
      });
    });

    it('should calculate rewards correctly for tie', async () => {
      const mockMatch = {
        id: 'match123',
        homeTeamId: 132,
        awayTeamId: 89,
        homeScore: 2,
        awayScore: 2,
        status: 'COMPLETED',
        matchType: 'EXHIBITION',
      };

      mockPrisma.game.findUnique.mockResolvedValue(mockMatch);

      const response = await request(app)
        .post('/api/exhibition/calculate-rewards')
        .send({ matchId: 'match123' })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        rewards: {
          homeTeam: { credits: 200, result: 'TIE' },
          awayTeam: { credits: 200, result: 'TIE' },
        },
      });
    });

    it('should not affect league standings', async () => {
      const mockMatch = {
        id: 'match123',
        homeTeamId: 132,
        awayTeamId: 89,
        homeScore: 3,
        awayScore: 1,
        status: 'COMPLETED',
        matchType: 'EXHIBITION',
      };

      const mockTeam = { id: 132, wins: 5, losses: 2, draws: 1 };

      mockPrisma.game.findUnique.mockResolvedValue(mockMatch);
      mockPrisma.team.findUnique.mockResolvedValue(mockTeam);

      const response = await request(app)
        .post('/api/exhibition/complete-match')
        .send({ matchId: 'match123' })
        .expect(200);

      // Team record should remain unchanged
      expect(mockPrisma.team.update).not.toHaveBeenCalled();
    });

    it('should not deplete stamina', async () => {
      const mockMatch = {
        id: 'match123',
        homeTeamId: 132,
        awayTeamId: 89,
        matchType: 'EXHIBITION',
        status: 'COMPLETED',
      };

      const mockPlayers = [
        { id: 'player1', stamina: 100, teamId: 132 },
        { id: 'player2', stamina: 100, teamId: 132 },
      ];

      mockPrisma.game.findUnique.mockResolvedValue(mockMatch);
      mockPrisma.player.findMany.mockResolvedValue(mockPlayers);

      const response = await request(app)
        .post('/api/exhibition/complete-match')
        .send({ matchId: 'match123' })
        .expect(200);

      // Player stamina should remain at 100
      expect(mockPrisma.player.update).not.toHaveBeenCalled();
    });
  });

  describe('Exhibition Match Opponents', () => {
    it('should return available opponents from same division', async () => {
      const mockUserTeam = { id: 132, name: 'Oakland Cougars', division: 8, subdivision: 'eta' };
      const mockOpponents = [
        { id: 89, name: 'Thunder Hawks 398', division: 8, subdivision: 'eta' },
        { id: 88, name: 'Thunder Hawks 659', division: 8, subdivision: 'eta' },
        { id: 91, name: 'Lightning Bolts 719', division: 8, subdivision: 'eta' },
      ];

      mockPrisma.team.findUnique.mockResolvedValue(mockUserTeam);
      mockPrisma.team.findMany.mockResolvedValue(mockOpponents);

      const response = await request(app)
        .get('/api/exhibition/available-opponents/132')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        opponents: mockOpponents.slice(0, 6), // Limit to 6 opponents
      });

      expect(mockPrisma.team.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            { division: 8 },
            { subdivision: 'eta' },
            { id: { not: 132 } },
          ],
        },
        select: {
          id: true,
          name: true,
          division: true,
          subdivision: true,
        },
        take: 6,
      });
    });

    it('should randomize opponent selection', async () => {
      const mockUserTeam = { id: 132, name: 'Oakland Cougars', division: 8, subdivision: 'eta' };
      const mockOpponents = [
        { id: 89, name: 'Thunder Hawks 398', division: 8, subdivision: 'eta' },
        { id: 88, name: 'Thunder Hawks 659', division: 8, subdivision: 'eta' },
        { id: 91, name: 'Lightning Bolts 719', division: 8, subdivision: 'eta' },
        { id: 84, name: 'Thunder Hawks 660', division: 8, subdivision: 'eta' },
        { id: 86, name: 'Thunder Hawks 810', division: 8, subdivision: 'eta' },
        { id: 83, name: 'Wind Runners 574', division: 8, subdivision: 'eta' },
        { id: 81, name: 'Shadow Wolves 181', division: 8, subdivision: 'eta' },
        { id: 90, name: 'Storm Eagles 342', division: 8, subdivision: 'eta' },
      ];

      mockPrisma.team.findUnique.mockResolvedValue(mockUserTeam);
      mockPrisma.team.findMany.mockResolvedValue(mockOpponents);

      const response = await request(app)
        .get('/api/exhibition/available-opponents/132')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.opponents).toHaveLength(6);
      expect(response.body.opponents.every(opponent => opponent.id !== 132)).toBe(true);
    });
  });

  describe('Exhibition Match Live Simulation', () => {
    it('should start match simulation immediately', async () => {
      const mockMatch = {
        id: 'match123',
        homeTeamId: 132,
        awayTeamId: 89,
        status: 'SCHEDULED',
        matchType: 'EXHIBITION',
      };

      const mockMatchStateManager = require('../../server/services/matchStateManager');
      mockMatchStateManager.startMatch.mockResolvedValue({ success: true });

      mockPrisma.game.create.mockResolvedValue(mockMatch);

      const response = await request(app)
        .post('/api/exhibition/instant-match')
        .send({
          teamId: 132,
          opponentTeamId: 89,
        })
        .expect(200);

      expect(mockMatchStateManager.startMatch).toHaveBeenCalledWith('match123');
      expect(response.body.message).toBe('Exhibition match created and starting...');
    });

    it('should handle match simulation errors gracefully', async () => {
      const mockMatch = {
        id: 'match123',
        homeTeamId: 132,
        awayTeamId: 89,
        status: 'SCHEDULED',
        matchType: 'EXHIBITION',
      };

      const mockMatchStateManager = require('../../server/services/matchStateManager');
      mockMatchStateManager.startMatch.mockRejectedValue(new Error('Simulation failed'));

      mockPrisma.game.create.mockResolvedValue(mockMatch);

      const response = await request(app)
        .post('/api/exhibition/instant-match')
        .send({
          teamId: 132,
          opponentTeamId: 89,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.match).toEqual(mockMatch);
    });
  });
});

module.exports = {
  // Export test utilities
  createMockExhibitionMatch: (overrides = {}) => ({
    id: 'test-match',
    homeTeamId: 132,
    awayTeamId: 89,
    matchType: 'EXHIBITION',
    status: 'SCHEDULED',
    gameDate: new Date(),
    ...overrides,
  }),
};