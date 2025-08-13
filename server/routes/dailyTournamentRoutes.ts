import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from '../storage/index.js';
import { isAuthenticated } from '../googleAuth.js';
import { getPrismaClient } from '../db.js';
import moment from "moment-timezone";
// CRITICAL FIX: Dynamic import to prevent startup database connections
// import { matchStateManager } from '../services/matchStateManager.js';

const router = Router();

/**
 * Get daily tournament statistics for the authenticated user's team
 */
router.get("/stats", isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    // Get start of today in Eastern Time
    const todayStart = moment.tz("America/New_York").startOf('day').toDate();

    // Count tournament matches played today (both completed and in progress)
    const tournamentMatchesToday = await prisma.game.findMany({
      where: {
        matchType: "TOURNAMENT" as any, // Type assertion for enum compatibility
        createdAt: { gte: todayStart },
        OR: [
          { homeTeamId: team.id },
          { awayTeamId: team.id }
        ]
      }
    });

    // Count tournament entries used today - check tournament matches created today
    const tournamentEntriesUsedToday = tournamentMatchesToday.filter((match: any) => 
      match.createdAt && match.createdAt >= todayStart
    );

    res.json({
      gamesPlayedToday: tournamentMatchesToday.length,
      tournamentEntriesUsedToday: tournamentEntriesUsedToday.length,
    });
  } catch (error) {
    console.error("Error fetching tournament stats:", error);
    next(error);
  }
});

/**
 * Get available tournament opponents for the authenticated user's team
 */
router.get("/available-opponents", isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    // Get teams in same division using storage abstraction
    const availableOpponents = await storage.teams.getTeamsByDivision(team.division);

    // Filter out own team manually since Drizzle doesn't have a direct 'not equal' operator
    const filteredOpponents = availableOpponents.filter(opponent => opponent.id !== team.id);

    // Calculate power rating for each opponent
    const opponentsWithPower = filteredOpponents.map(opponent => ({
      ...opponent,
      teamPower: Math.round((
        (opponent.teamPower || 0) + 
        (opponent.teamCamaraderie || 50)
      ) / 2)
    }));

    // Sort by power rating similarity to user's team
    const userPower = Math.round(((team.teamPower || 0) + (team.teamCamaraderie || 50)) / 2);
    opponentsWithPower.sort((a: any, b: any) => {
      return Math.abs(a.teamPower - userPower) - Math.abs(b.teamPower - userPower);
    });

    res.json(opponentsWithPower.slice(0, 8)); // Return top 8 most suitable opponents
  } catch (error) {
    console.error("Error fetching available opponents:", error);
    next(error);
  }
});

/**
 * Start an instant tournament match (auto-match opponent)
 */
