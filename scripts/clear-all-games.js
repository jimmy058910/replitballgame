// Clear all games and reset for testing
import { getPrismaClient } from '../server/database.js';

async function clearAllGames() {
  console.log('🧹 Starting database cleanup...');
  
  const prisma = await getPrismaClient();
  
  try {
    // Delete all games regardless of type
    const deletedGames = await prisma.game.deleteMany({});
    console.log(`✅ Deleted ${deletedGames.count} games`);
    
    // Clear team statistics
    await prisma.team.updateMany({
      data: {
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
        goalsFor: 0,
        goalsAgainst: 0
      }
    });
    console.log(`✅ Reset team statistics`);
    
    // Update season to Day 1
    await prisma.season.updateMany({
      data: {
        currentDay: 1
      }
    });
    console.log(`✅ Reset season to Day 1`);
    
    console.log('🎉 Database cleanup complete!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearAllGames().catch(console.error);