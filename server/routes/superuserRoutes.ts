import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { db } from "../db";
import { players, teams, staff, teamFinances, matches as matchesTable } from "@shared/schema";
import { eq, or } from "drizzle-orm";
import { generateRandomPlayer as generatePlayerForTeam } from "../services/leagueService";
import { RBACService, Permission, UserRole } from "../services/rbacService";
import { ErrorCreators, asyncHandler, logInfo } from "../services/errorService";

const router = Router();

// Apply authentication to all routes
router.use(isAuthenticated);

// Grant credits - Admin permission required
router.post('/grant-credits', RBACService.requirePermission(Permission.GRANT_CREDITS), asyncHandler(async (req: any, res: Response) => {
  const requestId = req.requestId;
  const userId = req.user.claims.sub;
  const { teamId: targetTeamId, credits = 500000, premiumCurrency = 500 } = req.body;
  
  logInfo("Admin granting credits", { 
    adminUserId: userId,
    targetTeamId,
    credits,
    premiumCurrency,
    requestId 
  });

  // Find target team
  const teamToCredit = targetTeamId 
    ? await storage.teams.getTeamById(targetTeamId) 
    : await storage.teams.getTeamByUserId(userId);

  if (!teamToCredit) {
    throw ErrorCreators.notFound("Target team not found");
  }

  // Update team finances
  const currentFinances = await storage.teamFinances.getTeamFinances(teamToCredit.id);
  if (!currentFinances) {
    await storage.teamFinances.createTeamFinances({
      teamId: teamToCredit.id,
      credits: credits,
      premiumCurrency: premiumCurrency,
      season: 1, // Default season
      ticketSales: 0,
      concessionSales: 0,
      jerseySales: 0,
      sponsorships: 0,
      playerSalaries: 0,
      staffSalaries: 0,
      facilities: 0,
      totalIncome: 0,
      totalExpenses: 0,
      netIncome: 0,
    });
  } else {
    await storage.teamFinances.updateTeamFinances(teamToCredit.id, {
      credits: (currentFinances.credits || 0) + credits,
      premiumCurrency: (currentFinances.premiumCurrency || 0) + premiumCurrency
    });
  }

  res.json({ 
    success: true,
    message: `${credits.toLocaleString()} credits and ${premiumCurrency} premium currency granted to ${teamToCredit.name}`,
    data: { teamName: teamToCredit.name, creditsGranted: credits, premiumGranted: premiumCurrency }
  });
}));

// Advance day - Admin permission required
router.post('/advance-day', RBACService.requirePermission(Permission.MANAGE_SEASONS), asyncHandler(async (req: any, res: Response) => {
  const requestId = req.requestId;
  const userId = req.user.claims.sub;
  
  logInfo("Admin advancing game day", { adminUserId: userId, requestId });

  const currentSeason = await storage.seasons.getCurrentSeason();
  if (!currentSeason) {
    throw ErrorCreators.notFound("No active season found");
  }

  const newStartDate = new Date(currentSeason.startDate || Date.now());
  newStartDate.setDate(newStartDate.getDate() + 1);

  const daysSinceStart = Math.floor((newStartDate.getTime() - (currentSeason.startDateOriginal || currentSeason.startDate).getTime()) / (1000 * 60 * 60 * 24));
  const currentDayInCycle = (daysSinceStart % 17) + 1;

  let message = "Day advanced successfully";

  if (currentDayInCycle === 1 && daysSinceStart > 0) {
    // New season cycle
    const newSeasonYear = (currentSeason.year || new Date().getFullYear()) + 1;
    const newSeasonName = `Season ${newSeasonYear}`;
    
    await storage.updateSeason(currentSeason.id, { status: "completed", endDate: new Date() });
    await storage.createSeason({
      name: newSeasonName,
      year: newSeasonYear,
      status: "active",
      startDate: newStartDate,
      startDateOriginal: newStartDate,
    });
    
    message = `New season started: ${newSeasonName}`;
  } else {
    await storage.updateSeason(currentSeason.id, { startDate: newStartDate });
  }

  res.json({ 
    success: true,
    message,
    data: { currentDay: currentDayInCycle, seasonName: currentSeason.name }
  });
}));

// Start tournament - Admin permission required
router.post('/start-tournament', RBACService.requirePermission(Permission.MANAGE_TOURNAMENTS), asyncHandler(async (req: any, res: Response) => {
  const requestId = req.requestId;
  const userId = req.user.claims.sub;
  
  logInfo("Admin starting tournament", { adminUserId: userId, requestId });

  // Tournament logic implementation would go here
  res.json({ 
    success: true,
    message: "Tournament started successfully",
    data: { tournamentId: "temp-tournament-id" }
  });
}));

