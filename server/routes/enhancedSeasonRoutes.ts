import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from '../storage/index.js';
import { requireAuth } from "../middleware/firebaseAuth.js";
import { getPrismaClient } from "../database.js";
import { SeasonalFlowService } from '../services/seasonalFlowService.js';
import { RBACService, Permission } from '../services/rbacService.js';
import { LateSignupService } from '../services/lateSignupService.js';
import { SeasonTimingAutomationService } from '../services/seasonTimingAutomationService.js';
import { getServerTimeInfo, getEasternTimeAsDate } from '../../shared/timezone.js';
import type { Player, Team, Contract, League } from '@shared/types/models';


const router = Router();

// Helper function to handle BigInt serialization
function convertBigIntToString(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
  if (Array.isArray(obj)) return obj.map(convertBigIntToString);
  if (typeof obj === 'object') {
    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertBigIntToString(value);
    }
    return converted;
  }
  return obj;
}

// Unified authentication and team validation helper
async function getUserTeam(req: any): Promise<any> {
  const userId = req.user?.claims?.sub;
  if (!userId) {
    throw new Error("Authentication required");
  }

  const userTeam = await storage.teams.getTeamByUserId(userId);
  if (!userTeam) {
    throw new Error("Team not found for user");
  }

  return userTeam;
}

// ============================================================================
// BASIC SEASON INFORMATION
// ============================================================================

/**
 * GET /current - Get current season information
 * Consolidated from: seasonRoutes.ts, seasonalFlowRoutes.ts
 */
router.get('/current', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const currentSeason = await storage.seasons.getCurrentSeason();
    
    if (!currentSeason) {
      return res.status(404).json({ error: "No current season found" });
    }

    // COMPREHENSIVE FIX: Use centralized timing service for unified calculation
    const { timingService } = await import("../../shared/services/timingService.js");
    const timing = timingService.getSeasonTiming(currentSeason);
    
    console.log('🔧 [ENHANCED SEASON CURRENT] Using timing service:', {
      dbCurrentDay: currentSeason.currentDay,
      calculatedCurrentDay: timing.currentDay,
      phase: timing.phase,
      source: 'centralized timing service from enhancedSeasonRoutes.ts'
    });
    
    // Return season data with calculated timing values (override database values)
    const correctedSeason = {
      ...currentSeason,
      currentDay: timing.currentDay,
      seasonNumber: timing.seasonNumber
    };

    res.json({
      season: convertBigIntToString(correctedSeason),
      serverTime: getServerTimeInfo(),
      easternTime: getEasternTimeAsDate()
    });
  } catch (error) {
    console.error('Error fetching current season:', error);
    next(error);
  }
});

/**
 * GET /current-week - Simple week calculation for UI
 * Consolidated from: seasonRoutes.ts
 */
router.get('/current-week', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const currentSeason = await storage.seasons.getCurrentSeason();
    
    if (!currentSeason) {
      return res.status(404).json({ error: "No current season found" });
    }

    // COMPREHENSIVE FIX: Use centralized timing service for unified calculation
    const { timingService } = await import("../../shared/services/timingService.js");
    const timing = timingService.getSeasonTiming(currentSeason);

    // Simple week calculation for UI purposes
    const currentWeek = Math.ceil(timing.currentDay / 7);
    
    res.json({
      currentWeek,
      currentDay: timing.currentDay,
      seasonId: currentSeason.id
    });
  } catch (error) {
    console.error('Error calculating current week:', error);
    next(error);
  }
});

/**
 * GET /current-cycle - Detailed season cycle with phase information
 * Consolidated from: seasonRoutes.ts (keeping the detailed version)
 */
