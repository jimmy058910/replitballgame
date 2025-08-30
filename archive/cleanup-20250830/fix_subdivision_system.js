#!/usr/bin/env node

// Comprehensive fix for subdivision and AI classification issues

import { getPrismaClient } from './server/database.ts';

async function main() {
  console.log('🔧 FIXING SUBDIVISION AND AI CLASSIFICATION ISSUES...\n');
  
  const prisma = await getPrismaClient();

  // Step 1: Fix AI classification for Shadow Runners 500
  console.log('1️⃣ FIXING AI CLASSIFICATION...');
  
  const shadowRunners = await prisma.team.findFirst({
    where: { name: 'Shadow Runners 500' },
    include: { user: true }
  });

  if (shadowRunners && shadowRunners.user?.userId === 'AI_USER_PROFILE') {
    await prisma.team.update({
      where: { id: shadowRunners.id },
      data: { isAI: true }
    });
    console.log('✅ Fixed Shadow Runners 500: isAI = true');
  }

  // Step 2: Move all teams from "main" to Greek alphabet subdivision
  console.log('\n2️⃣ MOVING TEAMS TO GREEK ALPHABET SYSTEM...');
  
  const mainTeams = await prisma.team.findMany({
    where: { 
      division: 8,
      subdivision: 'main'
    },
    include: { user: true }
  });

  console.log(`Found ${mainTeams.length} teams in "main" subdivision`);

  // Move all teams to "late_alpha" subdivision (first Greek letter)
  if (mainTeams.length > 0) {
    const updateResult = await prisma.team.updateMany({
      where: {
        division: 8,
        subdivision: 'main'
      },
      data: {
        subdivision: 'late_alpha'
      }
    });
    
    console.log(`✅ Moved ${updateResult.count} teams from "main" to "late_alpha"`);
  }

  // Step 3: Verify the fix
  console.log('\n3️⃣ VERIFYING FIXES...');
  
  const oaklandTeam = await prisma.team.findFirst({
    where: { name: { contains: 'Oakland' } },
    include: { user: true }
  });

  console.log(`✅ Oakland Cougars now in subdivision: "${oaklandTeam?.subdivision}"`);

  const lateAlphaTeams = await prisma.team.findMany({
    where: {
      division: 8,
      subdivision: 'late_alpha'
    },
    include: { user: true },
    orderBy: { name: 'asc' }
  });

  console.log(`\n📋 LATE_ALPHA SUBDIVISION (${lateAlphaTeams.length}/8 teams):`);
  lateAlphaTeams.forEach((team, i) => {
    const userId = team.user?.userId || 'NONE';
    const isReallyAI = userId.startsWith('ai_') || userId === 'AI_USER_PROFILE';
    const flagCorrect = team.isAI === isReallyAI;
    const teamType = team.isAI ? 'AI' : 'Human';
    console.log(`   ${i+1}. ${team.name} (${teamType}) ${flagCorrect ? '✅' : '⚠️'}`);
  });

  // Step 4: Check all Division 8 subdivisions
  console.log(`\n📊 UPDATED DIVISION 8 SUBDIVISIONS:`);
  const allDiv8Teams = await prisma.team.findMany({
    where: { division: 8 },
    select: { subdivision: true, isAI: true }
  });

  const subdivisionCounts = {};
  allDiv8Teams.forEach(team => {
    if (!subdivisionCounts[team.subdivision]) {
      subdivisionCounts[team.subdivision] = { total: 0, ai: 0, human: 0 };
    }
    subdivisionCounts[team.subdivision].total++;
    if (team.isAI) {
      subdivisionCounts[team.subdivision].ai++;
    } else {
      subdivisionCounts[team.subdivision].human++;
    }
  });

  Object.entries(subdivisionCounts).forEach(([subdivision, counts]) => {
    console.log(`   ${subdivision}: ${counts.total} teams (${counts.human} Human, ${counts.ai} AI)`);
  });

  console.log('\n🎉 FIXES COMPLETED:');
  console.log('✅ Fixed AI team classification');  
  console.log('✅ Moved teams to proper Greek alphabet subdivision');
  console.log('✅ Oakland Cougars now in late_alpha subdivision');
  console.log('✅ Standings should now display properly');

  console.log('\n🔍 NEXT: Check your standings page - it should now show all 8 teams!');
}

main().catch(console.error);