// Reset season - Super Admin permission required
router.post('/reset-season', RBACService.requireSuperAdmin(), asyncHandler(async (req: any, res: Response) => {
  const requestId = req.requestId;
  const userId = req.user.claims.sub;
  
  logInfo("Super admin resetting season", { adminUserId: userId, requestId });

  // Reset all team statistics
  await db.update(teams)
    .set({
      wins: 0,
      losses: 0,
      draws: 0,
      points: 0,
      teamPower: 0
    });

  // Stop all active matches
  await db.update(matchesTable)
    .set({ status: 'cancelled' })
    .where(eq(matchesTable.status, 'in_progress'));

  const currentSeason = await storage.getCurrentSeason();
  if (currentSeason) {
    await storage.updateSeason(currentSeason.id, {
      startDate: new Date(),
      startDateOriginal: new Date()
    });
  }

  res.json({ 
    success: true,
    message: "Season reset to Day 1, all team statistics cleared",
    data: { resetDate: new Date().toISOString() }
  });
}));

// Stop all games - Admin permission required
router.post('/stop-all-games', RBACService.requirePermission(Permission.STOP_MATCHES), asyncHandler(async (req: any, res: Response) => {
  const requestId = req.requestId;
  const userId = req.user.claims.sub;
  
  logInfo("Admin stopping all matches", { adminUserId: userId, requestId });

  const result = await db.update(matchesTable)
    .set({ 
      status: 'cancelled',
      completedAt: new Date()
    })
    .where(or(
      eq(matchesTable.status, 'in_progress'),
      eq(matchesTable.status, 'scheduled')
    ))
    .returning({ id: true });

  res.json({ 
    success: true,
    message: `${result.length} matches stopped successfully`,
    data: { matchesStopped: result.length }
  });
}));

// Cleanup division - Super Admin permission required
router.post('/cleanup-division', RBACService.requireSuperAdmin(), asyncHandler(async (req: any, res: Response) => {
  const requestId = req.requestId;
  const userId = req.user.claims.sub;
  const { division } = req.body;
  
  if (!division || division < 1 || division > 8) {
    throw ErrorCreators.validation("Valid division number (1-8) required");
  }

  logInfo("Super admin cleaning up division", { adminUserId: userId, division, requestId });

  // Remove AI teams from division
  const divisionTeams = await storage.getTeamsByDivision(division);
  const aiTeams = divisionTeams.filter(team => !team.userId);
  
  for (const team of aiTeams) {
    // Remove team and associated data
    await db.delete(players).where(eq(players.teamId, team.id));
    await db.delete(staff).where(eq(staff.teamId, team.id));
    await db.delete(teamFinances).where(eq(teamFinances.teamId, team.id));
    await db.delete(teams).where(eq(teams.id, team.id));
  }

  res.json({ 
    success: true,
    message: `Division ${division} cleaned up, ${aiTeams.length} AI teams removed`,
    data: { division, teamsRemoved: aiTeams.length }
  });
}));

// Get current cycle info - Admin permission required
router.get('/season/current-cycle-info', RBACService.requirePermission(Permission.VIEW_FINANCES), asyncHandler(async (req: any, res: Response) => {
  const currentSeason = await storage.getCurrentSeason();
  if (!currentSeason) {
    throw ErrorCreators.notFound("No active season found");
  }

  const daysSinceStart = Math.floor((Date.now() - (currentSeason.startDateOriginal || currentSeason.startDate).getTime()) / (1000 * 60 * 60 * 24));
  const currentDayInCycle = (daysSinceStart % 17) + 1;

  let phase = "Regular Season";
  if (currentDayInCycle === 15) phase = "Playoffs";
  else if (currentDayInCycle >= 16) phase = "Off-Season";

  res.json({
    success: true,
    data: {
      season: currentSeason.name,
      currentDay: currentDayInCycle,
      phase,
      daysSinceStart,
      daysUntilPlayoffs: phase === "Regular Season" ? 15 - currentDayInCycle : 0,
      daysUntilNewSeason: phase === "Off-Season" ? 17 - currentDayInCycle + 1 : 0
    }
  });
}));

// Add players to team - Admin permission required
router.post('/add-players', RBACService.requirePermission(Permission.MANAGE_LEAGUES), asyncHandler(async (req: any, res: Response) => {
  const requestId = req.requestId;
  const userId = req.user.claims.sub;
  const { teamId, playerCount = 10 } = req.body;
  
  if (!teamId) {
    throw ErrorCreators.validation("Team ID required");
  }

  logInfo("Admin adding players to team", { adminUserId: userId, teamId, playerCount, requestId });

  const team = await storage.getTeamById(teamId);
  if (!team) {
    throw ErrorCreators.notFound("Team not found");
  }

  const newPlayers = [];
  for (let i = 0; i < playerCount; i++) {
    const player = generatePlayerForTeam(teamId);
    await storage.createPlayer(player);
    newPlayers.push(player);
  }

  res.json({ 
    success: true,
    message: `${playerCount} players added to ${team.name}`,
    data: { teamName: team.name, playersAdded: playerCount, newPlayers }
  });
}));

export default router;