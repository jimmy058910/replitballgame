import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from '../storage/index.js';
import { requireAuth } from "../middleware/firebaseAuth.js";
import { getPrismaClient } from "../database.js";
import { z } from "zod";
import { tournamentService } from '../services/tournamentService.js';
import { QuickMatchSimulation } from '../services/enhancedSimulationEngine.js';
import { StandingsUpdateService } from '../services/standingsUpdateService.js';
import { PaymentHistoryService } from '../services/paymentHistoryService.js';
import { tournamentFlowService } from '../services/tournamentFlowService.js';
import { SeasonTimingAutomationService } from '../services/seasonTimingAutomationService.js';
import { dailyTournamentAutoFillService } from '../services/dailyTournamentAutoFillService.js';
import { tournamentStorage } from '../storage/tournamentStorage.js';
import { teamFinancesStorage } from '../storage/teamFinancesStorage.js';
import { getDivisionName } from "../../shared/divisionUtils.js";
import moment from "moment-timezone";
import type { Team } from '@shared/types/models';


const router = Router();

// Admin user check
const isAdmin = (userId: string): boolean => userId === "44010914";

// Helper function to handle BigInt serialization
function convertBigIntToString(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
  if (Array.isArray(obj)) return obj.map(convertBigIntToString);
  if (typeof obj === 'object') {
    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertBigIntToString(value);
    }
    return converted;
  }
  return obj;
}

// ============================================================================
// REGISTRATION & AVAILABILITY ENDPOINTS
// ============================================================================

/**
 * GET /available - Get all available tournaments
 * Consolidated from: tournamentRoutes.ts, newTournamentRoutes.ts
 */
router.get('/available', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const prisma = await getPrismaClient();
    const userProfile = req.userProfile;

    if (!userProfile?.Team) {
      return res.status(404).json({ error: "Team not found for user" });
    }

    const tournaments = await prisma.tournament.findMany({
      where: {
        status: 'REGISTRATION_OPEN',
        OR: [
          { division: userProfile.Team.division },
          { division: null } // Open tournaments
        ]
      },
      include: {
        entries: true,
        _count: { select: { entries: true } }
      },
      orderBy: { startTime: 'asc' }
    });

    const formattedTournaments = tournaments.map(tournament => ({
      id: tournament.id,
      name: tournament.name,
      type: tournament.type,
      division: tournament.division,
      status: tournament.status,
      startTime: tournament.startTime.toISOString(),
      registrationEndTime: tournament.registrationEndTime?.toISOString(),
      entryFeeCredits: tournament.entryFeeCredits?.toString(),
      entryFeeGems: tournament.entryFeeGems,
      prizePool: tournament.prizePoolJson,
      currentParticipants: tournament._count.entries,
      maxParticipants: 8, // Standard tournament size
      isRegistered: tournament.entries.some(entry => entry.teamId === userProfile.Team.id)
    }));

    res.json({ tournaments: formattedTournaments });
  } catch (error) {
    console.error('Error fetching available tournaments:', error);
    next(error);
  }
});

/**
 * POST /register - Universal tournament registration
 * Consolidated from: tournamentRoutes.ts, newTournamentRoutes.ts
 */
router.post('/register', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tournamentId, paymentType = "credits" } = req.body;
    const userProfile = req.userProfile;

    if (!userProfile?.Team) {
      return res.status(404).json({ error: "Team not found for user" });
    }

    await tournamentService.registerForTournament(
      userProfile.Team.id, 
      parseInt(tournamentId), 
      paymentType
    );

    res.json({ 
      success: true, 
      message: "Successfully registered for tournament",
      tournamentId: parseInt(tournamentId)
    });
  } catch (error) {
    console.error('Error registering for tournament:', error);
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * POST /daily-tournament/register - Create/join daily tournaments  
 * Consolidated from: tournamentRoutes.ts, newTournamentRoutes.ts
 */
router.post('/daily-tournament/register', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { paymentType = "credits" } = req.body;
    const userProfile = req.userProfile;

    if (!userProfile?.Team) {
      return res.status(404).json({ error: "Team not found for user" });
    }

    const division = userProfile.Team.division;
    
    if (division === 1) {
      return res.status(400).json({ 
        error: "Division 1 (Diamond) does not have Daily Division Tournaments" 
      });
    }

    await tournamentService.registerForDailyTournament(userProfile.Team.id, paymentType);

    res.json({ 
      success: true, 
      message: `Successfully registered for Daily Division Tournament (Division ${division})` 
    });
  } catch (error) {
    console.error('Error registering for daily tournament:', error);
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * POST /mid-season/register - Create/join mid-season cups
 * Consolidated from: newTournamentRoutes.ts
 */
router.post('/mid-season/register', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { paymentType = "credits" } = req.body;
    const userProfile = req.userProfile;

    if (!userProfile?.Team) {
      return res.status(404).json({ error: "Team not found for user" });
    }

    await tournamentService.registerForMidSeasonCup(userProfile.Team.id, paymentType);

    res.json({ 
      success: true, 
      message: `Successfully registered for Mid-Season Cup (Division ${userProfile.Team.division})` 
    });
  } catch (error) {
    console.error('Error registering for mid-season cup:', error);
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * GET /registration-status - Debug registration status
 * Consolidated from: cleanupTournamentRoutes.ts
 */
router.get('/registration-status', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userProfile = req.userProfile;
    if (!userProfile?.Team) {
      return res.status(404).json({ error: "Team not found for user" });
    }

    const prisma = await getPrismaClient();
    
    const activeRegistrations = await prisma.tournamentEntry.findMany({
      where: { teamId: userProfile.Team.id },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            status: true,
            startTime: true,
            type: true
          }
        }
      }
    });

    res.json({
      teamId: userProfile.Team.id,
      teamName: userProfile.Team.name,
      activeRegistrations: activeRegistrations.map(entry => ({
        tournamentId: entry.tournamentId,
        tournamentName: entry.tournament.name,
        tournamentStatus: entry.tournament.status,
        registeredAt: entry.registeredAt,
        startTime: entry.tournament.startTime
      }))
    });
  } catch (error) {
    console.error('Error getting registration status:', error);
    next(error);
  }
});