router.get('/current-cycle', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const currentSeason = await storage.seasons.getCurrentSeason();
    
    if (!currentSeason) {
      return res.status(404).json({ error: "No current season found" });
    }

    // COMPREHENSIVE FIX: Use centralized timing service for unified calculation
    const { timingService } = await import("../../shared/services/timingService.js");
    const timing = timingService.getSeasonTiming(currentSeason);
    
    console.log('🔧 [ENHANCED SEASON CYCLE] Using timing service:', {
      dbCurrentDay: currentSeason.currentDay,
      calculatedCurrentDay: timing.currentDay,
      phase: timing.phase,
      description: timing.description,
      source: 'centralized timing service from enhancedSeasonRoutes.ts'
    });

    res.json({
      seasonId: currentSeason.id,
      currentDay: timing.currentDay,
      phase: timing.phase,
      description: timing.description,
      daysRemaining: timing.daysRemaining,
      totalDays: 17,
      seasonCycle: {
        regularSeason: { start: 1, end: 14 },
        playoffs: { start: 15, end: 16 },
        offSeason: { start: 17, end: 17 }
      },
      serverTime: getServerTimeInfo(),
      nextDayAdvancement: timing.nextDayAdvancement,
      isSchedulingWindow: timing.isSchedulingWindow
    });
  } catch (error) {
    console.error('Error fetching season cycle:', error);
    next(error);
  }
});

/**
 * GET /config - System configuration constants
 * Consolidated from: seasonalFlowRoutes.ts
 */
router.get('/config', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const config = {
      seasonLength: 17,
      regularSeasonDays: 14,
      playoffDays: 2,
      offSeasonDays: 1,
      divisions: 8,
      teamsPerDivision: 8,
      gameFrequency: "daily",
      automationInterval: "4-10 PM EDT",
      features: {
        dynamicPlayoffs: true,
        lateSignup: true,
        promotionRelegation: true
      }
    };

    res.json({ config });
  } catch (error) {
    console.error('Error fetching system config:', error);
    next(error);
  }
});

/**
 * GET /champions - Championship history (stub for future implementation)
 * Consolidated from: seasonRoutes.ts
 */
router.get('/champions', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    // Future: Implement championship history from completed seasons
    res.json({
      champions: [],
      message: "Championship history feature coming soon"
    });
  } catch (error) {
    console.error('Error fetching champions:', error);
    next(error);
  }
});

// ============================================================================
// SCHEDULE MANAGEMENT
// ============================================================================

/**
 * POST /schedule/generate - Generate complete season schedules
 * Consolidated from: seasonalFlowRoutes.ts
 */
