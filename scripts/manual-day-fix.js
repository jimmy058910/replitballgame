// Manual day fix by directly updating the database

import { getPrismaClient } from '../server/database.ts';

async function fixCurrentDay() {
  try {
    console.log('🔧 Manual Day Fix Script');
    console.log('========================');
    
    const prisma = await getPrismaClient();
    
    // Get current season
    const currentSeason = await prisma.season.findFirst({
      orderBy: { startDate: 'desc' }
    });
    
    if (!currentSeason) {
      console.log('❌ No season found');
      return;
    }
    
    console.log('\n📊 Current Season State:');
    console.log(`- ID: ${currentSeason.id}`);
    console.log(`- Start Date: ${currentSeason.startDate.toISOString()}`);
    console.log(`- Current Day (DB): ${currentSeason.currentDay}`);
    
    // Calculate what the day should be (same logic as our fix)
    const seasonStartDate = new Date(currentSeason.startDate);
    const now = new Date();
    
    // Eastern Time conversion
    const easternNow = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const easternSeasonStart = new Date(seasonStartDate.toLocaleString("en-US", { timeZone: "America/New_York" }));
    
    // If it's before 3AM EDT today, we're still in the previous day
    const currentHour = easternNow.getHours();
    const adjustedNow = new Date(easternNow);
    
    if (currentHour < 3) {
      adjustedNow.setDate(adjustedNow.getDate() - 1);
    }
    
    // Calculate days since season start, accounting for 3AM EDT boundaries
    const adjustedSeasonStart = new Date(easternSeasonStart);
    adjustedSeasonStart.setHours(3, 0, 0, 0);
    
    const adjustedNowAtThreeAM = new Date(adjustedNow);
    adjustedNowAtThreeAM.setHours(3, 0, 0, 0);
    
    const timeDiff = adjustedNowAtThreeAM.getTime() - adjustedSeasonStart.getTime();
    const daysSinceStart = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    
    const correctCurrentDay = (daysSinceStart % 17) + 1;
    const correctedDay = Math.max(1, Math.min(17, correctCurrentDay));
    
    console.log('\n🧮 Calculation Results:');
    console.log(`- Eastern Time: ${easternNow.toLocaleString()}`);
    console.log(`- Current Hour: ${currentHour} (Before 3AM: ${currentHour < 3})`);
    console.log(`- Days Since Start: ${daysSinceStart}`);
    console.log(`- Calculated Day: ${correctedDay}`);
    
    if (currentSeason.currentDay === correctedDay) {
      console.log('\n✅ Day is already correct! No update needed.');
    } else {
      console.log(`\n🔧 Updating database: ${currentSeason.currentDay} → ${correctedDay}`);
      
      const updatedSeason = await prisma.season.update({
        where: { id: currentSeason.id },
        data: { currentDay: correctedDay }
      });
      
      console.log('✅ Database updated successfully!');
      console.log(`- New currentDay: ${updatedSeason.currentDay}`);
    }
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixCurrentDay();