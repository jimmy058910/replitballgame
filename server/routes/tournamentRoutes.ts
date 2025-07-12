import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from "../storage/index";
import { teamFinancesStorage } from "../storage/teamFinancesStorage";
import { tournamentStorage } from "../storage/tournamentStorage";
import { isAuthenticated } from "../replitAuth";
import { z } from "zod";
import { getDivisionName } from "../../shared/divisionUtils";

const router = Router();

const enterTournamentParamsSchema = z.object({
    id: z.string().uuid("Invalid tournament ID format"), // Assuming tournament IDs are UUIDs
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
        const participantCount = await tournamentStorage.getTournamentParticipantCount(t.id);
        return { ...t, teamsEntered: participantCount };
    }));

    res.json(tournamentsWithDetails);
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

    const tournament = await tournamentStorage.getTournamentById(tournamentId);
    if (!tournament) return res.status(404).json({ message: "Tournament not found." });
    if (tournament.status !== 'REGISTRATION_OPEN') return res.status(400).json({ message: "Tournament is not open for entries."});
    if (tournament.division !== team.division) return res.status(400).json({ message: "Your team is not in the correct division for this tournament."});

    const participantCount = await tournamentStorage.getTournamentParticipantCount(tournamentId);
    if (participantCount >= (tournament.maxTeams || 8)) return res.status(400).json({ message: "Tournament is full."});

    const existingEntry = await tournamentStorage.getTournamentEntry(tournamentId, team.id);
    if(existingEntry) return res.status(400).json({message: "Your team is already entered in this tournament."});

    const entryFee = tournament.entryFee || 0;
    const finances = await teamFinancesStorage.getTeamFinances(team.id);
    if (!finances || (finances.credits || 0) < entryFee) {
      return res.status(400).json({ message: `Insufficient credits. Entry fee: ${entryFee}` });
    }

    if (team.name !== "Macomb Cougars" && entryFee > 0) { // Macomb Cougars bypass fee for testing
        await teamFinancesStorage.updateTeamFinances(team.id, { credits: (finances.credits || 0) - entryFee });
    }

    await tournamentStorage.createTournamentEntry({ tournamentId, teamId: team.id });

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

    const entries = await tournamentStorage.getEntriesByTeam(team.id);
    res.json(entries);
  } catch (error) {
    console.error("Error fetching current tournament entries:", error);
    next(error);
  }
});

router.get('/history', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.claims?.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team || !team.id) return res.json([]);

    // Fetch completed tournaments the team participated in
    const teamEntries = await tournamentStorage.getEntriesByTeam(team.id);
    const completedTournamentIds = teamEntries.filter(e => e.placement !== null).map(e => e.tournamentId);

    const history = [];
    if (completedTournamentIds.length > 0) {
        for (const tId of completedTournamentIds) {
            const t = await tournamentStorage.getTournamentById(tId);
            if (t && t.status === 'COMPLETED') {
                const entry = teamEntries.find(e => e.tournamentId === tId);
                history.push({ ...t, yourPlacement: entry?.placement, prizeWon: entry?.prizeWon });
            }
        }
    }
    res.json(history.sort((a,b) => new Date(b.endTime || 0).getTime() - new Date(a.endTime || 0).getTime()));
  } catch (error) {
    console.error("Error fetching tournament history:", error);
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