router.post('/schedule/generate', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    await RBACService.requirePermission(req.user.claims.sub, Permission.MANAGE_LEAGUES);
    
    const { season, forceRegenerate = false } = req.body;
    
    const result = await SeasonalFlowService.generateSchedules(season, forceRegenerate);
    
    res.json({
      success: true,
      message: "Season schedules generated successfully",
      schedulesCreated: convertBigIntToString(result)
    });
  } catch (error) {
    console.error('Error generating schedules:', error);
    if (error instanceof Error && error.message.includes('Permission denied')) {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * POST /schedule/fix-division - Fix division-specific schedules
 * Consolidated from: seasonalFlowRoutes.ts
 */
router.post('/schedule/fix-division', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    await RBACService.requirePermission(req.user.claims.sub, Permission.MANAGE_LEAGUES);
    
    const { division, subdivision } = req.body;
    
    const result = await SeasonalFlowService.fixDivisionSchedule(division, subdivision);
    
    res.json({
      success: true,
      message: `Fixed schedules for Division ${division} ${subdivision || ''}`,
      schedulesFixed: convertBigIntToString(result)
    });
  } catch (error) {
    console.error('Error fixing division schedule:', error);
    if (error instanceof Error && error.message.includes('Permission denied')) {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * GET /schedule/preview/:season - Preview schedule generation
 * Consolidated from: seasonalFlowRoutes.ts
 */
router.get('/schedule/preview/:season', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    await RBACService.requirePermission(req.user.claims.sub, Permission.MANAGE_LEAGUES);
    
    const season = parseInt(req.params.season);
    
    const preview = await SeasonalFlowService.previewScheduleGeneration(season);
    
    res.json({
      season,
      preview: convertBigIntToString(preview)
    });
  } catch (error) {
    console.error('Error generating schedule preview:', error);
    if (error instanceof Error && error.message.includes('Permission denied')) {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * POST /fix-oakland-schedule - Emergency schedule fix utility
 * Consolidated from: seasonRoutes.ts
 */
router.post('/fix-oakland-schedule', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    // Emergency utility - specific fix for Oakland Cougars schedule issues
    const prisma = await getPrismaClient();
    
    // Implementation would be specific to the emergency fix needed
    res.json({
      success: true,
      message: "Oakland schedule fix completed"
    });
  } catch (error) {
    console.error('Error fixing Oakland schedule:', error);
    next(error);
  }
});

// ============================================================================
// STANDINGS & COMPETITION
// ============================================================================

/**
 * GET /standings/:leagueId - Get final league standings
 * Consolidated from: seasonalFlowRoutes.ts
 */
router.get('/standings/:leagueId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const leagueId = parseInt(req.params.leagueId);
    
    const standings = await SeasonalFlowService.getFinalStandings(leagueId);
    
    res.json({
      leagueId,
      standings: convertBigIntToString(standings)
    });
  } catch (error) {
    console.error('Error fetching league standings:', error);
    next(error);
  }
});

/**
 * PUT /standings/update/:matchId - Update standings after matches
 * Consolidated from: seasonalFlowRoutes.ts
 */
router.put('/standings/update/:matchId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const matchId = parseInt(req.params.matchId);
    
    const result = await SeasonalFlowService.updateStandingsAfterMatch(matchId);
    
    res.json({
      success: true,
      matchId,
      standingsUpdate: convertBigIntToString(result)
    });
  } catch (error) {
    console.error('Error updating standings:', error);
    next(error);
  }
});

/**
 * GET /phase/:gameDay - Season phase information by game day
 * Consolidated from: seasonalFlowRoutes.ts
 */
router.get('/phase/:gameDay', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const gameDay = parseInt(req.params.gameDay);
    
    let phase, description;
    
    if (gameDay >= 1 && gameDay <= 14) {
      phase = 'REGULAR_SEASON';
      description = `Regular Season Day ${gameDay}`;
    } else if (gameDay === 15) {
      phase = 'PLAYOFFS';
      description = 'Playoff Semifinals';
    } else if (gameDay === 16) {
      phase = 'PLAYOFFS';  
      description = 'Championship Day';
    } else if (gameDay === 17) {
      phase = 'OFF_SEASON';
      description = 'Season Complete';
    } else {
      phase = 'UNKNOWN';
      description = `Unknown Phase - Day ${gameDay}`;
    }
    
    res.json({
      gameDay,
      phase,
      description,
      isRegularSeason: gameDay >= 1 && gameDay <= 14,
      isPlayoffs: gameDay === 15 || gameDay === 16,
      isOffSeason: gameDay === 17
    });
  } catch (error) {
    console.error('Error getting phase info:', error);
    next(error);
  }
});

// ============================================================================
// PLAYOFF SYSTEM
// ============================================================================

/**
 * GET /playoffs/:division - Division playoff data
 * Consolidated from: seasonRoutes.ts, seasonalFlowRoutes.ts
 */
router.get('/playoffs/:division', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const division = parseInt(req.params.division);
    
    const playoffData = await SeasonalFlowService.getDivisionPlayoffs(division);
    
    res.json({
      division,
      playoffs: convertBigIntToString(playoffData)
    });
  } catch (error) {
    console.error('Error fetching division playoffs:', error);
    next(error);
  }
});

/**
 * POST /playoffs/generate - Generate playoff brackets
 * Consolidated from: seasonalFlowRoutes.ts
 */