/**
 * POST /cleanup-registration - Fix stuck registrations
 * Consolidated from: cleanupTournamentRoutes.ts
 */
router.post('/cleanup-registration', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userProfile = req.userProfile;
    if (!userProfile?.Team) {
      return res.status(404).json({ error: "Team not found for user" });
    }

    const prisma = await getPrismaClient();
    
    // Remove registrations for completed or cancelled tournaments
    const deletedRegistrations = await prisma.tournamentEntry.deleteMany({
      where: {
        teamId: userProfile.Team.id,
        tournament: {
          status: {
            in: ['COMPLETED', 'CANCELLED']
          }
        }
      }
    });

    res.json({
      success: true,
      message: `Cleaned up ${deletedRegistrations.count} stuck tournament registrations`,
      removedCount: deletedRegistrations.count
    });
  } catch (error) {
    console.error('Error cleaning up registrations:', error);
    next(error);
  }
});

// ============================================================================
// STATUS & MONITORING ENDPOINTS  
// ============================================================================

/**
 * GET /status/:tournamentId - Detailed tournament status
 * Consolidated from: tournamentRoutes.ts, tournamentStatusRoutes.ts
 */
router.get('/status/:tournamentId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const tournamentId = parseInt(req.params.tournamentId);
    const prisma = await getPrismaClient();

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        entries: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
                division: true,
                wins: true,
                losses: true,
                draws: true
              }
            }
          }
        },
        games: {
          include: {
            homeTeam: { select: { id: true, name: true } },
            awayTeam: { select: { id: true, name: true } }
          },
          orderBy: { round: 'asc' }
        }
      }
    });

    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    const response = {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        type: tournament.type,
        status: tournament.status,
        division: tournament.division,
        startTime: tournament.startTime.toISOString(),
        registrationEndTime: tournament.registrationEndTime?.toISOString(),
        entryFeeCredits: tournament.entryFeeCredits?.toString(),
        entryFeeGems: tournament.entryFeeGems,
        prizePool: tournament.prizePoolJson
      },
      participants: tournament.entries.length,
      maxParticipants: 8,
      entries: tournament.entries.map(entry => ({
        teamId: entry.teamId,
        teamName: entry.team.name,
        division: entry.team.division,
        record: `${entry.team.wins}W-${entry.team.draws}D-${entry.team.losses}L`,
        registeredAt: entry.registeredAt.toISOString(),
        finalRank: entry.finalRank
      })),
      matches: tournament.games.map(game => ({
        id: game.id,
        round: game.round,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        status: game.status,
        gameDate: game.gameDate?.toISOString()
      }))
    };

    res.json(convertBigIntToString(response));
  } catch (error) {
    console.error('Error getting tournament status:', error);
    next(error);
  }
});

/**
 * GET /my-tournaments - User's active tournaments
 * Consolidated from: tournamentRoutes.ts, newTournamentRoutes.ts
 */
router.get('/my-tournaments', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userProfile = req.userProfile;
    if (!userProfile?.Team) {
      return res.status(404).json({ error: "Team not found for user" });
    }

    const prisma = await getPrismaClient();
    
    const tournaments = await prisma.tournamentEntry.findMany({
      where: { teamId: userProfile.Team.id },
      include: {
        tournament: {
          include: {
            _count: { select: { entries: true } }
          }
        }
      },
      orderBy: { registeredAt: 'desc' }
    });

    const response = tournaments.map(entry => ({
      id: entry.tournament.id,
      name: entry.tournament.name,
      type: entry.tournament.type,
      status: entry.tournament.status,
      division: entry.tournament.division,
      startTime: entry.tournament.startTime.toISOString(),
      registeredAt: entry.registeredAt.toISOString(),
      currentParticipants: entry.tournament._count.entries,
      finalRank: entry.finalRank,
      rewardsClaimed: entry.rewardsClaimed
    }));

    res.json({ tournaments: convertBigIntToString(response) });
  } catch (error) {
    console.error('Error getting user tournaments:', error);
    next(error);
  }
});

