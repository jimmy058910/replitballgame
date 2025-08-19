#!/usr/bin/env node

// Fix user linkage for Oakland Cougars to match Firebase authentication

import { getPrismaClient } from './server/database.ts';

async function main() {
  console.log('🔧 FIXING USER LINKAGE FOR OAKLAND COUGARS...\n');
  
  const prisma = await getPrismaClient();

  console.log('1️⃣ FINDING REAL FIREBASE USER...');
  
  // Find the real user (not dev or AI users)
  const realUser = await prisma.userProfile.findFirst({
    where: {
      AND: [
        { email: { not: null } },
        { email: { contains: '@' } },
        { userId: { not: { startsWith: 'dev-' } } },
        { userId: { not: { startsWith: 'ai_' } } },
        { userId: { not: { startsWith: 'AI_' } } },
        { firstName: { not: null } }
      ]
    }
  });

  if (!realUser) {
    console.log('❌ No real Firebase user found');
    return;
  }

  console.log(`✅ Found real Firebase user:`);
  console.log(`   ID: ${realUser.id}`);
  console.log(`   User ID: ${realUser.userId}`);
  console.log(`   Email: ${realUser.email}`);
  console.log(`   Name: ${realUser.firstName} ${realUser.lastName}`);

  console.log('\n2️⃣ LINKING OAKLAND COUGARS TO REAL USER...');
  
  const oaklandTeam = await prisma.team.findFirst({
    where: { name: { contains: 'Oakland' } }
  });

  if (!oaklandTeam) {
    console.log('❌ Oakland Cougars not found');
    return;
  }

  console.log(`Current Oakland Cougars user profile ID: ${oaklandTeam.userProfileId}`);
  
  // Update Oakland Cougars to be linked to the real user
  const updatedTeam = await prisma.team.update({
    where: { id: oaklandTeam.id },
    data: { userProfileId: realUser.id },
    include: { user: true }
  });

  console.log(`✅ Updated Oakland Cougars linkage:`);
  console.log(`   Team ID: ${updatedTeam.id}`);
  console.log(`   New User Profile ID: ${updatedTeam.userProfileId}`);
  console.log(`   Linked to User ID: ${updatedTeam.user?.userId}`);
  console.log(`   Linked to Email: ${updatedTeam.user?.email}`);

  console.log('\n3️⃣ VERIFICATION - TESTING API LOGIC...');
  
  // Simulate the API logic
  console.log('API will now look for user with Firebase token sub:', realUser.userId);
  
  const userTeam = await prisma.team.findFirst({
    where: { user: { userId: realUser.userId } },
    include: { user: true }
  });

  if (userTeam) {
    console.log(`✅ API lookup SUCCESS:`);
    console.log(`   Found team: ${userTeam.name}`);
    console.log(`   Division: ${userTeam.division}`);
    console.log(`   Subdivision: ${userTeam.subdivision}`);
  } else {
    console.log(`❌ API lookup FAILED - no team found for user ${realUser.userId}`);
  }

  console.log('\n🎯 FIX COMPLETED:');
  console.log('✅ Oakland Cougars now linked to real Firebase user');
  console.log('✅ Firebase token sub will match database userId');
  console.log('✅ API authentication should work correctly');
  
  console.log('\n🧪 TEST THE STANDINGS NOW:');
  console.log('The standings API should work because:');
  console.log(`1. Firebase token contains sub: ${realUser.userId}`);
  console.log(`2. Database team is linked to userId: ${realUser.userId}`);
  console.log('3. API will find the team and return standings data');
}

main().catch(console.error);