import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from '../storage/index.js';
import { teamFinancesStorage } from '../storage/teamFinancesStorage.js';
import { tournamentStorage } from '../storage/tournamentStorage.js';
import { requireAuth } from "../middleware/firebaseAuth.js";
import { z } from "zod";
import { getDivisionName } from "../../shared/divisionUtils.js";
import { getPrismaClient } from '../database.js';
import { TournamentService } from '../services/tournamentService.js';
import type { Team } from '@shared/types/models';


const router = Router();

const enterTournamentParamsSchema = z.object({
    id: z.string().uuid("Invalid tournament ID format"), // Assuming tournament IDs are UUIDs
});

// History route must come BEFORE the :division route to avoid conflicts
// Register for Daily Division Tournament
router.post('/daily-division/register', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.claims?.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team || !team.id) {
      return res.status(404).json({ message: "Team not found" });
    }

    const { division } = req.body;
    if (!division || division !== team.division) {
      return res.status(400).json({ message: "Invalid division for this team" });
    }

    // Use the flat architecture tournament service
    const tournamentService = new TournamentService();
    
    // For daily division tournaments, we need to get the tournament ID first
    // This is a simplified version - the actual tournament registration logic may need adjustment
    const entry = await tournamentService.registerForTournament(team.id, 1); // Placeholder tournament ID
    
    res.json({
      success: true,
      message: "Successfully registered for Daily Division Tournament",
      entry
    });
  } catch (error: any) {
    console.error('Tournament registration error:', error);
    
    if (error.name === 'ConflictError') {
      return res.status(409).json({ message: error.message });
    }
    if (error.name === 'NotFoundError') {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ 
      message: "Tournament registration failed",
      error: error.message 
    });
  }
});

