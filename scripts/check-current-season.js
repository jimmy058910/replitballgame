import { getPrismaClient } from '../server/database.ts';

async function checkCurrentSeason() {
  try {
    console.log('🔍 Checking current season in database...');
    
    const prisma = await getPrismaClient();
    
    // Get current season
    const currentSeason = await prisma.season.findFirst({
      orderBy: { startDate: 'desc' }
    });
    
    console.log('📊 Current Season Data:');
    console.log(JSON.stringify(currentSeason, null, 2));
    
    if (currentSeason) {
      console.log(`\n📅 Season Summary:`);
      console.log(`- Season Number: ${currentSeason.seasonNumber}`);
      console.log(`- Current Day: ${currentSeason.currentDay}`);
      console.log(`- Phase: ${currentSeason.phase}`);
      console.log(`- Start Date: ${currentSeason.startDate}`);
      console.log(`- Created At: ${currentSeason.createdAt}`);
      
      // Calculate expected day based on start date
      const now = new Date();
      const startDate = new Date(currentSeason.startDate);
      const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const expectedDay = (daysSinceStart % 17) + 1;
      
      console.log(`\n🧮 Calculated Values:`);
      console.log(`- Days since season start: ${daysSinceStart}`);
      console.log(`- Expected current day: ${expectedDay}`);
      console.log(`- Database current day: ${currentSeason.currentDay}`);
      console.log(`- Discrepancy: ${currentSeason.currentDay - expectedDay} days`);
    } else {
      console.log('❌ No season found in database');
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error checking season:', error);
  }
}

checkCurrentSeason();