/**
 * GET /active - All active tournaments
 * Consolidated from: tournamentStatusRoutes.ts
 */
router.get('/active', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const prisma = await getPrismaClient();
    
    const tournaments = await prisma.tournament.findMany({
      where: {
        status: {
          in: ['REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'IN_PROGRESS']
        }
      },
      include: {
        _count: { select: { entries: true } }
      },
      orderBy: { startTime: 'asc' }
    });

    const response = tournaments.map(tournament => ({
      id: tournament.id,
      name: tournament.name,
      type: tournament.type,
      status: tournament.status,
      division: tournament.division,
      startTime: tournament.startTime.toISOString(),
      participants: tournament._count.entries,
      maxParticipants: 8
    }));

    res.json({ tournaments: convertBigIntToString(response) });
  } catch (error) {
    console.error('Error getting active tournaments:', error);
    next(error);
  }
});

/**
 * GET /division/:division - Division-specific tournaments
 * Consolidated from: tournamentRoutes.ts, newTournamentRoutes.ts
 */
router.get('/division/:division', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const division = parseInt(req.params.division);
    const prisma = await getPrismaClient();
    
    const tournaments = await prisma.tournament.findMany({
      where: { division },
      include: {
        _count: { select: { entries: true } }
      },
      orderBy: { startTime: 'desc' },
      take: 20
    });

    const response = tournaments.map(tournament => ({
      id: tournament.id,
      name: tournament.name,
      type: tournament.type,
      status: tournament.status,
      startTime: tournament.startTime.toISOString(),
      participants: tournament._count.entries,
      prizePool: tournament.prizePoolJson
    }));

    res.json({ 
      division,
      divisionName: getDivisionName(division),
      tournaments: convertBigIntToString(response) 
    });
  } catch (error) {
    console.error('Error getting division tournaments:', error);
    next(error);
  }
});

// ============================================================================
// MATCH MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * POST /matches/instant - Start instant tournament match
 * Consolidated from: dailyTournamentRoutes.ts
 */
router.post('/matches/instant', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userProfile = req.userProfile;
    if (!userProfile?.Team) {
      return res.status(404).json({ error: "Team not found for user" });
    }

    const { opponentId } = req.body;
    const prisma = await getPrismaClient();

    // Find or create opponent team
    let opponent;
    if (opponentId) {
      opponent = await prisma.team.findUnique({ where: { id: parseInt(opponentId) } });
    } else {
      // Find random opponent from same division
      const opponents = await prisma.team.findMany({
        where: {
          division: userProfile.Team.division,
          id: { not: userProfile.Team.id }
        },
        take: 10
      });
      opponent = opponents[Math.floor(Math.random() * opponents.length)];
    }

    if (!opponent) {
      return res.status(404).json({ error: "No suitable opponent found" });
    }

    // Create instant tournament match
    const game = await prisma.game.create({
      data: {
        homeTeamId: userProfile.Team.id,
        awayTeamId: opponent.id,
        matchType: 'TOURNAMENT_DAILY',
        status: 'SCHEDULED',
        gameDate: new Date(),
        leagueId: null
      }
    });

    // Simulate the match
    const simulation = new QuickMatchSimulation();
    await simulation.simulateGame(game.id);

    // Update standings
    const standingsService = new StandingsUpdateService();
    await standingsService.updateStandings(game.id);

    const updatedGame = await prisma.game.findUnique({
      where: { id: game.id },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } }
      }
    });

    res.json({
      success: true,
      match: {
        id: updatedGame?.id,
        homeTeam: updatedGame?.homeTeam.name,
        awayTeam: updatedGame?.awayTeam.name,
        homeScore: updatedGame?.homeScore,
        awayScore: updatedGame?.awayScore,
        status: updatedGame?.status
      }
    });
  } catch (error) {
    console.error('Error creating instant match:', error);
    next(error);
  }
});

/**
 * POST /matches/challenge - Challenge specific opponent
 * Consolidated from: dailyTournamentRoutes.ts
 */
