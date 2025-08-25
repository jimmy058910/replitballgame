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
        draws: 0,
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

export default router;