import { PrismaClient } from '@prisma/client';

console.log('🧹 Starting direct database cleanup...');

const prisma = new PrismaClient();

async function clearAndReset() {
  try {
    console.log('🗑️  Deleting all games...');
    const deletedGames = await prisma.game.deleteMany({});
    console.log(`✅ Deleted ${deletedGames.count} games`);
    
    console.log('📊 Resetting all team statistics...');
    const updatedTeams = await prisma.team.updateMany({
      data: {
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
        goalsFor: 0,
        goalsAgainst: 0
      }
    });
    console.log(`✅ Reset ${updatedTeams.count} teams`);
    
    console.log('📅 Resetting season to Day 1...');
    const updatedSeasons = await prisma.season.updateMany({
      data: {
        currentDay: 1
      }
    });
    console.log(`✅ Reset ${updatedSeasons.count} seasons`);
    
    console.log('🎉 Database cleanup complete! Ready for fresh schedule generation.');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

clearAndReset();