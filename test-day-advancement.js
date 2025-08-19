// Direct test of day advancement logic using the database
import { getPrismaClient } from './server/database.js';

console.log('🔧 DIRECT DAY ADVANCEMENT TEST...');

async function testDayAdvancement() {
  try {
    const prisma = await getPrismaClient();
    
    console.log('1. Getting current season...');
    const season = await prisma.season.findFirst({
      orderBy: { startDate: 'desc' }
    });
    
    console.log('2. Current season data:', {
      id: season?.id,
      currentDay: season?.currentDay,
      startDate: season?.startDate?.toISOString()
    });
    
    if (!season) {
      console.log('❌ No season found');
      return;
    }
    
    console.log('3. Calculating correct day...');
    const seasonStart = new Date(season.startDate);
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24));
    const correctDay = Math.min((daysSinceStart % 17) + 1, 17);
    
    console.log('Day calculation:', {
      seasonStart: seasonStart.toISOString(),
      now: now.toISOString(),
      daysSinceStart,
      currentDayInDB: season.currentDay,
      correctDay,
      needsUpdate: correctDay !== season.currentDay
    });
    
    if (correctDay !== season.currentDay) {
      console.log(`4. Updating day from ${season.currentDay} to ${correctDay}...`);
      
      const updated = await prisma.season.update({
        where: { id: season.id },
        data: { currentDay: correctDay }
      });
      
      console.log('✅ Updated successfully:', {
        id: updated.id,
        oldDay: season.currentDay,
        newDay: updated.currentDay
      });
    } else {
      console.log('✅ Day is already correct');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

testDayAdvancement();