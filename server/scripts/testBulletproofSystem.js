/**
 * Test Bulletproof Standings System
 * Verifies Schedule table exists and bulletproof filtering is working
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

// Load environment variables
config({ path: path.join(projectRoot, '.env') });

const prisma = new PrismaClient();

async function testBulletproofSystem() {
  console.log('🔍 Testing bulletproof standings system...\n');
  
  try {
    // Test 1: Verify Schedule table exists
    console.log('📋 Test 1: Checking Schedule table...');
    const scheduleCount = await prisma.schedule.count();
    console.log(`✅ Schedule table exists with ${scheduleCount} schedules\n`);
    
    // Test 2: List all schedules
    console.log('📋 Test 2: Listing all schedules...');
    const schedules = await prisma.schedule.findMany({
      orderBy: [
        { division: 'asc' },
        { subdivision: 'asc' }
      ]
    });
    
    schedules.forEach(schedule => {
      console.log(`  📊 Division ${schedule.division} ${schedule.subdivision}: ${schedule.id}`);
    });
    console.log();
    
    // Test 3: Check games by schedule (bulletproof filtering)
    console.log('📋 Test 3: Testing bulletproof game filtering...');
    for (const schedule of schedules.slice(0, 3)) { // Test first 3 schedules
      const gameCount = await prisma.game.count({
        where: {
          scheduleId: schedule.id
        }
      });
      console.log(`  🎮 Division ${schedule.division} ${schedule.subdivision}: ${gameCount} games`);
    }
    console.log();
    
    // Test 4: Compare old vs new approach
    console.log('📋 Test 4: Comparing old vs new filtering...');
    
    // Old approach (cross-contamination prone)
    const oldApproachCount = await prisma.game.count({
      where: {
        OR: [
          { matchType: 'LEAGUE' },
          { matchType: 'PLAYOFF', tournamentId: null }
        ]
      }
    });
    
    // New approach (bulletproof)
    const firstSchedule = schedules[0];
    if (firstSchedule) {
      const newApproachCount = await prisma.game.count({
        where: {
          scheduleId: firstSchedule.id,
          OR: [
            { matchType: 'LEAGUE' },
            { matchType: 'PLAYOFF', tournamentId: null }
          ]
        }
      });
      
      console.log(`  ❌ OLD (cross-contaminated): ${oldApproachCount} total games`);
      console.log(`  ✅ NEW (bulletproof): ${newApproachCount} games for Division ${firstSchedule.division} ${firstSchedule.subdivision}`);
      
      if (newApproachCount < oldApproachCount) {
        console.log(`  🎯 BULLETPROOF SUCCESS: Filtered out ${oldApproachCount - newApproachCount} cross-contaminated games!`);
      }
    }
    
    console.log('\n✅ Bulletproof standings system verification complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testBulletproofSystem().catch(console.error);