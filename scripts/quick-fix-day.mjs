// Quick fix - update currentDay to 7
import { PrismaClient } from '../prisma/generated/client/index.js';

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL
});

async function quickFix() {
  try {
    console.log('🚀 QUICK FIX: Updating currentDay to 7');
    
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
    console.log('🎉 Header should now show Day 7!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

quickFix();