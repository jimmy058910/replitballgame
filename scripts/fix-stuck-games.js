/**
 * Fix Stuck Games Script
 * Finds games in IN_PROGRESS status and completes them with realistic scores
 */

import { PrismaClient } from '../prisma/generated/client/index.js';

async function fixStuckGames() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Looking for games stuck in IN_PROGRESS status...');
    
    // Find all games in IN_PROGRESS status
    const stuckGames = await prisma.game.findMany({
      where: {
        status: 'IN_PROGRESS'
      },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } }
      }
    });
    
    if (stuckGames.length === 0) {
      console.log('✅ No stuck games found!');
      return;
    }
    
    console.log(`🎮 Found ${stuckGames.length} stuck games. Fixing them now...`);
    
    for (const game of stuckGames) {
      // Generate realistic dome ball scores
      const homeScore = Math.floor(Math.random() * 26) + 10; // 10-35
      const awayScore = Math.floor(Math.random() * 24) + 8;   // 8-31
      
      await prisma.game.update({
        where: { id: game.id },
        data: {
          status: 'COMPLETED',
          homeScore: homeScore,
          awayScore: awayScore,
          simulated: true
        }
      });
      
      console.log(`✅ Fixed: ${game.homeTeam.name} ${homeScore}-${awayScore} ${game.awayTeam.name} (Day ${game.gameDay})`);
    }
    
    console.log(`🏆 Successfully fixed ${stuckGames.length} stuck games!`);
    
  } catch (error) {
    console.error('❌ Error fixing stuck games:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixStuckGames();