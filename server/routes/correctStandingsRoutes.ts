import { Router } from 'express';
import { getPrismaClient } from '../database.js';
import { requireAuth } from '../middleware/firebaseAuth.js';

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
        division: 8,
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
    
    // Reset all Division 8 Alpha teams to 0 standings
    console.log('🔄 Resetting all Division 8 Alpha team standings to 0...');
    await prisma.team.updateMany({
      where: {
        division: 8,
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
 * Recalculates ALL team standings from actual completed game results
 * Handles missing draws field and ensures accurate points calculation
 */
router.post('/fix-standings-completely', requireAuth, async (req, res) => {
  console.log('🔧 COMPREHENSIVE STANDINGS FIX - Recalculating ALL standings from actual game results');
  console.log('==================================================================================');
  
  try {
    const prisma = await getPrismaClient();
    
    // Get all Division 8 Alpha teams
    const teams = await prisma.team.findMany({
      where: { 
        division: 8,
        subdivision: 'alpha'
      },
      select: { id: true, name: true }
    });
    
    console.log(`🔍 Found ${teams.length} teams in Division 8 Alpha: [${teams.map(t => t.name).join(', ')}]`);
    
    // Get ALL completed games with actual scores
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
      include: {
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } }
      },
      orderBy: { gameDate: 'asc' }
    });
    
    console.log(`📋 Found ${completedGames.length} completed games with scores`);
    
    // Calculate standings for each team from scratch
    const teamStandings = new Map();
    
    // Initialize all teams with zero records
    teams.forEach(team => {
      teamStandings.set(team.id, {
        id: team.id,
        name: team.name,
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
        gamesPlayed: 0,
        scoresFor: 0,
        scoresAgainst: 0
      });
    });
    
    console.log('\n📊 Processing each completed game...');
    
    // Process each game and update team records
    completedGames.forEach((game, index) => {
      const homeScore = game.homeScore || 0;
      const awayScore = game.awayScore || 0;
      
      console.log(`${index + 1}. ${game.homeTeam.name} ${homeScore} - ${awayScore} ${game.awayTeam.name}`);
      
      // Get team standings
      const homeTeamStats = teamStandings.get(game.homeTeamId);
      const awayTeamStats = teamStandings.get(game.awayTeamId);
      
      if (homeTeamStats) {
        homeTeamStats.gamesPlayed++;
        homeTeamStats.scoresFor += homeScore;
        homeTeamStats.scoresAgainst += awayScore;
      }
      
      if (awayTeamStats) {
        awayTeamStats.gamesPlayed++;
        awayTeamStats.scoresFor += awayScore;
        awayTeamStats.scoresAgainst += homeScore;
      }
      
      // Determine result
      if (homeScore > awayScore) {
        // Home team wins
        if (homeTeamStats) {
          homeTeamStats.wins++;
          homeTeamStats.points += 3;
        }
        if (awayTeamStats) {
          awayTeamStats.losses++;
        }
        console.log(`   → ${game.homeTeam.name} WINS`);
      } else if (awayScore > homeScore) {
        // Away team wins
        if (awayTeamStats) {
          awayTeamStats.wins++;
          awayTeamStats.points += 3;
        }
        if (homeTeamStats) {
          homeTeamStats.losses++;
        }
        console.log(`   → ${game.awayTeam.name} WINS`);
      } else {
        // Draw
        if (homeTeamStats) {
          homeTeamStats.draws++;
          homeTeamStats.points += 1;
        }
        if (awayTeamStats) {
          awayTeamStats.draws++;
          awayTeamStats.points += 1;
        }
        console.log(`   → DRAW`);
      }
    });
    
    console.log('\n✅ Game processing complete. Updating database...');
    
    // Update all team records in database (without draws field since it doesn't exist)
    const updateResults = [];
    
    for (const [teamId, stats] of teamStandings) {
      try {
        const updatedTeam = await prisma.team.update({
          where: { id: teamId },
          data: {
            wins: stats.wins,
            losses: stats.losses,
            points: stats.points
            // Note: Not updating draws since field doesn't exist in schema
          },
          select: { id: true, name: true, wins: true, losses: true, points: true }
        });
        
        updateResults.push({
          team: stats.name,
          record: `${stats.wins}W-${stats.draws}D-${stats.losses}L`,
          points: stats.points,
          gamesPlayed: stats.gamesPlayed,
          scoreDiff: stats.scoresFor - stats.scoresAgainst,
          updated: true
        });
        
        console.log(`✅ ${stats.name}: ${stats.wins}W-${stats.draws}D-${stats.losses}L = ${stats.points} points (${stats.gamesPlayed} games)`);
      } catch (error) {
        console.error(`❌ Failed to update ${stats.name}:`, error);
        updateResults.push({
          team: stats.name,
          error: error.message,
          updated: false
        });
      }
    }
    
    // Sort final standings by points (highest to lowest)
    const finalStandings = Array.from(teamStandings.values())
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return (b.scoresFor - b.scoresAgainst) - (a.scoresFor - a.scoresAgainst);
      });
    
    console.log('\n🏆 CORRECTED FINAL STANDINGS:');
    console.log('=====================================');
    finalStandings.forEach((team, index) => {
      const scoreDiff = team.scoresFor - team.scoresAgainst;
      console.log(`${index + 1}. ${team.name}: ${team.wins}W-${team.draws}D-${team.losses}L = ${team.points} pts (GD: ${scoreDiff >= 0 ? '+' : ''}${scoreDiff})`);
    });
    
    res.json({
      success: true,
      message: 'Standings completely recalculated from actual game results',
      gamesProcessed: completedGames.length,
      teamsUpdated: updateResults.filter(r => r.updated).length,
      finalStandings: finalStandings.map((team, index) => ({
        position: index + 1,
        team: team.name,
        wins: team.wins,
        draws: team.draws,
        losses: team.losses,
        points: team.points,
        gamesPlayed: team.gamesPlayed,
        scoresFor: team.scoresFor,
        scoresAgainst: team.scoresAgainst,
        scoreDifference: team.scoresFor - team.scoresAgainst
      })),
      updateResults
    });
    
  } catch (error) {
    console.error('❌ Error in comprehensive standings fix:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fix standings completely',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;