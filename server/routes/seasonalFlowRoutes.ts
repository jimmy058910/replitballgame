import { Router, type Request, type Response } from 'express';
import { SeasonalFlowService } from '../services/seasonalFlowService';
import { isAuthenticated } from '../googleAuth';
import { RBACService } from '../services/rbacService';
import { asyncHandler } from '../services/errorService';
import { storage } from '../storage/index';

const router = Router();

/**
 * GET /api/seasonal-flow/phase/:gameDay
 * Get current seasonal phase information
 */
router.get('/phase/:gameDay', isAuthenticated, async (req, res) => {
  try {
    const gameDay = parseInt(req.params.gameDay);
    
    if (isNaN(gameDay) || gameDay < 1) {
      return res.status(400).json({
        success: false,
        message: 'Valid game day required'
      });
    }
    
    const phase = SeasonalFlowService.getCurrentSeasonalPhase(gameDay);
    
    res.json({
      success: true,
      data: phase
    });
  } catch (error) {
    console.error('Error getting seasonal phase:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get seasonal phase',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/seasonal-flow/schedule/generate
 * Generate complete season schedule for all leagues
 */
router.post('/schedule/generate', isAuthenticated, RBACService.requirePermission('manage_leagues'), async (req, res) => {
  try {
    const { season } = req.body;
    
    if (!season || typeof season !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Season number is required'
      });
    }
    
    const result = await SeasonalFlowService.generateSeasonSchedule(season);
    
    res.json({
      success: true,
      data: result,
      message: `Generated ${result.matchesGenerated} matches across ${result.schedulesCreated} leagues`
    });
  } catch (error) {
    console.error('Error generating season schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate season schedule',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/seasonal-flow/schedule/fix-division
 * Fix league schedule for a specific division using corrected round-robin logic
 */
router.post('/schedule/fix-division', isAuthenticated, RBACService.requirePermission('manage_leagues'), async (req, res) => {
  try {
    const { division, season } = req.body;
    
    if (!division || typeof division !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Division number is required'
      });
    }
    
    if (season === undefined || typeof season !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Season number is required'
      });
    }
    
    const result = await SeasonalFlowService.fixDivisionSchedule(division, season);
    
    res.json({
      success: true,
      data: result,
      message: `Fixed schedule for Division ${division}: ${result.matchesGenerated} matches created`
    });
  } catch (error) {
    console.error('Error fixing division schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fix division schedule',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/seasonal-flow/standings/update/:matchId
 * Update league standings after a match is completed
 */
router.put('/standings/update/:matchId', isAuthenticated, RBACService.requirePermission('manage_matches'), async (req, res) => {
  try {
    const { matchId } = req.params;
    
    const result = await SeasonalFlowService.updateStandingsAfterMatch(matchId);
    
    res.json({
      success: true,
      data: result,
      message: 'Standings updated successfully'
    });
  } catch (error) {
    console.error('Error updating standings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update standings',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/seasonal-flow/standings/:leagueId
 * Get final league standings with tie-breakers applied
 */
router.get('/standings/:leagueId', isAuthenticated, async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { season } = req.query;
    
    if (!season || isNaN(parseInt(season as string))) {
      return res.status(400).json({
        success: false,
        message: 'Season number is required'
      });
    }
    
    const result = await SeasonalFlowService.getFinalStandings(leagueId, parseInt(season as string));
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting final standings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get final standings',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/seasonal-flow/playoffs/generate
 * Generate playoff brackets for Day 15
 */
router.post('/playoffs/generate', isAuthenticated, RBACService.requirePermission('manage_leagues'), async (req, res) => {
  try {
    const { season } = req.body;
    
    if (!season || typeof season !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Season number is required'
      });
    }
    
    const result = await SeasonalFlowService.generatePlayoffBrackets(season);
    
    res.json({
      success: true,
      data: result,
      message: `Generated ${result.totalPlayoffMatches} playoff matches across ${result.bracketsByLeague.length} leagues`
    });
  } catch (error) {
    console.error('Error generating playoff brackets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate playoff brackets',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/seasonal-flow/promotion-relegation/process
 * Process promotion and relegation after playoffs complete
 */
router.post('/promotion-relegation/process', isAuthenticated, RBACService.requirePermission('manage_leagues'), async (req, res) => {
  try {
    const { season } = req.body;
    
    if (!season || typeof season !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Season number is required'
      });
    }
    
    const result = await SeasonalFlowService.processPromotionRelegation(season);
    
    res.json({
      success: true,
      data: result,
      message: `Processed ${result.totalTeamsProcessed} team movements (${result.promotions.length} promotions, ${result.relegations.length} relegations)`
    });
  } catch (error) {
    console.error('Error processing promotion/relegation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process promotion/relegation',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/seasonal-flow/leagues/rebalance
 * Rebalance leagues after promotion/relegation
 */
router.post('/leagues/rebalance', isAuthenticated, RBACService.requirePermission('manage_leagues'), async (req, res) => {
  try {
    const { season } = req.body;
    
    if (!season || typeof season !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Season number is required'
      });
    }
    
    const result = await SeasonalFlowService.rebalanceLeagues(season);
    
    res.json({
      success: true,
      data: result,
      message: `Rebalanced ${result.leaguesRebalanced} divisions with ${result.teamsRedistributed} teams redistributed`
    });
  } catch (error) {
    console.error('Error rebalancing leagues:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to rebalance leagues',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/seasonal-flow/season/rollover
 * Execute complete season rollover
 */
router.post('/season/rollover', isAuthenticated, RBACService.requirePermission('manage_leagues'), async (req, res) => {
  try {
    const { currentSeason } = req.body;
    
    if (!currentSeason || typeof currentSeason !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Current season number is required'
      });
    }
    
    const result = await SeasonalFlowService.executeSeasonRollover(currentSeason);
    
    res.json({
      success: true,
      data: result,
      message: `Season rollover completed! Advanced to Season ${result.newSeason} with ${result.summary.totalMatches} matches scheduled`
    });
  } catch (error) {
    console.error('Error executing season rollover:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute season rollover',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/seasonal-flow/cleanup-ai-teams
 * Test endpoint to clean up AI teams (temporary for debugging)
 */
router.post('/cleanup-ai-teams', isAuthenticated, RBACService.requirePermission('manage_leagues'), async (req, res) => {
  try {
    console.log('Manual AI cleanup requested...');
    
    const result = await SeasonalFlowService.cleanupAITeams();
    
    res.json({
      success: true,
      data: result,
      message: `AI cleanup completed! Removed ${result.totalAITeamsDeleted} AI teams and ${result.totalAIPlayersDeleted} AI players`
    });
  } catch (error) {
    console.error('Error executing AI cleanup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute AI cleanup',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/seasonal-flow/config
 * Get seasonal flow system configuration
 */
router.get('/config', isAuthenticated, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        seasonConfig: SeasonalFlowService.SEASON_CONFIG,
        description: 'Seasonal Flow Algorithm Configuration and Constants',
        competitionStructure: {
          regularSeason: `Days 1-${SeasonalFlowService.SEASON_CONFIG.REGULAR_SEASON_DAYS}`,
          playoffs: `Day ${SeasonalFlowService.SEASON_CONFIG.PLAYOFF_DAY}`,
          offseason: `Days ${SeasonalFlowService.SEASON_CONFIG.OFFSEASON_DAYS.join(', ')}`,
          totalCycle: `${SeasonalFlowService.SEASON_CONFIG.TOTAL_SEASON_DAYS} days`
        },
        pointSystem: {
          win: `${SeasonalFlowService.SEASON_CONFIG.POINTS_WIN} points`,
          draw: `${SeasonalFlowService.SEASON_CONFIG.POINTS_DRAW} point`,
          loss: `${SeasonalFlowService.SEASON_CONFIG.POINTS_LOSS} points`
        },
        promotionRelegation: {
          playoffQualifiers: SeasonalFlowService.SEASON_CONFIG.PLAYOFF_QUALIFIERS,
          division1Relegation: SeasonalFlowService.SEASON_CONFIG.DIVISION_1_RELEGATION,
          standardRelegation: SeasonalFlowService.SEASON_CONFIG.STANDARD_RELEGATION,
          onlyChampionsPromote: true
        }
      }
    });
  } catch (error) {
    console.error('Error getting seasonal flow config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get seasonal flow config',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/seasonal-flow/schedule/preview/:season
 * Preview schedule generation without creating matches
 */
router.get('/schedule/preview/:season', isAuthenticated, RBACService.requirePermission('manage_leagues'), async (req, res) => {
  try {
    const season = parseInt(req.params.season);
    
    if (isNaN(season)) {
      return res.status(400).json({
        success: false,
        message: 'Valid season number required'
      });
    }
    
    // This would be a preview version that doesn't actually create matches
    // For now, return structure information
    res.json({
      success: true,
      data: {
        season,
        structure: {
          division1: {
            teams: SeasonalFlowService.SEASON_CONFIG.DIVISION_1_TEAMS,
            gamesPerTeam: 28,
            gamesPerDay: 2,
            totalDays: SeasonalFlowService.SEASON_CONFIG.REGULAR_SEASON_DAYS
          },
          standardDivisions: {
            teams: SeasonalFlowService.SEASON_CONFIG.STANDARD_LEAGUE_TEAMS,
            gamesPerTeam: 14,
            gamesPerDay: 1,
            totalDays: SeasonalFlowService.SEASON_CONFIG.REGULAR_SEASON_DAYS,
            format: 'Double round-robin'
          }
        },
        timeline: {
          regularSeason: `Days 1-${SeasonalFlowService.SEASON_CONFIG.REGULAR_SEASON_DAYS}`,
          playoffs: `Day ${SeasonalFlowService.SEASON_CONFIG.PLAYOFF_DAY}`,
          offseason: `Days ${SeasonalFlowService.SEASON_CONFIG.OFFSEASON_DAYS.join('-')}`
        }
      }
    });
  } catch (error) {
    console.error('Error previewing schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to preview schedule',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/seasonal-flow/late-signup
 * Handle progressive late signup team creation
 */
router.post('/late-signup', isAuthenticated, async (req, res) => {
  try {
    const { teamName } = req.body;
    const userId = req.user.id;
    
    if (!teamName || typeof teamName !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Team name is required'
      });
    }
    
    // Import LateSignupService
    const { LateSignupService } = await import('../services/lateSignupService');
    
    const result = await LateSignupService.processLateSignup({
      userId,
      name: teamName
    });
    
    res.json({
      success: true,
      data: result,
      message: result.scheduleGenerated 
        ? `Team created! Subdivision ${result.subdivision} is full and schedule generated. You can start playing immediately!`
        : `Team created in subdivision ${result.subdivision}. Waiting for more teams to start season.`
    });
  } catch (error) {
    console.error('Error processing late signup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process late signup',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/seasonal-flow/late-signup/stats
 * Get late signup statistics and subdivision status
 */
router.get('/late-signup/stats', isAuthenticated, async (req, res) => {
  try {
    // Import LateSignupService
    const { LateSignupService } = await import('../services/lateSignupService');
    
    const stats = await LateSignupService.getLateSignupStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting late signup stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get late signup stats',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/seasonal-flow/health
 * Health check for seasonal flow system
 */
router.get('/health', isAuthenticated, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        service: 'SeasonalFlowService',
        status: 'operational',
        features: [
          'Schedule Generation',
          'Standings Management',
          'Playoff Brackets',
          'Promotion/Relegation',
          'League Rebalancing',
          'Season Rollover',
          'Progressive Late Signup'
        ],
        version: '1.0.0'
      }
    });
  } catch (error) {
    console.error('Error checking seasonal flow health:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check seasonal flow health',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get current season cycle information
router.get('/current-cycle', asyncHandler(async (req: Request, res: Response) => {
  const currentSeason = await storage.seasons.getCurrentSeason();
  
  res.json({
    currentDay: currentSeason?.currentDay || 1,
    seasonStatus: currentSeason?.status || 'ACTIVE'
  });
}));

export default router;