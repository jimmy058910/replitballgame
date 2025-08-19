#!/usr/bin/env node

// Script to check current teams and add AI teams to Oakland Cougars subdivision

import { getPrismaClient } from './server/database.ts';
import { LateSignupService } from './server/services/lateSignupService.ts';

async function main() {
  console.log('🔍 Checking current teams...');
  
  const prisma = await getPrismaClient();
  
  // Find all teams
  const teams = await prisma.team.findMany({
    orderBy: [
      { division: 'asc' },
      { subdivision: 'asc' },
      { name: 'asc' }
    ]
  });
  
  console.log(`\n📊 Found ${teams.length} teams:`);
  teams.forEach(team => {
    console.log(`  - ${team.name} (Division ${team.division}, Subdivision: ${team.subdivision}, User: ${team.userId})`);
  });
  
  // Find Oakland Cougars
  const oaklandCougars = teams.find(t => t.name.includes('Oakland') || t.name.includes('Cougars'));
  
  if (!oaklandCougars) {
    console.log('❌ Oakland Cougars team not found');
    console.log('Available teams:', teams.map(t => t.name).join(', '));
    return;
  }
  
  console.log(`\n🎯 Found Oakland Cougars: ${oaklandCougars.name}`);
  console.log(`   Division: ${oaklandCougars.division}, Subdivision: ${oaklandCougars.subdivision}`);
  
  // Check current teams in that subdivision
  const subdivisionTeams = teams.filter(t => 
    t.division === oaklandCougars.division && 
    t.subdivision === oaklandCougars.subdivision
  );
  
  console.log(`\n📋 Current teams in Division ${oaklandCougars.division}, Subdivision ${oaklandCougars.subdivision}:`);
  subdivisionTeams.forEach((team, index) => {
    console.log(`  ${index + 1}. ${team.name} (User: ${team.userId || 'AI'})`);
  });
  
  console.log(`\nTeams in subdivision: ${subdivisionTeams.length}/8`);
  
  if (subdivisionTeams.length >= 8) {
    console.log('✅ Subdivision is already full (8 teams)');
    return;
  }
  
  // Add AI teams to fill the subdivision
  const aiTeamsToAdd = 8 - subdivisionTeams.length;
  console.log(`\n🤖 Adding ${aiTeamsToAdd} AI teams to ${oaklandCougars.subdivision} subdivision...`);
  
  try {
    await LateSignupService.generateAITeamsForSubdivision(oaklandCougars.subdivision, aiTeamsToAdd);
    console.log('✅ AI teams added successfully!');
    
    // Check final state
    const finalTeams = await prisma.team.findMany({
      where: {
        division: oaklandCougars.division,
        subdivision: oaklandCougars.subdivision
      }
    });
    
    console.log(`\n🎉 Final subdivision roster (${finalTeams.length}/8 teams):`);
    finalTeams.forEach((team, index) => {
      const isAI = !team.userId || team.userId.includes('ai_') || team.userId.includes('system_');
      console.log(`  ${index + 1}. ${team.name} ${isAI ? '(AI)' : '(Human)'}`);
    });
    
  } catch (error) {
    console.error('❌ Error adding AI teams:', error.message);
  }
}

main().catch(console.error);