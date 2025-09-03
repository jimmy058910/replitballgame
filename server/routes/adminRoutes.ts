/**
 * Admin routes for testing and manual triggers
 */
import { Router, Request, Response } from 'express';
import { SeasonTimingAutomationService } from '../services/seasonTimingAutomationService.js';
import { MatchStatusFixer } from '../utils/matchStatusFixer.js';
import { TournamentBracketGenerator } from '../utils/tournamentBracketGenerator.js';
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

// Generate tournament bracket for a tournament with 8 teams
router.post('/tournament/:id/generate-bracket', async (req: Request, res: Response) => {
  try {
    const tournamentId = parseInt(req.params.id);
    console.log(`🏆 [ADMIN] Generating bracket for tournament ${tournamentId}...`);
    
    if (tournamentId === 2) {
      // Special case for Tournament 2 - use manual creation
      const { createTournamentGames } = await import('../utils/manualGameCreator.js');
      await createTournamentGames();
    } else {
      await TournamentBracketGenerator.generateInitialBracket(tournamentId);
    }
    
    res.json({
      success: true,
      message: `Successfully generated bracket for tournament ${tournamentId}`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [ADMIN] Tournament bracket generation failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Fix schedule duplicates and missing games for Division 7 Alpha
router.post('/fix-division-7-schedule', async (req: Request, res: Response) => {
  try {
    console.log('🔧 [ADMIN] Fixing Division 7 Alpha schedule issues...');
    
    const { getPrismaClient } = await import('../database');
    const prisma = await getPrismaClient();
    
    // Get Division 7 Alpha teams
    const teams = await prisma.team.findMany({
      where: { 
        division: 7,
        subdivision: 'alpha'
      }
    });
    
    console.log(`🔍 Found ${teams.length} teams in Division 7 Alpha`);
    
    // Get team IDs for easier lookup
    const teamLookup = new Map();
    teams.forEach(t => teamLookup.set(t.name, t.id));
    
    const oaklandId = teamLookup.get('Oakland Cougars');
    const earthGuardiansId = teamLookup.get('Earth Guardians 132');
    const fireHawksId = teamLookup.get('Fire Hawks 261');
    const galaxyWarriorsId = teamLookup.get('Galaxy Warriors 792');
    
    let deletedCount = 0;
    let createdCount = 0;
    
    // STEP 1: Remove duplicate games
    console.log('🗑️ Removing duplicate games...');
    
    // Find Oakland vs Fire Hawks games (should be 2, currently 3)
    const oaklandFireHawks = await prisma.game.findMany({
      where: {
        OR: [
          { homeTeamId: oaklandId, awayTeamId: fireHawksId },
          { homeTeamId: fireHawksId, awayTeamId: oaklandId }
        ],
        status: 'SCHEDULED'
      },
      orderBy: { gameDate: 'desc' }
    });
    
    // Delete the latest extra game (Day 13)
    if (oaklandFireHawks.length > 2) {
      await prisma.game.delete({
        where: { id: oaklandFireHawks[0].id }
      });
      console.log(`✅ Deleted duplicate Oakland vs Fire Hawks game (ID: ${oaklandFireHawks[0].id})`);
      deletedCount++;
    }
    
    // Find Oakland vs Earth Guardians games (should be 1 more, currently 2 extra)
    const oaklandEarthGuardians = await prisma.game.findMany({
      where: {
        OR: [
          { homeTeamId: oaklandId, awayTeamId: earthGuardiansId },
          { homeTeamId: earthGuardiansId, awayTeamId: oaklandId }
        ],
        status: 'SCHEDULED'
      },
      orderBy: { gameDate: 'desc' }
    });
    
    // Delete the latest extra game (Day 14) 
    if (oaklandEarthGuardians.length > 1) {
      await prisma.game.delete({
        where: { id: oaklandEarthGuardians[0].id }
      });
      console.log(`✅ Deleted duplicate Oakland vs Earth Guardians game (ID: ${oaklandEarthGuardians[0].id})`);
      deletedCount++;
    }
    
    // STEP 2: Add missing games
    console.log('➕ Adding missing games...');
    
    // Add missing Oakland vs Galaxy Warriors game (they only have 1, need 2)
    const newGame1 = await prisma.game.create({
      data: {
        leagueId: 7, // Division 7 league
        homeTeamId: oaklandId,
        awayTeamId: galaxyWarriorsId,
        gameDate: new Date('2025-09-15T22:00:00Z'), // Day 15, 6:00 PM
        status: 'SCHEDULED',
        matchType: 'LEAGUE'
      }
    });
    console.log(`✅ Created missing Oakland vs Galaxy Warriors game (ID: ${newGame1.id})`);
    createdCount++;
    
    // Add missing Earth Guardians vs Fire Hawks game (they only have 1, need 2)
    const newGame2 = await prisma.game.create({
      data: {
        leagueId: 7, // Division 7 league  
        homeTeamId: earthGuardiansId,
        awayTeamId: fireHawksId,
        gameDate: new Date('2025-09-15T22:15:00Z'), // Day 15, 6:15 PM
        status: 'SCHEDULED',
        matchType: 'LEAGUE'
      }
    });
    console.log(`✅ Created missing Earth Guardians vs Fire Hawks game (ID: ${newGame2.id})`);
    createdCount++;
    
    res.json({
      success: true,
      message: `Fixed Division 7 Alpha schedule`,
      deletedGames: deletedCount,
      createdGames: createdCount,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fixing Division 7 schedule:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Fix stuck tournament - advance to next round
router.post('/advance-tournament/:id', async (req: Request, res: Response) => {
  try {
    const tournamentId = parseInt(req.params.id);
    const { currentRound } = req.body;
    
    console.log(`🏆 [ADMIN] Manually advancing tournament ${tournamentId} from round ${currentRound}...`);
    
    // Import the automation service
    const { UnifiedTournamentAutomation } = await import('../services/unifiedTournamentAutomation.js');
    
    // Check and advance the current round
    await UnifiedTournamentAutomation.checkRoundCompletion(tournamentId, currentRound || 1);
    
    console.log(`✅ [ADMIN] Tournament ${tournamentId} advancement triggered`);
    
    res.json({
      success: true,
      message: `Tournament ${tournamentId} advancement triggered for round ${currentRound || 1}`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error advancing tournament:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Check tournament games and find the correct tournament ID
router.get('/check-tournament-games', async (req: Request, res: Response) => {
  try {
    console.log('🔍 [ADMIN] Checking tournament games...');
    
    const { getPrismaClient } = await import('../database');
    const prisma = await getPrismaClient();
    
    // Find games with the IDs from the screenshot (10117, 10118, etc.)
    const tournamentGames = await prisma.game.findMany({
      where: {
        id: {
          in: [10117, 10118, 10119, 10120]
        }
      },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } }
      }
    });
    
    // Find all tournament games for analysis (check for games with tournamentId)
    const allTournamentGames = await prisma.game.findMany({
      where: {
        tournamentId: {
          not: null
        }
      },
      orderBy: [{ tournamentId: 'asc' }, { round: 'asc' }]
    });
    
    res.json({
      success: true,
      screenshotGames: tournamentGames,
      allTournamentGames: allTournamentGames.length,
      tournamentBreakdown: allTournamentGames.reduce((acc: any, game: any) => {
        const key = `tournament_${game.tournamentId}_round_${game.round}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error checking tournament games:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;