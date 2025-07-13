import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { prisma } from "../db";
import { generateRandomPlayer as generatePlayerForTeam } from "../services/leagueService";
import { RBACService, Permission, UserRole } from "../services/rbacService";
import { ErrorCreators, asyncHandler, logInfo, logError } from "../services/errorService";
import { matchStateManager } from "../services/matchStateManager";

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
      credits: BigInt(credits),
      gems: premiumCurrency,
    });
  } else {
    // Convert string credits back to number, add new credits, then convert to BigInt
    const currentCredits = parseInt(currentFinances.credits as string || "0");
    const currentGems = currentFinances.gems || 0;
    
    await storage.teamFinances.updateTeamFinances(teamToCredit.id, {
      credits: BigInt(currentCredits + credits),
      gems: currentGems + premiumCurrency
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

  const startDate = currentSeason.startDateOriginal || currentSeason.startDate;
  if (!startDate) {
    throw ErrorCreators.internal("Season start date not found");
  }
  const daysSinceStart = Math.floor((newStartDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const currentDayInCycle = (daysSinceStart % 17) + 1;

  let message = "Day advanced successfully";

  if (currentDayInCycle === 1 && daysSinceStart > 0) {
    // New season cycle
    const newSeasonYear = (currentSeason.year || new Date().getFullYear()) + 1;
    const newSeasonName = `Season ${newSeasonYear}`;
    
    await storage.seasons.updateSeason(currentSeason.id, { status: "completed", endDate: new Date() });
    await storage.seasons.createSeason({
      yearInput: newSeasonYear,
      status: "active",
      startDate: newStartDate,
    });
    
    message = `New season started: ${newSeasonName}`;
  } else {
    await storage.seasons.updateSeason(currentSeason.id, { startDate: newStartDate });
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
  await prisma.team.updateMany({
    data: {
      wins: 0,
      losses: 0,
      draws: 0,
      points: 0,
      teamPower: 0
    }
  });

  // Stop all active matches
  await prisma.game.updateMany({
    where: { status: 'in_progress' },
    data: { status: 'cancelled' }
  });

  const currentSeason = await storage.seasons.getCurrentSeason();
  if (currentSeason) {
    await storage.seasons.updateSeason(currentSeason.id, {
      startDate: new Date(),
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

  const result = await prisma.game.updateMany({
    where: { 
      status: { in: ['in_progress', 'scheduled'] }
    },
    data: { 
      status: 'cancelled',
      completedAt: new Date()
    }
  });

  res.json({ 
    success: true,
    message: `${result.count} matches stopped successfully`,
    data: { matchesStopped: result.count }
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
  const divisionTeams = await storage.teams.getTeamsByDivision(division);
  const aiTeams = divisionTeams.filter((team: any) => !team.userId);
  
  for (const team of aiTeams) {
    // Remove team and associated data
    await prisma.player.deleteMany({ where: { teamId: team.id } });
    await prisma.staff.deleteMany({ where: { teamId: team.id } });
    await prisma.teamFinances.deleteMany({ where: { teamId: team.id } });
    await prisma.team.delete({ where: { id: team.id } });
  }

  res.json({ 
    success: true,
    message: `Division ${division} cleaned up, ${aiTeams.length} AI teams removed`,
    data: { division, teamsRemoved: aiTeams.length }
  });
}));

// Get current cycle info - Admin permission required
router.get('/season/current-cycle-info', RBACService.requirePermission(Permission.VIEW_FINANCES), asyncHandler(async (req: any, res: Response) => {
  const currentSeason = await storage.seasons.getCurrentSeason();
  if (!currentSeason) {
    throw ErrorCreators.notFound("No active season found");
  }

  const seasonStartDate = currentSeason.startDateOriginal || currentSeason.startDate;
  if (!seasonStartDate) {
    throw ErrorCreators.internal("Season start date not found");
  }
  const daysSinceStart = Math.floor((Date.now() - seasonStartDate.getTime()) / (1000 * 60 * 60 * 24));
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

  const team = await storage.teams.getTeamById(teamId);
  if (!team) {
    throw ErrorCreators.notFound("Team not found");
  }

  const newPlayers = [];
  for (let i = 0; i < playerCount; i++) {
    const player = generatePlayerForTeam(teamId, "human", "Passer", "25");
    await storage.players.createPlayer(player);
    newPlayers.push(player);
  }

  res.json({ 
    success: true,
    message: `${playerCount} players added to ${team.name}`,
    data: { teamName: team.name, playersAdded: playerCount, newPlayers }
  });
}));

// Reset tryout restrictions - Admin permission required for testing
router.post('/reset-tryout-restrictions', RBACService.requirePermission(Permission.MANAGE_LEAGUES), asyncHandler(async (req: any, res: Response) => {
  const requestId = req.requestId;
  const userId = req.user.claims.sub;
  
  logInfo("Admin resetting tryout restrictions for testing", { adminUserId: userId, requestId });

  // Get the admin's team
  const team = await storage.teams.getTeamByUserId(userId);
  if (!team) {
    throw ErrorCreators.notFound("Admin team not found");
  }

  // Clear taxi squad players to reset the seasonal restriction
  const taxiSquadPlayers = await storage.players.getTaxiSquadPlayersByTeamId(team.id);
  let playersRemoved = 0;
  
  for (const player of taxiSquadPlayers) {
    await storage.players.releasePlayerFromTaxiSquad(player.id);
    playersRemoved++;
  }

  res.json({ 
    success: true,
    message: `Tryout restrictions reset for testing. ${playersRemoved} taxi squad players removed.`,
    data: { 
      teamName: team.name, 
      taxiPlayersRemoved: playersRemoved,
      canHostTryoutsNow: true
    }
  });
}));

// Create league schedule - Admin permission required
router.post('/create-league-schedule', RBACService.requirePermission(Permission.MANAGE_LEAGUES), asyncHandler(async (req: any, res: Response) => {
  const requestId = req.requestId;
  const userId = req.user.claims.sub;
  
  logInfo("Admin creating league schedule", { adminUserId: userId, requestId });

  // Get current season and calculate current day
  const currentSeason = await storage.seasons.getCurrentSeason();
  if (!currentSeason) {
    throw ErrorCreators.notFound("No active season found");
  }

  const seasonStartDate = currentSeason.startDateOriginal || currentSeason.startDate;
  if (!seasonStartDate) {
    throw ErrorCreators.internal("Season start date not found");
  }
  
  const daysSinceStart = Math.floor((Date.now() - seasonStartDate.getTime()) / (1000 * 60 * 60 * 24));
  const currentDayInCycle = (daysSinceStart % 17) + 1;

  // Only create schedule for regular season days (1-14)
  if (currentDayInCycle < 1 || currentDayInCycle > 14) {
    throw ErrorCreators.validation("League schedule can only be created during regular season (Days 1-14)");
  }

  let scheduledMatches = 0;
  
  // Get all leagues and create matches for current day
  for (let division = 1; division <= 8; division++) {
    const teams = await storage.teams.getTeamsByDivision(division);
    
    if (teams.length < 2) continue; // Need at least 2 teams
    
    // Create round-robin style matches for the current day
    const matchesPerDay = Math.floor(teams.length / 2);
    const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < matchesPerDay; i++) {
      const homeTeam = shuffledTeams[i * 2];
      const awayTeam = shuffledTeams[i * 2 + 1];
      
      if (homeTeam && awayTeam) {
        // Check if match already exists for today using direct query
        const existingMatches = await db
          .select()
          .from(matchesTable)
          .where(
            and(
              eq(matchesTable.homeTeamId, homeTeam.id),
              eq(matchesTable.awayTeamId, awayTeam.id),
              eq(matchesTable.gameDay, currentDayInCycle)
            )
          );
        
        if (existingMatches.length === 0) {
          const matchData = {
            homeTeamId: homeTeam.id,
            awayTeamId: awayTeam.id,
            gameDay: currentDayInCycle,
            status: 'scheduled',
            matchType: 'league',
            leagueId: `league-division-${division}`,
            scheduledTime: new Date()
          };
          
          await storage.matches.createMatch(matchData);
          scheduledMatches++;
        }
      }
    }
  }

  res.json({ 
    success: true,
    message: `League schedule created for Day ${currentDayInCycle}`,
    data: { 
      currentDay: currentDayInCycle,
      matchesScheduled: scheduledMatches,
      divisionsProcessed: 8
    }
  });
}));

// Start all scheduled league games - Admin permission required
router.post('/start-all-league-games', RBACService.requirePermission(Permission.MANAGE_LEAGUES), asyncHandler(async (req: any, res: Response) => {
  const requestId = req.requestId;
  const userId = req.user.claims.sub;
  
  logInfo("Admin starting all scheduled league games", { adminUserId: userId, requestId });

  // Get current season and calculate current day
  const currentSeason = await storage.seasons.getCurrentSeason();
  if (!currentSeason) {
    throw ErrorCreators.notFound("No active season found");
  }

  const seasonStartDate = currentSeason.startDateOriginal || currentSeason.startDate;
  if (!seasonStartDate) {
    throw ErrorCreators.internal("Season start date not found");
  }
  
  const daysSinceStart = Math.floor((Date.now() - seasonStartDate.getTime()) / (1000 * 60 * 60 * 24));
  const currentDayInCycle = (daysSinceStart % 17) + 1;

  // Get all scheduled league matches for current day
  const scheduledMatches = await db
    .select()
    .from(matchesTable)
    .where(
      eq(matchesTable.status, 'scheduled')
    );

  let gamesStarted = 0;
  const startPromises = [];

  for (const match of scheduledMatches) {
    if (match.matchType === 'league' || match.leagueId) {
      // Start match using WebSocket system
      const startPromise = matchStateManager.startLiveMatch(match.id.toString(), false)
        .then(() => {
          logInfo("League game started via WebSocket", { matchId: match.id, homeTeamId: match.homeTeamId, awayTeamId: match.awayTeamId });
          return match.id;
        })
        .catch(error => {
          logError("Failed to start league game", { matchId: match.id, error: error.message });
          throw error;
        });
      
      startPromises.push(startPromise);
      gamesStarted++;
    }
  }

  // Execute all match starts concurrently
  const startedMatchIds = await Promise.all(startPromises);

  res.json({ 
    success: true,
    message: `${gamesStarted} league games started concurrently for Day ${currentDayInCycle}`,
    data: { 
      currentDay: currentDayInCycle,
      gamesStarted,
      matchIds: startedMatchIds,
      totalScheduledMatches: scheduledMatches.length
    }
  });
}));

export default router;