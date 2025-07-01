import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from "../storage"; // Adjusted path
import { isAuthenticated } from "../replitAuth"; // Adjusted path
import { z } from "zod"; // For validation

const router = Router();

// Import timezone utilities for current cycle calculation
import { getServerTimeInfo } from "@shared/timezone";

// Zod Schemas for validation
const playoffStartSchema = z.object({
    division: z.number().min(1).max(8),
});

const contractNegotiationSchema = z.object({
    playerId: z.string().uuid(),
    teamId: z.string().uuid(), // Should ideally be derived from user or verified against user's team
    salary: z.number().min(1),
    duration: z.number().min(1).max(5), // Example: 1-5 year contracts
    // bonuses: z.record(z.any()).optional(),
    // contractType: z.string().optional(),
});

const sponsorshipNegotiationSchema = z.object({
    teamId: z.string().uuid(), // Should be derived/verified
    sponsorName: z.string().min(1),
    dealType: z.string().min(1),
    value: z.number().min(1),
    duration: z.number().min(1).max(5),
    // bonusConditions: z.record(z.any()).optional(),
});


// ===== SEASON CHAMPIONSHIPS & PLAYOFFS ROUTES =====
router.get('/current', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const season = await storage.seasons.getCurrentSeason(); // Assumes this returns the active season
    if (!season) {
        // If no active season, might create one or return specific status
        return res.status(404).json({ message: "No active season found. Please start a new season." });
    }
    res.json(season);
  } catch (error) {
    console.error("Error fetching current season:", error);
    next(error);
  }
});

// Get current season cycle (day-by-day info)
router.get('/current-cycle', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentSeason = await storage.seasons.getCurrentSeason();
    if (!currentSeason) {
      return res.status(404).json({ message: "No active season found." });
    }

    // Calculate the current day in the 17-day cycle
    const seasonStartDate = currentSeason.startDateOriginal || currentSeason.startDate || new Date();
    const daysSinceStart = Math.floor((new Date().getTime() - seasonStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const currentDayInCycle = (daysSinceStart % 17) + 1;

    // Determine the phase based on current day in cycle
    let phase = "Regular Season";
    let description = "Regular Season - Teams compete in their divisions";
    let details = "League matches are being played daily";
    let daysUntilPlayoffs = 0;
    let daysUntilNewSeason = 0;

    if (currentDayInCycle >= 1 && currentDayInCycle <= 10) {
      phase = "Regular Season";
      description = "Regular Season - Teams compete in their divisions";
      details = "League matches are being played daily";
      daysUntilPlayoffs = 11 - currentDayInCycle;
    } else if (currentDayInCycle >= 11 && currentDayInCycle <= 14) {
      phase = "Playoffs";
      description = "Division Playoffs - Compete for championship";
      details = "Elimination rounds determine division champions";
      daysUntilPlayoffs = 0;
      daysUntilNewSeason = 15 - currentDayInCycle;
    } else if (currentDayInCycle >= 15 && currentDayInCycle <= 17) {
      phase = "Off-Season";
      description = "Off-Season - Recruit and prepare for next season";
      details = "Team building, tryouts, and strategic planning";
      daysUntilPlayoffs = 0;
      daysUntilNewSeason = 18 - currentDayInCycle;
    }

    res.json({
      season: currentSeason.name || `Season ${currentSeason.year || new Date().getFullYear()}`,
      currentDay: currentDayInCycle,
      phase,
      description,
      details,
      daysUntilPlayoffs,
      daysUntilNewSeason,
      seasonYear: currentSeason.year || new Date().getFullYear(),
      seasonStatus: currentSeason.status || "active"
    });
  } catch (error) {
    console.error("Error fetching current season cycle:", error);
    next(error);
  }
});

router.get('/champions', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const history = await storage.getChampionshipHistory(); // Assumes this gets completed seasons with champions
    res.json(history);
  } catch (error) {
    console.error("Error fetching championship history:", error);
    next(error);
  }
});

router.get('/playoffs/:division', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const division = parseInt(req.params.division);
    if (isNaN(division) || division < 1 || division > 8) {
        return res.status(400).json({ message: "Invalid division number." });
    }
    const currentSeason = await storage.getCurrentSeason();
    if (!currentSeason || !currentSeason.id) {
      return res.json([]); // No active season, no playoffs
    }
    const playoffsData = await storage.getPlayoffsByDivision(currentSeason.id, division);
    res.json(playoffsData);
  } catch (error) {
    console.error("Error fetching playoffs:", error);
    next(error);
  }
});

router.post('/:seasonId/playoffs/start', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: Add SuperUser/Admin check for starting playoffs
    const { seasonId } = req.params;
    const { division } = playoffStartSchema.parse(req.body);

    const season = await storage.getSeasonById(seasonId); // Assuming storage.getSeasonById exists
    if (!season) return res.status(404).json({ message: "Season not found." });
    if (season.status !== 'active') return res.status(400).json({ message: "Season is not active, cannot start playoffs." });

    const teamsInDivision = await storage.getTeamsByDivision(division);
    // Simplified sorting, real tie-breakers would be more complex
    const sortedTeams = teamsInDivision.sort((a, b) => (b.points || 0) - (a.points || 0) || (b.wins || 0) - (a.wins || 0));

    if (sortedTeams.length < 4) {
        return res.status(400).json({ message: `Not enough teams in Division ${division} (found ${sortedTeams.length}) to start a 4-team playoff.` });
    }
    const topTeams = sortedTeams.slice(0, 4);

    const playoffMatchesData = [
      { seasonId, division, round: 1, team1Id: topTeams[0].id, team2Id: topTeams[3].id, status: "scheduled" as const, matchName: "Semifinal 1 (1v4)" },
      { seasonId, division, round: 1, team1Id: topTeams[1].id, team2Id: topTeams[2].id, status: "scheduled" as const, matchName: "Semifinal 2 (2v3)" }
    ];

    const createdPlayoffMatches = [];
    for (const matchData of playoffMatchesData) {
      const pMatch = await storage.createPlayoffMatch(matchData);
      createdPlayoffMatches.push(pMatch);
    }

    // Update season status to 'playoffs'
    await storage.updateSeason(seasonId, { status: "playoffs", playoffStartDate: new Date() });

    res.status(201).json({ message: `Playoffs for Division ${division}, Season ${season.name} started successfully.`, matches: createdPlayoffMatches });
  } catch (error) {
    console.error("Error starting playoffs:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid playoff start data", errors: error.errors });
    }
    next(error);
  }
});

// ===== CONTRACT SYSTEM ROUTES =====
router.get('/contracts/:teamId', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    // Optional: Add check if user owns teamId or is admin
    const contracts = await storage.getTeamContracts(teamId); // Assumes this fetches active contracts
    res.json(contracts);
  } catch (error) {
    console.error("Error fetching team contracts:", error);
    next(error);
  }
});

router.get('/salary-cap/:teamId', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    // Optional: Add check if user owns teamId or is admin
    let capInfo = await storage.getTeamSalaryCap(teamId);
    if (!capInfo) {
        // Create a default salary cap entry if one doesn't exist
        const currentSeasonInfo = await storage.getCurrentSeason();
        capInfo = await storage.updateSalaryCap(teamId, {
            season: currentSeasonInfo?.year || new Date().getFullYear(),
            totalSalary: 0,
            capLimit: 50000000, // Default cap limit
            capSpace: 50000000
        });
    }
    res.json(capInfo);
  } catch (error) {
    console.error("Error fetching salary cap:", error);
    next(error);
  }
});

router.post('/contracts/negotiate', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const userTeam = await storage.getTeamByUserId(userId);
    if (!userTeam) return res.status(404).json({ message: "Your team not found." });

    const { playerId, salary, duration } = contractNegotiationSchema.omit({teamId: true}).parse(req.body);

    const player = await storage.getPlayerById(playerId);
    if(!player || player.teamId !== userTeam.id) {
        return res.status(403).json({ message: "Player not on your team or does not exist." });
    }

    // TODO: Validate against salary cap, player demands, etc.
    // For now, direct creation.

    const currentSeasonInfo = await storage.getCurrentSeason();
    const contract = await storage.createPlayerContract({
      playerId,
      teamId: userTeam.id,
      salary,
      duration,
      remainingYears: duration,
      contractType: "standard", // Example
      signedDate: new Date(),
      expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + duration)),
      isActive: true,
      season: currentSeasonInfo?.year || new Date().getFullYear(), // Add season to contract
    });

    // Update player's main record with new salary/contract info
    await storage.updatePlayer(playerId, { salary, contractSeasons: duration });
    // TODO: Recalculate and update team's totalSalary in salaryCap table.

    res.status(201).json(contract);
  } catch (error) {
    console.error("Error negotiating contract:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid contract data", errors: error.errors });
    }
    next(error);
  }
});

// ... other contract routes like renew, release, templates (similar structure)

// ===== SPONSORSHIP SYSTEM ROUTES =====
router.get('/sponsorships/:teamId', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    // Optional: Permission check
    const sponsorships = await storage.getTeamSponsorships(teamId);
    res.json(sponsorships);
  } catch (error) {
    console.error("Error fetching team sponsorships:", error);
    next(error);
  }
});

router.post('/sponsorships/negotiate', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const userTeam = await storage.getTeamByUserId(userId);
    if (!userTeam) return res.status(404).json({ message: "Your team not found." });

    const { sponsorName, dealType, value, duration } = sponsorshipNegotiationSchema.omit({teamId:true}).parse(req.body);

    // TODO: Validate if this sponsor deal is available/legit, check limits, etc.
    const currentSeasonInfo = await storage.getCurrentSeason();
    const deal = await storage.createSponsorshipDeal({
      teamId: userTeam.id,
      sponsorName,
      dealType,
      value, // Annual value
      duration,
      remainingYears: duration,
      status: "active",
      signedDate: new Date(),
      expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + duration)),
      season: currentSeasonInfo?.year || new Date().getFullYear(), // Add season
    });

    // TODO: Update team finances based on this new sponsorship (e.g., add to annual income)

    res.status(201).json(deal);
  } catch (error) {
    console.error("Error negotiating sponsorship:", error);
     if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid sponsorship data", errors: error.errors });
    }
    next(error);
  }
});

// ... other sponsorship routes like renew, available sponsors

export default router;
