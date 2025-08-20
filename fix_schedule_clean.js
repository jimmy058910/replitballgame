import { getPrismaClient } from './server/database.js';

async function fixSchedule() {
  const prisma = await getPrismaClient();

  try {
    console.log('🧹 Clearing duplicate live games...');
    
    // Get current live games count
    const liveGames = await prisma.game.findMany({
      where: { status: 'LIVE' },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } }
      }
    });
    
    console.log(`Found ${liveGames.length} live games:`);
    liveGames.forEach((game, i) => {
      console.log(`${i+1}. ${game.homeTeam.name} vs ${game.awayTeam.name} (${game.status})`);
    });
    
    // Clear ALL games for fresh schedule
    const deletedCount = await prisma.game.deleteMany({});
    console.log(`✅ Deleted ${deletedCount.count} total games`);
    
    // Reset team standings
    const teamReset = await prisma.team.updateMany({
      data: {
        wins: 0,
        losses: 0,
        points: 0
      }
    });
    console.log(`✅ Reset ${teamReset.count} team standings`);
    
    console.log('🎉 Database cleanup complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixSchedule();
