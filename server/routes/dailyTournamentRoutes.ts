import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from "../storage/index";
import { isAuthenticated } from "../googleAuth";
import { prisma } from "../db";
import moment from "moment-timezone";
// CRITICAL FIX: Dynamic import to prevent startup database connections
// import { matchStateManager } from "../services/matchStateManager";

const router = Router();

/**
 * Get daily tournament statistics for the authenticated user's team
 */
router.get("/stats", isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Get start of today in Eastern Time
    const todayStart = moment.tz("America/New_York").startOf('day').toDate();

    // Count tournament matches played today using Prisma
    const tournamentMatchesToday = await prisma.game.findMany({
      where: {
        matchType: "tournament",
        createdAt: { gte: todayStart },
        OR: [
          { homeTeamId: team.id },
          { awayTeamId: team.id }
        ]
      }
    });

    // Count tournament entries used today
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
 * Get daily tournament matchmaking data for a team's division
 */
router.get("/matchmaking", isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Get all teams in the same division using storage abstraction
    const opponents = await storage.teams.getTeamsByDivision(team.division);

    // Filter out the user's own team and sort by power rating for balanced matchmaking
    const availableOpponents = opponents
      .filter((opponent: any) => opponent.id !== team.id)
      .sort((a: any, b: any) => Math.abs((a.powerRating || 0) - (team.powerRating || 0)) - Math.abs((b.powerRating || 0) - (team.powerRating || 0)));

    res.json({
      availableOpponents: availableOpponents.slice(0, 10), // Return top 10 most balanced opponents
    });
  } catch (error) {
    console.error("Error fetching matchmaking data:", error);
    next(error);
  }
});

/**
 * Start a daily tournament match
 */
router.post("/start", isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Get start of today in Eastern Time
    const todayStart = moment.tz("America/New_York").startOf('day').toDate();

    // Check tournament entries for today using Prisma
    const tournamentEntriesToday = await prisma.tournamentEntry.findMany({
      where: {
        teamId: team.id,
        createdAt: { gte: todayStart }
      }
    });

    const freeGamesRemaining = 3 - tournamentEntriesToday.length; // 3 free tournament games per day

    // Find suitable opponent using storage abstraction
    const availableOpponents = await storage.teams.getTeamsByDivision(team.division);
    const filteredOpponents = availableOpponents.filter((opponent: any) => opponent.id !== team.id);

    if (filteredOpponents.length === 0) {
      return res.status(400).json({ message: "No suitable opponents available" });
    }

    // Pick random opponent
    const opponent = filteredOpponents[Math.floor(Math.random() * filteredOpponents.length)];
    const isHome = Math.random() < 0.5;

    // Create tournament match using Prisma with proper schema
    const newMatch = await prisma.game.create({
      data: {
        homeTeamId: isHome ? team.id : (opponent as any).id,
        awayTeamId: isHome ? (opponent as any).id : team.id,
        matchType: "tournament",
        status: "in_progress",
        gameDay: 9, // Tournament day
        scheduledTime: new Date(),
        gameDate: new Date().toISOString().split('T')[0] // Required field
      }
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

    // Create tournament entry record
    await prisma.tournamentEntry.create({
      data: {
        teamId: team.id,
        matchId: newMatch.id,
        entryFee: freeGamesRemaining > 0 ? 0 : 100, // Free or paid entry
      }
    });

    res.json({
      matchId: newMatch.id,
      message: "Tournament match started successfully",
      freeGamesRemaining: Math.max(0, freeGamesRemaining - 1),
    });
  } catch (error) {
    console.error("Error starting tournament match:", error);
    next(error);
  }
});

/**
 * Start a premium daily tournament match (with enhanced rewards)
 */
router.post("/start-premium", isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Get suitable opponent using storage abstraction
    const availableOpponents = await storage.teams.getTeamsByDivision(team.division);
    const filteredOpponents = availableOpponents.filter((opponent: any) => opponent.id !== team.id);

    if (filteredOpponents.length === 0) {
      return res.status(400).json({ message: "No suitable opponents available" });
    }

    // Pick random opponent
    const opponent = filteredOpponents[Math.floor(Math.random() * filteredOpponents.length)];
    const isHome = Math.random() < 0.5;

    // Create premium tournament match using Prisma
    const newMatch = await prisma.game.create({
      data: {
        homeTeamId: isHome ? team.id : (opponent as any).id,
        awayTeamId: isHome ? (opponent as any).id : team.id,
        matchType: "tournament",
        status: "in_progress",
        gameDay: 9, // Tournament day
        scheduledTime: new Date(),
        gameDate: new Date().toISOString().split('T')[0] // Required field
      }
    });

    // Start live match using WebSocket system with dynamic import
    try {
      const { matchStateManager } = await import('../services/matchStateManager');
      await matchStateManager.startLiveMatch(newMatch.id.toString(), false);
      console.log("Premium tournament match started via WebSocket", { matchId: newMatch.id, homeTeamId: newMatch.homeTeamId, awayTeamId: newMatch.awayTeamId });
    } catch (error: any) {
      console.error("Failed to start premium tournament match", { matchId: newMatch.id, error: error.message });
      // Continue with response even if WebSocket start fails
    }

    // Create tournament entry record for premium match
    await prisma.tournamentEntry.create({
      data: {
        teamId: team.id,
        matchId: newMatch.id,
        entryFee: 250, // Premium entry fee
      }
    });

    res.json({
      matchId: newMatch.id,
      message: "Premium tournament match started successfully",
      premiumRewards: true,
    });
  } catch (error) {
    console.error("Error starting premium tournament match:", error);
    next(error);
  }
});

/**
 * Get active daily tournament matches for the authenticated user's team
 */
router.get("/active", isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Get start of today in Eastern Time
    const todayStart = moment.tz("America/New_York").startOf('day').toDate();

    // Get active tournament matches for today using Prisma
    const activeTournamentMatches = await prisma.game.findMany({
      where: {
        matchType: "tournament",
        createdAt: { gte: todayStart },
        status: { in: ["in_progress", "scheduled"] },
        OR: [
          { homeTeamId: team.id },
          { awayTeamId: team.id }
        ]
      }
    });

    res.json({
      activeMatches: activeTournamentMatches,
    });
  } catch (error) {
    console.error("Error fetching active tournament matches:", error);
    next(error);
  }
});

export default router;