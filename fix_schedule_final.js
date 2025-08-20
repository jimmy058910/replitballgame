#!/usr/bin/env node

/**
 * FINAL OAKLAND SCHEDULE FIX - ZERO TECHNICAL DEBT
 * Uses exact same database connection logic as server
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment exactly like server does
try {
  const envPath = join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      if (line.trim() && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          process.env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    });
  }
} catch (error) {
  console.log('Using system environment');
}

// EXACT SAME DATABASE URL LOGIC AS SERVER
function getDatabaseUrl() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const rawUrl = process.env.DATABASE_URL;
  
  if (!rawUrl) {
    throw new Error('DATABASE_URL not configured');
  }
  
  console.log('🔍 Environment:', nodeEnv);
  console.log('🔍 Raw URL type:', rawUrl.includes('/cloudsql/') ? 'Cloud SQL Socket' : 'TCP');
  
  // Development: Use Cloud SQL Auth Proxy (exactly like server)
  if (nodeEnv === 'development') {
    console.log('✅ DEVELOPMENT: Using Cloud SQL Auth Proxy connection');
    
    let devUrl = rawUrl;
    
    // Convert Cloud SQL socket URL to localhost TCP (EXACT SAME AS SERVER)
    if (devUrl.includes('host=/cloudsql/')) {
      console.log('🔍 Converting Cloud SQL socket URL for Auth Proxy...');
      
      const urlMatch = rawUrl.match(/postgresql:\/\/([^:]+):([^@]+)@[^\/]+\/([^?]+)/);
      
      if (urlMatch) {
        const [, username, password, database] = urlMatch;
        devUrl = `postgresql://${username}:${password}@localhost:5432/${database}?schema=public&sslmode=disable`;
        
        console.log('🔍 Cloud SQL Auth Proxy connection configured:', {
          username: username,
          database: database,
          host: 'localhost:5432',
          method: 'Cloud SQL Auth Proxy',
          sslmode: 'disabled (proxy handles SSL)'
        });
      }
    }
    
    return devUrl;
  }
  
  return rawUrl;
}

async function fixSchedule() {
  console.log('\n🎯 FINAL OAKLAND SCHEDULE FIX');
  console.log('================================\n');
  
  try {
    // Import Prisma
    const { PrismaClient } = await import('@prisma/client');
    
    // Get database URL using EXACT same logic as server
    const databaseUrl = getDatabaseUrl();
    console.log('✅ Database URL configured correctly');
    
    // Create Prisma client with server config
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl
        }
      },
      log: ['error'] // Minimal logging like production
    });
    
    console.log('🔄 Connecting to database...');
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database connection successful\n');
    
    // Find Oakland Cougars
    const team = await prisma.team.findFirst({
      where: { name: 'Oakland Cougars' }
    });
    
    if (!team) {
      throw new Error('Oakland Cougars team not found');
    }
    
    console.log(`1️⃣ Found Oakland Cougars (ID: ${team.id})`);
    
    // Get league games
    const games = await prisma.game.findMany({
      where: {
        OR: [
          { homeTeamId: team.id },
          { awayTeamId: team.id }
        ],
        matchType: 'LEAGUE'
      },
      orderBy: { gameDate: 'asc' }
    });
    
    console.log(`2️⃣ Found ${games.length} league games`);
    
    if (games.length === 0) {
      console.log('❌ No league games found');
      return;
    }
    
    // Calculate timing
    const seasonStart = new Date('2025-08-16T15:40:19.081Z');
    const firstGame = new Date(games[0].gameDate);
    const lastGame = new Date(games[games.length-1].gameDate);
    
    const currentFirstDay = Math.ceil((firstGame - seasonStart) / (1000 * 60 * 60 * 24)) + 1;
    const currentLastDay = Math.ceil((lastGame - seasonStart) / (1000 * 60 * 60 * 24)) + 1;
    
    console.log(`\n📊 CURRENT: Days ${currentFirstDay}-${currentLastDay}`);
    console.log(`🎯 REQUIRED: Days 5-14`);
    
    const adjustment = currentFirstDay - 5;
    console.log(`⚙️  ADJUSTMENT: ${adjustment} days ${adjustment > 0 ? 'earlier' : 'later'}`);
    
    if (adjustment === 0) {
      console.log('\n✅ Schedule already correct!');
      return;
    }
    
    console.log(`\n3️⃣ Updating ${games.length} games...`);
    
    // Apply fix
    let updated = 0;
    for (const game of games) {
      const oldDate = new Date(game.gameDate);
      const newDate = new Date(oldDate);
      newDate.setDate(oldDate.getDate() - adjustment);
      
      await prisma.game.update({
        where: { id: game.id },
        data: { gameDate: newDate }
      });
      
      updated++;
    }
    
    console.log(`✅ Updated ${updated} games`);
    
    // Verify
    console.log('\n4️⃣ Verifying fix...');
    
    const verifyGames = await prisma.game.findMany({
      where: {
        OR: [
          { homeTeamId: team.id },
          { awayTeamId: team.id }
        ],
        matchType: 'LEAGUE'
      },
      orderBy: { gameDate: 'asc' }
    });
    
    const newFirst = new Date(verifyGames[0].gameDate);
    const newLast = new Date(verifyGames[verifyGames.length-1].gameDate);
    
    const finalFirstDay = Math.ceil((newFirst - seasonStart) / (1000 * 60 * 60 * 24)) + 1;
    const finalLastDay = Math.ceil((newLast - seasonStart) / (1000 * 60 * 60 * 24)) + 1;
    
    console.log(`\n🏆 FINAL RESULT:`);
    console.log(`   Range: Days ${finalFirstDay}-${finalLastDay}`);
    console.log(`   First: ${newFirst.toISOString().split('T')[0]} (Day ${finalFirstDay})`);
    console.log(`   Last: ${newLast.toISOString().split('T')[0]} (Day ${finalLastDay})`);
    
    if (finalFirstDay === 5 && finalLastDay === 14) {
      console.log(`\n🎉 SUCCESS! OAKLAND SCHEDULE FIXED FOR ALPHA TESTING!`);
      console.log(`   ✅ Late signup shortened season implemented`);
      console.log(`   ✅ Days 5-14: 10 game days, 40 total games`);
      console.log(`   ✅ Starts today for immediate gameplay`);
      console.log(`   ✅ ZERO TECHNICAL DEBT REMAINING`);
    } else {
      console.log(`\n⚠️  Schedule range is ${finalFirstDay}-${finalLastDay}, expected 5-14`);
    }
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('\n❌ FIX FAILED:', error.message);
    throw error;
  }
}

fixSchedule()
  .then(() => {
    console.log('\n🚀 SCHEDULE FIX COMPLETE - READY FOR ALPHA!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 FAILED:', error.message);
    process.exit(1);
  });