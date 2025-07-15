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
    // Always calculate season data based on fixed date (no database dependency)
    // Adjusted to make today (July 15) approximately Day 3 in the cycle
    const startDate = new Date("2025-07-13");
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const currentDayInCycle = (daysSinceStart % 17) + 1;
    
    // Debug logging (can be removed in production)
    // console.log('Season calculation debug:', {
    //   rawStartDate: currentSeason.start_date_original,
    //   rawStartDateBackup: currentSeason.start_date,
    //   seasonStartDate: seasonStartDate.toISOString(),
    //   now: now.toISOString(),
    //   daysSinceStart,
    //   currentDayInCycle
    // });
    
    // Calculate season number starting from Season 0, incrementing every 17 days
    const seasonNumber = Math.floor(daysSinceStart / 17);
    
    // Determine the phase and dynamic content based on current day in cycle
    let phase = "Regular Season";
    let phaseTitle = "Regular Season";
    let description = "";
    let dynamicDetail = "";
    let daysUntilPlayoffs = 0;
    let daysUntilNewSeason = 0;
    let countdownText = "";

    if (currentDayInCycle >= 1 && currentDayInCycle <= 14) {
      // Phase 1: Regular Season (Days 1-14)
      phase = "Regular Season";
      phaseTitle = "Regular Season";
      description = "Compete in your division to earn a spot in the playoffs.";
      
      // Dynamic detail based on specific day
      if (currentDayInCycle === 1) {
        dynamicDetail = "A new season begins! Your first match is today.";
      } else if (currentDayInCycle === 14) {
        dynamicDetail = "Final day of the regular season! Secure your playoff spot!";
      } else {
        dynamicDetail = "The league grind continues. Every game counts.";
      }
      
      daysUntilPlayoffs = 15 - currentDayInCycle;
      countdownText = `${daysUntilPlayoffs} Days Until Playoffs`;
      
    } else if (currentDayInCycle === 15) {
      // Phase 2: Playoffs (Day 15)
      phase = "Playoffs";
      phaseTitle = "Championship Day";
      description = "The top 4 teams from each league compete for the title.";
      dynamicDetail = "It's win or go home! Semifinals and the Championship will be decided today.";
      daysUntilPlayoffs = 0;
      daysUntilNewSeason = 2; // Days 16-17 remaining
      countdownText = "Next Round Simulates In: [HH:MM:SS]"; // TODO: Add real-time countdown
      
    } else if (currentDayInCycle >= 16 && currentDayInCycle <= 17) {
      // Phase 3: Off-Season (Days 16-17)
      phase = "Off-Season";
      phaseTitle = "Off-Season: Management Phase";
      description = "Build your dynasty. Sign contracts, recruit new talent, and set your strategy.";
      
      // Dynamic detail based on specific day
      if (currentDayInCycle === 16) {
        dynamicDetail = "Contract negotiations are open! Secure your key players for next season.";
        daysUntilNewSeason = 1;
      } else if (currentDayInCycle === 17) {
        dynamicDetail = "Final day to prepare. The league re-shuffle and new season schedule will be announced at 3 AM.";
        daysUntilNewSeason = 0;
      }
      
      daysUntilPlayoffs = 0;
      countdownText = daysUntilNewSeason > 0 ? `New Season Begins In: ${daysUntilNewSeason} Days` : "New Season Begins Tomorrow at 3 AM";
    }

    res.json({
      season: `Season ${seasonNumber}`,
      seasonNumber,
      currentDay: currentDayInCycle,
      phase,
      phaseTitle,
      description,
      dynamicDetail,
      countdownText,
      daysUntilPlayoffs,
      daysUntilNewSeason,
      seasonYear: seasonNumber,
      seasonStatus: "active",
      // Legacy fields for backward compatibility
      details: dynamicDetail
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
