#!/usr/bin/env node

/**
 * DIRECT SCHEDULE RESET - Bypasses server
 * Directly connects to database to reset Days 8-14 games
 */

async function directReset() {
  console.log('🔧 [DIRECT RESET] Starting direct database reset...');
  
  try {
    // Use environment variables from .env.local
    const fs = await import('fs');
    const path = await import('path');
    
    // Simple .env.local parser
    const envPath = path.default.join(process.cwd(), '.env.local');
    const envContent = fs.default.readFileSync(envPath, 'utf8');
    
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim().replace(/"/g, '');
      }
    });
    
    // Import Prisma client
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });
    
    await prisma.$connect();
    console.log('✅ [DIRECT RESET] Database connected');
    
    // Get current season
    const currentSeason = await prisma.season.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    
    if (!currentSeason) {
      console.error('❌ [DIRECT RESET] No season found');
      return;
    }
    
    console.log(`📊 [DIRECT RESET] Current season: ${currentSeason.seasonNumber}, Day: ${currentSeason.currentDay}`);
    
    // Find games to reset
    const gamesToReset = await prisma.game.findMany({
      where: {
        gameDay: { gte: 8, lte: 14 },
        status: 'COMPLETED',
        scheduleId: { not: null }
      },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } }
      }
    });
    
    console.log(`🎯 [DIRECT RESET] Found ${gamesToReset.length} games to reset`);
    
    if (gamesToReset.length === 0) {
      console.log('✅ [DIRECT RESET] No games need resetting');
      await prisma.$disconnect();
      return;
    }
    
    // Reset games
    const seasonStart = new Date(currentSeason.startDate);
    let resetCount = 0;
    
    for (const game of gamesToReset) {
      const gameDayDate = new Date(seasonStart);
      gameDayDate.setDate(seasonStart.getDate() + (game.gameDay - 1));
      
      if (game.gameDay === 8) {
        gameDayDate.setHours(15, 0, 0, 0); // Past time for re-simulation
      } else {
        gameDayDate.setHours(19, 0, 0, 0); // Future time
      }
      
      await prisma.game.update({
        where: { id: game.id },
        data: {
          status: 'SCHEDULED',
          homeScore: null,
          awayScore: null,
          gameDate: gameDayDate
        }
      });
      
      console.log(`✅ [DIRECT RESET] Day ${game.gameDay}: ${game.homeTeam.name} vs ${game.awayTeam.name}`);
      resetCount++;
    }
    
    console.log(`🏆 [DIRECT RESET] Successfully reset ${resetCount} games`);
    console.log('🎮 [DIRECT RESET] Day 8 games will be re-simulated with proper scoring');
    console.log('📅 [DIRECT RESET] Days 9-14 games are now scheduled for future');
    
    await prisma.$disconnect();
    console.log('✅ [DIRECT RESET] Complete! Schedule is now fixed for testing.');
    
  } catch (error) {
    console.error('❌ [DIRECT RESET] Failed:', error.message);
    process.exit(1);
  }
}

directReset();