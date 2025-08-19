#!/usr/bin/env node

// Fix games creation for alpha subdivision

import { getPrismaClient } from './server/database.ts';

async function main() {
  console.log('🔧 FIXING GAMES CREATION FOR ALPHA SUBDIVISION...\n');
  
  const prisma = await getPrismaClient();

  console.log('1️⃣ CHECKING CURRENT STATE...');
  
  // Get all teams in alpha subdivision
  const alphaTeams = await prisma.team.findMany({
    where: {
      division: 8,
      subdivision: 'alpha'
    },
    include: { league: true }
  });

  console.log(`Found ${alphaTeams.length} teams in alpha subdivision`);
  alphaTeams.forEach((team, i) => {
    const leagueStatus = team.leagueId ? '✅ Has League' : '❌ No League';
    console.log(`   ${i+1}. ${team.name} - ${leagueStatus}`);
  });

  console.log('\n2️⃣ GENERATING SIMPLIFIED SEASON SCHEDULE...');
  
  // Check existing games
  const existingGames = await prisma.game.count({
    where: {
      OR: [
        { homeTeam: { division: 8, subdivision: 'alpha' } },
        { awayTeam: { division: 8, subdivision: 'alpha' } }
      ]
    }
  });

  console.log(`Found ${existingGames} existing games`);

  if (existingGames === 0 && alphaTeams.length === 8) {
    console.log('Creating season schedule without seasonId field...');
    
    // Generate simplified round-robin schedule  
    const games = [];
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + 1); // Start tomorrow
    
    // Round-robin: each team plays every other team once
    for (let i = 0; i < alphaTeams.length; i++) {
      for (let j = i + 1; j < alphaTeams.length; j++) {
        const gameDate = new Date(baseDate);
        gameDate.setDate(baseDate.getDate() + games.length); // Spread games over days
        
        games.push({
          homeTeamId: alphaTeams[i].id,
          awayTeamId: alphaTeams[j].id,
          gameDate: gameDate,
          matchType: 'LEAGUE',
          status: 'SCHEDULED'
        });
      }
    }

    console.log(`Attempting to create ${games.length} games...`);

    try {
      // Create games in smaller batches
      for (let i = 0; i < games.length; i += 5) {
        const batch = games.slice(i, i + 5);
        await prisma.game.createMany({
          data: batch
        });
        console.log(`   Created batch ${Math.floor(i/5) + 1}: ${batch.length} games`);
      }
      
      console.log(`✅ Successfully created ${games.length} games`);
    } catch (error) {
      console.log('❌ Error creating games:', error.message);
      
      // Try creating individual games to identify the issue
      console.log('Attempting to create single game for debugging...');
      try {
        const testGame = await prisma.game.create({
          data: {
            homeTeamId: alphaTeams[0].id,
            awayTeamId: alphaTeams[1].id,
            gameDate: new Date(),
            matchType: 'LEAGUE',
            status: 'SCHEDULED'
          }
        });
        console.log('✅ Test game created successfully');
      } catch (testError) {
        console.log('❌ Test game failed:', testError.message);
      }
    }
  }

  console.log('\n3️⃣ FINAL VERIFICATION...');
  
  // Check final games count
  const finalGamesCount = await prisma.game.count({
    where: {
      OR: [
        { homeTeam: { division: 8, subdivision: 'alpha' } },
        { awayTeam: { division: 8, subdivision: 'alpha' } }
      ]
    }
  });

  console.log(`\n🎯 FINAL STATUS:`);
  console.log(`✅ Teams in alpha subdivision: ${alphaTeams.length}/8`);
  console.log(`✅ Teams with league assignment: ${alphaTeams.filter(t => t.leagueId).length}/${alphaTeams.length}`);
  console.log(`✅ Scheduled games: ${finalGamesCount}`);
  
  if (finalGamesCount > 0) {
    console.log('\n🎉 SUCCESS: Standings should now display with teams!');
  } else {
    console.log('\n⚠️  Games creation may need manual intervention');
  }
}

main().catch(console.error);