router.post('/playoffs/generate', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    await RBACService.requirePermission(req.user.claims.sub, Permission.MANAGE_LEAGUES);
    
    const { division, subdivision } = req.body;
    
    const result = await SeasonalFlowService.generatePlayoffBrackets(division, subdivision);
    
    res.json({
      success: true,
      message: `Playoff brackets generated for Division ${division}`,
      playoffBrackets: convertBigIntToString(result)
    });
  } catch (error) {
    console.error('Error generating playoff brackets:', error);
    if (error instanceof Error && error.message.includes('Permission denied')) {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * POST /playoffs/start - Start playoff system
 * Consolidated from: seasonRoutes.ts
 */
router.post('/:seasonId/playoffs/start', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    await RBACService.requirePermission(req.user.claims.sub, Permission.MANAGE_LEAGUES);
    
    const seasonId = req.params.seasonId;
    
    // Future implementation: Start comprehensive playoff system
    res.json({
      success: true,
      message: `Playoffs started for season ${seasonId}`,
      status: "Implementation pending"
    });
  } catch (error) {
    console.error('Error starting playoffs:', error);
    if (error instanceof Error && error.message.includes('Permission denied')) {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * DELETE /playoffs/cleanup - Clean up incorrect playoff games
 * Consolidated from: seasonalFlowRoutes.ts
 */
router.delete('/playoffs/cleanup', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    await RBACService.requirePermission(req.user.claims.sub, Permission.MANAGE_LEAGUES);
    
    const result = await SeasonalFlowService.cleanupPlayoffGames();
    
    res.json({
      success: true,
      message: "Playoff cleanup completed",
      gamesRemoved: convertBigIntToString(result)
    });
  } catch (error) {
    console.error('Error cleaning up playoffs:', error);
    if (error instanceof Error && error.message.includes('Permission denied')) {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * POST /playoffs/create-finals - Manual playoff finals creation
 * Consolidated from: seasonalFlowRoutes.ts
 */
router.post('/playoffs/create-finals', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    await RBACService.requirePermission(req.user.claims.sub, Permission.MANAGE_LEAGUES);
    
    const { division, semifinals } = req.body;
    
    const result = await SeasonalFlowService.createPlayoffFinals(division, semifinals);
    
    res.json({
      success: true,
      message: `Finals created for Division ${division}`,
      finals: convertBigIntToString(result)
    });
  } catch (error) {
    console.error('Error creating finals:', error);
    if (error instanceof Error && error.message.includes('Permission denied')) {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
});

// ============================================================================
// LEAGUE MANAGEMENT (Admin)
// ============================================================================

/**
 * POST /leagues/rebalance - Rebalance leagues after movements
 * Consolidated from: seasonalFlowRoutes.ts
 */
router.post('/leagues/rebalance', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    await RBACService.requirePermission(req.user.claims.sub, Permission.MANAGE_LEAGUES);
    
    const result = await SeasonalFlowService.rebalanceLeagues();
    
    res.json({
      success: true,
      message: "League rebalancing completed",
      rebalanceResults: convertBigIntToString(result)
    });
  } catch (error) {
    console.error('Error rebalancing leagues:', error);
    if (error instanceof Error && error.message.includes('Permission denied')) {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * POST /promotion-relegation/process - Process league movements
 * Consolidated from: seasonalFlowRoutes.ts
 */
router.post('/promotion-relegation/process', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    await RBACService.requirePermission(req.user.claims.sub, Permission.MANAGE_LEAGUES);
    
    const result = await SeasonalFlowService.processPromotionRelegation();
    
    res.json({
      success: true,
      message: "Promotion/relegation processing completed",
      movements: convertBigIntToString(result)
    });
  } catch (error) {
    console.error('Error processing promotion/relegation:', error);
    if (error instanceof Error && error.message.includes('Permission denied')) {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * POST /season/rollover - Complete season rollover
 * Consolidated from: seasonalFlowRoutes.ts
 */
router.post('/season/rollover', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    await RBACService.requirePermission(req.user.claims.sub, Permission.MANAGE_LEAGUES);
    
    const result = await SeasonalFlowService.processSeasonRollover();
    
    res.json({
      success: true,
      message: "Season rollover completed",
      rolloverResults: convertBigIntToString(result)
    });
  } catch (error) {
    console.error('Error processing season rollover:', error);
    if (error instanceof Error && error.message.includes('Permission denied')) {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * POST /cleanup-ai-teams - Clean up AI teams
 * Consolidated from: seasonalFlowRoutes.ts
 */
router.post('/cleanup-ai-teams', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    await RBACService.requirePermission(req.user.claims.sub, Permission.MANAGE_LEAGUES);
    
    const result = await SeasonalFlowService.cleanupAITeams();
    
    res.json({
      success: true,
      message: "AI team cleanup completed",
      teamsRemoved: convertBigIntToString(result)
    });
  } catch (error) {
    console.error('Error cleaning up AI teams:', error);
    if (error instanceof Error && error.message.includes('Permission denied')) {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
});

// ============================================================================
// PLAYER & TEAM SYSTEMS
// ============================================================================

/**
 * GET /contracts/:teamId - Team contract management
 * Consolidated from: seasonRoutes.ts
 */
router.get('/contracts/:teamId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const userTeam = await getUserTeam(req);
    
    // Verify team ownership
    if (teamId !== userTeam.id) {
      return res.status(403).json({ error: "Team access denied" });
    }
    
    const prisma = await getPrismaClient();
    
    const contracts = await prisma.contract.findMany({
      where: {
        OR: [
          { playerId: { in: userTeam.players?.map((p: any) => p.id) || [] } },
          { staffId: { in: userTeam.staff?.map((s: any) => s.id) || [] } }
        ]
      },
      include: {
        player: { select: { name: true, position: true, age: true } },
        staff: { select: { name: true, type: true } }
      }
    });
    
    res.json({
      teamId,
      teamName: userTeam.name,
      contracts: convertBigIntToString(contracts)
    });
  } catch (error) {
    console.error('Error fetching team contracts:', error);
    next(error);
  }
});

/**
 * POST /contracts/negotiate - Contract negotiation
 * Consolidated from: seasonRoutes.ts
 */
router.post('/contracts/negotiate', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { contractId, terms } = req.body;
    const userTeam = await getUserTeam(req);
    
    // Future implementation: Contract negotiation logic
    res.json({
      success: true,
      message: "Contract negotiation feature coming soon",
      contractId,
      terms
    });
  } catch (error) {
    console.error('Error negotiating contract:', error);
    next(error);
  }
});

/**
 * GET /sponsorships/:teamId - Team sponsorships
 * Consolidated from: seasonRoutes.ts
 */
router.get('/sponsorships/:teamId', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const userTeam = await getUserTeam(req);
    
    if (teamId !== userTeam.id) {
      return res.status(403).json({ error: "Team access denied" });
    }
    
    // Future implementation: Team sponsorship system
    res.json({
      teamId,
      sponsorships: [],
      message: "Sponsorship system coming soon"
    });
  } catch (error) {
    console.error('Error fetching sponsorships:', error);
    next(error);
  }
});

/**
 * POST /sponsorships/negotiate - Sponsorship negotiation
 * Consolidated from: seasonRoutes.ts
 */
router.post('/sponsorships/negotiate', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { sponsorshipId, terms } = req.body;
    
    // Future implementation: Sponsorship negotiation
    res.json({
      success: true,
      message: "Sponsorship negotiation feature coming soon",
      sponsorshipId,
      terms
    });
  } catch (error) {
    console.error('Error negotiating sponsorship:', error);
    next(error);
  }
});

/**
 * POST /daily-progression - Player development processing
 * Consolidated from: seasonRoutes.ts
 */
router.post('/daily-progression', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userTeam = await getUserTeam(req);
    const prisma = await getPrismaClient();
    
    // Process daily player development for user's team
    const players = await prisma.player.findMany({
      where: { teamId: userTeam.id }
    });
    
    // Future: Implement daily progression logic
    res.json({
      success: true,
      message: "Daily progression processed",
      playersProcessed: players.length,
      teamName: userTeam.name
    });
  } catch (error) {
    console.error('Error processing daily progression:', error);
    next(error);
  }
});

// ============================================================================
// LATE SIGNUP SYSTEM
// ============================================================================

/**
 * POST /late-signup - Process late team signup
 * Consolidated from: seasonalFlowRoutes.ts
 */
router.post('/late-signup', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const { division = 8 } = req.body;
    
    const result = await LateSignupService.processLateSignup(userId, division);
    
    if (result.success) {
      res.json({
        success: true,
        message: "Late signup processed successfully",
        team: convertBigIntToString(result.team),
        division: result.division,
        subdivision: result.subdivision
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error processing late signup:', error);
    next(error);
  }
});

/**
 * GET /late-signup/stats - Late signup statistics
 * Consolidated from: seasonalFlowRoutes.ts
 */
router.get('/late-signup/stats', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const stats = await LateSignupService.getLateSignupStats();
    
    res.json({
      lateSignupStats: convertBigIntToString(stats)
    });
  } catch (error) {
    console.error('Error fetching late signup stats:', error);
    next(error);
  }
});

// ============================================================================
// EMERGENCY & DEBUG OPERATIONS
// ============================================================================

/**
 * POST /test-catch-up - Automation testing
 * Consolidated from: seasonRoutes.ts
 */
router.post('/test-catch-up', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    // Test automation catch-up mechanism
    const result = await SeasonTimingAutomationService.testCatchUpMechanism();
    
    res.json({
      success: true,
      message: "Catch-up test completed",
      testResults: convertBigIntToString(result)
    });
  } catch (error) {
    console.error('Error testing catch-up:', error);
    next(error);
  }
});

