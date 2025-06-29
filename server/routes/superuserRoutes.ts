import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from "../storage"; // Adjusted path
import { isAuthenticated } from "../replitAuth"; // Adjusted path
import { db } from "../db"; // For direct DB access
import { players, teams, staff, teamFinances, matches as matchesTable } from "@shared/schema"; // Schema
import { eq, or } from "drizzle-orm";
import { generateRandomPlayer as generatePlayerForTeam } from "../services/leagueService"; // Renamed for clarity


const router = Router();

// Middleware to check for SuperUser status (e.g., specific user ID or a role)
// This is a simplified check. In a real app, use roles or a config for superuser IDs.
const isSuperUser = async (req: any, res: Response, next: NextFunction) => {
    const userId = req.user?.claims?.sub;
    if (!userId) {
        return res.status(401).json({ message: "Authentication required." });
    }
    // Example: Check against a specific user ID known to be the superuser
    // In a real app, this should be more robust (e.g., check a 'role' field on the user object)
    // For now, using the "Macomb Cougars" team owner as a proxy if their user ID is fixed or known
    // Or, more directly, check user ID if it's static for the superuser.
    // const user = await storage.getUser(userId);
    // if (user && user.email === process.env.SUPERUSER_EMAIL) { // Or some other admin check
    if (userId === "44010914" || (req.user.claims.email === "sixtey7@gmail.com")) { // Allow specific ID or email
        return next();
    }
    // Fallback check if team name "Macomb Cougars" is used for superuser
    const team = await storage.getTeamByUserId(userId);
    if (team && team.name === "Macomb Cougars") {
        return next();
    }

    return res.status(403).json({ message: "Forbidden: SuperUser access required." });
};

router.use(isSuperUser); // Apply SuperUser check to all routes in this file

// Grant credits
router.post('/grant-credits', async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub; // SuperUser ID
    const targetTeamId = req.body.teamId; // Optionally grant to a specific team
    const teamToCredit = targetTeamId ? await storage.getTeamById(targetTeamId) : await storage.getTeamByUserId(userId);

    if (!teamToCredit) {
      return res.status(404).json({ message: "Target team not found." });
    }

    const { credits = 500000, premiumCurrency = 500 } = req.body; // Generous defaults for SU

    const currentFinances = await storage.getTeamFinances(teamToCredit.id);
    if (!currentFinances) {
      await storage.createTeamFinances({
        teamId: teamToCredit.id,
        credits: credits,
        premiumCurrency: premiumCurrency,
        // ... other finance fields if necessary
      });
    } else {
      await storage.updateTeamFinances(teamToCredit.id, {
        credits: (currentFinances.credits || 0) + credits,
        premiumCurrency: (currentFinances.premiumCurrency || 0) + premiumCurrency
      });
    }
    res.json({ message: `${credits.toLocaleString()} credits and ${premiumCurrency} premium currency granted to ${teamToCredit.name}.` });
  } catch (error) {
    console.error("SuperUser Error - Granting Credits:", error);
    next(error);
  }
});

// Advance game week/day (conceptual, actual implementation depends on game's time flow)
router.post('/advance-day', async (req: any, res: Response, next: NextFunction) => {
  try {
    // This would interact with a global game state service managing season/day progression
    // For now, it's a placeholder for the concept.
    const currentSeason = await storage.getCurrentSeason();
    if (!currentSeason) return res.status(404).json({ message: "No active season." });

    const newStartDate = new Date(currentSeason.startDate || Date.now());
    newStartDate.setDate(newStartDate.getDate() + 1); // Advance by one day

    let newSeasonYear = currentSeason.year || new Date().getFullYear();
    let newSeasonName = currentSeason.name;
    let message = "Day advanced successfully.";

    const daysSinceStart = Math.floor((newStartDate.getTime() - (currentSeason.startDateOriginal || currentSeason.startDate).getTime()) / (1000 * 60 * 60 * 24));
    const currentDayInCycle = (daysSinceStart % 17) + 1;


    if (currentDayInCycle === 1 && daysSinceStart > 0) { // New cycle starts
        await storage.updateSeason(currentSeason.id, { status: "completed", endDate: new Date() });
        newSeasonYear = (currentSeason.year || new Date().getFullYear()) + 1;
        newSeasonName = `Season ${newSeasonYear}`;
        await storage.createSeason({
            name: newSeasonName,
            year: newSeasonYear,
            status: "active",
            startDate: newStartDate, // Start of new season
            startDateOriginal: newStartDate, // Store original start
        });
        message = `New season (${newSeasonName}) started. Day advanced.`;
    } else {
        await storage.updateSeason(currentSeason.id, { startDate: newStartDate });
    }

    res.json({ message, newDayInCycle: currentDayInCycle, season: newSeasonName });
  } catch (error) {
    console.error("SuperUser Error - Advancing Day:", error);
    next(error);
  }
});


// Start a specific tournament (if not auto-started)
router.post('/start-tournament', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { division, tournamentId } = req.body;
    if (!division && !tournamentId) {
        return res.status(400).json({ message: "Either division or tournamentId is required."});
    }
    // TODO: Logic to find tournament (by ID or create/find by division) and change its status to 'in_progress'
    // Generate matches for the tournament, notify participants.
    res.json({ message: `Tournament (ID: ${tournamentId || `Div ${division}`}) start process initiated (mock).` });
  } catch (error) {
    console.error("SuperUser Error - Starting Tournament:", error);
    next(error);
  }
});