// Get Daily Division Tournament status and timer info
router.get('/daily-division/status/:division', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { division } = req.params;
    const divisionNum = parseInt(division);
    
    if (!divisionNum || divisionNum < 1 || divisionNum > 8) {
      return res.status(400).json({ message: "Invalid division" });
    }

    const prisma = await getPrismaClient();
    
    // Find active tournament for this division
    const tournament = await prisma.tournament.findFirst({
      where: {
        division: divisionNum,
        status: { in: ['REGISTRATION_OPEN', 'IN_PROGRESS'] }
      },
      include: {
        entries: {
          include: {
            team: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!tournament) {
      return res.json({
        hasActiveTournament: false,
        registrationOpen: true,
        registrationCount: 0,
        maxTeams: 8,
        timeRemaining: null
      });
    }

    // Get timer status from auto-fill service
    const { dailyTournamentAutoFillService } = await import('../services/dailyTournamentAutoFillService.js');
    let timerStatus = await dailyTournamentAutoFillService.getTimerStatus(Number(tournament.id));
    
    // ✅ FALLBACK: If we have registered teams but no active timer, start one  
    console.log(`🔍 [TOURNAMENT DEBUG] Timer check - Active: ${timerStatus.active}, Entries: ${tournament.entries.length}, Tournament ID: ${tournament.id}`);
    
    // Check if there's a valid future registration end time
    const hasValidEndTime = tournament.registrationEndTime && new Date(tournament.registrationEndTime) > new Date();
    console.log(`🔍 [TOURNAMENT DEBUG] Registration end time check - EndTime: ${tournament.registrationEndTime}, Valid: ${hasValidEndTime}`);
    
    if (!timerStatus.active && tournament.entries.length > 0 && tournament.entries.length < 8) {
      if (hasValidEndTime) {
        // Restore timer based on existing registration end time
        console.log(`🔄 [TOURNAMENT TIMER] RESTORING EXISTING TIMER - Tournament ${tournament.id} already has valid end time`);
        
        try {
          const existingEndTime = new Date(tournament.registrationEndTime!);
          const remainingTime = existingEndTime.getTime() - Date.now();
          
          if (remainingTime > 0) {
            console.log(`🔧 [TOURNAMENT TIMER] Restoring timer with ${Math.round(remainingTime / 60000)} minutes remaining`);
            
            // Restore the timer in the service with existing end time
            const mockTimer = {
              tournamentId: Number(tournament.id),
              division: divisionNum,
              startTime: new Date(existingEndTime.getTime() - (60 * 60 * 1000)), // Back-calculate start time
              timeoutId: setTimeout(() => {
                console.log(`⏰ [TOURNAMENT TIMER] Timer expired for tournament ${tournament.id}`);
              }, remainingTime)
            };
            
            (dailyTournamentAutoFillService as any).activeTimers.set(Number(tournament.id), mockTimer);
            console.log(`✅ [TOURNAMENT TIMER] Timer restored successfully for tournament ${tournament.id}`);
          }
        } catch (error) {
          console.error(`❌ [TOURNAMENT TIMER] Failed to restore existing timer:`, error);
        }
      } else {
        // Create new timer only if no valid end time exists
        console.log(`🔄 [TOURNAMENT TIMER] NEW TIMER - Starting fresh timer for tournament ${tournament.id} with ${tournament.entries.length} teams`);
        
        try {
          const timeoutDuration = 60 * 60 * 1000; // 1 hour in milliseconds  
          const startTime = new Date();
          
          // Manually set the timer in the service (accessing private property)
          const mockTimer = {
            tournamentId: Number(tournament.id),
            division: divisionNum,
            startTime,
            timeoutId: setTimeout(() => {
              console.log(`⏰ [TOURNAMENT TIMER] Timer expired for tournament ${tournament.id}`);
            }, timeoutDuration)
          };
          
          console.log(`🔧 [TOURNAMENT TIMER] Setting timer in service...`);
          (dailyTournamentAutoFillService as any).activeTimers.set(Number(tournament.id), mockTimer);
          
          // Update tournament with timer info
          console.log(`🔧 [TOURNAMENT TIMER] Updating tournament with end time...`);
          await prisma.tournament.update({
            where: { id: tournament.id },
            data: {
              registrationEndTime: new Date(Date.now() + timeoutDuration)
            }
          });
          
          console.log(`✅ [TOURNAMENT TIMER] Manual timer set successfully for tournament ${tournament.id}`);
          
        } catch (error) {
          console.error(`❌ [TOURNAMENT TIMER] Failed to set manual timer:`, error);
        }
      }
      
      // Get updated timer status
      timerStatus = await dailyTournamentAutoFillService.getTimerStatus(Number(tournament.id));
      console.log(`🔍 [TOURNAMENT TIMER] Updated timer status:`, timerStatus);
      
    } else {
      console.log(`⏭️ [TOURNAMENT TIMER] Fallback conditions not met - Active: ${timerStatus.active}, Entries: ${tournament.entries.length}`);
    }
    
    // Get registered team names
    const registeredTeams = tournament.entries.map(entry => ({
      teamId: entry.team.id,
      teamName: entry.team.name,
      registeredAt: entry.registeredAt
    }));

    res.json({
      hasActiveTournament: true,
      tournamentId: tournament.id,
      displayTournamentId: tournament.tournamentId, // Add readable tournament ID
      tournamentName: tournament.name,
      registrationOpen: true,
      registrationCount: tournament.entries.length,
      maxTeams: 8,
      timeRemaining: timerStatus.timeRemaining || null,
      timerActive: timerStatus.active,
      registrationEndTime: tournament.registrationEndTime,
      registeredTeams: registeredTeams // Add team names
    });

  } catch (error) {
    console.error('Tournament status error:', error);
    res.status(500).json({ message: "Failed to get tournament status" });
  }
});

router.get('/history', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = await getPrismaClient();
    const userId = req.user?.claims?.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team || !team.id) return res.json([]);

    // Use Prisma directly to get tournament history
    const tournamentEntries = await prisma.tournamentEntry.findMany({
      where: { teamId: team.id },
      include: { 
        tournament: true
      },
      orderBy: { registeredAt: 'desc' }
    });
    
    console.log(`TOURNAMENT HISTORY DEBUG: Found ${tournamentEntries.length} entries for team ${team.id}:`);
    console.log(`Tournament entries details:`, tournamentEntries.map((e: any) => ({
      id: e.id,
      tournamentId: e.tournamentId,
      teamId: e.teamId,
      finalRank: e.finalRank,
      registeredAt: e.registeredAt,
      tournament: e.tournament ? {
        name: e.tournament.name,
        type: e.tournament.type,
        status: e.tournament.status
      } : null
    })));

    const completedEntries = tournamentEntries.filter((entry: any) => entry.tournament.status === 'COMPLETED' as any);
    console.log(`TOURNAMENT HISTORY DEBUG: Found ${completedEntries.length} completed tournaments`);
    
    const history = completedEntries.map((entry: any) => ({
      id: entry.tournamentId,
      tournamentId: entry.tournament.tournamentId,
      teamId: entry.teamId,
      registeredAt: entry.registeredAt?.toISOString() || entry.registeredAt,
      finalRank: entry.finalRank,
      placement: entry.finalRank,
      rewardsClaimed: entry.rewardsClaimed,
      tournament: {
        id: entry.tournament.id,
        tournamentId: entry.tournament.tournamentId,
        name: entry.tournament.name,
        type: entry.tournament.type,
        status: entry.tournament.status,
        division: entry.tournament.division,
        seasonDay: entry.tournament.seasonDay,
        gameDay: entry.tournament.seasonDay
      },
      creditsWon: entry.finalRank === 1 ? 1500 : entry.finalRank === 2 ? 500 : 0,
      gemsWon: 0,
      trophyWon: entry.finalRank !== null && entry.finalRank >= 1 && entry.finalRank <= 3,
      yourPlacement: entry.finalRank,
      prizeWon: entry.finalRank === 1 ? 1500 : entry.finalRank === 2 ? 500 : 0
    }));
    
    console.log(`TOURNAMENT HISTORY DEBUG: Final history structure:`, history);

    // Use custom JSON serializer to handle BigInt values
    const responseText = JSON.stringify(history, (key, value) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      return value;
    });
    
    res.setHeader('Content-Type', 'application/json');
    res.send(responseText);
  } catch (error) {
    console.error("Error fetching tournament history:", error);
    next(error);
  }
});