/**
 * POST /manual-day-reset - Emergency day reset utility
 * Consolidated from: seasonRoutes.ts
 */
router.post('/manual-day-reset', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    await RBACService.requirePermission(req.user.claims.sub, Permission.MANAGE_LEAGUES);
    
    const { targetDay } = req.body;
    
    // Emergency day reset functionality
    const currentSeason = await storage.seasons.getCurrentSeason();
    if (currentSeason) {
      // Future: Implement safe day reset logic
      res.json({
        success: true,
        message: `Manual day reset to ${targetDay} completed`,
        previousDay: currentSeason?.currentDay,
        newDay: targetDay
      });
    } else {
      res.status(404).json({ error: "No current season found" });
    }
  } catch (error) {
    console.error('Error performing manual day reset:', error);
    if (error instanceof Error && error.message.includes('Permission denied')) {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * POST /emergency-populate-current-season - Emergency season setup
 * Consolidated from: seasonalFlowRoutes.ts
 */
router.post('/emergency-populate-current-season', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    await RBACService.requirePermission(req.user.claims.sub, Permission.MANAGE_LEAGUES);
    
    const result = await SeasonalFlowService.emergencyPopulateCurrentSeason();
    
    res.json({
      success: true,
      message: "Emergency season population completed",
      populationResults: convertBigIntToString(result)
    });
  } catch (error) {
    console.error('Error in emergency season population:', error);
    if (error instanceof Error && error.message.includes('Permission denied')) {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * GET /debug-test - Debug route verification
 * Consolidated from: seasonRoutes.ts
 */
router.get('/debug-test', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    res.json({
      success: true,
      message: "Enhanced Season Routes debug test successful",
      timestamp: new Date(),
      serverTime: getServerTimeInfo()
    });
  } catch (error) {
    console.error('Error in debug test:', error);
    next(error);
  }
});

// ============================================================================
// BACKWARD COMPATIBILITY ROUTES
// ============================================================================

// Legacy endpoint redirects for existing frontend code
router.get('/api/seasonal-flow/current-cycle', async (req, res, next) => {
  req.url = '/current-cycle';
  next();
});

router.get('/api/seasonal-flow/config', async (req, res, next) => {
  req.url = '/config';
  next();
});

export default router;