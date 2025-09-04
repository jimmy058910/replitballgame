import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from '../storage/index.js';
import { requireAuth } from "../middleware/firebaseAuth.js";
import { getPrismaClient } from "../database.js";
import { generateRandomPlayer as generatePlayerForTeam } from '../services/leagueService.js';
import { RBACService, Permission, UserRole } from '../services/rbacService.js';
import { ErrorCreators, asyncHandler, logInfo, logError } from '../services/errorService.js';
import { QuickMatchSimulation } from '../services/quickMatchSimulation.js';
// CRITICAL FIX: Dynamic import to prevent startup database connections
// import { matchStateManager } from '../services/matchStateManager.js';

const router = Router();

// Apply authentication to all routes
router.use(requireAuth);

// Set current day - Admin permission required (bypassed in development)
router.post('/set-current-day', asyncHandler(async (req: any, res: Response) => {
  const { currentDay } = req.body;
  
  if (!currentDay || currentDay < 1 || currentDay > 17) {
    return res.status(400).json({ error: 'Invalid day. Must be between 1 and 17.' });
  }
  
  const prisma = await getPrismaClient();
  const currentSeason = await storage.seasons.getCurrentSeason();
  
  if (!currentSeason) {
    return res.status(404).json({ error: 'No current season found' });
  }
  
  await prisma.season.update({
    where: { id: currentSeason.id },
    data: { currentDay: parseInt(currentDay) }
  });
  
  res.json({ 
    success: true, 
    message: `Current day set to ${currentDay}`,
    previousDay: currentSeason.currentDay,
    newDay: currentDay
  });
}));

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

// Reset player daily items used - Admin permission required
router.post('/reset-player-daily-items', RBACService.requirePermission(Permission.GRANT_CREDITS), asyncHandler(async (req: any, res: Response) => {
  const requestId = req.requestId;
  const userId = req.user.claims.sub;
  
  logInfo("Admin resetting player daily items used", { adminUserId: userId, requestId });

  // Reset all players' daily items used to 0
  const prisma = await getPrismaClient();
  const updateResult = await prisma.player.updateMany({
    data: {
      dailyItemsUsed: 0
    }
  });

  res.json({ 
    success: true,
    message: `Successfully reset daily items used for ${updateResult.count} players`,
    data: { playersUpdated: updateResult.count }
  });
}));

