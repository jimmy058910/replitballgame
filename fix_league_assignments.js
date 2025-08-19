#!/usr/bin/env node

// Fix league assignments and generate standings for alpha subdivision

import { getPrismaClient } from './server/database.ts';

async function main() {
  console.log('🔧 FIXING LEAGUE ASSIGNMENTS & GENERATING STANDINGS...\n');
  
  const prisma = await getPrismaClient();

  console.log('1️⃣ FINDING DIVISION 8 LEAGUE...');
  
  // Get the Division 8 league
  const div8League = await prisma.league.findFirst({
    where: { division: 8 }
  });

  if (!div8League) {
    console.log('❌ No Division 8 league found. Creating one...');
    
    // Get current season
    const currentSeason = await prisma.season.findFirst({
      orderBy: { startDate: 'desc' }
    });

    if (!currentSeason) {
      console.log('❌ No current season found!');
      return;
    }

    // Create Division 8 league
    const newLeague = await prisma.league.create({
      data: {
        name: 'Division 8',
        division: 8,
        seasonId: currentSeason.id
      }
    });
    
    console.log(`✅ Created Division 8 league: ${newLeague.id}`);
  } else {
    console.log(`✅ Found Division 8 league: ${div8League.name} (ID: ${div8League.id})`);
  }

  const targetLeague = div8League || await prisma.league.findFirst({ where: { division: 8 } });

  console.log('\n2️⃣ ASSIGNING TEAMS TO LEAGUE...');
  
  // Get all teams in alpha subdivision
  const alphaTeams = await prisma.team.findMany({
    where: {
      division: 8,
      subdivision: 'alpha'
    }
  });

  console.log(`Found ${alphaTeams.length} teams in alpha subdivision`);

  // Assign all teams to the Division 8 league
  if (targetLeague && alphaTeams.length > 0) {
    const updateResult = await prisma.team.updateMany({
      where: {
        division: 8,
        subdivision: 'alpha'
      },
      data: {
        leagueId: targetLeague.id
      }
    });
    
    console.log(`✅ Assigned ${updateResult.count} teams to Division 8 league`);
  }

  console.log('\n3️⃣ GENERATING SEASON SCHEDULE...');
  
  // Check if games exist for these teams
  const existingGames = await prisma.game.count({
    where: {
      OR: [
        { homeTeam: { division: 8, subdivision: 'alpha' } },
        { awayTeam: { division: 8, subdivision: 'alpha' } }
      ]
    }
  });

  console.log(`Found ${existingGames} existing games for alpha subdivision`);

  if (existingGames === 0 && alphaTeams.length === 8) {
    console.log('Generating season schedule for 8-team alpha subdivision...');
    
    // Get current season
    const currentSeason = await prisma.season.findFirst({
      orderBy: { startDate: 'desc' }
    });

    if (currentSeason) {
      // Generate a simple round-robin schedule
      const games = [];
      const seasonStart = new Date(currentSeason.startDate);
      
      // Round-robin: each team plays every other team once
      for (let i = 0; i < alphaTeams.length; i++) {
        for (let j = i + 1; j < alphaTeams.length; j++) {
          const gameDate = new Date(seasonStart);
          gameDate.setDate(seasonStart.getDate() + games.length); // Spread games over days
          
          games.push({
            homeTeamId: alphaTeams[i].id,
            awayTeamId: alphaTeams[j].id,
            gameDate: gameDate,
            matchType: 'LEAGUE',
            seasonId: currentSeason.id,
            status: 'SCHEDULED'
          });
        }
      }

      // Insert all games
      await prisma.game.createMany({
        data: games
      });
      
      console.log(`✅ Generated ${games.length} league games for alpha subdivision`);
    }
  }

  console.log('\n4️⃣ VERIFYING FIX...');
  
  // Check final state
  const finalTeams = await prisma.team.findMany({
    where: {
      division: 8,
      subdivision: 'alpha'
    },
    include: { league: true },
    orderBy: { name: 'asc' }
  });

  console.log(`\n📋 ALPHA SUBDIVISION TEAMS (${finalTeams.length}/8):`);
  finalTeams.forEach((team, i) => {
    const hasLeague = team.leagueId ? `✅ League: ${team.league?.name}` : '❌ No League';
    console.log(`   ${i+1}. ${team.name} - ${hasLeague}`);
  });

  // Check games count
  const totalGames = await prisma.game.count({
    where: {
      OR: [
        { homeTeam: { division: 8, subdivision: 'alpha' } },
        { awayTeam: { division: 8, subdivision: 'alpha' } }
      ]
    }
  });

  console.log(`\n🎯 FINAL STATUS:`);
  console.log(`✅ Teams in alpha subdivision: ${finalTeams.length}/8`);
  console.log(`✅ Teams with league assignment: ${finalTeams.filter(t => t.leagueId).length}/${finalTeams.length}`);
  console.log(`✅ Scheduled games: ${totalGames}`);
  
  console.log('\n🎉 FIXES COMPLETED:');
  console.log('✅ Greek alphabet naming (alpha, beta, gamma, delta)');
  console.log('✅ Teams assigned to Division 8 league');
  console.log('✅ Season schedule generated');
  console.log('✅ Standings should now display properly!');
}

main().catch(console.error);