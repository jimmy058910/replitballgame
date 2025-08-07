import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from "../storage/index";
import { teamFinancesStorage } from "../storage/teamFinancesStorage";
import { tournamentStorage } from "../storage/tournamentStorage";
import { isAuthenticated } from "../googleAuth";
import { z } from "zod";
import { getDivisionName } from "../../shared/divisionUtils";
import { PrismaClient } from "../../generated/prisma/index";

const prisma = new PrismaClient();

const router = Router();

const enterTournamentParamsSchema = z.object({
    id: z.string().uuid("Invalid tournament ID format"), // Assuming tournament IDs are UUIDs
});

// History route must come BEFORE the :division route to avoid conflicts
router.get('/history', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
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
    console.log(`Tournament entries details:`, tournamentEntries.map(e => ({
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

    const completedEntries = tournamentEntries.filter(entry => entry.tournament.status === 'COMPLETED' as any);
    console.log(`TOURNAMENT HISTORY DEBUG: Found ${completedEntries.length} completed tournaments`);
    
    const history = completedEntries.map(entry => ({
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
        gameDay: entry.tournament.gameDay
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
router.get('/bracket/:id', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
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
router.get('/available', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
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

router.get('/:division', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
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

router.post('/:id/enter', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id: tournamentId } = enterTournamentParamsSchema.parse(req.params);
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team || !team.id) return res.status(404).json({ message: "Team not found." });

    const tournament = await tournamentStorage.getTournamentById(parseInt(tournamentId));
    if (!tournament) return res.status(404).json({ message: "Tournament not found." });
    if (tournament.status !== 'REGISTRATION_OPEN') return res.status(400).json({ message: "Tournament is not open for entries."});
    if (tournament.division !== team.division) return res.status(400).json({ message: "Your team is not in the correct division for this tournament."});

    const participantCount = await prisma.tournamentEntry.count({
      where: { tournamentId: tournamentId }
    });
    if (participantCount >= (tournament.maxTeams || 8)) return res.status(400).json({ message: "Tournament is full."});

    const existingEntry = await prisma.tournamentEntry.findFirst({
      where: { tournamentId: tournamentId, teamId: team.id }
    });
    if(existingEntry) return res.status(400).json({message: "Your team is already entered in this tournament."});

    const entryFee = tournament.entryFeeCredits || 0;
    const finances = await teamFinancesStorage.getTeamFinances(team.id);
    if (!finances || (finances.credits || 0) < entryFee) {
      return res.status(400).json({ message: `Insufficient credits. Entry fee: ${entryFee}` });
    }

    if (team.name !== "Macomb Cougars" && entryFee > 0) { // Macomb Cougars bypass fee for testing
        await teamFinancesStorage.updateTeamFinances(team.id, { credits: (finances.credits || 0) - BigInt(entryFee) });
    }

    await tournamentStorage.createTournamentEntry({ tournamentId: parseInt(tournamentId), teamId: team.id });

    res.json({ success: true, message: "Tournament entry successful. Fee deducted (if applicable)." });
  } catch (error) {
    console.error("Error entering tournament:", error);
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid tournament ID.", errors: error.errors });
    next(error);
  }
});

router.get('/my-entries', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
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


router.get('/:division/bracket', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const division = parseInt(req.params.division);
    if (isNaN(division) || division < 1 || division > 8) {
      return res.status(400).json({ message: "Invalid division number." });
    }

    // TODO: Fetch actual teams for a *specific* tournament, not just any team in division
    // This would involve getting teams that *entered* a specific tournament.
    const teamsInDivision = await storage.teams.getTeamsByDivision(division);

    if (teamsInDivision.length < 4) {
        return res.status(400).json({ message: `Not enough teams in Division ${division} to form a 4-team bracket.` });
    }

    const sortedTeams = teamsInDivision.sort((a, b) => (b.points || 0) - (a.points || 0) || (b.wins || 0) - (a.wins || 0) ).slice(0,4);

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

export default router;