// Add bracket endpoint
router.get('/bracket/:id', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const prisma = await getPrismaClient();
    const tournamentIdParam = req.params.id;
    
    // First, find the tournament by tournamentId field to get the actual id
    const tournament = await prisma.tournament.findFirst({
      where: { tournamentId: tournamentIdParam }
    });
    
    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }
    
    // Get tournament matches for the bracket using the tournament's id
    const matches = await prisma.game.findMany({
      where: { tournamentId: tournament.id },
      include: {
        homeTeam: true,
        awayTeam: true
      },
      orderBy: [
        { round: 'asc' },
        { id: 'asc' }
      ]
    });

    // Include tournament info in the response
    const response = {
      tournament: {
        id: tournament.id,
        tournamentId: tournament.tournamentId,
        name: tournament.name,
        type: tournament.type,
        status: tournament.status,
        division: tournament.division,
        startTime: tournament.startTime,
        endTime: tournament.endTime
      },
      matches
    };

    // Use custom JSON serializer to handle BigInt values
    const responseText = JSON.stringify(response, (key, value) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      return value;
    });
    
    res.setHeader('Content-Type', 'application/json');
    res.send(responseText);
  } catch (error) {
    console.error("Error fetching tournament bracket:", error);
    next(error);
  }
});

// Available tournaments endpoint - frontend calls /api/tournaments/available
router.get('/available', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const prisma = await getPrismaClient();
    const userId = req.user?.claims?.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team || !team.id) return res.json([]);
    
    const division = team.division || 8;
    const openTournaments = await tournamentStorage.getTournamentsByDivision(division, 'open');
    
    // Add more details like participant count if needed
    const tournamentsWithDetails = await Promise.all(openTournaments.map(async t => {
        const participantCount = await prisma.tournamentEntry.count({
          where: { tournamentId: t.id }
        });
        return { ...t, teamsEntered: participantCount };
    }));

    // Use custom JSON serializer to handle BigInt values
    const responseText = JSON.stringify(tournamentsWithDetails, (key, value) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      return value;
    });
    
    res.setHeader('Content-Type', 'application/json');
    res.send(responseText);
  } catch (error) {
    console.error("Error fetching available tournaments:", error);
    next(error);
  }
});

router.get('/:division', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = await getPrismaClient();
    const division = parseInt(req.params.division);
    if (isNaN(division) || division < 1 || division > 8) {
      return res.status(400).json({ message: "Invalid division number." });
    }

    const openTournaments = await tournamentStorage.getTournamentsByDivision(division, 'open');
    // Add more details like participant count if needed
    const tournamentsWithDetails = await Promise.all(openTournaments.map(async t => {
        const participantCount = await prisma.tournamentEntry.count({
          where: { tournamentId: t.id }
        });
        return { ...t, teamsEntered: participantCount };
    }));

    // Use custom JSON serializer to handle BigInt values
    const responseText = JSON.stringify(tournamentsWithDetails, (key, value) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      return value;
    });
    
    res.setHeader('Content-Type', 'application/json');
    res.send(responseText);
  } catch (error) {
    console.error("Error fetching tournaments:", error);
    next(error);
  }
});

