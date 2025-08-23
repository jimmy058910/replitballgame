import { Router } from 'express';
import { getPrismaClient } from '../database.js';
import { requireAuth } from '../middleware/firebaseAuth.js';

const router = Router();

/**
 * Fix Day 7 Standings - Retroactive Update
 * 
 * This endpoint manually updates team standings for the completed Day 7 games
 * that occurred before the standings update system was properly in place.
 */
router.post('/fix-day7-standings', requireAuth, async (req, res) => {
  console.log('🔧 FIXING DAY 7 STANDINGS - Retroactive Update API');
  console.log('===============================================');
  
  try {
    const prisma = await getPrismaClient();
    
    // Based on completed Day 7 games from the screenshot:
    // Game 1: Desert Hawks 2025 (3) vs Oakland Cougars (0) - Desert Hawks win
    // Game 2: Thunder Eagles (4) vs Fire Hawks 509 (0) - Thunder Eagles win
    
    const completedGames = [
      {
        winnerName: 'Desert Hawks 2025',
        loserName: 'Oakland Cougars',
        winnerScore: 3,
        loserScore: 0
      },
      {
        winnerName: 'Thunder Eagles',
        loserName: 'Fire Hawks 509',
        winnerScore: 4,
        loserScore: 0
      }
    ];
    
    console.log(`📋 Processing ${completedGames.length} completed Day 7 games...`);
    
    const results = [];
    
    for (const game of completedGames) {
      console.log(`\n🏈 Processing: ${game.winnerName} (${game.winnerScore}) vs ${game.loserName} (${game.loserScore})`);
      
      // Find winner team
      const winnerTeam = await prisma.team.findFirst({
        where: { name: game.winnerName }
      });
      
      // Find loser team
      const loserTeam = await prisma.team.findFirst({
        where: { name: game.loserName }
      });
      
      if (!winnerTeam) {
        console.error(`❌ Winner team not found: ${game.winnerName}`);
        results.push({ error: `Winner team not found: ${game.winnerName}` });
        continue;
      }
      
      if (!loserTeam) {
        console.error(`❌ Loser team not found: ${game.loserName}`);
        results.push({ error: `Loser team not found: ${game.loserName}` });
        continue;
      }
      
      console.log(`✅ Found teams - Winner ID: ${winnerTeam.id}, Loser ID: ${loserTeam.id}`);
      
      // Check if this update has already been applied (avoid double-counting)
      if ((winnerTeam.wins && winnerTeam.wins > 0) || (winnerTeam.losses && winnerTeam.losses > 0)) {
        console.log(`⚠️ ${game.winnerName} already has W=${winnerTeam.wins || 0}, L=${winnerTeam.losses || 0} - skipping to avoid double-counting`);
        results.push({ 
          skipped: true, 
          reason: 'Already has wins/losses - avoiding double update',
          winner: game.winnerName,
          loser: game.loserName
        });
        continue;
      }
      
      // Update winner: +1 W, +3 Pts
      const winnerUpdate = await prisma.team.update({
        where: { id: winnerTeam.id },
        data: {
          wins: { increment: 1 },
          points: { increment: 3 }
        }
      });
      
      // Update loser: +1 L
      const loserUpdate = await prisma.team.update({
        where: { id: loserTeam.id },
        data: {
          losses: { increment: 1 }
        }
      });
      
      console.log(`🏆 ${game.winnerName}: W=${winnerUpdate.wins || 0}, L=${winnerUpdate.losses || 0}, Pts=${winnerUpdate.points || 0}`);
      console.log(`😞 ${game.loserName}: W=${loserUpdate.wins || 0}, L=${loserUpdate.losses || 0}, Pts=${loserUpdate.points || 0}`);
      
      results.push({
        success: true,
        winner: {
          name: game.winnerName,
          wins: winnerUpdate.wins || 0,
          losses: winnerUpdate.losses || 0,
          points: winnerUpdate.points || 0
        },
        loser: {
          name: game.loserName,
          wins: loserUpdate.wins || 0,
          losses: loserUpdate.losses || 0,
          points: loserUpdate.points || 0
        }
      });
    }
    
    console.log('\n✅ Day 7 standings fix completed!');
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
    
    console.log('\n📊 UPDATED DIVISION 8 ALPHA STANDINGS:');
    console.log('=====================================');
    alphaTeams.forEach((team, index) => {
      const gamesPlayed = (team.wins || 0) + (team.losses || 0);
      console.log(`${index + 1}. ${team.name}: GP=${gamesPlayed}, W=${team.wins || 0}, L=${team.losses || 0}, Pts=${team.points || 0}`);
    });
    
    res.json({
      success: true,
      message: 'Day 7 standings fix completed successfully',
      results,
      updatedStandings: alphaTeams
    });
    
  } catch (error) {
    console.error('❌ Error fixing Day 7 standings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fix Day 7 standings',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;