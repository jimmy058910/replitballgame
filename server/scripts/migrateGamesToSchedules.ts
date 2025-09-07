/**
 * Migration script to update existing games with scheduleId
 * This ensures all games are properly linked to their division-subdivision schedule
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateGamesToSchedules() {
  console.log('🚀 Starting games to schedules migration...');
  
  try {
    // Step 1: Get current season
    const currentSeason = await prisma.season.findFirst({
      orderBy: { startDate: 'desc' }
    });
    
    if (!currentSeason) {
      console.error('❌ No active season found');
      return;
    }
    
    console.log(`✅ Found current season: ${currentSeason.id}`);
    
    // Step 2: Get all games without scheduleId
    const gamesWithoutSchedule = await prisma.game.findMany({
      where: {
        scheduleId: null,
        matchType: { in: ['LEAGUE', 'PLAYOFF'] }
      },
      include: {
        homeTeam: true,
        awayTeam: true
      }
    });
    
    console.log(`📊 Found ${gamesWithoutSchedule.length} games without scheduleId`);
    
    // Step 3: Group games by division and subdivision
    const gamesByDivisionSubdivision = new Map<string, any[]>();
    
    for (const game of gamesWithoutSchedule) {
      // Determine division and subdivision from team data
      const division = game.homeTeam.division;
      const subdivision = game.homeTeam.subdivision || 'alpha';
      const key = `${division}-${subdivision}`;
      
      if (!gamesByDivisionSubdivision.has(key)) {
        gamesByDivisionSubdivision.set(key, []);
      }
      
      gamesByDivisionSubdivision.get(key)!.push(game);
    }
    
    console.log(`📁 Games grouped into ${gamesByDivisionSubdivision.size} division-subdivision combinations`);
    
    // Step 4: Create schedules and update games
    for (const [key, games] of gamesByDivisionSubdivision) {
      const [divisionStr, subdivision] = key.split('-');
      const division = parseInt(divisionStr);
      
      console.log(`\n🔧 Processing Division ${division}-${subdivision} with ${games.length} games...`);
      
      // Find or create schedule
      let schedule = await prisma.schedule.findUnique({
        where: {
          seasonId_division_subdivision: {
            seasonId: currentSeason.id,
            division: division,
            subdivision: subdivision
          }
        }
      });
      
      if (!schedule) {
        schedule = await prisma.schedule.create({
          data: {
            seasonId: currentSeason.id,
            division: division,
            subdivision: subdivision,
            isActive: true
          }
        });
        console.log(`✨ Created new schedule with ID: ${schedule.id}`);
      } else {
        console.log(`♻️ Using existing schedule with ID: ${schedule.id}`);
      }
      
      // Update all games with this scheduleId
      const gameIds = games.map(g => g.id);
      
      // Calculate gameDay based on gameDate
      const baseDate = new Date("2025-08-20");
      
      for (const game of games) {
        const gameDate = new Date(game.gameDate);
        const diffTime = Math.abs(gameDate.getTime() - baseDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const gameDay = diffDays + 1; // Day 1 is the base date
        
        await prisma.game.update({
          where: { id: game.id },
          data: {
            scheduleId: schedule.id,
            seasonId: currentSeason.id,
            subdivision: subdivision,
            gameDay: gameDay
          }
        });
      }
      
      console.log(`✅ Updated ${games.length} games with scheduleId: ${schedule.id}`);
    }
    
    // Step 5: Verify migration
    const remainingGamesWithoutSchedule = await prisma.game.count({
      where: {
        scheduleId: null,
        matchType: { in: ['LEAGUE', 'PLAYOFF'] }
      }
    });
    
    console.log(`\n🎯 Migration complete!`);
    console.log(`📊 Remaining games without scheduleId: ${remainingGamesWithoutSchedule}`);
    
    // Step 6: Show schedule summary
    const schedules = await prisma.schedule.findMany({
      where: { seasonId: currentSeason.id },
      include: {
        _count: {
          select: { games: true }
        }
      }
    });
    
    console.log(`\n📋 Schedule Summary:`);
    for (const schedule of schedules) {
      console.log(`  Division ${schedule.division}-${schedule.subdivision}: ${schedule._count.games} games`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateGamesToSchedules()
  .then(() => console.log('✨ Migration script completed'))
  .catch((error) => console.error('💥 Migration script failed:', error));