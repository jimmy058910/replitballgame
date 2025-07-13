import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as tournamentService from '../services/tournamentService';
import { prisma } from '../db';

// Mock the prisma client
vi.mock('../db', () => ({
  prisma: {
    tournament: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    team: {
      findMany: vi.fn(),
    },
    tournamentEntry: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
  },
}));

describe('tournamentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Daily Divisional Cup System', () => {
    it('should create daily divisional cup with correct parameters', async () => {
      const mockTournament = {
        id: 'tournament123',
        name: 'Daily Divisional Cup - Division 3',
        type: 'DAILY_DIVISIONAL_CUP',
        division: 3,
        maxParticipants: 8,
        entryFeeCredits: 0,
        entryFeeGems: 0,
        requiresEntryItem: true,
        status: 'REGISTRATION_OPEN',
        startTime: new Date(),
        registrationDeadline: new Date(),
        createdAt: new Date()
      };

      (prisma.tournament.create as any).mockResolvedValue(mockTournament);

      const result = await tournamentService.createDailyDivisionalCup(3);

      expect(prisma.tournament.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: expect.stringContaining('Daily Divisional Cup'),
            type: 'DAILY_DIVISIONAL_CUP',
            division: 3,
            requiresEntryItem: true
          })
        })
      );
      expect(result).toEqual(mockTournament);
    });

    it('should validate division requirements for daily cups', async () => {
      await expect(tournamentService.createDailyDivisionalCup(1))
        .rejects.toThrow('Daily Divisional Cups are only available for divisions 2-8');
      
      await expect(tournamentService.createDailyDivisionalCup(9))
        .rejects.toThrow('Daily Divisional Cups are only available for divisions 2-8');
    });

    it('should set correct entry requirements for daily cups', async () => {
      const mockTournament = {
        id: 'tournament123',
        requiresEntryItem: true,
        entryFeeCredits: 0,
        entryFeeGems: 0
      };

      (prisma.tournament.create as any).mockResolvedValue(mockTournament);

      await tournamentService.createDailyDivisionalCup(3);
      
      expect(prisma.tournament.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            requiresEntryItem: true,
            entryFeeCredits: 0,
            entryFeeGems: 0
          })
        })
      );
    });
  });

  describe('Mid-Season Classic System', () => {
    it('should create mid-season classic with correct parameters', async () => {
      const mockTournament = {
        id: 'tournament456',
        name: 'Mid-Season Classic',
        type: 'MID_SEASON_CLASSIC',
        division: null, // All divisions
        maxParticipants: 64,
        entryFeeCredits: 10000,
        entryFeeGems: 20,
        requiresEntryItem: false,
        status: 'REGISTRATION_OPEN',
        startTime: new Date(),
        registrationDeadline: new Date(),
        createdAt: new Date()
      };

      (prisma.tournament.create as any).mockResolvedValue(mockTournament);

      const result = await tournamentService.createMidSeasonClassic();
      
      expect(prisma.tournament.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Mid-Season Classic',
            type: 'MID_SEASON_CLASSIC',
            division: null,
            entryFeeCredits: 10000,
            entryFeeGems: 20,
            requiresEntryItem: false
          })
        })
      );
      expect(result).toEqual(mockTournament);
    });

    it('should set correct entry fees for mid-season classic', async () => {
      (prisma.tournament.create as any).mockResolvedValue({});

      await tournamentService.createMidSeasonClassic();
      
      expect(prisma.tournament.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entryFeeCredits: 10000,
            entryFeeGems: 20,
            requiresEntryItem: false
          })
        })
      );
    });

    it('should allow all divisions to participate', async () => {
      (prisma.tournament.create as any).mockResolvedValue({});

      await tournamentService.createMidSeasonClassic();
      
      expect(prisma.tournament.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            division: null // All divisions allowed
          })
        })
      );
    });
  });

  describe('Tournament Entry System', () => {
    it('should validate team eligibility for tournament entry', async () => {
      const mockTournament = {
        id: 'tournament123',
        type: 'DAILY_DIVISIONAL_CUP',
        division: 3,
        maxParticipants: 8,
        status: 'REGISTRATION_OPEN',
        requiresEntryItem: true,
        entryFeeCredits: 0,
        entryFeeGems: 0
      };

      const mockTeam = {
        id: 'team123',
        division: 3,
        credits: 50000,
        gems: 100
      };

      (prisma.tournament.findUnique as any).mockResolvedValue(mockTournament);
      (prisma.tournamentEntry.findMany as any).mockResolvedValue([]);

      const result = await tournamentService.canTeamEnterTournament('team123', 'tournament123', mockTeam);
      
      expect(result.eligible).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should reject teams from wrong division for divisional cups', async () => {
      const mockTournament = {
        id: 'tournament123',
        type: 'DAILY_DIVISIONAL_CUP',
        division: 3,
        status: 'REGISTRATION_OPEN'
      };

      const mockTeam = {
        id: 'team123',
        division: 5, // Wrong division
        credits: 50000,
        gems: 100
      };

      (prisma.tournament.findUnique as any).mockResolvedValue(mockTournament);

      const result = await tournamentService.canTeamEnterTournament('team123', 'tournament123', mockTeam);
      
      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('division');
    });

    it('should check entry fee requirements', async () => {
      const mockTournament = {
        id: 'tournament456',
        type: 'MID_SEASON_CLASSIC',
        division: null,
        maxParticipants: 64,
        status: 'REGISTRATION_OPEN',
        entryFeeCredits: 10000,
        entryFeeGems: 20,
        requiresEntryItem: false
      };

      const mockPoorTeam = {
        id: 'team123',
        division: 3,
        credits: 5000, // Not enough credits
        gems: 10 // Not enough gems
      };

      (prisma.tournament.findUnique as any).mockResolvedValue(mockTournament);

      const result = await tournamentService.canTeamEnterTournament('team123', 'tournament456', mockPoorTeam);
      
      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('credits');
    });

    it('should process tournament entry successfully', async () => {
      const mockTournament = {
        id: 'tournament456',
        type: 'MID_SEASON_CLASSIC',
        entryFeeCredits: 10000,
        entryFeeGems: 20
      };

      const mockTeam = {
        id: 'team123',
        division: 3,
        credits: 50000,
        gems: 100
      };

      (prisma.tournament.findUnique as any).mockResolvedValue(mockTournament);
      (prisma.tournamentEntry.create as any).mockResolvedValue({});
      (prisma.user.update as any).mockResolvedValue({});

      await tournamentService.enterTournament('team123', 'tournament456', mockTeam);
      
      expect(prisma.tournamentEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            teamId: 'team123',
            tournamentId: 'tournament456'
          }
        })
      );

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockTeam.userId },
          data: {
            credits: 40000, // 50000 - 10000
            gems: 80 // 100 - 20
          }
        })
      );
    });
  });

  describe('Tournament Bracket System', () => {
    it('should generate single elimination bracket correctly', () => {
      const teams = [
        { id: 'team1', name: 'Team 1' },
        { id: 'team2', name: 'Team 2' },
        { id: 'team3', name: 'Team 3' },
        { id: 'team4', name: 'Team 4' }
      ];

      const bracket = tournamentService.generateBracket(teams, 'SINGLE_ELIMINATION');
      
      expect(bracket).toBeDefined();
      expect(bracket.rounds).toBeDefined();
      expect(bracket.rounds.length).toBeGreaterThan(0);

      // Should have correct number of rounds for 4 teams (2 rounds: semis + final)
      expect(bracket.rounds.length).toBe(2);
    });

    it('should handle odd number of teams with byes', () => {
      const teams = [
        { id: 'team1', name: 'Team 1' },
        { id: 'team2', name: 'Team 2' },
        { id: 'team3', name: 'Team 3' }
      ];

      const bracket = tournamentService.generateBracket(teams, 'SINGLE_ELIMINATION');
      
      expect(bracket).toBeDefined();
      // Should handle byes for odd number of teams
      expect(bracket.rounds).toBeDefined();
    });
  });

  describe('Tournament Rewards System', () => {
    it('should calculate correct rewards for daily divisional cup winners', () => {
      const placement = 1; // Winner
      const tournamentType = 'DAILY_DIVISIONAL_CUP';
      const division = 3;

      const rewards = tournamentService.calculateTournamentRewards(placement, tournamentType, division);
      
      expect(rewards).toBeDefined();
      expect(rewards.credits).toBeGreaterThan(0);
      expect(rewards.title).toBeDefined();
    });

    it('should give higher rewards for higher divisions', () => {
      const division1Rewards = tournamentService.calculateTournamentRewards(1, 'DAILY_DIVISIONAL_CUP', 1);
      const division8Rewards = tournamentService.calculateTournamentRewards(1, 'DAILY_DIVISIONAL_CUP', 8);
      
      // Division 1 should have higher rewards than Division 8
      expect(division1Rewards.credits).toBeGreaterThan(division8Rewards.credits);
    });

    it('should give higher rewards for better placements', () => {
      const firstPlace = tournamentService.calculateTournamentRewards(1, 'MID_SEASON_CLASSIC');
      const secondPlace = tournamentService.calculateTournamentRewards(2, 'MID_SEASON_CLASSIC');
      const thirdPlace = tournamentService.calculateTournamentRewards(3, 'MID_SEASON_CLASSIC');
      
      expect(firstPlace.credits).toBeGreaterThan(secondPlace.credits);
      expect(secondPlace.credits).toBeGreaterThan(thirdPlace.credits);
    });
  });

  describe('Tournament Scheduling', () => {
    it('should schedule daily divisional cups correctly', () => {
      const schedule = tournamentService.getNextTournamentSchedule('DAILY_DIVISIONAL_CUP');

      expect(schedule).toBeDefined();
      expect(schedule.registrationStart).toBeDefined();
      expect(schedule.registrationEnd).toBeDefined();
      expect(schedule.tournamentStart).toBeDefined();
      
      // Registration should end before tournament starts
      expect(schedule.registrationEnd.getTime()).toBeLessThan(schedule.tournamentStart.getTime());
    });

    it('should schedule mid-season classic on correct game days', () => {
      const schedule = tournamentService.getNextTournamentSchedule('MID_SEASON_CLASSIC');
      
      expect(schedule).toBeDefined();
      // Mid-season classic should be scheduled for days 6-7
      expect(schedule.gameDay).toBeGreaterThanOrEqual(6);
      expect(schedule.gameDay).toBeLessThanOrEqual(7);
    });
  });
});