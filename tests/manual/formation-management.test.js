/**
 * Formation Management Tests
 * Tests manual tactical formation management and player positioning
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

// Mock database
const mockPrisma = {
  strategy: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
  },
  player: {
    findMany: jest.fn(),
  },
  team: {
    findUnique: jest.fn(),
  },
};

describe('Formation Management System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Formation Saving', () => {
    it('should save formation data correctly', async () => {
      const mockTeam = { id: 132, name: 'Test Team', userProfileId: 1 };
      const mockFormation = {
        starters: [
          { playerId: 'player1', position: 'PASSER', order: 1 },
          { playerId: 'player2', position: 'RUNNER', order: 2 },
          { playerId: 'player3', position: 'RUNNER', order: 3 },
          { playerId: 'player4', position: 'BLOCKER', order: 4 },
          { playerId: 'player5', position: 'BLOCKER', order: 5 },
          { playerId: 'player6', position: 'WILDCARD', order: 6 },
        ],
        substitutes: [
          { playerId: 'player7', position: 'PASSER', order: 7 },
          { playerId: 'player8', position: 'RUNNER', order: 8 },
        ],
        fieldSize: 'STANDARD',
        formation: '1-2-2-1',
      };

      mockPrisma.team.findUnique.mockResolvedValue(mockTeam);
      mockPrisma.strategy.upsert.mockResolvedValue({ id: 'strategy1', formationJson: JSON.stringify(mockFormation) });

      const response = await request(app)
        .put('/api/formation/save')
        .send({ teamId: 132, formation: mockFormation })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Formation saved successfully',
        formation: mockFormation,
      });
    });

    it('should validate formation structure', async () => {
      const invalidFormation = {
        starters: [
          { playerId: 'player1', position: 'PASSER', order: 1 },
          // Missing required positions
        ],
        substitutes: [],
        fieldSize: 'STANDARD',
        formation: '1-2-2-1',
      };

      const response = await request(app)
        .put('/api/formation/save')
        .send({ teamId: 132, formation: invalidFormation })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Formation must have exactly 6 starters',
      });
    });

    it('should enforce position requirements', async () => {
      const invalidFormation = {
        starters: [
          { playerId: 'player1', position: 'PASSER', order: 1 },
          { playerId: 'player2', position: 'PASSER', order: 2 }, // Too many passers
          { playerId: 'player3', position: 'PASSER', order: 3 },
          { playerId: 'player4', position: 'BLOCKER', order: 4 },
          { playerId: 'player5', position: 'BLOCKER', order: 5 },
          { playerId: 'player6', position: 'WILDCARD', order: 6 },
        ],
        substitutes: [],
        fieldSize: 'STANDARD',
        formation: '3-0-2-1',
      };

      const response = await request(app)
        .put('/api/formation/save')
        .send({ teamId: 132, formation: invalidFormation })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Invalid formation: requires at least 1 Passer, 2 Runners, 2 Blockers',
      });
    });

    it('should handle field size changes correctly', async () => {
      const mockTeam = { id: 132, name: 'Test Team', userProfileId: 1 };
      const mockSeason = { currentDay: 16, phase: 'OFFSEASON' }; // Allow field size changes

      mockPrisma.team.findUnique.mockResolvedValue(mockTeam);
      mockPrisma.season.findFirst.mockResolvedValue(mockSeason);

      const formationWithFieldSize = {
        starters: [
          { playerId: 'player1', position: 'PASSER', order: 1 },
          { playerId: 'player2', position: 'RUNNER', order: 2 },
          { playerId: 'player3', position: 'RUNNER', order: 3 },
          { playerId: 'player4', position: 'BLOCKER', order: 4 },
          { playerId: 'player5', position: 'BLOCKER', order: 5 },
          { playerId: 'player6', position: 'WILDCARD', order: 6 },
        ],
        substitutes: [],
        fieldSize: 'LARGE',
        formation: '1-2-2-1',
      };

      const response = await request(app)
        .put('/api/formation/save')
        .send({ teamId: 132, formation: formationWithFieldSize })
        .expect(200);

      expect(response.body.formation.fieldSize).toBe('LARGE');
    });

    it('should reject field size changes during season', async () => {
      const mockTeam = { id: 132, name: 'Test Team', userProfileId: 1 };
      const mockSeason = { currentDay: 10, phase: 'REGULAR_SEASON' }; // Reject field size changes

      mockPrisma.team.findUnique.mockResolvedValue(mockTeam);
      mockPrisma.season.findFirst.mockResolvedValue(mockSeason);

      const formationWithFieldSize = {
        starters: [
          { playerId: 'player1', position: 'PASSER', order: 1 },
          { playerId: 'player2', position: 'RUNNER', order: 2 },
          { playerId: 'player3', position: 'RUNNER', order: 3 },
          { playerId: 'player4', position: 'BLOCKER', order: 4 },
          { playerId: 'player5', position: 'BLOCKER', order: 5 },
          { playerId: 'player6', position: 'WILDCARD', order: 6 },
        ],
        substitutes: [],
        fieldSize: 'LARGE',
        formation: '1-2-2-1',
      };

      const response = await request(app)
        .put('/api/formation/save')
        .send({ teamId: 132, formation: formationWithFieldSize })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Field size changes are only allowed during offseason (Days 16-17)',
      });
    });
  });

  describe('Formation Retrieval', () => {
    it('should retrieve saved formation data', async () => {
      const mockTeam = { id: 132, name: 'Test Team', userProfileId: 1 };
      const mockFormation = {
        starters: [
          { playerId: 'player1', position: 'PASSER', order: 1 },
          { playerId: 'player2', position: 'RUNNER', order: 2 },
          { playerId: 'player3', position: 'RUNNER', order: 3 },
          { playerId: 'player4', position: 'BLOCKER', order: 4 },
          { playerId: 'player5', position: 'BLOCKER', order: 5 },
          { playerId: 'player6', position: 'WILDCARD', order: 6 },
        ],
        substitutes: [
          { playerId: 'player7', position: 'PASSER', order: 7 },
        ],
        fieldSize: 'STANDARD',
        formation: '1-2-2-1',
      };

      mockPrisma.team.findUnique.mockResolvedValue(mockTeam);
      mockPrisma.strategy.findUnique.mockResolvedValue({
        id: 'strategy1',
        formationJson: JSON.stringify(mockFormation),
      });

      const response = await request(app)
        .get('/api/formation/132')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        formation: mockFormation,
      });
    });

    it('should return default formation when none saved', async () => {
      const mockTeam = { id: 132, name: 'Test Team', userProfileId: 1 };
      const mockPlayers = [
        { id: 'player1', role: 'PASSER', firstName: 'John', lastName: 'Doe' },
        { id: 'player2', role: 'RUNNER', firstName: 'Jane', lastName: 'Smith' },
        { id: 'player3', role: 'RUNNER', firstName: 'Bob', lastName: 'Johnson' },
        { id: 'player4', role: 'BLOCKER', firstName: 'Alice', lastName: 'Brown' },
        { id: 'player5', role: 'BLOCKER', firstName: 'Charlie', lastName: 'Davis' },
        { id: 'player6', role: 'WILDCARD', firstName: 'Diana', lastName: 'Wilson' },
      ];

      mockPrisma.team.findUnique.mockResolvedValue(mockTeam);
      mockPrisma.strategy.findUnique.mockResolvedValue(null);
      mockPrisma.player.findMany.mockResolvedValue(mockPlayers);

      const response = await request(app)
        .get('/api/formation/132')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.formation.starters).toHaveLength(6);
      expect(response.body.formation.fieldSize).toBe('STANDARD');
    });
  });

  describe('Formation Validation', () => {
    it('should validate player ownership', async () => {
      const mockTeam = { id: 132, name: 'Test Team', userProfileId: 1 };
      const mockPlayers = [
        { id: 'player1', teamId: 132, role: 'PASSER' },
        { id: 'player2', teamId: 132, role: 'RUNNER' },
        // player3 belongs to different team
      ];

      mockPrisma.team.findUnique.mockResolvedValue(mockTeam);
      mockPrisma.player.findMany.mockResolvedValue(mockPlayers);

      const formationWithInvalidPlayer = {
        starters: [
          { playerId: 'player1', position: 'PASSER', order: 1 },
          { playerId: 'player2', position: 'RUNNER', order: 2 },
          { playerId: 'player3', position: 'RUNNER', order: 3 }, // Invalid player
          { playerId: 'player4', position: 'BLOCKER', order: 4 },
          { playerId: 'player5', position: 'BLOCKER', order: 5 },
          { playerId: 'player6', position: 'WILDCARD', order: 6 },
        ],
        substitutes: [],
        fieldSize: 'STANDARD',
        formation: '1-2-2-1',
      };

      const response = await request(app)
        .put('/api/formation/save')
        .send({ teamId: 132, formation: formationWithInvalidPlayer })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Player player3 does not belong to this team',
      });
    });

    it('should validate substitute order', async () => {
      const mockTeam = { id: 132, name: 'Test Team', userProfileId: 1 };
      const mockPlayers = [
        { id: 'player1', teamId: 132, role: 'PASSER' },
        { id: 'player2', teamId: 132, role: 'RUNNER' },
        { id: 'player3', teamId: 132, role: 'RUNNER' },
        { id: 'player4', teamId: 132, role: 'BLOCKER' },
        { id: 'player5', teamId: 132, role: 'BLOCKER' },
        { id: 'player6', teamId: 132, role: 'WILDCARD' },
        { id: 'player7', teamId: 132, role: 'PASSER' },
        { id: 'player8', teamId: 132, role: 'RUNNER' },
      ];

      mockPrisma.team.findUnique.mockResolvedValue(mockTeam);
      mockPrisma.player.findMany.mockResolvedValue(mockPlayers);

      const formationWithValidSubstitutes = {
        starters: [
          { playerId: 'player1', position: 'PASSER', order: 1 },
          { playerId: 'player2', position: 'RUNNER', order: 2 },
          { playerId: 'player3', position: 'RUNNER', order: 3 },
          { playerId: 'player4', position: 'BLOCKER', order: 4 },
          { playerId: 'player5', position: 'BLOCKER', order: 5 },
          { playerId: 'player6', position: 'WILDCARD', order: 6 },
        ],
        substitutes: [
          { playerId: 'player7', position: 'PASSER', order: 7 },
          { playerId: 'player8', position: 'RUNNER', order: 8 },
        ],
        fieldSize: 'STANDARD',
        formation: '1-2-2-1',
      };

      const response = await request(app)
        .put('/api/formation/save')
        .send({ teamId: 132, formation: formationWithValidSubstitutes })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.formation.substitutes).toHaveLength(2);
    });
  });
});

module.exports = {
  // Export test utilities
  createMockFormation: (overrides = {}) => ({
    starters: [
      { playerId: 'player1', position: 'PASSER', order: 1 },
      { playerId: 'player2', position: 'RUNNER', order: 2 },
      { playerId: 'player3', position: 'RUNNER', order: 3 },
      { playerId: 'player4', position: 'BLOCKER', order: 4 },
      { playerId: 'player5', position: 'BLOCKER', order: 5 },
      { playerId: 'player6', position: 'WILDCARD', order: 6 },
    ],
    substitutes: [],
    fieldSize: 'STANDARD',
    formation: '1-2-2-1',
    ...overrides,
  }),
};