// Reset entire season data (teams stats, matches etc.)
router.post('/reset-season', async (req: any, res: Response, next: NextFunction) => {
  try {
    // Reset all teams' statistics
    const allTeams = await db.select({id: teams.id}).from(teams);
    for (const team of allTeams) {
      await storage.updateTeam(team.id, { wins: 0, losses: 0, draws: 0, points: 0 });
    }
    // Optionally delete old matches, reset player stats, etc.
    // Mark current season as new or reset its day/week counter
    const currentSeason = await storage.getCurrentSeason();
    if (currentSeason) {
        await storage.updateSeason(currentSeason.id, {
            startDate: new Date(), // Reset start date to now
            status: "active",
            playoffStartDate: null,
            championTeamId: null,
            endDate: null,
        });
    } else {
        await storage.createSeason({ name: "Season 1", year: new Date().getFullYear(), status: "active", startDate: new Date() });
    }


    res.json({ message: `Full season reset successfully. ${allTeams.length} teams' stats cleared.` });
  } catch (error) {
    console.error("SuperUser Error - Resetting Season:", error);
    next(error);
  }
});

// Clean up a division to max 8 teams (useful for testing AI generation)
router.post('/cleanup-division', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { division } = req.body;
    if (!division || division < 1 || division > 8) {
      return res.status(400).json({ message: "Invalid division number (1-8)." });
    }

    const allTeamsInDiv = await storage.getTeamsByDivision(division);
    if (allTeamsInDiv.length <= 8) {
      return res.json({ message: `Division ${division} has ${allTeamsInDiv.length} teams, no cleanup needed.` });
    }

    // Prioritize keeping human player teams. This is a heuristic.
    const humanTeams = allTeamsInDiv.filter(t => !t.userId.startsWith("ai_user_")); // Simple check
    const aiTeams = allTeamsInDiv.filter(t => t.userId.startsWith("ai_user_"));

    let teamsToKeep = [...humanTeams];
    const neededAiTeams = 8 - humanTeams.length;
    if (neededAiTeams > 0 && aiTeams.length > 0) {
        teamsToKeep.push(...aiTeams.slice(0, neededAiTeams));
    }

    const teamsToRemove = allTeamsInDiv.filter(t => !teamsToKeep.find(kept => kept.id === t.id));
    let removedCount = 0;

    for (const teamToRemove of teamsToRemove) {
        // Cascade delete: players, staff, finances, matches, then team
        await db.delete(players).where(eq(players.teamId, teamToRemove.id));
        await db.delete(staff).where(eq(staff.teamId, teamToRemove.id));
        await db.delete(teamFinances).where(eq(teamFinances.teamId, teamToRemove.id));
        await db.delete(matchesTable).where(or(eq(matchesTable.homeTeamId, teamToRemove.id), eq(matchesTable.awayTeamId, teamToRemove.id)));
        await db.delete(teams).where(eq(teams.id, teamToRemove.id));
        removedCount++;
    }

    res.json({ message: `Division ${division} cleaned. Removed ${removedCount} teams. ${teamsToKeep.length} teams remaining.` });
  } catch (error) {
    console.error("SuperUser Error - Cleaning Division:", error);
    next(error);
  }
});

// Stop all currently live games
router.post('/stop-all-games', async (req: any, res: Response, next: NextFunction) => {
  try {
    const liveMatches = await storage.getLiveMatches();
    for (const match of liveMatches) {
      await matchStateManager.stopMatch(match.id); // This updates DB status to completed
    }
    res.json({ message: `Successfully stopped ${liveMatches.length} live games.` });
  } catch (error) {
    console.error("SuperUser Error - Stopping Games:", error);
    next(error);
  }
});

// Get current season/week (more of a debug/status endpoint)
router.get('/season/current-cycle-info', async (req: any, res: Response, next: NextFunction) => {
  try {
    // This is largely the same as the public /api/season/current-cycle but for SU view
    const currentSeason = await storage.getCurrentSeason();
    if (!currentSeason) return res.status(404).json({ message: "No active season." });

    const seasonStartDate = currentSeason.startDateOriginal || currentSeason.startDate || new Date();
    const daysSinceStart = Math.floor((new Date().getTime() - seasonStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const currentDayInCycle = (daysSinceStart % 17) + 1;

    res.json({
      seasonName: currentSeason.name,
      seasonYear: currentSeason.year,
      seasonStatus: currentSeason.status,
      seasonStartDate: currentSeason.startDate,
      currentDayInCycle, // 1-17
      // ... add more detailed debug info if needed
    });
  } catch (error) {
    console.error("SuperUser Error - Fetching Current Cycle Info:", error);
    next(error);
  }
});

// Add players to a specific team
router.post('/add-players', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { teamId, count = 3, race: specificRace } = req.body;
    if (!teamId) return res.status(400).json({ message: "teamId is required." });

    const teamExists = await storage.getTeamById(teamId);
    if (!teamExists) return res.status(404).json({ message: `Team with ID ${teamId} not found.`});

    const createdPlayersList = [];
    const races = specificRace ? [specificRace] : ["human", "sylvan", "gryll", "lumina", "umbra"];

    for (let i = 0; i < count; i++) {
      const race = races[Math.floor(Math.random() * races.length)];
      const player = generatePlayerForTeam("Generated Player", race, teamId); // Uses leagueService
      const newPlayer = await storage.createPlayer(player);
      createdPlayersList.push(newPlayer);
    }
    res.status(201).json({ message: `Successfully added ${count} players to team ${teamId}.`, players: createdPlayersList });
  } catch (error) {
    console.error("SuperUser Error - Adding Players:", error);
    next(error);
  }
});


export default router;
