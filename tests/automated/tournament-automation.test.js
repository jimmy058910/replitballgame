/**
 * Tournament Automation System Tests
 * Tests automated tournament creation, bracket generation, and match progression
 */

const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const { UnifiedTournamentAutomation } = require('../../server/services/unifiedTournamentAutomation');
const { TournamentFlowService } = require('../../server/services/tournamentFlowService');
const { SeasonTimingAutomationService } = require('../../server/services/seasonTimingAutomationService');

// Mock database
const mockPrisma = {
  tournament: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  tournamentEntry: {
    findMany: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
  },
  game: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  team: {
    findMany: jest.fn(),
  },
  season: {
    findFirst: jest.fn(),
  },
};

// Mock services
jest.mock('../../server/services/errorService', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
}));

jest.mock('../../server/services/webSocketService', () => ({
  broadcast: jest.fn(),
}));

describe('Tournament Automation System', () => {
  let tournamentAutomation;
  let tournamentFlowService;
  let seasonTimingService;

  beforeEach(() => {
    jest.clearAllMocks();
    tournamentAutomation = new UnifiedTournamentAutomation();
    tournamentFlowService = new TournamentFlowService();
    seasonTimingService = new SeasonTimingAutomationService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Daily Division Tournament Creation', () => {
    it('should create daily division tournaments automatically', async () => {
      const mockSeason = { currentDay: 7, phase: 'REGULAR_SEASON' };
      const mockDivisions = [
        { id: 'league1', division: 8, subdivision: 'eta' },
        { id: 'league2', division: 8, subdivision: 'main' },
      ];

      mockPrisma.season.findFirst.mockResolvedValue(mockSeason);
      mockPrisma.tournament.findFirst.mockResolvedValue(null); // No existing tournament
      mockPrisma.tournament.create.mockResolvedValue({ id: 'tournament1', type: 'DAILY_DIVISION' });

      // Mock the service to use our mock prisma
      tournamentAutomation.prisma = mockPrisma;

      const result = await tournamentAutomation.createDailyDivisionTournaments();

      expect(mockPrisma.tournament.create).toHaveBeenCalled();
      expect(result).toEqual({ created: expect.any(Number), total: expect.any(Number) });
    });

    it('should generate tournament bracket correctly', async () => {
      const mockTournament = { id: 'tournament1', type: 'DAILY_DIVISION' };
      const mockEntries = [
        { id: 'entry1', teamId: 'team1', team: { name: 'Team 1' } },
        { id: 'entry2', teamId: 'team2', team: { name: 'Team 2' } },
        { id: 'entry3', teamId: 'team3', team: { name: 'Team 3' } },
        { id: 'entry4', teamId: 'team4', team: { name: 'Team 4' } },
        { id: 'entry5', teamId: 'team5', team: { name: 'Team 5' } },
        { id: 'entry6', teamId: 'team6', team: { name: 'Team 6' } },
        { id: 'entry7', teamId: 'team7', team: { name: 'Team 7' } },
        { id: 'entry8', teamId: 'team8', team: { name: 'Team 8' } },
      ];

      mockPrisma.tournamentEntry.findMany.mockResolvedValue(mockEntries);
      mockPrisma.game.create.mockResolvedValue({ id: 'match1' });

      // Mock the service to use our mock prisma
      tournamentAutomation.prisma = mockPrisma;

      const bracket = await tournamentAutomation.generateTournamentBracket(mockTournament);

      expect(bracket).toHaveProperty('quarterfinals');
      expect(bracket.quarterfinals).toHaveLength(4);
      expect(mockPrisma.game.create).toHaveBeenCalledTimes(4); // 4 quarterfinal matches
    });

    it('should advance to next round when previous round completes', async () => {
      const mockTournament = { id: 'tournament1', type: 'DAILY_DIVISION' };
      const mockCompletedMatches = [
        { id: 'match1', homeScore: 3, awayScore: 1, homeTeamId: 'team1', awayTeamId: 'team2' },
        { id: 'match2', homeScore: 2, awayScore: 4, homeTeamId: 'team3', awayTeamId: 'team4' },
        { id: 'match3', homeScore: 1, awayScore: 2, homeTeamId: 'team5', awayTeamId: 'team6' },
        { id: 'match4', homeScore: 3, awayScore: 0, homeTeamId: 'team7', awayTeamId: 'team8' },
      ];

      mockPrisma.game.findMany.mockResolvedValue(mockCompletedMatches);
      mockPrisma.game.create.mockResolvedValue({ id: 'semifinal1' });

      // Mock the service to use our mock prisma
      tournamentAutomation.prisma = mockPrisma;

      const advanceResult = await tournamentAutomation.advanceToNextRound(mockTournament, 1);

      expect(advanceResult).toEqual({ advanced: true, nextRound: 2 });
      expect(mockPrisma.game.create).toHaveBeenCalledTimes(2); // 2 semifinal matches
    });
  });

  describe('Mid-Season Cup Automation', () => {
    it('should create Mid-Season Cup on Day 7', async () => {
      const mockSeason = { currentDay: 7, phase: 'REGULAR_SEASON' };
      mockPrisma.season.findFirst.mockResolvedValue(mockSeason);
      mockPrisma.tournament.findFirst.mockResolvedValue(null); // No existing tournament

      // Mock the service to use our mock prisma
      seasonTimingService.prisma = mockPrisma;

      const shouldCreate = await seasonTimingService.shouldCreateMidSeasonCup();
      expect(shouldCreate).toBe(true);
    });

    it('should handle Mid-Season Cup registration', async () => {
      const mockTournament = { id: 'midseason1', type: 'MID_SEASON_CUP', status: 'REGISTRATION' };
      const mockTeam = { id: 'team1', name: 'Test Team' };

      mockPrisma.tournament.findFirst.mockResolvedValue(mockTournament);
      mockPrisma.tournamentEntry.create.mockResolvedValue({ id: 'entry1' });

      // Mock the service to use our mock prisma
      tournamentAutomation.prisma = mockPrisma;

      const entry = await tournamentAutomation.registerTeamForMidSeasonCup(mockTeam.id);

      expect(mockPrisma.tournamentEntry.create).toHaveBeenCalledWith({
        data: {
          tournamentId: mockTournament.id,
          teamId: mockTeam.id,
          entryFee: 10000,
          paymentMethod: 'CREDITS',
        },
      });
      expect(entry).toHaveProperty('id');
    });
  });

  describe('Tournament Auto-Start System', () => {
    it('should auto-start tournaments when countdown reaches zero', async () => {
      const mockTournament = {
        id: 'tournament1',
        type: 'DAILY_DIVISION',
        status: 'REGISTRATION',
        startTime: new Date(Date.now() - 60000), // 1 minute ago
      };

      mockPrisma.tournament.findMany.mockResolvedValue([mockTournament]);
      mockPrisma.tournament.update.mockResolvedValue({ ...mockTournament, status: 'IN_PROGRESS' });

      // Mock the service to use our mock prisma
      seasonTimingService.prisma = mockPrisma;

      const result = await seasonTimingService.checkTournamentAutoStart();

      expect(mockPrisma.tournament.update).toHaveBeenCalledWith({
        where: { id: mockTournament.id },
        data: { status: 'IN_PROGRESS' },
      });
      expect(result).toEqual({ autoStarted: 1, total: 1 });
    });

    it('should fill incomplete tournaments with AI teams', async () => {
      const mockTournament = {
        id: 'tournament1',
        type: 'DAILY_DIVISION',
        status: 'REGISTRATION',
        maxParticipants: 8,
      };

      const mockEntries = [
        { id: 'entry1', teamId: 'team1' },
        { id: 'entry2', teamId: 'team2' },
        { id: 'entry3', teamId: 'team3' },
      ];

      mockPrisma.tournamentEntry.findMany.mockResolvedValue(mockEntries);
      mockPrisma.team.findMany.mockResolvedValue([]);
      mockPrisma.tournamentEntry.create.mockResolvedValue({ id: 'ai-entry' });

      // Mock the service to use our mock prisma
      tournamentAutomation.prisma = mockPrisma;

      const fillResult = await tournamentAutomation.fillTournamentWithAI(mockTournament);

      expect(fillResult).toEqual({ filled: 5, total: 8 }); // 5 AI teams added
      expect(mockPrisma.tournamentEntry.create).toHaveBeenCalledTimes(5);
    });
  });

  describe('Tournament Completion', () => {
    it('should complete tournament when finals finish', async () => {
      const mockTournament = { id: 'tournament1', type: 'DAILY_DIVISION', status: 'IN_PROGRESS' };
      const mockFinalsMatch = {
        id: 'finals1',
        homeScore: 3,
        awayScore: 1,
        homeTeamId: 'team1',
        awayTeamId: 'team2',
        status: 'COMPLETED',
      };

      mockPrisma.game.findFirst.mockResolvedValue(mockFinalsMatch);
      mockPrisma.tournament.update.mockResolvedValue({ ...mockTournament, status: 'COMPLETED' });
      mockPrisma.tournamentEntry.updateMany.mockResolvedValue({ count: 2 });

      // Mock the service to use our mock prisma
      tournamentAutomation.prisma = mockPrisma;

      const completion = await tournamentAutomation.completeTournament(mockTournament);

      expect(mockPrisma.tournament.update).toHaveBeenCalledWith({
        where: { id: mockTournament.id },
        data: { status: 'COMPLETED' },
      });
      expect(completion).toEqual({ completed: true, champion: 'team1', runnerUp: 'team2' });
    });

    it('should distribute tournament prizes correctly', async () => {
      const mockTournament = { id: 'tournament1', type: 'DAILY_DIVISION', prizePool: 50000 };
      const mockEntries = [
        { id: 'entry1', teamId: 'team1', finalRank: 1 },
        { id: 'entry2', teamId: 'team2', finalRank: 2 },
        { id: 'entry3', teamId: 'team3', finalRank: 3 },
      ];

      mockPrisma.tournamentEntry.findMany.mockResolvedValue(mockEntries);

      // Mock the service to use our mock prisma
      tournamentAutomation.prisma = mockPrisma;

      const prizes = await tournamentAutomation.calculateTournamentPrizes(mockTournament);

      expect(prizes).toEqual({
        first: 25000,  // 50% of prize pool
        second: 15000, // 30% of prize pool
        third: 10000,  // 20% of prize pool
      });
    });
  });
});

module.exports = {
  // Export test utilities for integration tests
  mockPrisma,
  createMockTournament: (overrides = {}) => ({
    id: 'test-tournament',
    type: 'DAILY_DIVISION',
    status: 'REGISTRATION',
    maxParticipants: 8,
    prizePool: 50000,
    ...overrides,
  }),
};