router.post('/:id/enter', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const prisma = await getPrismaClient();
    const { id: tournamentId } = enterTournamentParamsSchema.parse(req.params);
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team || !team.id) return res.status(404).json({ message: "Team not found." });

    const tournament = await tournamentStorage.getTournamentById(parseInt(tournamentId));
    if (!tournament) return res.status(404).json({ message: "Tournament not found." });
    if (tournament.status !== 'REGISTRATION_OPEN') return res.status(400).json({ message: "Tournament is not open for entries."});
    if (tournament.division !== team.division) return res.status(400).json({ message: "Your team is not in the correct division for this tournament."});

    const participantCount = await prisma.tournamentEntry.count({
      where: { tournamentId: parseInt(tournamentId) }
    });
    if (participantCount >= 8) return res.status(400).json({ message: "Tournament is full."});

    const existingEntry = await prisma.tournamentEntry.findFirst({
      where: { tournamentId: parseInt(tournamentId), teamId: team.id }
    });
    if(existingEntry) return res.status(400).json({message: "Your team is already entered in this tournament."});

    const entryFee = tournament.entryFeeCredits || 0;
    const finances = await teamFinancesStorage.getTeamFinances(team.id);
    if (!finances || (finances.credits || 0) < entryFee) {
      return res.status(400).json({ message: `Insufficient credits. Entry fee: ${entryFee}` });
    }

    if (team.name !== "Macomb Cougars" && entryFee > 0) { // Macomb Cougars bypass fee for testing
        await teamFinancesStorage.updateTeamFinances(team.id, { credits: (finances.credits || 0) - Number(entryFee) });
    }

    await tournamentStorage.createTournamentEntry({ tournamentId: parseInt(tournamentId), teamId: team.id });

    res.json({ success: true, message: "Tournament entry successful. Fee deducted (if applicable)." });
  } catch (error) {
    console.error("Error entering tournament:", error);
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid tournament ID.", errors: error.errors });
    next(error);
  }
});

router.get('/my-entries', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team || !team.id) return res.json([]);

    const entries = await tournamentStorage.getTeamTournamentEntries(team.id);
    
    // Use custom JSON serializer to handle BigInt values
    const responseText = JSON.stringify(entries, (key, value) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      return value;
    });
    
    res.setHeader('Content-Type', 'application/json');
    res.send(responseText);
  } catch (error) {
    console.error("Error fetching current tournament entries:", error);
    next(error);
  }
});


router.get('/:division/bracket', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const division = parseInt(req.params.division);
    if (isNaN(division) || division < 1 || division > 8) {
      return res.status(400).json({ message: "Invalid division number." });
    }

    // Get teams in this division
    const teamsInDivision = await storage.teams.getTeamsByDivision(division);

    if (teamsInDivision.length < 4) {
        return res.status(400).json({ message: `Not enough teams in Division ${division} to form a 4-team bracket.` });
    }

    const sortedTeams = teamsInDivision.sort((a: any, b: any) => (b.points || 0) - (a.points || 0) || (b.wins || 0) - (a.wins || 0) ).slice(0,4);

    const bracket = {
      tournamentName: `${getDivisionName(division)} Championship Bracket (Top 4)`,
      division: division,
      status: "pending_generation",
      semifinals: [
        { id: 'semi1', name: 'Semifinal 1', team1: sortedTeams[0], team2: sortedTeams[3], seed1: 1, seed2: 4, status: 'pending', matchId: null, winner: null },
        { id: 'semi2', name: 'Semifinal 2', team1: sortedTeams[1], team2: sortedTeams[2], seed1: 2, seed2: 3, status: 'pending', matchId: null, winner: null }
      ],
      final: { id: 'final', name: 'Championship Final', team1: null, team2: null, status: 'pending', matchId: null, winner: null },
      tieBreakingRules: [ "1. Head-to-head record", "2. Point differential", /* ... more rules ... */ ]
    };

    res.json(bracket);
  } catch (error) {
    console.error("Error generating tournament bracket:", error);
    next(error);
  }
});

// Get bracket for a specific tournament (showing actual tournament games)
router.get('/:tournamentId/matches', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tournamentId = parseInt(req.params.tournamentId);
    if (isNaN(tournamentId)) {
      return res.status(400).json({ message: "Invalid tournament ID." });
    }

    // Get tournament details using Prisma directly
    const { getPrismaClient } = await import('../database.js');
    const prisma = await getPrismaClient();
    
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId }
    });
    
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    // Get tournament matches/games
    const games = await prisma.game.findMany({
      where: { tournamentId: tournamentId },
      orderBy: [{ round: 'asc' }, { id: 'asc' }]
    });
    
    // Get team names for the games
    const teamIds = new Set<number>();
    games.forEach((game: any) => {
      teamIds.add(game.homeTeamId);
      teamIds.add(game.awayTeamId);
    });
    
    const teams = await prisma.team.findMany({
      where: { id: { in: Array.from(teamIds) } },
      select: { id: true, name: true }
    });
    
    const teamMap = new Map(teams.map((team: any) => [team.id, team]));

    // Format matches with team names
    const matches = games.map((game: any) => ({
      id: game.id,
      round: game.round,
      homeTeam: teamMap.get(game.homeTeamId),
      awayTeam: teamMap.get(game.awayTeamId),
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      status: game.status,
      gameDate: game.gameDate
    }));

    const bracket = {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        division: tournament.division
      },
      matches: matches,
      hasMatches: matches.length > 0
    };

    res.json(bracket);
  } catch (error) {
    console.error("Error fetching tournament matches:", error);
    next(error);
  }
});

export default router;
