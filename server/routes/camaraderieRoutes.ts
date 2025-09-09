import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/firebaseAuth.js";
import { CamaraderieService } from '../services/camaraderieService.js';
import { RBACService, Permission } from '../services/rbacService.js';
import { ErrorCreators, asyncHandler, logInfo } from '../services/errorService.js';
import { storage } from '../storage/index.js';
import type { Player, Team } from '@shared/types/models';


const router = Router();

// Apply authentication to all routes
router.use(requireAuth);

/**
 * Get team camaraderie summary for logged-in user's team
 * GET /api/camaraderie/summary
 */
router.get('/summary', asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.claims.sub;
  
  // Get user's team
  const team = await storage.teams.getTeamByUserId(userId);
  if (!team) {
    throw ErrorCreators.notFound("Team not found");
  }

  const summary = await CamaraderieService.getCamaraderieSummary(team.id);
  
  res.json(summary);
}));

/**
 * Get team camaraderie summary
 * GET /api/camaraderie/team/:teamId
 */
router.get('/team/:teamId', asyncHandler(async (req: any, res: Response) => {
  const { teamId } = req.params;
  const userId = req.user.claims.sub;
  
  // Verify user owns the team or has admin access
  const team = await storage.teams.getTeamByUserId(userId);
  const isAdmin = await RBACService.hasPermission(userId, Permission.VIEW_ALL_TEAMS);
  
  if (!team || (team.id !== parseInt(teamId) && !isAdmin)) {
    throw ErrorCreators.forbidden("Cannot access team camaraderie data");
  }
  
  const effects = await CamaraderieService.getCamaraderieEffects(teamId);
  
  res.json(effects);
}));

/**
 * Get individual player camaraderie details
 * GET /api/camaraderie/player/:playerId
 */
router.get('/player/:playerId', asyncHandler(async (req: any, res: Response) => {
  const { playerId } = req.params;
  const userId = req.user.claims.sub;
  
  // Get player and verify team ownership
  const player = await storage?.players.getPlayerById(parseInt(playerId));
  if (!player) {
    throw ErrorCreators.notFound("Player not found");
  }
  
  const team = await storage.teams.getTeamByUserId(userId);
  const isAdmin = await RBACService.hasPermission(userId, Permission.VIEW_ALL_TEAMS);
  
  if (!team || (player.teamId !== team.id && !isAdmin)) {
    throw ErrorCreators.forbidden("Cannot access player camaraderie data");
  }
  
  res.json({
    success: true,
    data: {
      playerId: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      camaraderie: player.camaraderieScore || 50,
      yearsOnTeam: 0, // Note: yearsOnTeam field doesn't exist in Prisma schema - using default value
      contractNegotiationBonus: CamaraderieService.applyContractNegotiationEffects(
        player.id.toString(), // Convert number to string for method compatibility
        player.camaraderieScore || 50,
        50 // Base willingness 
      ) - 50 // Show just the bonus
    }
  });
}));

/**
 * Trigger end-of-season camaraderie updates for a team
 * POST /api/camaraderie/end-of-season/:teamId
 * Admin only
 */
router.post('/end-of-season/:teamId', 
  RBACService.requirePermission(Permission.MANAGE_SEASONS), // Note: Updated to match available Permission enum
  asyncHandler(async (req: any, res: Response) => {
    const { teamId } = req.params;
    const userId = req.user.claims.sub;
    
    logInfo("Admin triggering end-of-season camaraderie update", {
      adminUserId: userId,
      teamId
    });
    
    const updates = await CamaraderieService.updateTeamCamaraderieEndOfSeason(teamId);
    
    res.json({
      success: true,
      message: `Updated camaraderie for ${updates.length} players`,
      data: {
        updates,
        summary: await CamaraderieService.getCamaraderieSummary(teamId)
      }
    });
  })
);

/**
 * Trigger end-of-season camaraderie updates for all teams
 * POST /api/camaraderie/end-of-season-all
 * Super Admin only
 */
router.post('/end-of-season-all',
  RBACService.requireSuperAdmin(),
  asyncHandler(async (req: any, res: Response) => {
    const userId = req.user.claims.sub;
    
    logInfo("Super admin triggering league-wide end-of-season camaraderie update", {
      adminUserId: userId
    });
    
    // Get all teams
    const teams = await storage.teams.getTeams();
    const allUpdates = [];
    
    for (const team of teams) {
      const updates = await CamaraderieService.updateTeamCamaraderieEndOfSeason(team.id);
      allUpdates.push({ teamId: team.id, teamName: team.name, updates });
    }
    
    res.json({
      success: true,
      message: `Updated camaraderie for ${teams.length} teams`,
      data: {
        teamsUpdated: teams.length,
        totalPlayersUpdated: allUpdates.reduce((sum: any, team: any) => sum + team.updates.length, 0),
        teamUpdates: allUpdates
      }
    });
  })
);

/**
 * Increment years on team for all players (season transition)
 * POST /api/camaraderie/increment-years/:teamId
 * Admin only
 */
