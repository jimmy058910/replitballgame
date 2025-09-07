/**
 * Admin routes for testing and manual triggers
 */
import { Router, Request, Response } from 'express';
import { SeasonTimingAutomationService } from '../services/seasonTimingAutomationService.js';
import { MatchStatusFixer } from '../utils/matchStatusFixer.js';
import { TournamentBracketGenerator } from '../utils/tournamentBracketGenerator.js';
import { UnifiedTournamentAutomation } from '../services/unifiedTournamentAutomation';
import { TeamStandingsSyncService } from '../scripts/syncTeamStandings.js';
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

// Start a specific tournament round
router.post('/start-tournament-round', async (req: Request, res: Response) => {
  try {
    const { tournamentId, roundNumber } = req.body;
    
    if (!tournamentId || !roundNumber) {
      return res.status(400).json({
        success: false,
        error: 'tournamentId and roundNumber are required'
      });
    }
    
    console.log(`🎯 [ADMIN] Starting tournament ${tournamentId} round ${roundNumber}...`);
    
    await UnifiedTournamentAutomation.startTournamentRound(tournamentId, roundNumber);
    
    res.json({
      success: true,
      message: `Tournament ${tournamentId} round ${roundNumber} started`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [ADMIN] Start tournament round failed:', error);
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

// CRITICAL FIX: Repair corrupted game data
router.post('/fix-corrupted-games', async (req: Request, res: Response) => {
  try {
    const { getPrismaClient } = await import('../database');
    const prisma = await getPrismaClient();
    
    // Fix games 10117, 10118, 10120 - they should be LEAGUE games, not tournament games
    const corruptedGameIds = [10117, 10118, 10120];
    
    console.log(`🔧 [DATA FIX] Fixing corrupted games: ${corruptedGameIds.join(', ')}`);
    
    const updateResult = await prisma.game.updateMany({
      where: {
        id: { in: corruptedGameIds }
      },
      data: {
        matchType: 'LEAGUE',
        tournamentId: null
      }
    });
    
    console.log(`✅ [DATA FIX] Updated ${updateResult.count} games to LEAGUE type with no tournament ID`);
    
    res.json({ 
      success: true, 
      message: `Fixed ${updateResult.count} corrupted games`,
      gameIds: corruptedGameIds,
      changes: {
        matchType: 'LEAGUE',
        tournamentId: null
      }
    });
    
  } catch (error) {
    console.error('❌ [DATA FIX] Error fixing corrupted games:', error);
    res.status(500).json({ message: 'Failed to fix corrupted games' });
  }
});

// Synchronize team standings from game results
router.post('/sync-team-standings', async (req: Request, res: Response) => {
  try {
    console.log('🔄 [ADMIN] Team standings synchronization requested...');
    
    const { division, teamId } = req.body;
    
    if (teamId) {
      // Sync specific team
      const team = await (await import('../database.js')).getPrismaClient().then(prisma => 
        prisma.team.findUnique({ where: { id: parseInt(teamId) }, select: { name: true } })
      );
      
      if (!team) {
        return res.status(404).json({
          success: false,
          error: `Team ${teamId} not found`
        });
      }
      
      await TeamStandingsSyncService.syncTeamStanding(parseInt(teamId), team.name);
      
      res.json({
        success: true,
        message: `Team ${team.name} standings synchronized`,
        scope: 'single-team',
        teamId: parseInt(teamId),
        timestamp: new Date().toISOString()
      });
      
    } else if (division) {
      // Sync specific division
      await TeamStandingsSyncService.syncDivisionStandings(parseInt(division));
      
      res.json({
        success: true,
        message: `Division ${division} standings synchronized`,
        scope: 'division',
        division: parseInt(division),
        timestamp: new Date().toISOString()
      });
      
    } else {
      // Sync all teams
      await TeamStandingsSyncService.syncAllTeamStandings();
      
      res.json({
        success: true,
        message: 'All team standings synchronized',
        scope: 'all-teams',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('✅ [ADMIN] Team standings synchronization completed');
    
  } catch (error) {
    console.error('❌ [ADMIN] Team standings sync failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Regenerate Division 7 Alpha complete schedule
router.post('/regenerate-division-7-alpha', async (req: Request, res: Response) => {
  try {
    console.log('🔥 [ADMIN] Starting Division 7 Alpha schedule regeneration...');
    
    const { getPrismaClient } = await import('../database.js');
    const prisma = await getPrismaClient();
    
    // Step 1: Get all Division 7 Alpha teams
    const divisionTeams = await prisma.team.findMany({
      where: { division: 7, subdivision: 'alpha' },
      select: { id: true, name: true },
      orderBy: { id: 'asc' }
    });
    
    if (divisionTeams.length !== 8) {
      return res.status(400).json({
        success: false,
        error: `Expected exactly 8 teams in Division 7 Alpha, found ${divisionTeams.length}`,
        teams: divisionTeams.map(t => t.name)
      });
    }
    
    console.log(`🎯 Division 7 Alpha teams:`, divisionTeams.map(t => t.name));
    
    // Step 2: Delete ALL existing games for these teams
    const teamIds = divisionTeams.map(t => t.id);
    const deletedGames = await prisma.game.deleteMany({
      where: {
        OR: [
          { homeTeamId: { in: teamIds } },
          { awayTeamId: { in: teamIds } }
        ]
      }
    });
    console.log(`🧹 Deleted ${deletedGames.count} existing games`);
    
    // Step 3: Reset all team statistics  
    await prisma.team.updateMany({
      where: { division: 7, subdivision: 'alpha' },
      data: { wins: 0, losses: 0, draws: 0, points: 0 }
    });
    console.log(`✅ Reset statistics for all 8 teams`);
    
    // Step 4: Generate complete 14-day schedule (double round-robin)
    const baseRounds = [
      [[0, 1], [2, 3], [4, 5], [6, 7]],  // Round 1
      [[0, 2], [1, 4], [3, 6], [5, 7]],  // Round 2  
      [[0, 3], [1, 5], [2, 7], [4, 6]],  // Round 3
      [[0, 4], [1, 6], [2, 5], [3, 7]],  // Round 4
      [[0, 5], [1, 7], [2, 4], [3, 6]],  // Round 5
      [[0, 6], [1, 3], [2, 7], [4, 5]],  // Round 6
      [[0, 7], [1, 2], [3, 4], [5, 6]]   // Round 7
    ];
    
    // Create 14 rounds total (7 + 7 reversed for home/away)
    const fullSchedule = [
      ...baseRounds,  // Days 1-7: First meetings
      ...baseRounds.map(round => round.map(([home, away]) => [away, home])) // Days 8-14: Return matches
    ];
    
    // Step 5: Create games for all 14 days
    const seasonStart = new Date('2025-09-01');
    let gamesCreated = 0;
    
    for (let day = 0; day < 14; day++) {
      const gameDate = new Date(seasonStart);
      gameDate.setDate(seasonStart.getDate() + day);
      gameDate.setHours(19 + (day % 4), 0 + (day % 4) * 15, 0, 0); // Stagger times
      
      const dayRounds = fullSchedule[day];
      
      for (const [homeIndex, awayIndex] of dayRounds) {
        const homeTeam = divisionTeams[homeIndex];
        const awayTeam = divisionTeams[awayIndex];
        
        await prisma.game.create({
          data: {
            homeTeamId: homeTeam.id,
            awayTeamId: awayTeam.id,
            matchType: 'LEAGUE',
            status: day < 3 ? 'COMPLETED' : 'SCHEDULED', // Mark first 3 days as completed
            gameDate: gameDate,
            // Add scores for completed games
            homeScore: day < 3 ? Math.floor(Math.random() * 15) + 10 : null,
            awayScore: day < 3 ? Math.floor(Math.random() * 15) + 10 : null,
            simulated: day < 3
          }
        });
        gamesCreated++;
      }
    }
    
    console.log(`✅ Created ${gamesCreated} games for 14-day double round-robin schedule`);
    
    // Step 6: Update team statistics based on completed games
    for (const team of divisionTeams) {
      const completedGames = await prisma.game.findMany({
        where: {
          OR: [
            { homeTeamId: team.id },
            { awayTeamId: team.id }
          ],
          status: 'COMPLETED'
        }
      });
      
      let wins = 0, losses = 0, draws = 0, points = 0;
      
      for (const game of completedGames) {
        const isHome = game.homeTeamId === team.id;
        const teamScore = isHome ? game.homeScore : game.awayScore;
        const opponentScore = isHome ? game.awayScore : game.homeScore;
        
        if (teamScore! > opponentScore!) {
          wins++;
          points += 3;
        } else if (teamScore! === opponentScore!) {
          draws++;
          points += 1;
        } else {
          losses++;
        }
      }
      
      await prisma.team.update({
        where: { id: team.id },
        data: { wins, losses, draws, points }
      });
    }
    
    console.log(`✅ Updated statistics for all teams based on completed games`);
    
    res.json({
      success: true,
      message: 'Division 7 Alpha schedule completely regenerated',
      details: {
        teamsProcessed: 8,
        gamesCreated: gamesCreated,
        completedDays: 3,
        scheduledDays: 11,
        totalDays: 14
      },
      teams: divisionTeams.map(t => t.name),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [ADMIN] Division 7 Alpha regeneration failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Fix team statistics using TeamStatisticsIntegrityService
router.post('/fix-team-stats/:teamName', async (req: Request, res: Response) => {
  try {
    const { teamName } = req.params;
    console.log(`🔧 [ADMIN] Fixing statistics for team: ${teamName}`);
    
    const { getPrismaClient } = await import('../database.js');
    const { TeamStatisticsIntegrityService } = await import('../services/enhancedStatisticsService.js');
    
    const prisma = await getPrismaClient();
    
    // Find team by name (case-insensitive search)
    const team = await prisma.team.findFirst({
      where: { name: { contains: teamName, mode: 'insensitive' } },
      select: {
        id: true,
        name: true,
        wins: true,
        losses: true,
        draws: true,
        points: true
      }
    });
    
    if (!team) {
      return res.status(404).json({
        success: false,
        error: `Team containing "${teamName}" not found`
      });
    }
    
    console.log('✅ [ADMIN] Found team:', team);
    
    // Run comprehensive statistics synchronization
    const result = await TeamStatisticsIntegrityService.syncTeamStatistics(team.id);
    
    console.log('✅ [ADMIN] Statistics synchronization completed for', result.teamName);
    
    res.json({
      success: true,
      message: `Team statistics fixed for ${result.teamName}`,
      result: {
        teamName: result.teamName,
        before: result.before,
        after: result.after,
        gamesProcessed: result.gamesProcessed,
        discrepancies: result.discrepanciesFound
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [ADMIN] Fix team stats failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// QUICK FIX: Division 7 Alpha regeneration without TeamMatchStats dependency
router.post('/quick-fix-division-7-alpha', async (req: Request, res: Response) => {
  try {
    console.log('🚀 [QUICK FIX] Starting Division 7 Alpha schedule regeneration...');
    
    const { getPrismaClient } = await import('../database.js');
    const prisma = await getPrismaClient();
    
    // Step 1: Get all Division 7 Alpha teams
    const divisionTeams = await prisma.team.findMany({
      where: { division: 7, subdivision: 'alpha' },
      select: { id: true, name: true },
      orderBy: { id: 'asc' }
    });
    
    if (divisionTeams.length !== 8) {
      return res.status(400).json({
        success: false,
        error: `Expected exactly 8 teams in Division 7 Alpha, found ${divisionTeams.length}`,
        teams: divisionTeams.map(t => t.name)
      });
    }
    
    console.log(`🎯 Division 7 Alpha teams:`, divisionTeams.map(t => t.name));
    
    // Step 2: Delete ALL existing games for these teams (simplified - no match stats)
    const teamIds = divisionTeams.map(t => t.id);
    const deletedGames = await prisma.game.deleteMany({
      where: {
        OR: [
          { homeTeamId: { in: teamIds } },
          { awayTeamId: { in: teamIds } }
        ]
      }
    });
    console.log(`🧹 Deleted ${deletedGames.count} existing games`);
    
    // Step 3: Reset all team statistics  
    await prisma.team.updateMany({
      where: { division: 7, subdivision: 'alpha' },
      data: { wins: 0, losses: 0, draws: 0, points: 0 }
    });
    console.log(`✅ Reset statistics for all 8 teams`);
    
    // Step 4: Use enterprise league management system
    const { LeagueManagementService } = await import('../services/leagueManagementSystem.js');
    const result = await LeagueManagementService.regenerateLeagueSchedule(7, 'alpha', {
      scheduleType: 'FULL',
      currentDay: 1
    });
    
    console.log(`✅ Enterprise system generated ${result.gamesGenerated} games`);
    
    res.json({
      success: true,
      message: 'Division 7 Alpha schedule completely regenerated using enterprise system',
      details: {
        teamsProcessed: result.teamsProcessed,
        gamesGenerated: result.gamesGenerated,
        scheduleType: result.scheduleType,
        gameDays: result.gameDays,
        statisticsUpdated: result.statisticsUpdated,
        auditId: result.auditId
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [QUICK FIX] Division 7 Alpha regeneration failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// COMPREHENSIVE TEAM STATISTICS SYNCHRONIZATION
// Fixes systemic data integrity issues across all teams
router.post('/sync-all-team-statistics', async (req: Request, res: Response) => {
  console.log('🚀 [ADMIN] Starting comprehensive team statistics synchronization...');
  
  try {
    const { syncAllTeamStatistics } = await import('../scripts/syncAllTeamStatistics.js');
    const result = await syncAllTeamStatistics();
    
    console.log('✅ [ADMIN] Team statistics synchronization completed successfully!');
    
    res.json({
      success: true,
      message: 'Team statistics synchronized successfully',
      data: {
        totalTeams: result.totalTeams,
        discrepanciesFound: result.discrepanciesFound,
        updatesApplied: result.updatesApplied
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [ADMIN] Team statistics synchronization failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;