router.post('/matches/challenge', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { opponentId } = req.body;
    const userProfile = req.userProfile;

    if (!userProfile?.Team) {
      return res.status(404).json({ error: "Team not found for user" });
    }

    if (!opponentId) {
      return res.status(400).json({ error: "Opponent ID is required" });
    }

    const prisma = await getPrismaClient();
    
    const opponent = await prisma.team.findUnique({ where: { id: parseInt(opponentId) } });
    if (!opponent) {
      return res.status(404).json({ error: "Opponent team not found" });
    }

    // Create challenge match
    const game = await prisma.game.create({
      data: {
        homeTeamId: userProfile.Team.id,
        awayTeamId: opponent.id,
        matchType: 'TOURNAMENT_DAILY',
        status: 'SCHEDULED',
        gameDate: new Date(),
        leagueId: null
      }
    });

    res.json({
      success: true,
      message: `Challenge sent to ${opponent.name}`,
      matchId: game.id
    });
  } catch (error) {
    console.error('Error creating challenge:', error);
    next(error);
  }
});

/**
 * POST /matches/simulate-round - Simulate entire tournament round
 * Consolidated from: tournamentStatusRoutes.ts
 */
router.post('/matches/simulate-round', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tournamentId, round } = req.body;
    
    if (!tournamentId) {
      return res.status(400).json({ error: "Tournament ID is required" });
    }

    const prisma = await getPrismaClient();
    
    // Get matches for the specified round
    const matches = await prisma.game.findMany({
      where: {
        tournamentId: parseInt(tournamentId),
        round: round || 1,
        status: 'SCHEDULED'
      }
    });

    if (matches.length === 0) {
      return res.status(404).json({ error: "No scheduled matches found for this round" });
    }

    // Simulate all matches in the round
    const simulation = new QuickMatchSimulation();
    const results = [];

    for (const match of matches) {
      await simulation.simulateGame(match.id);
      const updatedMatch = await prisma.game.findUnique({
        where: { id: match.id },
        include: {
          homeTeam: { select: { name: true } },
          awayTeam: { select: { name: true } }
        }
      });
      results.push(updatedMatch);
    }

    res.json({
      success: true,
      message: `Simulated ${matches.length} matches in round ${round || 1}`,
      results: convertBigIntToString(results)
    });
  } catch (error) {
    console.error('Error simulating tournament round:', error);
    next(error);
  }
});

/**
 * GET /matches/:tournamentId - Get tournament bracket/matches
 * Consolidated from: tournamentRoutes.ts, tournamentStatusRoutes.ts
 */
router.get('/matches/:tournamentId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const tournamentId = parseInt(req.params.tournamentId);
    const prisma = await getPrismaClient();

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        games: {
          include: {
            homeTeam: { select: { id: true, name: true } },
            awayTeam: { select: { id: true, name: true } }
          },
          orderBy: [
            { round: 'asc' },
            { gameDate: 'asc' }
          ]
        },
        entries: {
          include: {
            team: { select: { id: true, name: true } }
          }
        }
      }
    });

    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    // Organize matches by round for bracket display
    const matchesByRound = tournament.games.reduce((acc: any, match) => {
      const round = match.round || 1;
      if (!acc[round]) acc[round] = [];
      acc[round].push({
        id: match.id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        status: match.status,
        gameDate: match.gameDate?.toISOString()
      });
      return acc;
    }, {});

    res.json({
      tournament: {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        type: tournament.type
      },
      participants: tournament.entries.map(entry => entry.team),
      bracket: {
        rounds: matchesByRound,
        totalRounds: Math.max(...Object.keys(matchesByRound).map(Number), 0)
      }
    });
  } catch (error) {
    console.error('Error getting tournament matches:', error);
    next(error);
  }
});

/**
 * POST /matches/:matchId/start - Start individual match
 * Consolidated from: tournamentStatusRoutes.ts
 */
router.post('/matches/:matchId/start', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const matchId = parseInt(req.params.matchId);
    const prisma = await getPrismaClient();

    const match = await prisma.game.findUnique({ where: { id: matchId } });
    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    if (match.status !== 'SCHEDULED') {
      return res.status(400).json({ error: "Match is not scheduled" });
    }

    // Start the match simulation
    const simulation = new QuickMatchSimulation();
    await simulation.simulateGame(matchId);

    const updatedMatch = await prisma.game.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } }
      }
    });

    res.json({
      success: true,
      match: convertBigIntToString(updatedMatch)
    });
  } catch (error) {
    console.error('Error starting match:', error);
    next(error);
  }
});

/**
 * POST /matches/:matchId/simulate - Simulate individual match
 * Consolidated from: tournamentStatusRoutes.ts
 */
router.post('/matches/:matchId/simulate', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const matchId = parseInt(req.params.matchId);
    const simulation = new QuickMatchSimulation();
    
    await simulation.simulateGame(matchId);

    const prisma = await getPrismaClient();
    const updatedMatch = await prisma.game.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } }
      }
    });

    res.json({
      success: true,
      message: "Match simulated successfully",
      match: convertBigIntToString(updatedMatch)
    });
  } catch (error) {
    console.error('Error simulating match:', error);
    next(error);
  }
});

// ============================================================================
// REWARDS SYSTEM ENDPOINTS
// ============================================================================

