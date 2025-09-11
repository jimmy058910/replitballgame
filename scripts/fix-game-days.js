/**
 * Quick fix script to assign proper gameDay values to games based on their dates
 * This will distribute the games across the correct days instead of lumping them all in Day 5
 */

import { PrismaClient } from '../prisma/generated/client/index.js';

const prisma = new PrismaClient();

async function fixGameDays() {
  console.log('🏀 Starting gameDay fix...');
  
  try {
    // Get current season
    const currentSeason = await prisma.season.findFirst({
      orderBy: { startDate: 'desc' }
    });
    
    if (!currentSeason) {
      console.error('❌ No active season found');
      return;
    }
    
    console.log(`✅ Found current season: ${currentSeason.id}`);
    console.log(`📅 Season starts: ${currentSeason.startDate.toISOString()}`);
    
    // Get all games with null or incorrect gameDay
    const gamesNeedingFix = await prisma.game.findMany({
      where: {
        OR: [
          { gameDay: null },
          { gameDay: { gt: 14 } } // Any games incorrectly assigned to days > 14
        ],
        matchType: 'LEAGUE'
      },
      orderBy: { gameDate: 'asc' }
    });
    
    console.log(`📊 Found ${gamesNeedingFix.length} games needing gameDay fix`);
    
    if (gamesNeedingFix.length === 0) {
      console.log('✅ All games already have correct gameDay assignments');
      return;
    }
    
    const seasonStart = new Date(currentSeason.startDate);
    let updatedCount = 0;
    
    for (const game of gamesNeedingFix) {
      const gameDate = new Date(game.gameDate);
      
      // Calculate days difference from season start
      const daysDiff = Math.floor((gameDate.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24));
      const correctGameDay = Math.max(1, Math.min(14, daysDiff + 1)); // Ensure day is between 1-14
      
      console.log(`🔧 Game ${game.id}: ${gameDate.toISOString().split('T')[0]} -> Day ${correctGameDay}`);
      
      await prisma.game.update({
        where: { id: game.id },
        data: { gameDay: correctGameDay }
      });
      
      updatedCount++;
    }
    
    console.log(`\n🎯 Fixed ${updatedCount} games!`);
    
    // Verify the fix by showing day distribution
    const dayDistribution = await prisma.game.groupBy({
      by: ['gameDay'],
      where: { 
        matchType: 'LEAGUE',
        gameDay: { not: null }
      },
      _count: { id: true }
    });
    
    console.log('\n📊 Games per day after fix:');
    dayDistribution
      .sort((a, b) => (a.gameDay || 0) - (b.gameDay || 0))
      .forEach(day => {
        console.log(`  Day ${day.gameDay}: ${day._count.id} games`);
      });
    
  } catch (error) {
    console.error('❌ Error fixing game days:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixGameDays();