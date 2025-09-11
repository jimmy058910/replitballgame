// Direct database fix - update currentDay to 7

import { getPrismaClient } from '../server/database.ts';

async function directFix() {
  try {
    console.log('🚀 DIRECT FIX: Updating currentDay to 7');
    
    const prisma = await getPrismaClient();
    
    // Update all seasons to have currentDay = 7
    const result = await prisma.season.updateMany({
      data: { currentDay: 7 }
    });
    
    console.log(`✅ Updated ${result.count} season(s) to Day 7`);
    
    // Verify the update
    const updated = await prisma.season.findFirst({
      orderBy: { startDate: 'desc' }
    });
    
    console.log(`🔍 Verification: currentDay is now ${updated.currentDay}`);
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

directFix();