/**
 * GET /rewards/unclaimed - Get unclaimed tournament rewards
 * Consolidated from: tournamentRewardRoutes.ts
 */
router.get('/rewards/unclaimed', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userProfile = req.userProfile;
    if (!userProfile?.Team) {
      return res.status(404).json({ error: "Team not found for user" });
    }

    const prisma = await getPrismaClient();
    
    const unclaimedEntries = await prisma.tournamentEntry.findMany({
      where: {
        teamId: userProfile.Team.id,
        rewardsClaimed: false,
        finalRank: { not: null }, // Tournament is completed
        tournament: { status: 'COMPLETED' }
      },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            type: true,
            division: true,
            prizePoolJson: true
          }
        }
      },
      orderBy: { registeredAt: 'desc' }
    });

    const rewards = unclaimedEntries.map(entry => {
      const prizePool = entry.tournament.prizePoolJson as any;
      let reward = null;

      if (entry.finalRank === 1) {
        reward = prizePool.champion;
      } else if (entry.finalRank === 2) {
        reward = prizePool.runnerUp;
      } else if (entry.finalRank && entry.finalRank <= 4) {
        reward = prizePool.semifinalist;
      }

      return {
        tournamentId: entry.tournament.id,
        tournamentName: entry.tournament.name,
        tournamentType: entry.tournament.type,
        division: entry.tournament.division,
        finalRank: entry.finalRank,
        reward: reward ? {
          credits: reward.credits || 0,
          gems: reward.gems || 0,
          trophy: reward.trophy
        } : null,
        registeredAt: entry.registeredAt
      };
    }).filter(entry => entry.reward !== null);

    res.json({
      teamName: userProfile.Team.name,
      unclaimedRewards: convertBigIntToString(rewards),
      totalUnclaimed: rewards.length
    });
  } catch (error) {
    console.error('Error getting unclaimed rewards:', error);
    next(error);
  }
});

/**
 * POST /rewards/claim - Claim all tournament rewards
 * Consolidated from: tournamentRewardRoutes.ts
 */
router.post('/rewards/claim', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userProfile = req.userProfile;
    if (!userProfile?.Team) {
      return res.status(404).json({ error: "Team not found for user" });
    }

    const prisma = await getPrismaClient();
    
    const unclaimedEntries = await prisma.tournamentEntry.findMany({
      where: {
        teamId: userProfile.Team.id,
        rewardsClaimed: false,
        finalRank: { not: null },
        tournament: { status: 'COMPLETED' }
      },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            prizePoolJson: true
          }
        }
      }
    });

    let totalCredits = 0;
    let totalGems = 0;
    const claimedTournaments = [];

    // Process each unclaimed reward
    for (const entry of unclaimedEntries) {
      const prizePool = entry.tournament.prizePoolJson as any;
      let reward = null;

      if (entry.finalRank === 1) {
        reward = prizePool.champion;
      } else if (entry.finalRank === 2) {
        reward = prizePool.runnerUp;
      } else if (entry.finalRank && entry.finalRank <= 4) {
        reward = prizePool.semifinalist;
      }

      if (reward) {
        totalCredits += reward.credits || 0;
        totalGems += reward.gems || 0;
        
        // Mark as claimed
        await prisma.tournamentEntry.update({
          where: { id: entry.id },
          data: { rewardsClaimed: true }
        });

        claimedTournaments.push({
          name: entry.tournament.name,
          rank: entry.finalRank,
          credits: reward.credits || 0,
          gems: reward.gems || 0
        });
      }
    }

    // Add rewards to team finances
    if (totalCredits > 0 || totalGems > 0) {
      await prisma.team.update({
        where: { id: userProfile.Team.id },
        data: {
          credits: { increment: Number(totalCredits) },
          gems: { increment: totalGems }
        }
      });

      // Record payment history
      const paymentService = new PaymentHistoryService();
      await paymentService.recordPayment({
        teamId: userProfile.Team.id,
        amount: Number(totalCredits),
        gems: totalGems,
        type: 'TOURNAMENT_REWARD',
        description: `Tournament rewards claimed: ${claimedTournaments.length} tournaments`,
        details: { tournaments: claimedTournaments }
      });
    }

    res.json({
      success: true,
      message: `Claimed rewards from ${claimedTournaments.length} tournaments`,
      totalCredits,
      totalGems,
      claimedTournaments: convertBigIntToString(claimedTournaments)
    });
  } catch (error) {
    console.error('Error claiming rewards:', error);
    next(error);
  }
});

/**
 * POST /rewards/claim/:tournamentId - Claim specific tournament rewards
 * New endpoint for granular reward claiming
 */
