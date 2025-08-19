#!/usr/bin/env node

// Comprehensive debug script to fix subdivision and AI classification issues

import { getPrismaClient } from './server/database.ts';

async function main() {
  console.log('🔍 COMPREHENSIVE SUBDIVISION DEBUG...\n');
  
  const prisma = await getPrismaClient();

  // Step 1: Check Oakland Cougars details
  const oaklandTeam = await prisma.team.findFirst({
    where: { name: { contains: 'Oakland' } },
    include: { user: true }
  });

  if (!oaklandTeam) {
    console.log('❌ Oakland Cougars team not found!');
    return;
  }

  console.log('🎯 OAKLAND COUGARS DETAILS:');
  console.log(`   Name: ${oaklandTeam.name}`);
  console.log(`   Division: ${oaklandTeam.division}`);
  console.log(`   Subdivision: "${oaklandTeam.subdivision}"`);
  console.log(`   isAI Flag: ${oaklandTeam.isAI}`);
  console.log(`   User ID: ${oaklandTeam.user?.userId || 'NONE'}`);

  // Step 2: Check all teams in same subdivision
  console.log(`\n📋 ALL TEAMS IN SUBDIVISION "${oaklandTeam.subdivision}":`);
  const sameSubdivisionTeams = await prisma.team.findMany({
    where: {
      division: oaklandTeam.division,
      subdivision: oaklandTeam.subdivision
    },
    include: { user: true },
    orderBy: { name: 'asc' }
  });

  sameSubdivisionTeams.forEach((team, i) => {
    const userId = team.user?.userId || 'NONE';
    const isReallyAI = userId.startsWith('ai_') || userId === 'NONE';
    const flagMismatch = team.isAI !== isReallyAI;
    console.log(`   ${i+1}. ${team.name}`);
    console.log(`      - isAI flag: ${team.isAI}, Actually AI: ${isReallyAI} ${flagMismatch ? '⚠️ MISMATCH!' : '✅'}`);
    console.log(`      - User ID: ${userId.substring(0, 15)}...`);
  });

  // Step 3: Check ALL Division 8 subdivisions 
  console.log(`\n📊 ALL DIVISION 8 SUBDIVISIONS:`);
  const allDiv8Teams = await prisma.team.findMany({
    where: { division: 8 },
    select: { subdivision: true, name: true, isAI: true },
    orderBy: { subdivision: 'asc' }
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

  // Step 4: Identify the issues and provide fixes
  console.log(`\n🔧 IDENTIFIED ISSUES:\n`);

  // Issue 1: Greek alphabet naming
  if (oaklandTeam.subdivision === 'main') {
    console.log('❌ ISSUE 1: Oakland Cougars in "main" subdivision instead of Greek alphabet');
    console.log('   FIX: Should be in "late_alpha", "late_beta", "late_gamma", or "late_delta"');
  }

  // Issue 2: AI flag mismatches
  let aiFlagIssues = 0;
  sameSubdivisionTeams.forEach(team => {
    const userId = team.user?.userId || 'NONE';
    const isReallyAI = userId.startsWith('ai_') || userId === 'NONE';
    if (team.isAI !== isReallyAI) {
      aiFlagIssues++;
    }
  });

  if (aiFlagIssues > 0) {
    console.log(`❌ ISSUE 2: ${aiFlagIssues} teams have incorrect isAI flags`);
    console.log('   FIX: Update isAI flags to match actual user types');
  }

  // Issue 3: Empty standings
  console.log(`❌ ISSUE 3: Empty standings in UI`);
  console.log(`   Current subdivision "${oaklandTeam.subdivision}" has ${sameSubdivisionTeams.length} teams`);
  console.log('   FIX: Frontend may not be querying correct subdivision name');

  console.log(`\n🛠️ READY TO APPLY FIXES? This script can:`);
  console.log('   1. Move Oakland Cougars to proper Greek subdivision');
  console.log('   2. Fix all isAI flags to match actual team types');  
  console.log('   3. Ensure subdivision has 8 teams for testing');
}

main().catch(console.error);