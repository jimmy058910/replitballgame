/**
 * Admin routes for testing and manual triggers
 */
import { Router, Request, Response } from 'express';
import { SeasonTimingAutomationService } from '../services/seasonTimingAutomationService.js';
import { MatchStatusFixer } from '../utils/matchStatusFixer.js';
// No auth import needed for now - will use simple endpoint

const router = Router();

// Manual trigger for game simulation (for testing)
router.post('/trigger-simulation', async (req: Request, res: Response) => {
  try {
    console.log('🎮 [ADMIN] Manual simulation trigger requested...');
    
    const automationService = SeasonTimingAutomationService.getInstance();
    
    // Force check simulation window
    await automationService.checkMatchSimulationWindow();
    
    console.log('✅ [ADMIN] Manual simulation trigger completed');
    
    res.json({ 
      success: true, 
      message: 'Game simulation check triggered successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [ADMIN] Manual simulation trigger failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// CRITICAL FIX: Force advance day to Day 7 (manual day advancement)
router.post('/force-advance-to-day-7', async (req, res) => {
  try {
    console.log('🔥 [ADMIN] CRITICAL FIX: Manually advancing to Day 7...');
    
    const { getPrismaClient } = await import('../database');
    const prisma = await getPrismaClient();
    
    // Get current season
    const currentSeason = await prisma.season.findFirst({
      orderBy: { startDate: 'desc' }
    });
    
    if (!currentSeason) {
      return res.status(404).json({
        success: false,
        error: 'No current season found'
      });
    }
    
    console.log(`🔥 Current season Day ${currentSeason.currentDay} -> advancing to Day 7`);
    
    // Force update to Day 7
    await prisma.season.update({
      where: { id: currentSeason.id },
      data: { currentDay: 7 }
    });
    
    console.log('✅ Season successfully advanced to Day 7');
    
    res.json({
      success: true,
      message: 'Season manually advanced to Day 7',
      previousDay: currentSeason.currentDay,
      newDay: 7,
      seasonId: currentSeason.id,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error advancing to Day 7:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Force complete all overdue Day 6 games
router.post('/force-complete-day-6-games', async (req, res) => {
  try {
    console.log('🔥 [ADMIN] Force completing all overdue Day 6 games...');
    
    const { getPrismaClient } = await import('../database');
    const prisma = await getPrismaClient();
    
    // Find all SCHEDULED games that should have been completed by now
    const now = new Date();
    const overdueGames = await prisma.game.findMany({
      where: {
        status: 'SCHEDULED',
        gameDate: {
          lt: now
        },
        matchType: 'LEAGUE'
      }
    });
    
    console.log(`🔥 Found ${overdueGames.length} overdue games to complete`);
    
    let completedCount = 0;
    
    for (const game of overdueGames) {
      try {
        // Generate random scores (simulate the game instantly)
        const homeScore = Math.floor(Math.random() * 5) + 1; // 1-5 points
        const awayScore = Math.floor(Math.random() * 5) + 1; // 1-5 points
        
        await prisma.game.update({
          where: { id: game.id },
          data: {
            status: 'COMPLETED',
            homeScore: homeScore,
            awayScore: awayScore,
            simulated: true,
            simulationLog: `Game completed automatically at ${now.toISOString()} due to overdue status`
          }
        });
        
        console.log(`✅ Completed overdue game ${game.id}: ${homeScore}-${awayScore}`);
        completedCount++;
      } catch (error) {
        console.error(`❌ Error completing game ${game.id}:`, error);
      }
    }
    
    res.json({
      success: true,
      message: `Successfully completed ${completedCount} overdue games`,
      completedGames: completedCount,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error force completing Day 6 games:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Fix stuck LIVE games
router.post('/fix-stuck-games', async (req: Request, res: Response) => {
  try {
    console.log('🔧 [ADMIN] Fix stuck games requested...');
    
    const result = await MatchStatusFixer.fixStuckLiveGames();
    
    res.json({
      success: true,
      message: `Fixed ${result.fixed} stuck games`,
      fixedGames: result.games,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [ADMIN] Fix stuck games failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Check stuck LIVE games (read-only)
router.get('/stuck-games', async (req: Request, res: Response) => {
  try {
    const stuckGames = await MatchStatusFixer.getStuckLiveGames();
    
    res.json({
      success: true,
      count: stuckGames.length,
      games: stuckGames.map(game => ({
        id: game.id,
        homeTeam: game.homeTeam.name,
        awayTeam: game.awayTeam.name,
        createdAt: game.createdAt,
        status: game.status
      })),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [ADMIN] Check stuck games failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Check tournament status
router.get('/tournament/:id', async (req: Request, res: Response) => {
  try {
    const tournamentId = parseInt(req.params.id);
    
    const tournament = await MatchStatusFixer.getTournamentStatus(tournamentId);
    
    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: `Tournament ${tournamentId} not found`
      });
    }
    
    res.json({
      success: true,
      tournament: {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        entries: tournament.entries.map(entry => ({
          teamName: entry.team.name,
          isAI: entry.team.isAI
        })),
        entryCount: tournament._count.entries,
        startTime: tournament.startTime,
        endTime: tournament.endTime
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [ADMIN] Check tournament failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// List recent tournaments
router.get('/tournaments', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    
    const tournaments = await MatchStatusFixer.getRecentTournaments(limit);
    
    res.json({
      success: true,
      count: tournaments.length,
      tournaments: tournaments.map(t => ({
        id: t.id,
        name: t.name,
        status: t.status,
        entryCount: t._count.entries,
        division: t.division,
        createdAt: t.createdAt
      })),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [ADMIN] List tournaments failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;