router.post('/rewards/claim/:tournamentId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const tournamentId = parseInt(req.params.tournamentId);
    const userProfile = req.userProfile;

    if (!userProfile?.Team) {
      return res.status(404).json({ error: "Team not found for user" });
    }

    const prisma = await getPrismaClient();
    
    const entry = await prisma.tournamentEntry.findFirst({
      where: {
        teamId: userProfile.Team.id,
        tournamentId,
        rewardsClaimed: false,
        finalRank: { not: null }
      },
      include: {
        tournament: {
          select: {
            name: true,
            prizePoolJson: true,
            status: true
          }
        }
      }
    });

    if (!entry) {
      return res.status(404).json({ error: "No unclaimed rewards found for this tournament" });
    }

    if (entry.tournament.status !== 'COMPLETED') {
      return res.status(400).json({ error: "Tournament is not completed yet" });
    }

    const prizePool = entry.tournament.prizePoolJson as any;
    let reward = null;

    if (entry.finalRank === 1) {
      reward = prizePool.champion;
    } else if (entry.finalRank === 2) {
      reward = prizePool.runnerUp;
    } else if (entry.finalRank && entry.finalRank <= 4) {
      reward = prizePool.semifinalist;
    }

    if (!reward) {
      return res.status(400).json({ error: "No reward available for this rank" });
    }

    // Add rewards to team
    await prisma.team.update({
      where: { id: userProfile.Team.id },
      data: {
        credits: { increment: Number(reward.credits || 0) },
        gems: { increment: reward.gems || 0 }
      }
    });

    // Mark as claimed
    await prisma.tournamentEntry.update({
      where: { id: entry.id },
      data: { rewardsClaimed: true }
    });

    res.json({
      success: true,
      message: `Claimed reward for ${entry.tournament.name}`,
      reward: {
        credits: reward.credits || 0,
        gems: reward.gems || 0,
        finalRank: entry.finalRank
      }
    });
  } catch (error) {
    console.error('Error claiming tournament reward:', error);
    next(error);
  }
});

/**
 * GET /rewards/division/:division - Division reward structure
 * Consolidated from: tournamentRewardRoutes.ts
 */
router.get('/rewards/division/:division', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const division = parseInt(req.params.division);
    
    // Use tournamentService to get reward structure
    const rewardStructure = tournamentService.getDailyDivisionTournamentRewards?.(division) || {
      champion: { credits: 0, gems: 0 },
      runnerUp: { credits: 0, gems: 0 }
    };

    res.json({
      division,
      divisionName: getDivisionName(division),
      dailyTournamentRewards: convertBigIntToString(rewardStructure)
    });
  } catch (error) {
    console.error('Error getting division rewards:', error);
    next(error);
  }
});

// ============================================================================
// HISTORY & STATISTICS ENDPOINTS
// ============================================================================

/**
 * GET /history - Tournament history
 * Consolidated from: tournamentRoutes.ts, newTournamentRoutes.ts, tournamentHistoryRoutes.ts
 */
router.get('/history', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userProfile = req.userProfile;
    if (!userProfile?.Team) {
      return res.status(404).json({ error: "Team not found for user" });
    }

    const prisma = await getPrismaClient();
    
    // In development mode, show more tournament history
    const isDevelopment = process.env.NODE_ENV === 'development';
    const limit = isDevelopment ? 50 : 20;

    const tournamentHistory = await prisma.tournamentEntry.findMany({
      where: isDevelopment ? {} : { teamId: userProfile.Team.id },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            type: true,
            division: true,
            status: true,
            startTime: true,
            prizePoolJson: true
          }
        },
        team: {
          select: {
            id: true,
            name: true,
            division: true
          }
        }
      },
      orderBy: { registeredAt: 'desc' },
      take: limit
    });

    const history = tournamentHistory.map(entry => ({
      tournamentId: entry.tournament.id,
      tournamentName: entry.tournament.name,
      tournamentType: entry.tournament.type,
      division: entry.tournament.division,
      status: entry.tournament.status,
      startTime: entry.tournament.startTime.toISOString(),
      registeredAt: entry.registeredAt.toISOString(),
      finalRank: entry.finalRank,
      rewardsClaimed: entry.rewardsClaimed,
      team: isDevelopment ? entry.team : undefined
    }));

    res.json({
      teamName: userProfile.Team.name,
      tournamentHistory: convertBigIntToString(history),
      totalTournaments: history.length,
      isDevelopmentMode: isDevelopment
    });
  } catch (error) {
    console.error('Error getting tournament history:', error);
    next(error);
  }
});

/**
 * GET /stats - Tournament statistics
 * Consolidated from: newTournamentRoutes.ts, dailyTournamentRoutes.ts
 */
