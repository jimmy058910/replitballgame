import { Router } from 'express';
import { DailyPlayerProgressionService } from '../services/dailyPlayerProgressionService';
import { isAuthenticated } from '../googleAuth';
import { RBACService, Permission } from '../services/rbacService';

const router = Router();

/**
 * POST /api/daily-progression/execute
 * Execute daily progression for all players (admin only)
 */
router.post('/execute', isAuthenticated, RBACService.requirePermission("MANAGE_LEAGUES"), async (req, res) => {
  try {
    console.log('[DAILY PROGRESSION API] Starting manual daily progression execution');
    
    const result = await DailyPlayerProgressionService.executeDailyProgression();
    
    res.json({
      success: true,
      data: result,
      message: `Daily progression completed! ${result.totalProgressions} progressions across ${result.totalPlayersProcessed} players.`
    });
  } catch (error) {
    console.error('Error executing daily progression:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute daily progression',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/daily-progression/player/:playerId
 * Execute daily progression for a specific player (for testing)
 */
router.post('/player/:playerId', isAuthenticated, RBACService.requirePermission("MANAGE_LEAGUES"), async (req, res) => {
  try {
    const { playerId } = req.params;
    
    console.log(`[DAILY PROGRESSION API] Processing single player: ${playerId}`);
    
    const result = await DailyPlayerProgressionService.processPlayerDailyProgression(parseInt(playerId)); // Convert string to number
    
    res.json({
      success: true,
      data: result,
      message: `Player progression completed! ${result.progressions.length} stat improvements.`
    });
  } catch (error) {
    console.error('Error processing player daily progression:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process player daily progression',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/daily-progression/statistics
 * Get progression statistics for analysis
 */
router.get('/statistics', isAuthenticated, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysNumber = parseInt(days as string) || 30;
    
    const statistics = await DailyPlayerProgressionService.getProgressionStatistics(daysNumber);
    
    res.json({
      success: true,
      data: {
        ...statistics,
        periodDays: daysNumber,
        description: `Player progression statistics for the last ${daysNumber} days`
      }
    });
  } catch (error) {
    console.error('Error getting progression statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get progression statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/daily-progression/config
 * Get daily progression system configuration
 */
router.get('/config', isAuthenticated, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        systemName: 'Daily Player Progression & Development System',
        description: 'Organic player development through daily progression checks based on activity, potential, age, staff effects, and team environment.',
        configuration: {
          baseChance: '5% base progression chance',
          activityWeights: {
            leagueGames: '10 points per game',
            tournamentGames: '7 points per game', 
            exhibitionGames: '2 points per game'
          },
          rollsPerActivity: 'floor(ActivityScore / 5) progression attempts',
          potentialModifiers: {
            '1-Star': '+5% chance',
            '2-Stars': '+10% chance',
            '3-Stars': '+20% chance', 
            '4-Stars': '+30% chance',
            '5-Stars': '+40% chance'
          },
          ageModifiers: {
            'Youth (16-23)': '+15% bonus',
            'Prime (24-30)': '+5% bonus',
            'Veteran (31+)': '-20% penalty',
            'Physical Decline (34+)': 'No Speed/Agility/Power improvements'
          },
          staffModifiers: {
            trainerEffect: 'Teaching × 0.15%',
            headCoachAmplifier: '× (1 + Development/100)'
          },
          camaraderieModifier: '(Camaraderie - 50) × 0.05%',
          injuryModifiers: {
            'Minor Injury': '-5% penalty',
            'Moderate Injury': '-15% penalty',
            'Severe Injury': 'Ineligible for progression'
          },
          luckFactor: '±1.0% random variance',
          performanceBonus: '+5% for standout performances',
          resetTime: '3:00 AM Eastern Time daily'
        }
      }
    });
  } catch (error) {
    console.error('Error getting progression config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get progression config',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/daily-progression/team/:teamId/summary
 * Get daily progression summary for a specific team
 */
router.get('/team/:teamId/summary', isAuthenticated, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { days = 7 } = req.query;
    const daysNumber = parseInt(days as string) || 7;
    
    // Get team progression statistics (would need to implement this method)
    const statistics = await DailyPlayerProgressionService.getProgressionStatistics(daysNumber);
    
    res.json({
      success: true,
      data: {
        teamId,
        periodDays: daysNumber,
        progressionSummary: statistics,
        message: `Team progression summary for the last ${daysNumber} days`
      }
    });
  } catch (error) {
    console.error('Error getting team progression summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get team progression summary',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/daily-progression/test-full-day-advancement
 * Test full day advancement system (admin only)
 */
router.post('/test-full-day-advancement', isAuthenticated, RBACService.requirePermission("MANAGE_LEAGUES"), async (req, res) => {
  try {
    console.log('[DAILY PROGRESSION TEST] Starting full day advancement test');
    
    // Import the automation service
    const { SeasonTimingAutomationService } = await import('../services/seasonTimingAutomationService');
    const automationService = SeasonTimingAutomationService.getInstance();
    
    // Execute full daily progression (same as the scheduled 3AM process)
    const result = await (automationService as any).executeDailyProgression();
    
    res.json({
      success: true,
      data: result,
      message: 'Full day advancement test completed successfully (includes season day update)'
    });
  } catch (error) {
    console.error('Error executing full day advancement test:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute full day advancement test',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as dailyProgressionRoutes };