/**
 * Quick script to check what data exists in the database
 */

import { PrismaClient } from '../prisma/generated/client/index.js';

const prisma = new PrismaClient();

async function checkData() {
  console.log('🔍 Checking database contents...');
  
  try {
    // Check UserProfiles
    const userProfiles = await prisma.userProfile.findMany();
    console.log(`👤 UserProfiles: ${userProfiles.length}`);
    userProfiles.forEach(profile => {
      console.log(`  - ${profile.userId}: ${profile.email}`);
    });

    // Check Seasons
    const seasons = await prisma.season.findMany();
    console.log(`📅 Seasons: ${seasons.length}`);
    seasons.forEach(season => {
      console.log(`  - ${season.id}: Day ${season.currentDay}, ${season.phase}`);
    });

    // Check Teams
    const teams = await prisma.team.findMany();
    console.log(`⚽ Teams: ${teams.length}`);
    teams.forEach(team => {
      console.log(`  - ${team.name} (ID: ${team.id}, UserProfile: ${team.userProfileId})`);
    });

    // Check specific lookup for dev-user-123
    const devUser = await prisma.userProfile.findUnique({
      where: { userId: 'dev-user-123' }
    });
    console.log(`🔍 Dev user lookup: ${devUser ? 'Found' : 'NOT FOUND'}`);
    if (devUser) {
      console.log(`  - ID: ${devUser.id}, Email: ${devUser.email}`);
    }

  } catch (error) {
    console.error('❌ Error checking data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();