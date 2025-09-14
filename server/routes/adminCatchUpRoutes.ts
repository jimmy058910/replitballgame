import { Router } from 'express';
import { logger } from '../services/loggingService.js';

const router = Router();

/**
 * Force catch-up of overdue games
 * POST /api/admin/catch-up-games
 */
router.post('/catch-up-games', async (req, res) => {
  try {
    logger.adminOperation('CATCH_UP_GAMES', 'Manual catch-up triggered via API');
    
    const { getPrismaClient } = await import('../database.js');
    const prisma = await getPrismaClient();
    
    // Step 1: Find all overdue games
    const overdueGames = await prisma.game.findMany({
      where: {
        status: 'SCHEDULED',
        scheduleId: { not: null },
        gameDay: { in: [8, 9] } // Focus on Days 8 and 9
      },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } }
      },
      orderBy: [
        { gameDay: 'asc' },
        { gameDate: 'asc' }
      ]
    });
    
    if (overdueGames.length === 0) {
      logger.info('✅ No overdue games found');
      return res.json({
        success: true,
        message: 'No overdue games found',
        gamesSimulated: 0,
        errors: 0
      });
    }
    
    logger.info(`🎮 Found ${overdueGames.length} overdue games to simulate`);
    
    // Step 2: Use the MatchSimulationService to force simulate all matches
    const { MatchSimulationService } = await import('../services/automation/matchSimulationService.js');
    const result = await MatchSimulationService.forceSimulateScheduledMatches();
    
    logger.info(`✅ Catch-up completed: ${result.matchesSimulated} games simulated, ${result.errors} errors`);
    
    return res.json({
      success: result.success,
      message: result.message,
      gamesSimulated: result.matchesSimulated,
      errors: result.errors,
      details: `Processed ${overdueGames.length} overdue games`
    });
    
  } catch (error) {
    logger.error('❌ Failed to catch up overdue games', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to catch up overdue games',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Check automation system status
 * GET /api/admin/automation-status
 */
router.get('/automation-status', async (req, res) => {
  try {
    const { SeasonTimingAutomationService } = await import('../services/seasonTimingAutomationService.js');
    const automationService = SeasonTimingAutomationService.getInstance();
    const status = automationService.getStatus();
    
    logger.info(`🤖 Automation status check: ${status.isRunning ? 'RUNNING' : 'STOPPED'}`);
    
    return res.json({
      success: true,
      automation: {
        isRunning: status.isRunning,
        services: status.services
      },
      message: `Automation system is ${status.isRunning ? 'running' : 'stopped'}`
    });
    
  } catch (error) {
    logger.error('❌ Failed to check automation status', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to check automation status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Restart automation system
 * POST /api/admin/restart-automation
 */
router.post('/restart-automation', async (req, res) => {
  try {
    logger.adminOperation('RESTART_AUTOMATION', 'Manual automation restart triggered via API');
    
    const { SeasonTimingAutomationService } = await import('../services/seasonTimingAutomationService.js');
    const automationService = SeasonTimingAutomationService.getInstance();
    
    // Stop and restart the automation system
    await automationService.stop();
    await automationService.start();
    
    const status = automationService.getStatus();
    
    logger.info(`✅ Automation system restarted successfully: ${status.isRunning ? 'RUNNING' : 'FAILED'}`);
    
    return res.json({
      success: status.isRunning,
      message: `Automation system ${status.isRunning ? 'restarted successfully' : 'failed to restart'}`,
      automation: {
        isRunning: status.isRunning,
        services: status.services
      }
    });
    
  } catch (error) {
    logger.error('❌ Failed to restart automation system', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to restart automation system',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;