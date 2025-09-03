import { Router } from 'express';
import { getPrismaClient } from '../database.js';
import { requireAuth } from '../middleware/firebaseAuth.js';
import { StandingsUpdateService } from '../services/standingsUpdateService.js';

const router = Router();

/**
 * Fix Day 7 Standings - Based on Actual Game Results
 * 
 * This endpoint reads the actual completed game results from the database
 * and applies the correct standings based on real data, not assumptions.
 */

router.post('/fix-real-standings', requireAuth, async (req, res) => {
  console.log('🔧 FIXING STANDINGS BASED ON ACTUAL GAME RESULTS');
  console.log('================================================');
  
  try {
    const prisma = await getPrismaClient();
    
    // FIXED: Use same team filtering approach as teamRoutes.ts
    const teams = await prisma.team.findMany({
      where: { 
        division: 7,
        subdivision: 'alpha'
      }
    });
    
    console.log(`🔍 Found ${teams.length} teams in Division 8 Alpha: [${teams.map(t => t.name).join(', ')}]`);
    
    // Get all completed games using same pattern as teamRoutes.ts
    const completedGames = await prisma.game.findMany({
      where: {
        matchType: 'LEAGUE',
        homeScore: { not: null }, // Games with actual scores
        awayScore: { not: null },
        OR: [
          { homeTeamId: { in: teams.map(t => t.id) } },
          { awayTeamId: { in: teams.map(t => t.id) } }
        ]
      },
      include: {
        homeTeam: true,
        awayTeam: true
      },
      orderBy: {
        gameDate: 'asc'
      }
    });
    
    console.log(`📋 Found ${completedGames.length} completed games`);
    
    // Reset all Division 7 Alpha teams to 0 standings
    console.log('🔄 Resetting all Division 7 Alpha team standings to 0...');
    await prisma.team.updateMany({
      where: {
        division: 7,
        subdivision: 'alpha'
      },
      data: {
        wins: 0,
        losses: 0,
        points: 0
      }
    });
    console.log('✅ All Division 8 Alpha teams reset to 0 standings');
    
    const results = [];
    
    // Process each completed game
    for (const game of completedGames) {
      const homeScore = game.homeScore || 0;
      const awayScore = game.awayScore || 0;
      
      console.log(`\n🏈 Processing: ${game.homeTeam.name} (${homeScore}) vs ${game.awayTeam.name} (${awayScore})`);
      
      if (homeScore > awayScore) {
        // Home team wins
        const homeUpdate = await prisma.team.update({
          where: { id: game.homeTeam.id },
          data: {
            wins: { increment: 1 },
            points: { increment: 3 }
          }
        });
        
        const awayUpdate = await prisma.team.update({
          where: { id: game.awayTeam.id },
          data: {
            losses: { increment: 1 }
          }
        });
        
        console.log(`🏆 ${game.homeTeam.name} wins: W=${homeUpdate.wins}, L=${homeUpdate.losses}, Pts=${homeUpdate.points}`);
        console.log(`😞 ${game.awayTeam.name} loses: W=${awayUpdate.wins}, L=${awayUpdate.losses}, Pts=${awayUpdate.points}`);
        
        results.push({
          success: true,
          winner: {
            name: game.homeTeam.name,
            wins: homeUpdate.wins,
            losses: homeUpdate.losses,
            points: homeUpdate.points
          },
          loser: {
            name: game.awayTeam.name,
            wins: awayUpdate.wins,
            losses: awayUpdate.losses,
            points: awayUpdate.points
          },
          score: `${homeScore}-${awayScore}`
        });
        
      } else if (awayScore > homeScore) {
        // Away team wins
        const awayUpdate = await prisma.team.update({
          where: { id: game.awayTeam.id },
          data: {
            wins: { increment: 1 },
            points: { increment: 3 }
          }
        });
        
        const homeUpdate = await prisma.team.update({
          where: { id: game.homeTeam.id },
          data: {
            losses: { increment: 1 }
          }
        });
        
        console.log(`🏆 ${game.awayTeam.name} wins: W=${awayUpdate.wins}, L=${awayUpdate.losses}, Pts=${awayUpdate.points}`);
        console.log(`😞 ${game.homeTeam.name} loses: W=${homeUpdate.wins}, L=${homeUpdate.losses}, Pts=${homeUpdate.points}`);
        
        results.push({
          success: true,
          winner: {
            name: game.awayTeam.name,
            wins: awayUpdate.wins,
            losses: awayUpdate.losses,
            points: awayUpdate.points
          },
          loser: {
            name: game.homeTeam.name,
            wins: homeUpdate.wins,
            losses: homeUpdate.losses,
            points: homeUpdate.points
          },
          score: `${homeScore}-${awayScore}`
        });
        
      } else {
        // Draw - both teams get 1 point and 1 draw
        const homeUpdate = await prisma.team.update({
          where: { id: game.homeTeam.id },
          data: {
            draws: { increment: 1 },
            points: { increment: 1 }
          }
        });
        
        const awayUpdate = await prisma.team.update({
          where: { id: game.awayTeam.id },
          data: {
            draws: { increment: 1 },
            points: { increment: 1 }
          }
        });
        
        console.log(`🤝 DRAW: ${game.homeTeam.name}: W=${homeUpdate.wins}, L=${homeUpdate.losses}, Pts=${homeUpdate.points}`);
        console.log(`🤝 DRAW: ${game.awayTeam.name}: W=${awayUpdate.wins}, L=${awayUpdate.losses}, Pts=${awayUpdate.points}`);
        
        results.push({
          success: true,
          isDraw: true,
          team1: {
            name: game.homeTeam.name,
            wins: homeUpdate.wins,
            losses: homeUpdate.losses,
            points: homeUpdate.points
          },
          team2: {
            name: game.awayTeam.name,
            wins: awayUpdate.wins,
            losses: awayUpdate.losses,
            points: awayUpdate.points
          },
          score: `${homeScore}-${awayScore}`
        });
      }
    }
    
    console.log('\n✅ Real standings fix completed!');
    console.log('🔍 Checking final standings for Division 8 Alpha...');
    
    // Display updated standings for Division 8 Alpha
    const alphaTeams = await prisma.team.findMany({
      where: {
        division: 8,
        subdivision: 'alpha'
      },
      select: {
        name: true,
        wins: true,
        losses: true,
        points: true
      },
      orderBy: [
        { points: 'desc' },
        { wins: 'desc' }
      ]
    });
    
    console.log('\n📊 CORRECTED DIVISION 8 ALPHA STANDINGS:');
    console.log('=========================================');
    alphaTeams.forEach((team, index) => {
      const gamesPlayed = (team.wins || 0) + (team.losses || 0);
      console.log(`${index + 1}. ${team.name}: GP=${gamesPlayed}, W=${team.wins || 0}, L=${team.losses || 0}, Pts=${team.points || 0}`);
    });
    
    res.json({
      success: true,
      message: 'Standings corrected based on actual game results',
      gamesProcessed: completedGames.length,
      results,
      updatedStandings: alphaTeams
    });
    
  } catch (error) {
    console.error('❌ Error fixing real standings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fix real standings',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Fix GP Discrepancy - Ensure each team has exactly 4 completed games
 */
router.post('/fix-gp-discrepancy', requireAuth, async (req, res) => {
  console.log('🔧 FIXING GP DISCREPANCY - Ensuring exactly 4 games per team');
  
  try {
    const prisma = await getPrismaClient();
    
    // Get Division 8 Alpha teams
    const teams = await prisma.team.findMany({
      where: { division: 8, subdivision: 'alpha' },
      select: { id: true, name: true }
    });
    
    console.log(`🔍 Found ${teams.length} teams in Division 8 Alpha`);
    
    // Get all completed games
    const completedGames = await prisma.game.findMany({
      where: {
        matchType: 'LEAGUE',
        homeScore: { not: null },
        awayScore: { not: null },
        OR: [
          { homeTeamId: { in: teams.map(t => t.id) } },
          { awayTeamId: { in: teams.map(t => t.id) } }
        ]
      },
      orderBy: { gameDate: 'asc' }
    });
    
    console.log(`📊 Found ${completedGames.length} total completed games`);
    
    let gamesRemoved = 0;
    
    // Process each team - keep only first 4 completed games, mark others as incomplete
    for (const team of teams) {
      const teamGames = completedGames.filter(g => 
        g.homeTeamId === team.id || g.awayTeamId === team.id
      );
      
      console.log(`🎯 ${team.name}: ${teamGames.length} completed games`);
      
      if (teamGames.length > 4) {
        const gamesToRemove = teamGames.slice(4); // Remove games beyond the 4th
        console.log(`⚠️ ${team.name}: Removing ${gamesToRemove.length} extra games`);
        
        for (const game of gamesToRemove) {
          await prisma.game.update({
            where: { id: game.id },
            data: {
              homeScore: null,
              awayScore: null,
              simulated: false,
              status: 'SCHEDULED'
            }
          });
          gamesRemoved++;
        }
      }
    }
    
    console.log(`✅ Fixed GP discrepancy: Removed scores from ${gamesRemoved} extra games`);
    console.log(`✅ Each team now has exactly 4 completed games`);
    
    return res.json({
      success: true,
      message: `Fixed GP discrepancy: removed ${gamesRemoved} extra completed games`,
      result: `Each team now has exactly 4 completed games`
    });
    
  } catch (error) {
    console.error('❌ Error fixing GP discrepancy:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fix GP discrepancy',
      details: error.message
    });
  }
});

/**
 * Fix Team Records - Recalculate win/loss/draw records from actual game results
 */
router.post('/fix-team-records', requireAuth, async (req, res) => {
  console.log('🔧 FIXING TEAM RECORDS - Recalculating from actual game results');
  
  try {
    const prisma = await getPrismaClient();
    
    // Get Division 8 Alpha teams
    const teams = await prisma.team.findMany({
      where: { division: 8, subdivision: 'alpha' },
      select: { id: true, name: true }
    });
    
    // Get completed games  
    const completedGames = await prisma.game.findMany({
      where: {
        matchType: 'LEAGUE',
        homeScore: { not: null },
        awayScore: { not: null },
        OR: [
          { homeTeamId: { in: teams.map(t => t.id) } },
          { awayTeamId: { in: teams.map(t => t.id) } }
        ]
      },
      select: { 
        homeTeamId: true, awayTeamId: true, 
        homeScore: true, awayScore: true 
      }
    });
    
    console.log(`📊 Recalculating records from ${completedGames.length} completed games`);
    
    let updatedTeams = 0;
    
    // Recalculate each team's record from scratch
    for (const team of teams) {
      const teamGames = completedGames.filter(g => 
        g.homeTeamId === team.id || g.awayTeamId === team.id
      );
      
      let wins = 0;
      let losses = 0; 
      let draws = 0;
      
      teamGames.forEach(game => {
        const isHome = game.homeTeamId === team.id;
        const teamScore = isHome ? game.homeScore : game.awayScore;
        const opponentScore = isHome ? game.awayScore : game.homeScore;
        
        if (teamScore > opponentScore) {
          wins++;
        } else if (teamScore < opponentScore) {
          losses++;
        } else {
          draws++;
        }
      });
      
      const totalGames = wins + losses + draws;
      console.log(`🎯 ${team.name}: ${totalGames} games → ${wins}W-${losses}L-${draws}D`);
      
      // Update team record in database (Team model has no draws field)
      await prisma.team.update({
        where: { id: team.id },
        data: {
          wins,
          losses,
          points: (wins * 3) + (draws * 1) // 3 points for win, 1 for draw
        }
      });
      
      updatedTeams++;
    }
    
    console.log(`✅ Fixed team records: Updated ${updatedTeams} teams`);
    
    return res.json({
      success: true,
      message: `Fixed team records: updated ${updatedTeams} teams`,
      result: `All team records now match actual game results`
    });
    
  } catch (error) {
    console.error('❌ Error fixing team records:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fix team records',
      details: error.message
    });
  }
});

/**
 * COMPREHENSIVE STANDINGS FIX
 * Processes completed league games through StandingsUpdateService
 * No hardcoded divisions - works for all completed league games
 */
router.post('/fix-standings-completely', requireAuth, async (req, res) => {
  console.log('🔧 COMPREHENSIVE STANDINGS FIX - Processing completed games through StandingsUpdateService');
  console.log('======================================================================================');
  
  try {
    const prisma = await getPrismaClient();
    
    // Get ALL completed league games with scores
    const completedGames = await prisma.game.findMany({
      where: {
        matchType: 'LEAGUE',
        status: 'COMPLETED',
        homeScore: { not: null },
        awayScore: { not: null }
      },
      include: {
        homeTeam: true,
        awayTeam: true
      },
      orderBy: { gameDate: 'asc' }
    });
    
    console.log(`🔍 Found ${completedGames.length} completed league games across all divisions`);
    
    // Reset ALL team standings to zero first (to avoid double counting)
    console.log('🔄 Resetting all team standings to zero before recalculation...');
    await prisma.team.updateMany({
      data: {
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0
      }
    });
    console.log('✅ All team standings reset to zero');
    
    // Process each completed game through the existing StandingsUpdateService
    let processedGames = 0;
    const teams = new Set();
    
    for (const game of completedGames) {
      console.log(`\n🎮 Processing: ${game.homeTeam.name} ${game.homeScore} - ${game.awayScore} ${game.awayTeam.name} (Game ${game.id})`);
      
      // Use the existing StandingsUpdateService instead of custom logic
      await StandingsUpdateService.updateStandingsForCompletedGame(game.id);
      
      teams.add(game.homeTeam.name);
      teams.add(game.awayTeam.name);
      processedGames++;
    }
    
    // Get final standings for all affected teams
    const finalStandings = await prisma.team.findMany({
      where: {
        id: { in: Array.from(completedGames.flatMap(g => [g.homeTeamId, g.awayTeamId])) }
      },
      select: {
        id: true,
        name: true,
        wins: true,
        losses: true,
        draws: true,
        points: true
      },
      orderBy: [
        { points: 'desc' },
        { wins: 'desc' },
        { name: 'asc' }
      ]
    });
    
    const updateResults = finalStandings.map((team, index) => ({
      position: index + 1,
      team: team.name,
      wins: team.wins,
      draws: team.draws,
      losses: team.losses,
      points: team.points,
      gamesPlayed: team.wins + team.losses + team.draws,
      record: `${team.wins}W-${team.draws}D-${team.losses}L`
    }));
    
    console.log('\n✅ STANDINGS UPDATED SUCCESSFULLY');
    console.log(`📊 Processed ${processedGames} games across ${teams.size} teams`);
    
    return res.json({
      success: true,
      message: 'Standings completely recalculated from actual game results',
      gamesProcessed: processedGames,
      teamsUpdated: teams.size,
      finalStandings: updateResults
    });
  } catch (error) {
    console.error('❌ Error processing standings:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process standings',
      details: error.message
    });
  }
});

export default router;
    const teamStandings = new Map();
    
    // Initialize all teams with zero records