router.post("/instant-match", isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    // Check daily limits
    const todayStart = moment.tz("America/New_York").startOf('day').toDate();
    
    const tournamentMatchesToday = await prisma.game.findMany({
      where: {
        matchType: "TOURNAMENT" as any,
        createdAt: { gte: todayStart },
        OR: [
          { homeTeamId: team.id },
          { awayTeamId: team.id }
        ]
      }
    });

    const tournamentEntriesToday = await prisma.tournamentEntry.findMany({
      where: {
        teamId: team.id,
        registeredAt: { gte: todayStart }
      }
    });

    const gamesPlayedToday = tournamentMatchesToday.length;
    const entriesUsedToday = tournamentEntriesToday.length;
    const freeGamesRemaining = Math.max(0, 1 - gamesPlayedToday); // 1 free tournament per day
    const entryGamesRemaining = Math.max(0, 1 - entriesUsedToday); // 1 additional with entry item

    if (freeGamesRemaining + entryGamesRemaining <= 0) {
      return res.status(400).json({ message: "Daily tournament limit reached" });
    }

    // Find suitable opponent (prioritize user teams, fallback to AI teams)
    const availableOpponents = await storage.teams.getTeamsByDivision(team.division);

    const filteredOpponents = availableOpponents.filter(opponent => opponent.id !== team.id);

    if (filteredOpponents.length === 0) {
      return res.status(400).json({ message: "No suitable opponents available" });
    }

    // Pick random opponent (could be enhanced with power rating matching)
    const opponent = filteredOpponents[Math.floor(Math.random() * filteredOpponents.length)];
    const isHome = Math.random() < 0.5;

    // Create tournament match
    const matchData = {
      homeTeamId: isHome ? team.id : opponent.id,
      awayTeamId: isHome ? opponent.id : team.id,
      matchType: "TOURNAMENT" as any, // Note: Using string literal for enum comparison
      status: "IN_PROGRESS" as any, // Note: Using string literal for enum comparison  
      gameDay: 9, // Tournament day
      scheduledTime: new Date(),
    } as any; // Type assertion to bypass strict Prisma typing

    const newMatch = await prisma.game.create({
      data: matchData
    });

    // Start live match using WebSocket system with dynamic import
    try {
      const { matchStateManager } = await import('../services/matchStateManager');
      await matchStateManager.startLiveMatch(newMatch.id.toString(), false);
      console.log("Tournament match started via WebSocket", { matchId: newMatch.id, homeTeamId: newMatch.homeTeamId, awayTeamId: newMatch.awayTeamId });
    } catch (error) {
      console.error("Failed to start tournament match", { matchId: newMatch.id, error: error instanceof Error ? error.message : String(error) }); // Fix unknown error type
      // Continue with response even if WebSocket start fails
    }

    // Use tournament entry item if no free games remaining
    if (freeGamesRemaining <= 0) {
      // Check for tournament entry items in inventory using storage abstraction
      const entryItems = await storage.items.getTeamInventory(team.id); // Note: Using getTeamInventory instead of getTeamInventoryByType which doesn't exist

      if (entryItems.length === 0) {
        return res.status(400).json({ message: "No tournament entry items available" });
      }

      // Consume one tournament entry item using storage abstraction
      const entryItem = entryItems[0];
      await storage.items.removeItemFromTeamInventory(team.id, entryItem.itemId, 1);

      // Record tournament entry usage
      await prisma.tournamentEntry.create({
        data: {
          tournamentId: 1, // Use a default tournament ID for daily tournaments
          teamId: team.id,
        }
      });
    }

    res.json({
      success: true,
      matchId: newMatch.id,
      opponentName: opponent.name,
      isHome,
      message: `Tournament match started against ${opponent.name}!`
    });

  } catch (error) {
    console.error("Error starting instant tournament:", error);
    next(error);
  }
});

/**
 * Challenge specific opponent for tournament match
 */