router.post('/increment-years/:teamId',
  RBACService.requirePermission(Permission.MANAGE_SEASONS),
  asyncHandler(async (req: any, res: Response) => {
    const { teamId } = req.params;
    const userId = req.user.claims.sub;
    
    logInfo("Admin incrementing years on team", {
      adminUserId: userId,
      teamId
    });
    
    await CamaraderieService.incrementYearsOnTeam(teamId);
    
    res.json({
      success: true,
      message: "Years on team incremented for all players",
      data: {
        teamId,
        summary: await CamaraderieService.getCamaraderieSummary(teamId)
      }
    });
  })
);

/**
 * Increment years on team for all teams
 * POST /api/camaraderie/increment-years-all
 * Super Admin only
 */
router.post('/increment-years-all',
  RBACService.requireSuperAdmin(),
  asyncHandler(async (req: any, res: Response) => {
    const userId = req.user.claims.sub;
    
    logInfo("Super admin incrementing years on team league-wide", {
      adminUserId: userId
    });
    
    const teams = await storage.teams.getTeams();
    
    for (const team of teams) {
      await CamaraderieService.incrementYearsOnTeam(team.id);
    }
    
    res.json({
      success: true,
      message: `Incremented years on team for ${teams.length} teams`,
      data: {
        teamsUpdated: teams.length
      }
    });
  })
);

/**
 * Get match stat modifiers for a team based on camaraderie
 * GET /api/camaraderie/match-effects/:teamId
 */
router.get('/match-effects/:teamId', asyncHandler(async (req: any, res: Response) => {
  const { teamId } = req.params;
  const userId = req.user.claims.sub;
  
  // Verify user owns the team or has admin access
  const team = await storage.teams.getTeamByUserId(userId);
  const isAdmin = await RBACService.hasPermission(userId, Permission.VIEW_ALL_TEAMS);
  
  if (!team || (team.id !== teamId && !isAdmin)) {
    throw ErrorCreators.forbidden("Cannot access team match effects");
  }
  
  const effects = await CamaraderieService.applyMatchStatModifications(teamId);
  const progressionBonus = await CamaraderieService.getProgressionBonus(teamId);
  const injuryReduction = await CamaraderieService.getInjuryReduction(teamId);
  
  res.json({
    success: true,
    data: {
      teamId,
      matchStatModifiers: effects,
      progressionBonus,
      injuryReduction
    }
  });
}));

/**
 * Test camaraderie calculation with different scenarios
 * POST /api/camaraderie/test-calculation
 * Admin only - for testing purposes
 */
router.post('/test-calculation',
  RBACService.requirePermission(Permission.VIEW_FINANCES),
  asyncHandler(async (req: any, res: Response) => {
    const { 
      currentCamaraderie = 50,
      yearsOnTeam = 1,
      winPercentage = 0.5,
      wonChampionship = false,
      headCoachLeadership = 20
    } = req.body;
    
    // Simulate the calculation
    let newCamaraderie = currentCamaraderie;
    const factors = {
      decay: -5,
      loyaltyBonus: yearsOnTeam * 2,
      winningBonus: 0,
      championshipBonus: 0,
      coachBonus: Math.round(headCoachLeadership * 0.5),
      losingPenalty: 0
    };
    
    newCamaraderie -= 5; // Decay
    newCamaraderie += factors.loyaltyBonus;
    newCamaraderie += factors.coachBonus;
    
    if (wonChampionship) {
      factors.championshipBonus = 25;
      newCamaraderie += 25;
    } else if (winPercentage >= 0.60) {
      factors.winningBonus = 10;
      newCamaraderie += 10;
    }
    
    if (winPercentage <= 0.40) {
      factors.losingPenalty = -10;
      newCamaraderie -= 10;
    }
    
    newCamaraderie = Math.max(0, Math.min(100, newCamaraderie));
    
    res.json({
      success: true,
      data: {
        inputs: {
          currentCamaraderie,
          yearsOnTeam,
          winPercentage,
          wonChampionship,
          headCoachLeadership
        },
        calculation: {
          oldCamaraderie: currentCamaraderie,
          newCamaraderie,
          change: newCamaraderie - currentCamaraderie,
          factors
        }
      }
    });
  }));

/**
 * Manual post-game camaraderie update (SuperUser testing)
 * POST /api/camaraderie/test-post-game
 */
router.post('/test-post-game', asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.claims.sub;
  
  // Verify admin access
  const isAdmin = await RBACService.hasPermission(userId, Permission.MANAGE_LEAGUES); // Note: Using MANAGE_LEAGUES instead of SUPERUSER_ACCESS which doesn't exist
  if (!isAdmin) {
    throw ErrorCreators.forbidden("SuperUser access required");
  }

  const { homeTeamId, awayTeamId, homeScore, awayScore, matchType } = req.body;
  
  if (!homeTeamId || !awayTeamId || homeScore === undefined || awayScore === undefined || !matchType) {
    throw ErrorCreators.validation("Missing required fields: homeTeamId, awayTeamId, homeScore, awayScore, matchType"); // Note: Using validation instead of badRequest which doesn't exist
  }

  await CamaraderieService.updatePostGameCamaraderie(
    homeTeamId.toString(),
    awayTeamId.toString(),
    parseInt(homeScore),
    parseInt(awayScore),
    matchType
  );

  res.json({
    success: true,
    message: `Post-game camaraderie update applied for ${matchType} match: ${homeTeamId} (${homeScore}) vs ${awayTeamId} (${awayScore})`
  });
}));

export default router;