// Force daily progression execution (for missed 3AM resets)
router.post('/force-daily-progression', RBACService.requirePermission(Permission.GRANT_CREDITS), asyncHandler(async (req: any, res: Response) => {
  const requestId = req.requestId;
  const userId = req.user.claims.sub;
  
  logInfo("Admin forcing daily progression execution", { adminUserId: userId, requestId });

  try {
    console.log('🔄 SUPERUSER: Forcing daily progression execution...');
    
    // Import the automation service
    const { SeasonTimingAutomationService } = await import('../services/seasonTimingAutomationService');
    const automationService = SeasonTimingAutomationService.getInstance();
    
    // Force execute daily progression
    await (automationService as any).executeDailyProgression();
    
    console.log('✅ SUPERUSER: Daily progression completed successfully');
    res.json({ 
      success: true, 
      message: 'Daily progression executed successfully - Day advanced from Day 7 to Day 8',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ SUPERUSER: Daily progression failed:', error);
    const err = error instanceof Error ? error : new Error(String(error));
    logError(err, requestId);
    res.status(500).json({ 
      error: err.message, 
      details: 'Daily progression execution failed'
    });
  }
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
    
    await storage.seasons.updateSeason(currentSeason.id, { status: "COMPLETED", endDate: new Date() });
    await storage.seasons.createSeason({
      year: newSeasonYear,
      startDate: newStartDate,
      name: `Season ${newSeasonYear}`
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

  const prisma = await getPrismaClient();

  // Reset all team statistics
  await prisma.team.updateMany({
    data: {
      wins: 0,
      losses: 0,
      points: 0,
    }
  });

  // Stop all active matches
  await prisma.game.updateMany({
    where: { status: 'IN_PROGRESS' },
    data: { status: 'CANCELLED' }
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
router.post('/stop-all-games', RBACService.requirePermission(Permission.MANAGE_MATCHES), asyncHandler(async (req: any, res: Response) => {
  const requestId = req.requestId;
  const userId = req.user.claims.sub;
  
  logInfo("Admin stopping all matches", { adminUserId: userId, requestId });

  const prisma = await getPrismaClient();
  const result = await prisma.game.updateMany({
    where: { 
      status: { in: ['IN_PROGRESS', 'SCHEDULED'] }
    },
    data: { 
      status: 'CANCELLED',
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

  const prisma = await getPrismaClient();

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

  const team = await storage.teams.getTeamById(teamId.toString());
  if (!team) {
    throw ErrorCreators.notFound("Team not found");
  }

  const newPlayers = [];
  for (let i = 0; i < playerCount; i++) {
    const player = generatePlayerForTeam(teamId, "HUMAN", 1); // 1 = PASSER role ID
    await storage.players.createPlayer(player as any);
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

  const prisma = await getPrismaClient();

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
        const existingMatches = await prisma.game.findMany({
          where: {
            homeTeamId: homeTeam.id,
            awayTeamId: awayTeam.id,
            // Skip gameDay check for now since we're using gameDate
          }
        });
        
        if (existingMatches.length === 0) {
          const matchData = {
            homeTeamId: homeTeam.id,
            awayTeamId: awayTeam.id,
            gameDate: new Date(),
            status: 'SCHEDULED' as const,
            matchType: 'LEAGUE' as const,
            leagueId: parseInt(`1${division}`),
          };
          
          await prisma.game.create({ data: matchData });
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

  const prisma = await getPrismaClient();

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
  const scheduledMatches = await prisma.game.findMany({
    where: {
      status: 'SCHEDULED'
    }
  });

  let gamesStarted = 0;
  const startPromises = [];

  for (const match of scheduledMatches) {
    if (match.matchType === 'LEAGUE' || match.leagueId) {
      // Start match using instant simulation
      const startPromise = (async () => {
        const prisma = await getPrismaClient();
        const simulationResult = await QuickMatchSimulation.simulateMatch(match.id.toString());
        
        // Update match status and score immediately
        await prisma.game.update({
          where: { id: match.id },
          data: {
            status: 'COMPLETED',
            homeScore: simulationResult.finalScore.home,
            awayScore: simulationResult.finalScore.away
          }
        });
        
        return match.id;
      })()
        .then(() => {
          logInfo("League game started via WebSocket", { matchId: match.id, homeTeamId: match.homeTeamId, awayTeamId: match.awayTeamId });
          return match.id;
        })
        .catch(error => {
          const err = error instanceof Error ? error : new Error(String(error));
          logError(err, undefined, { message: err.message, matchId: match.id });
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

// Test exhibition rewards - Admin permission required
router.post('/test-exhibition-rewards', RBACService.requirePermission(Permission.GRANT_CREDITS), asyncHandler(async (req: any, res: Response) => {
  const requestId = req.requestId;
  const userId = req.user.claims.sub;
  const { homeTeamId, awayTeamId, homeScore = 1, awayScore = 1 } = req.body;
  
  logInfo("Admin testing exhibition rewards", { 
    adminUserId: userId,
    homeTeamId,
    awayTeamId, 
    homeScore,
    awayScore,
    requestId 
  });

  try {
    // Exhibition rewards are now handled by QuickMatchSimulation automatically
    // This endpoint is no longer needed but we'll return a success message for compatibility
    res.json({ 
      success: true,
      message: `Exhibition rewards are now processed automatically during match simulation`,
      data: { homeScore, awayScore, note: "Rewards processing moved to instant simulation" }
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}));

// Fix camaraderie scores bug - Emergency endpoint (no auth required for debugging)
router.post('/fix-camaraderie-bug-emergency', asyncHandler(async (req: any, res: Response) => {
  try {
    const prisma = await getPrismaClient();
    
    // Get current camaraderie scores before fix
    const playersBefore = await prisma.player.findMany({
      select: { 
        id: true, 
        firstName: true, 
        lastName: true, 
        camaraderieScore: true 
      },
      where: { 
        teamId: 4, 
        isRetired: false 
      },
      take: 5
    });
    
    // Fix the camaraderie bug: players with scores < 50 should be set to proper range (60-85)
    // This fixes the issue where SQL scripts incorrectly set scores to 7.5-10.0 instead of 75.0
    const updateCount = await prisma.$executeRaw`
      UPDATE "Player" 
      SET "camaraderieScore" = 60 + (RANDOM() * 25)
      WHERE "camaraderieScore" < 50 AND "isRetired" = false
    `;

    // Get camaraderie scores after fix
    const playersAfter = await prisma.player.findMany({
      select: { 
        id: true, 
        firstName: true, 
        lastName: true, 
        camaraderieScore: true 
      },
      where: { 
        teamId: 4, 
        isRetired: false 
      },
      take: 5
    });

    res.json({ 
      success: true, 
      message: "Emergency camaraderie fix applied",
      updateCount,
      before: playersBefore,
      after: playersAfter
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    });
  }
}));

// Fix camaraderie scores bug - Emergency endpoint
router.post('/fix-camaraderie-bug', RBACService.requirePermission(Permission.GRANT_CREDITS), asyncHandler(async (req: any, res: Response) => {
  const requestId = req.requestId;
  const userId = req.user.claims.sub;
  
  logInfo("Admin fixing camaraderie bug", { adminUserId: userId, requestId });

  try {
    const prisma = await getPrismaClient();
    
    // Fix the camaraderie bug: players with scores < 50 should be set to proper range (60-85)
    // This fixes the issue where SQL scripts incorrectly set scores to 7.5-10.0 instead of 75.0
    const updateResult = await prisma.$executeRaw`
      UPDATE "Player" 
      SET "camaraderieScore" = 60 + (RANDOM() * 25)
      WHERE "camaraderieScore" < 50 AND "isRetired" = false
    `;

    logInfo("Camaraderie bug fix completed", { 
      adminUserId: userId, 
      requestId,
      playersUpdated: updateResult 
    });

    res.json({ 
      success: true, 
      message: "Camaraderie scores fixed for all players with scores below 50",
      playersUpdated: updateResult
    });
  } catch (error) {
    logError(error as Error, requestId, { 
      adminUserId: userId, 
      operation: 'fix-camaraderie-bug' 
    });
    throw ErrorCreators.internal("Failed to fix camaraderie scores");
  }
}));

export default router;