router.get('/stats', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userProfile = req.userProfile;
    if (!userProfile?.Team) {
      return res.status(404).json({ error: "Team not found for user" });
    }

    const prisma = await getPrismaClient();
    
    const stats = await prisma.tournamentEntry.aggregate({
      where: { teamId: userProfile.Team.id },
      _count: {
        id: true
      }
    });

    const winStats = await prisma.tournamentEntry.aggregate({
      where: { 
        teamId: userProfile.Team.id,
        finalRank: 1
      },
      _count: {
        id: true
      }
    });

    const runnerUpStats = await prisma.tournamentEntry.aggregate({
      where: { 
        teamId: userProfile.Team.id,
        finalRank: 2
      },
      _count: {
        id: true
      }
    });

    const semifinalStats = await prisma.tournamentEntry.aggregate({
      where: { 
        teamId: userProfile.Team.id,
        finalRank: { in: [3, 4] }
      },
      _count: {
        id: true
      }
    });

    // Get recent tournament matches for additional stats
    const recentMatches = await prisma.game.findMany({
      where: {
        OR: [
          { homeTeamId: userProfile.Team.id },
          { awayTeamId: userProfile.Team.id }
        ],
        matchType: {
          in: ['TOURNAMENT_DAILY', 'TOURNAMENT_MIDSEASON']
        },
        status: 'COMPLETED'
      },
      orderBy: { gameDate: 'desc' },
      take: 10
    });

    const tournamentMatchWins = recentMatches.filter(match => {
      if (match.homeTeamId === userProfile.Team.id) {
        return (match.homeScore || 0) > (match.awayScore || 0);
      } else {
        return (match.awayScore || 0) > (match.homeScore || 0);
      }
    }).length;

    res.json({
      teamName: userProfile.Team.name,
      statistics: {
        totalTournaments: stats._count.id,
        championships: winStats._count.id,
        runnerUp: runnerUpStats._count.id,
        semifinals: semifinalStats._count.id,
        tournamentMatchWins,
        recentMatches: recentMatches.length,
        winRate: recentMatches.length > 0 ? 
          Math.round((tournamentMatchWins / recentMatches.length) * 100) : 0
      }
    });
  } catch (error) {
    console.error('Error getting tournament stats:', error);
    next(error);
  }
});

/**
 * GET /team/:teamId/history - Team-specific tournament history
 * Consolidated from: newTournamentRoutes.ts
 */
router.get('/team/:teamId/history', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const prisma = await getPrismaClient();
    
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, name: true, division: true }
    });

    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    const tournamentHistory = await prisma.tournamentEntry.findMany({
      where: { teamId },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            type: true,
            division: true,
            status: true,
            startTime: true
          }
        }
      },
      orderBy: { registeredAt: 'desc' },
      take: 20
    });

    res.json({
      team,
      tournamentHistory: tournamentHistory.map(entry => ({
        tournamentId: entry.tournament.id,
        tournamentName: entry.tournament.name,
        tournamentType: entry.tournament.type,
        division: entry.tournament.division,
        status: entry.tournament.status,
        startTime: entry.tournament.startTime.toISOString(),
        registeredAt: entry.registeredAt.toISOString(),
        finalRank: entry.finalRank,
        rewardsClaimed: entry.rewardsClaimed
      }))
    });
  } catch (error) {
    console.error('Error getting team tournament history:', error);
    next(error);
  }
});

// ============================================================================
// ADMIN & EMERGENCY ENDPOINTS
// ============================================================================

/**
 * POST /admin/create/:type/:division - Create tournaments
 * Consolidated from: newTournamentRoutes.ts
 */
