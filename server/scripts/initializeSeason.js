// Initialize Season Script - Creates the first season for automation system
import { getPrismaClient } from '../database.ts';

const prisma = getPrismaClient();

async function initializeSeason() {
  try {
    console.log('🔧 Initializing Season 1...');
    
    // Check if any season already exists
    const existingSeasons = await prisma.season.findMany();
    
    if (existingSeasons.length > 0) {
      console.log('✅ Season already exists:', existingSeasons[0]);
      return existingSeasons[0];
    }
    
    // Create Season 1 starting today
    const today = new Date();
    const seasonEndDate = new Date(today);
    seasonEndDate.setDate(today.getDate() + 17); // 17-day season cycle
    
    const newSeason = await prisma.season.create({
      data: {
        id: `season-1-${Date.now()}`,
        seasonNumber: 1,
        phase: 'REGULAR_SEASON',
        startDate: today,
        endDate: seasonEndDate,
        currentDay: 1, // Start at Day 1
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Season 1 created successfully:', newSeason);
    return newSeason;
    
  } catch (error) {
    console.error('❌ Error initializing season:', error);
    throw error;
  }
}

// Run the initialization
initializeSeason()
  .then(() => {
    console.log('🎉 Season initialization complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Season initialization failed:', error);
    process.exit(1);
  });