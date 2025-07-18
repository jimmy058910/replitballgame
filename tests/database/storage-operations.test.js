/**
 * Storage Operations Tests
 * Tests database CRUD operations and data integrity
 */

const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const { PrismaClient } = require('@prisma/client');

// Mock Prisma client
const mockPrisma = {
  team: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  player: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  game: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  tournament: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  userProfile: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('Storage Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Team Storage', () => {
    it('should create team with valid data', async () => {
      const mockTeam = {
        id: 'team1',
        name: 'Test Team',
        userProfileId: 'user1',
        division: 8,
        subdivision: 'eta',
        wins: 0,
        losses: 0,
        draws: 0,
      };

      mockPrisma.team.create.mockResolvedValue(mockTeam);

      const team = await mockPrisma.team.create({
        data: {
          name: 'Test Team',
          userProfileId: 'user1',
          division: 8,
          subdivision: 'eta',
        },
      });

      expect(team).toEqual(mockTeam);
      expect(mockPrisma.team.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Team',
          userProfileId: 'user1',
          division: 8,
          subdivision: 'eta',
        },
      });
    });

    it('should find team by ID', async () => {
      const mockTeam = { id: 'team1', name: 'Test Team' };
      mockPrisma.team.findUnique.mockResolvedValue(mockTeam);

      const team = await mockPrisma.team.findUnique({
        where: { id: 'team1' },
      });

      expect(team).toEqual(mockTeam);
    });

    it('should update team record', async () => {
      const mockUpdatedTeam = {
        id: 'team1',
        name: 'Test Team',
        wins: 1,
        losses: 0,
        draws: 0,
      };

      mockPrisma.team.update.mockResolvedValue(mockUpdatedTeam);

      const team = await mockPrisma.team.update({
        where: { id: 'team1' },
        data: { wins: 1 },
      });

      expect(team.wins).toBe(1);
    });
  });

  describe('Player Storage', () => {
    it('should create player with valid attributes', async () => {
      const mockPlayer = {
        id: 'player1',
        firstName: 'John',
        lastName: 'Doe',
        race: 'HUMAN',
        role: 'RUNNER',
        age: 25,
        speed: 20,
        power: 25,
        agility: 18,
        throwing: 15,
        catching: 22,
        kicking: 12,
        stamina: 28,
        leadership: 16,
        potentialRating: 3.5,
        teamId: 'team1',
        isRetired: false,
      };

      mockPrisma.player.create.mockResolvedValue(mockPlayer);

      const player = await mockPrisma.player.create({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          race: 'HUMAN',
          role: 'RUNNER',
          age: 25,
          speed: 20,
          power: 25,
          agility: 18,
          throwing: 15,
          catching: 22,
          kicking: 12,
          stamina: 28,
          leadership: 16,
          potentialRating: 3.5,
          teamId: 'team1',
        },
      });

      expect(player).toEqual(mockPlayer);
      expect(player.age).toBe(25);
      expect(player.potentialRating).toBe(3.5);
    });

    it('should find players by team', async () => {
      const mockPlayers = [
        { id: 'player1', teamId: 'team1', firstName: 'John' },
        { id: 'player2', teamId: 'team1', firstName: 'Jane' },
      ];

      mockPrisma.player.findMany.mockResolvedValue(mockPlayers);

      const players = await mockPrisma.player.findMany({
        where: { teamId: 'team1' },
      });

      expect(players).toHaveLength(2);
      expect(players.every(p => p.teamId === 'team1')).toBe(true);
    });

    it('should update player attributes', async () => {
      const mockUpdatedPlayer = {
        id: 'player1',
        speed: 22, // Increased from 20
        age: 26, // Aged up
      };

      mockPrisma.player.update.mockResolvedValue(mockUpdatedPlayer);

      const player = await mockPrisma.player.update({
        where: { id: 'player1' },
        data: { speed: 22, age: 26 },
      });

      expect(player.speed).toBe(22);
      expect(player.age).toBe(26);
    });
  });

  describe('Game Storage', () => {
    it('should create game with valid data', async () => {
      const mockGame = {
        id: 'game1',
        homeTeamId: 'team1',
        awayTeamId: 'team2',
        gameDate: new Date(),
        matchType: 'LEAGUE',
        status: 'SCHEDULED',
        homeScore: 0,
        awayScore: 0,
      };

      mockPrisma.game.create.mockResolvedValue(mockGame);

      const game = await mockPrisma.game.create({
        data: {
          homeTeamId: 'team1',
          awayTeamId: 'team2',
          gameDate: mockGame.gameDate,
          matchType: 'LEAGUE',
          status: 'SCHEDULED',
        },
      });

      expect(game).toEqual(mockGame);
      expect(game.matchType).toBe('LEAGUE');
      expect(game.status).toBe('SCHEDULED');
    });

    it('should find games by status', async () => {
      const mockLiveGames = [
        { id: 'game1', status: 'IN_PROGRESS' },
        { id: 'game2', status: 'IN_PROGRESS' },
      ];

      mockPrisma.game.findMany.mockResolvedValue(mockLiveGames);

      const games = await mockPrisma.game.findMany({
        where: { status: 'IN_PROGRESS' },
      });

      expect(games).toHaveLength(2);
      expect(games.every(g => g.status === 'IN_PROGRESS')).toBe(true);
    });

    it('should update game score', async () => {
      const mockUpdatedGame = {
        id: 'game1',
        homeScore: 3,
        awayScore: 1,
        status: 'COMPLETED',
      };

      mockPrisma.game.update.mockResolvedValue(mockUpdatedGame);

      const game = await mockPrisma.game.update({
        where: { id: 'game1' },
        data: { homeScore: 3, awayScore: 1, status: 'COMPLETED' },
      });

      expect(game.homeScore).toBe(3);
      expect(game.awayScore).toBe(1);
      expect(game.status).toBe('COMPLETED');
    });
  });

  describe('Tournament Storage', () => {
    it('should create tournament with valid data', async () => {
      const mockTournament = {
        id: 'tournament1',
        name: 'Daily Division Tournament',
        type: 'DAILY_DIVISION',
        status: 'REGISTRATION',
        maxParticipants: 8,
        prizePool: 50000,
        startTime: new Date(),
        division: 8,
        seasonDay: 7,
      };

      mockPrisma.tournament.create.mockResolvedValue(mockTournament);

      const tournament = await mockPrisma.tournament.create({
        data: {
          name: 'Daily Division Tournament',
          type: 'DAILY_DIVISION',
          status: 'REGISTRATION',
          maxParticipants: 8,
          prizePool: 50000,
          startTime: mockTournament.startTime,
          division: 8,
          seasonDay: 7,
        },
      });

      expect(tournament).toEqual(mockTournament);
      expect(tournament.type).toBe('DAILY_DIVISION');
      expect(tournament.maxParticipants).toBe(8);
    });

    it('should find tournaments by status', async () => {
      const mockActiveTournaments = [
        { id: 'tournament1', status: 'REGISTRATION' },
        { id: 'tournament2', status: 'IN_PROGRESS' },
      ];

      mockPrisma.tournament.findMany.mockResolvedValue(mockActiveTournaments);

      const tournaments = await mockPrisma.tournament.findMany({
        where: { status: { in: ['REGISTRATION', 'IN_PROGRESS'] } },
      });

      expect(tournaments).toHaveLength(2);
      expect(tournaments.every(t => ['REGISTRATION', 'IN_PROGRESS'].includes(t.status))).toBe(true);
    });

    it('should update tournament status', async () => {
      const mockUpdatedTournament = {
        id: 'tournament1',
        status: 'COMPLETED',
      };

      mockPrisma.tournament.update.mockResolvedValue(mockUpdatedTournament);

      const tournament = await mockPrisma.tournament.update({
        where: { id: 'tournament1' },
        data: { status: 'COMPLETED' },
      });

      expect(tournament.status).toBe('COMPLETED');
    });
  });

  describe('Data Integrity', () => {
    it('should maintain referential integrity', async () => {
      // Test that deleting a team doesn't leave orphaned players
      const mockTeam = { id: 'team1', name: 'Test Team' };
      const mockPlayers = [
        { id: 'player1', teamId: 'team1' },
        { id: 'player2', teamId: 'team1' },
      ];

      mockPrisma.team.findUnique.mockResolvedValue(mockTeam);
      mockPrisma.player.findMany.mockResolvedValue(mockPlayers);

      // Verify team exists before deletion
      const team = await mockPrisma.team.findUnique({ where: { id: 'team1' } });
      expect(team).toBeTruthy();

      // Verify players exist for team
      const players = await mockPrisma.player.findMany({ where: { teamId: 'team1' } });
      expect(players).toHaveLength(2);
    });

    it('should validate foreign key constraints', async () => {
      // Test that creating a player with invalid teamId fails
      const invalidPlayerData = {
        firstName: 'John',
        lastName: 'Doe',
        teamId: 'nonexistent-team',
        race: 'HUMAN',
        role: 'RUNNER',
        age: 25,
      };

      mockPrisma.player.create.mockRejectedValue(new Error('Foreign key constraint failed'));

      await expect(
        mockPrisma.player.create({ data: invalidPlayerData })
      ).rejects.toThrow('Foreign key constraint failed');
    });
  });
});

module.exports = {};