router.post('/admin/create/:type/:division', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userProfile = req.userProfile;
    if (!isAdmin(userProfile.userId)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { type, division } = req.params;
    const divisionNum = parseInt(division);

    let tournamentId: string;

    if (type === 'daily') {
      tournamentId = await tournamentService.createDailyDivisionTournament(divisionNum);
    } else if (type === 'mid-season') {
      tournamentId = await tournamentService.createMidSeasonCup(divisionNum);
    } else {
      return res.status(400).json({ error: "Invalid tournament type. Use 'daily' or 'mid-season'" });
    }

    res.json({
      success: true,
      message: `Created ${type} tournament for Division ${divisionNum}`,
      tournamentId: parseInt(tournamentId)
    });
  } catch (error) {
    console.error('Error creating tournament:', error);
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * POST /admin/force-start/:tournamentId - Force start tournament
 * Consolidated from: tournamentStatusRoutes.ts
 */
router.post('/admin/force-start/:tournamentId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userProfile = req.userProfile;
    if (!isAdmin(userProfile.userId)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const tournamentId = parseInt(req.params.tournamentId);
    
    await tournamentService.startTournament(tournamentId);
    await tournamentService.generateTournamentMatches(tournamentId);

    res.json({
      success: true,
      message: `Force started tournament ${tournamentId}`
    });
  } catch (error) {
    console.error('Error force starting tournament:', error);
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * POST /admin/force-complete/:tournamentId - Force complete tournament
 * Consolidated from: cleanupTournamentRoutes.ts
 */
router.post('/admin/force-complete/:tournamentId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userProfile = req.userProfile;
    if (!isAdmin(userProfile.userId)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const tournamentId = parseInt(req.params.tournamentId);
    const prisma = await getPrismaClient();

    // Update tournament status to completed
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { 
        status: 'COMPLETED',
        endTime: new Date()
      }
    });

    // Distribute rewards automatically
    const entries = await prisma.tournamentEntry.findMany({
      where: { tournamentId },
      include: {
        tournament: { select: { prizePoolJson: true } }
      }
    });

    // Simple reward distribution (this could be enhanced)
    for (const entry of entries) {
      if (entry.finalRank && entry.finalRank <= 4 && !entry.rewardsClaimed) {
        const prizePool = entry.tournament.prizePoolJson as any;
        let reward = null;

        if (entry.finalRank === 1) reward = prizePool.champion;
        else if (entry.finalRank === 2) reward = prizePool.runnerUp;
        else if (entry.finalRank <= 4) reward = prizePool.semifinalist;

        if (reward) {
          await prisma.team.update({
            where: { id: entry.teamId },
            data: {
              credits: { increment: Number(reward.credits || 0) },
              gems: { increment: reward.gems || 0 }
            }
          });

          await prisma.tournamentEntry.update({
            where: { id: entry.id },
            data: { rewardsClaimed: true }
          });
        }
      }
    }

    res.json({
      success: true,
      message: `Force completed tournament ${tournamentId} and distributed rewards`
    });
  } catch (error) {
    console.error('Error force completing tournament:', error);
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * POST /admin/emergency-match/:tournamentId - Emergency match fixes
 * Consolidated from: tournamentFixRoutes.ts
 */
router.post('/admin/emergency-match/:tournamentId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userProfile = req.userProfile;
    if (!isAdmin(userProfile.userId)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const tournamentId = parseInt(req.params.tournamentId);
    const prisma = await getPrismaClient();

    // Get all scheduled tournament matches
    const scheduledMatches = await prisma.game.findMany({
      where: {
        tournamentId,
        status: 'SCHEDULED'
      }
    });

    if (scheduledMatches.length === 0) {
      return res.json({
        success: true,
        message: "No scheduled matches found to simulate"
      });
    }

    // Simulate all scheduled matches
    const simulation = new QuickMatchSimulation();
    for (const match of scheduledMatches) {
      await simulation.simulateGame(match.id);
    }

    // Check if tournament flow needs to advance
    await tournamentFlowService.checkAndAdvanceTournament(tournamentId);

    res.json({
      success: true,
      message: `Emergency simulated ${scheduledMatches.length} matches for tournament ${tournamentId}`
    });
  } catch (error) {
    console.error('Error in emergency match simulation:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Additional admin endpoints for comprehensive management...

/**
 * GET /admin/debug/:tournamentId - Debug tournament state  
 * New comprehensive debugging endpoint
 */
router.get('/admin/debug/:tournamentId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userProfile = req.userProfile;
    if (!isAdmin(userProfile.userId)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const tournamentId = parseInt(req.params.tournamentId);
    const prisma = await getPrismaClient();

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        entries: {
          include: {
            team: { select: { id: true, name: true, division: true } }
          }
        },
        games: {
          include: {
            homeTeam: { select: { name: true } },
            awayTeam: { select: { name: true } }
          }
        }
      }
    });

    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    const debugInfo = {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        type: tournament.type,
        division: tournament.division,
        startTime: tournament.startTime,
        endTime: tournament.endTime
      },
      participants: {
        registered: tournament.entries.length,
        maxAllowed: 8,
        entries: tournament.entries.map(entry => ({
          teamId: entry.teamId,
          teamName: entry.team.name,
          division: entry.team.division,
          finalRank: entry.finalRank,
          rewardsClaimed: entry.rewardsClaimed
        }))
      },
      matches: {
        total: tournament.games.length,
        byStatus: tournament.games.reduce((acc: any, game) => {
          acc[game.status] = (acc[game.status] || 0) + 1;
          return acc;
        }, {}),
        byRound: tournament.games.reduce((acc: any, game) => {
          const round = game.round || 'unknown';
          acc[round] = (acc[round] || 0) + 1;
          return acc;
        }, {}),
        games: tournament.games.map(game => ({
          id: game.id,
          round: game.round,
          status: game.status,
          homeTeam: game.homeTeam.name,
          awayTeam: game.awayTeam.name,
          score: `${game.homeScore || 0} - ${game.awayScore || 0}`
        }))
      }
    };

    res.json(convertBigIntToString(debugInfo));
  } catch (error) {
    console.error('Error debugging tournament:', error);
    next(error);
  }
});

// ============================================================================
// BACKWARD COMPATIBILITY ROUTES
// ============================================================================

// Ensure backward compatibility with existing frontend paths
router.get('/daily-division/status/:division', async (req, res, next) => {
  req.url = `/status/division-${req.params.division}`;
  next();
});

router.post('/daily-division/register', async (req, res, next) => {
  req.url = '/daily-tournament/register';
  next();
});

export default router;