router.post("/challenge-opponent", isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const { opponentId } = req.body;

    if (!opponentId) {
      return res.status(400).json({ message: "Opponent ID is required" });
    }

    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const opponent = await storage.teams.getTeamById(opponentId);
    if (!opponent) return res.status(404).json({ message: "Opponent team not found" });

    if (opponent.division !== team.division) {
      return res.status(400).json({ message: "Can only challenge teams in your division" });
    }

    // Check daily limits (same logic as instant match)
    const todayStart = moment.tz("America/New_York").startOf('day').toDate();
    
    const tournamentMatchesToday = await prisma.game.findMany({
      where: {
        matchType: "TOURNAMENT" as any,
        createdAt: { gte: todayStart },
        OR: [
          { homeTeamId: team.id },
          { awayTeamId: team.id }
        ]
      }
    });

    const tournamentEntriesToday = await prisma.tournamentEntry.findMany({
      where: {
        teamId: team.id,
        registeredAt: { gte: todayStart }
      }
    });

    const gamesPlayedToday = tournamentMatchesToday.length;
    const entriesUsedToday = tournamentEntriesToday.length;
    const freeGamesRemaining = Math.max(0, 1 - gamesPlayedToday);
    const entryGamesRemaining = Math.max(0, 1 - entriesUsedToday);

    if (freeGamesRemaining + entryGamesRemaining <= 0) {
      return res.status(400).json({ message: "Daily tournament limit reached" });
    }

    const isHome = Math.random() < 0.5;

    // Create tournament match
    const matchData = {
      homeTeamId: isHome ? team.id : opponent.id,
      awayTeamId: isHome ? opponent.id : team.id,
      matchType: "TOURNAMENT" as any, // Note: Using string literal for enum comparison
      status: "IN_PROGRESS" as any, // Note: Using string literal for enum comparison  
      gameDay: 9,
      scheduledTime: new Date(),
    } as any; // Type assertion to bypass strict Prisma typing

    const newMatch = await prisma.game.create({
      data: matchData
    });

    // Start live match using WebSocket system with dynamic import
    try {
      const { matchStateManager } = await import('../services/matchStateManager');
      await matchStateManager.startLiveMatch(newMatch.id.toString(), false);
      console.log("Tournament match started via WebSocket", { matchId: newMatch.id, homeTeamId: newMatch.homeTeamId, awayTeamId: newMatch.awayTeamId });
    } catch (error: any) {
      console.error("Failed to start tournament match", { matchId: newMatch.id, error: error.message });
      // Continue with response even if WebSocket start fails
    }

    // Use tournament entry item if no free games remaining
    if (freeGamesRemaining <= 0) {
      const entryItems = await storage.items.getTeamInventory(team.id); // Note: Using getTeamInventory instead of getTeamInventoryByType which doesn't exist

      if (entryItems.length === 0) {
        return res.status(400).json({ message: "No tournament entry items available" });
      }

      // Consume one tournament entry item using storage abstraction
      const entryItem = entryItems[0];
      await storage.items.removeItemFromTeamInventory(team.id, entryItem.itemId, 1);

      await prisma.tournamentEntry.create({
        data: {
          tournamentId: 1, // Use a default tournament ID for daily tournaments
          teamId: team.id,
        }
      });
    }

    res.json({
      success: true,
      matchId: newMatch.id,
      opponentName: opponent.name,
      isHome,
      message: `Tournament match started against ${opponent.name}!`
    });

  } catch (error) {
    console.error("Error challenging opponent:", error);
    next(error);
  }
});

/**
 * Get recent tournament matches for the authenticated user's team
 */
router.get("/recent", isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    // Get recent tournament matches (last 7 days)
    const sevenDaysAgo = moment.tz("America/New_York").subtract(7, 'days').toDate();

    const recentMatches = await prisma.game.findMany({
      where: {
        matchType: "TOURNAMENT" as any,
        createdAt: { gte: sevenDaysAgo },
        OR: [
          { homeTeamId: team.id },
          { awayTeamId: team.id }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get opponent team data for each match
    const matchesWithOpponents = await Promise.all(
      recentMatches.map(async (match: any) => {
        const opponentId = match.homeTeamId === team.id ? match.awayTeamId : match.homeTeamId;
        const opponentTeam = await storage.teams.getTeamById(opponentId);
        
        // Determine result
        let result = "pending";
        if (match.status === "COMPLETED" as any) {
          const isHome = match.homeTeamId === team.id;
          const teamScore = isHome ? match.homeScore : match.awayScore;
          const opponentScore = isHome ? match.awayScore : match.homeScore;
          
          if ((teamScore ?? 0) > (opponentScore ?? 0)) result = "win";
          else if ((teamScore ?? 0) < (opponentScore ?? 0)) result = "loss";
          else result = "draw";
        }

        return {
          id: match.id,
          type: "tournament",
          status: match.status,
          result,
          score: match.status === "COMPLETED" as any ? `${match.homeScore}-${match.awayScore}` : undefined,
          opponentTeam: opponentTeam ? { name: opponentTeam.name } : { name: "Unknown Team" },
          playedDate: match.createdAt,
          // replayCode: match.replayCode, // Property doesn't exist in Game schema
        };
      })
    );

    res.json(matchesWithOpponents.slice(0, 10)); // Return last 10 matches
  } catch (error) {
    console.error("Error fetching recent tournament matches:", error);
    next(error);
  }
});

export default router;