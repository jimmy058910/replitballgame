#!/usr/bin/env node

/**
 * COMPREHENSIVE OAKLAND COUGARS SCHEDULE FIX
 * 
 * GOAL: Eliminate all technical debt and ensure proper late signup scheduling
 * 
 * PROBLEM: Oakland Cougars games scheduled for Days 9-18 instead of 5-14
 * SOLUTION: Direct database access to fix schedule timing
 * 
 * REQUIREMENTS FOR ALPHA TESTING:
 * - Games must span Days 5-14 (10 game days, 40 total games)
 * - First game should be today (Day 5 - Aug 20)
 * - Last game should be Day 14 (Aug 29)
 * - Maintains 4 games per day structure
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to load environment variables
try {
  const envPath = join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      if (line.trim() && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          process.env[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    console.log('✅ Environment variables loaded from .env');
  }
} catch (error) {
  console.log('⚠️  Could not load .env file, using system environment');
}

// Import Prisma with proper setup
console.log('🔄 Importing Prisma client...');

let prisma;
try {
  // Use dynamic import to handle the connection properly
  const { PrismaClient } = await import('@prisma/client');
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  console.log('🔍 Database URL configured:', databaseUrl.substring(0, 50) + '...');
  
  // Convert Cloud SQL socket URL to use localhost proxy
  let finalUrl = databaseUrl;
  if (databaseUrl.includes('/cloudsql/')) {
    console.log('🔄 Converting Cloud SQL socket URL to proxy format...');
    finalUrl = databaseUrl.replace(/\/cloudsql\/[^\/]+\/\.s\.PGSQL\.\d+/, ':5432');
    console.log('✅ Using Cloud SQL Auth Proxy connection');
  }
  
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: finalUrl
      }
    }
  });
  
  console.log('✅ Prisma client initialized');
  
} catch (error) {
  console.error('❌ Failed to initialize Prisma:', error);
  process.exit(1);
}

async function fixOaklandScheduleComprehensive() {
  console.log('\n🚨 COMPREHENSIVE OAKLAND COUGARS SCHEDULE FIX');
  console.log('================================================\n');
  
  try {
    // Test database connection
    console.log('🔍 Testing database connection...');
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database connection successful\n');
    
    // Step 1: Find Oakland Cougars team
    console.log('1️⃣ Finding Oakland Cougars team...');
    const oaklandCougars = await prisma.team.findFirst({
      where: { name: 'Oakland Cougars' },
      include: {
        homeGames: {
          where: { matchType: 'LEAGUE' },
          orderBy: { gameDate: 'asc' }
        },
        awayGames: {
          where: { matchType: 'LEAGUE' },
          orderBy: { gameDate: 'asc' }
        }
      }
    });
    
    if (!oaklandCougars) {
      console.log('❌ Oakland Cougars team not found!');
      process.exit(1);
    }
    
    console.log(`✅ Found Oakland Cougars (ID: ${oaklandCougars.id})`);
    console.log(`   Division: ${oaklandCougars.division}, Subdivision: ${oaklandCougars.subdivision}`);
    
    // Step 2: Analyze current schedule
    console.log('\n2️⃣ Analyzing current schedule...');
    const allGames = [...oaklandCougars.homeGames, ...oaklandCougars.awayGames].sort(
      (a, b) => new Date(a.gameDate) - new Date(b.gameDate)
    );
    
    console.log(`   Total games found: ${allGames.length}`);
    
    if (allGames.length === 0) {
      console.log('❌ No games found for Oakland Cougars!');
      process.exit(1);
    }
    
    // Calculate current game days
    const seasonStart = new Date('2025-08-16T15:40:19.081Z'); // From database logs
    console.log(`   Season start: ${seasonStart.toISOString().split('T')[0]}`);
    
    allGames.forEach((game, index) => {
      const gameDate = new Date(game.gameDate);
      const daysDiff = Math.floor((gameDate - seasonStart) / (1000 * 60 * 60 * 24));
      const gameDay = daysDiff + 1;
      console.log(`   ${index + 1}. ${gameDate.toISOString().split('T')[0]} (Day ${gameDay})`);
    });
    
    const firstGameDate = new Date(allGames[0].gameDate);
    const lastGameDate = new Date(allGames[allGames.length - 1].gameDate);
    const firstGameDay = Math.floor((firstGameDate - seasonStart) / (1000 * 60 * 60 * 24)) + 1;
    const lastGameDay = Math.floor((lastGameDate - seasonStart) / (1000 * 60 * 60 * 24)) + 1;
    
    console.log(`\n   📊 CURRENT SCHEDULE: Days ${firstGameDay}-${lastGameDay}`);
    console.log(`   🎯 REQUIRED SCHEDULE: Days 5-14`);
    console.log(`   📏 Adjustment needed: Move ${firstGameDay - 5} days earlier\n`);
    
    // Step 3: Calculate the fix
    const adjustmentDays = firstGameDay - 5;
    if (adjustmentDays === 0) {
      console.log('✅ Schedule is already correct! No adjustment needed.');
      return;
    }
    
    console.log(`3️⃣ Applying schedule fix (moving ${adjustmentDays} days earlier)...`);
    
    // Step 4: Update all games
    let updateCount = 0;
    for (const game of allGames) {
      const currentDate = new Date(game.gameDate);
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - adjustmentDays);
      
      await prisma.game.update({
        where: { id: game.id },
        data: { gameDate: newDate }
      });
      
      const newGameDay = Math.floor((newDate - seasonStart) / (1000 * 60 * 60 * 24)) + 1;
      console.log(`   ✅ Updated game ${game.id}: ${currentDate.toISOString().split('T')[0]} → ${newDate.toISOString().split('T')[0]} (Day ${newGameDay})`);
      updateCount++;
    }
    
    console.log(`\n4️⃣ Verification: Checking updated schedule...`);
    
    // Step 5: Verify the fix
    const updatedGames = await prisma.game.findMany({
      where: {
        OR: [
          { homeTeamId: oaklandCougars.id },
          { awayTeamId: oaklandCougars.id }
        ],
        matchType: 'LEAGUE'
      },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } }
      },
      orderBy: { gameDate: 'asc' }
    });
    
    console.log(`\n📋 FINAL SCHEDULE VERIFICATION:`);
    updatedGames.forEach((game, index) => {
      const gameDate = new Date(game.gameDate);
      const gameDay = Math.floor((gameDate - seasonStart) / (1000 * 60 * 60 * 24)) + 1;
      const timeStr = gameDate.toTimeString().split(' ')[0].substring(0, 5);
      console.log(`   ${index + 1}. Day ${gameDay}: ${game.homeTeam.name} vs ${game.awayTeam.name} at ${timeStr} (${gameDate.toISOString().split('T')[0]})`);
    });
    
    const finalFirstDay = Math.floor((new Date(updatedGames[0].gameDate) - seasonStart) / (1000 * 60 * 60 * 24)) + 1;
    const finalLastDay = Math.floor((new Date(updatedGames[updatedGames.length-1].gameDate) - seasonStart) / (1000 * 60 * 60 * 24)) + 1;
    
    console.log(`\n🎉 COMPREHENSIVE FIX COMPLETED!`);
    console.log(`   ✅ Games updated: ${updateCount}`);
    console.log(`   ✅ Schedule range: Days ${finalFirstDay}-${finalLastDay}`);
    console.log(`   ✅ First game: Today (Day ${finalFirstDay} - ${new Date(updatedGames[0].gameDate).toISOString().split('T')[0]})`);
    console.log(`   ✅ Last game: Day ${finalLastDay} (${new Date(updatedGames[updatedGames.length-1].gameDate).toISOString().split('T')[0]})`);
    
    if (finalFirstDay === 5 && finalLastDay === 14) {
      console.log(`\n🏆 PERFECT! Oakland Cougars schedule now meets alpha testing requirements!`);
      console.log(`   - Late signup team receives shortened season (Days 5-14)`);
      console.log(`   - 10 game days with 40 total games`);
      console.log(`   - Starts today for immediate gameplay`);
      console.log(`\n✅ NO TECHNICAL DEBT - System ready for alpha testing!`);
    } else {
      console.log(`\n⚠️  WARNING: Schedule is Days ${finalFirstDay}-${finalLastDay}, expected 5-14`);
    }
    
  } catch (error) {
    console.error('\n❌ COMPREHENSIVE FIX FAILED:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the fix
fixOaklandScheduleComprehensive()
  .then(() => {
    console.log('\n🎯 COMPREHENSIVE SCHEDULE FIX SUCCESS!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 COMPREHENSIVE SCHEDULE FIX FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  });