#!/usr/bin/env node

// Test the Firebase authentication and user matching

import { getPrismaClient } from './server/database.ts';

async function main() {
  console.log('🔐 FIREBASE AUTH DEBUG...\n');
  
  const prisma = await getPrismaClient();

  console.log('1️⃣ CHECKING OAKLAND COUGARS USER LINKAGE...');
  
  const oaklandTeam = await prisma.team.findFirst({
    where: { name: { contains: 'Oakland' } },
    include: { 
      user: true 
    }
  });

  if (oaklandTeam) {
    console.log(`✅ Oakland Cougars Found:`);
    console.log(`   Team ID: ${oaklandTeam.id}`);
    console.log(`   Linked User Profile ID: ${oaklandTeam.userProfileId}`);
    console.log(`   User ID (from profile): ${oaklandTeam.user?.userId || 'NONE'}`);
    console.log(`   User Email: ${oaklandTeam.user?.email || 'NONE'}`);
  }

  console.log('\n2️⃣ CHECKING ALL USERS IN DATABASE...');
  
  const allUsers = await prisma.userProfile.findMany({
    take: 10
  });

  console.log(`Found ${allUsers.length} users:`);
  allUsers.forEach(user => {
    console.log(`   ${user.userId} - ${user.email} (${user.firstName} ${user.lastName})`);
  });

  console.log('\n3️⃣ FIREBASE TOKEN SIMULATION...');
  
  // The API is expecting req.user?.claims?.sub to match a userId in the database
  console.log('API expects: req.user?.claims?.sub === userProfile.userId');
  console.log('Oakland team is linked to userId:', oaklandTeam?.user?.userId);
  
  console.log('\n🎯 DIAGNOSIS:');
  if (!oaklandTeam?.user?.userId) {
    console.log('❌ ISSUE: Oakland Cougars has no linked user');
    console.log('   FIX: Link Oakland Cougars to a proper user profile');
  } else {
    console.log('✅ Oakland Cougars has linked user');
    console.log('❌ LIKELY ISSUE: Firebase token sub != database userId');
    console.log('   Firebase token sub: (need to check browser)');
    console.log(`   Database userId: ${oaklandTeam.user.userId}`);
    console.log('   FIX: Make sure Firebase authentication uses consistent userId');
  }

  console.log('\n🔧 QUICK FIX OPTIONS:');
  console.log('1. Update user profile to match Firebase token');
  console.log('2. Modify API to be more flexible with user matching');
  console.log('3. Check browser console for actual Firebase token content');
}

main().catch(console.error);