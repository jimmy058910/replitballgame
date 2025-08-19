// Manual day advancement to fix the stalled automation
import { getPrismaClient } from './server/database.js';

async function fixDayProgression() {
  try {
    console.log('🔧 MANUAL DAY ADVANCEMENT: Fixing stalled progression...');
    
    const prisma = await getPrismaClient();
    
    // Get current season
    const currentSeason = await prisma.season.findFirst({
      orderBy: { startDate: 'desc' }
    });
    
    console.log('Current season data:', {
      id: currentSeason?.id,
      seasonNumber: currentSeason?.seasonNumber,
      currentDay: currentSeason?.currentDay,
      startDate: currentSeason?.startDate?.toISOString(),
      phase: currentSeason?.phase
    });
    
    if (!currentSeason) {
      console.log('❌ No season found');
      return;
    }
    
    // Calculate what day we should actually be on
    const seasonStart = new Date(currentSeason.startDate);
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24));
    const correctDay = Math.min((daysSinceStart % 17) + 1, 17); // Cap at 17
    
    console.log('Day calculation:', {
      seasonStart: seasonStart.toISOString(),
      now: now.toISOString(),
      daysSinceStart,
      currentDayInDB: currentSeason.currentDay,
      correctDay,
      needsAdvancement: correctDay > currentSeason.currentDay
    });
    
    if (correctDay > currentSeason.currentDay) {
      console.log(`🚀 ADVANCING: Day ${currentSeason.currentDay} → Day ${correctDay}`);
      
      // Update the season day
      await prisma.season.update({
        where: { id: currentSeason.id },
        data: { currentDay: correctDay }
      });
      
      console.log('✅ Season day updated successfully');
      
      // Verify the update
      const updatedSeason = await prisma.season.findUnique({
        where: { id: currentSeason.id }
      });
      
      console.log('Verification:', {
        previousDay: currentSeason.currentDay,
        newDay: updatedSeason?.currentDay,
        success: updatedSeason?.currentDay === correctDay
      });
    } else {
      console.log('✅ Season day is already correct - no advancement needed');
    }
    
  } catch (error) {
    console.error('❌ Error fixing day progression:', error);
  } finally {
    process.exit(0);
  }
}

fixDayProgression();