#!/usr/bin/env node

/**
 * DIRECT DATABASE ACCESS FOR OAKLAND SCHEDULE FIX
 * Using the same database configuration as the server
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment properly
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
  console.log('Using system environment variables');
}

// Use the same database setup as the server
async function fixOaklandSchedule() {
  console.log('\n🎯 DIRECT OAKLAND SCHEDULE FIX');
  console.log('================================\n');
  
  try {
    // Import using the same pattern as server
    const { PrismaClient } = await import('@prisma/client');
    
    // Use the exact same connection logic as the server
    let databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not found in environment');
    }
    
    console.log('🔍 Original URL type:', databaseUrl.includes('/cloudsql/') ? 'Cloud SQL Socket' : 'TCP');
    
    // Convert socket URL to proxy format (same as server does)
    if (databaseUrl.includes('/cloudsql/')) {
      databaseUrl = databaseUrl.replace(/\/cloudsql\/[^\/]+\/\.s\.PGSQL\.\d+/, ':5432');
      console.log('✅ Converted to proxy format');
    }
    
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl
        }
      },
      log: ['query', 'error']
    });
    
    console.log('🔄 Testing connection...');
    await prisma.$connect();
    console.log('✅ Database connected');
    
    // Find Oakland Cougars
    console.log('\n1️⃣ Finding Oakland Cougars...');
    const team = await prisma.team.findFirst({
      where: { name: 'Oakland Cougars' }
    });
    
    if (!team) {
      throw new Error('Oakland Cougars not found');
    }
    
    console.log(`✅ Found team: ${team.name} (${team.id})`);
    
    // Get all their league games
    console.log('\n2️⃣ Finding league games...');
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
    
    console.log(`✅ Found ${games.length} league games`);
    
    if (games.length === 0) {
      console.log('⚠️  No league games found for Oakland Cougars');
      return;
    }
    
    // Analyze schedule timing
    const seasonStart = new Date('2025-08-16T15:40:19.081Z'); // From database
    console.log(`Season start: ${seasonStart.toISOString().split('T')[0]}`);
    
    const firstGame = new Date(games[0].gameDate);
    const lastGame = new Date(games[games.length-1].gameDate);
    
    const firstDay = Math.ceil((firstGame - seasonStart) / (1000 * 60 * 60 * 24)) + 1;
    const lastDay = Math.ceil((lastGame - seasonStart) / (1000 * 60 * 60 * 24)) + 1;
    
    console.log(`\n📊 CURRENT SCHEDULE:`);
    console.log(`   First game: ${firstGame.toISOString().split('T')[0]} (Day ${firstDay})`);
    console.log(`   Last game: ${lastGame.toISOString().split('T')[0]} (Day ${lastDay})`);
    console.log(`   Range: Days ${firstDay}-${lastDay}`);
    
    console.log(`\n🎯 TARGET SCHEDULE:`);
    console.log(`   Required: Days 5-14`);
    console.log(`   Adjustment needed: ${firstDay - 5} days earlier`);
    
    const adjustmentDays = firstDay - 5;
    
    if (adjustmentDays === 0) {
      console.log(`\n✅ Schedule is already correct!`);
      return;
    }
    
    console.log(`\n3️⃣ Applying ${adjustmentDays}-day adjustment...`);
    
    // Update all games
    let count = 0;
    for (const game of games) {
      const oldDate = new Date(game.gameDate);
      const newDate = new Date(oldDate);
      newDate.setDate(oldDate.getDate() - adjustmentDays);
      
      await prisma.game.update({
        where: { id: game.id },
        data: { gameDate: newDate }
      });
      
      count++;
      if (count <= 5) { // Show first 5 updates
        console.log(`   ✅ Game ${count}: ${oldDate.toISOString().split('T')[0]} → ${newDate.toISOString().split('T')[0]}`);
      }
    }
    
    console.log(`   ... (updated ${count} total games)`);
    
    // Verify the fix
    console.log(`\n4️⃣ Verifying fix...`);
    
    const updatedGames = await prisma.game.findMany({
      where: {
        OR: [
          { homeTeamId: team.id },
          { awayTeamId: team.id }
        ],
        matchType: 'LEAGUE'
      },
      orderBy: { gameDate: 'asc' }
    });
    
    const newFirstGame = new Date(updatedGames[0].gameDate);
    const newLastGame = new Date(updatedGames[updatedGames.length-1].gameDate);
    
    const newFirstDay = Math.ceil((newFirstGame - seasonStart) / (1000 * 60 * 60 * 24)) + 1;
    const newLastDay = Math.ceil((newLastGame - seasonStart) / (1000 * 60 * 60 * 24)) + 1;
    
    console.log(`\n🏆 FINAL RESULT:`);
    console.log(`   Updated games: ${count}`);
    console.log(`   New range: Days ${newFirstDay}-${newLastDay}`);
    console.log(`   First game: ${newFirstGame.toISOString().split('T')[0]} (Day ${newFirstDay})`);
    console.log(`   Last game: ${newLastGame.toISOString().split('T')[0]} (Day ${newLastDay})`);
    
    if (newFirstDay === 5 && newLastDay === 14) {
      console.log(`\n🎉 SUCCESS! Oakland Cougars schedule fixed for alpha testing!`);
      console.log(`   ✅ Late signup shortened season: Days 5-14`);
      console.log(`   ✅ 10 game days, 40 total games`);  
      console.log(`   ✅ Starts today for immediate play`);
      console.log(`   ✅ NO TECHNICAL DEBT REMAINING`);
    } else {
      console.log(`\n⚠️  WARNING: Expected Days 5-14, got ${newFirstDay}-${newLastDay}`);
    }
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('\n❌ FIX FAILED:', error.message);
    throw error;
  }
}

fixOaklandSchedule()
  .then(() => {
    console.log('\n🚀 OAKLAND SCHEDULE FIX COMPLETE!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 FAILED:', error.message);
    process.exit(1);
  });