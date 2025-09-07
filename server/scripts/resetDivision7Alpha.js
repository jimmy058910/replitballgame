/**
 * COMPREHENSIVE DIVISION 7 ALPHA RESET SCRIPT
 * 
 * This script will:
 * 1. Clear all historical games from Division 7 Alpha
 * 2. Reset season to Day 1
 * 3. Generate complete 14-game round-robin schedule
 * 4. Ensure proper scheduling requirements are met
 * 
 * SCHEDULE REQUIREMENTS:
 * - 8 teams in Division 7 Alpha
 * - 14 games per team (each team plays each other team twice)
 * - 7 home games, 7 away games per team
 * - 14 days total
 * - 1 game per day per team
 * - 4 games per day for the division
 */

import { getPrismaClient } from '../database.ts';

async function resetDivision7Alpha() {
  const prisma = await getPrismaClient();
  
  try {
    console.log('🚀 Starting Division 7 Alpha comprehensive reset...');
    
    // STEP 1: Get current season and Division 7 Alpha teams
    const currentSeason = await prisma.season.findFirst({
      where: { phase: 'REGULAR_SEASON' },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!currentSeason) {
      throw new Error('No active season found');
    }
    
    console.log(`📅 Found season: ${currentSeason.id} (currently Day ${currentSeason.currentDay})`);
    
    // Get all teams in Division 7 Alpha
    const division7AlphaTeams = await prisma.team.findMany({
      where: { 
        division: 7, 
        subdivision: 'alpha' 
      },
      select: { id: true, name: true },
      orderBy: { id: 'asc' }
    });
    
    console.log(`🏆 Found ${division7AlphaTeams.length} teams in Division 7 Alpha:`);
    division7AlphaTeams.forEach(team => console.log(`   - ${team.name} (ID: ${team.id})`));
    
    if (division7AlphaTeams.length !== 8) {
      throw new Error(`Expected 8 teams in Division 7 Alpha, found ${division7AlphaTeams.length}`);
    }
    
    // STEP 2: Find or create the schedule for Division 7 Alpha
    let schedule = await prisma.schedule.findFirst({
      where: {
        seasonId: currentSeason.id,
        division: 7,
        subdivision: 'alpha'
      }
    });
    
    if (!schedule) {
      console.log('📋 Creating new schedule for Division 7 Alpha...');
      schedule = await prisma.schedule.create({
        data: {
          seasonId: currentSeason.id,
          division: 7,
          subdivision: 'alpha',
          isActive: true
        }
      });
    }
    
    console.log(`📋 Using schedule ID: ${schedule.id}`);
    
    // STEP 3: Clear all existing games for this schedule
    const deletedGames = await prisma.game.deleteMany({
      where: {
        scheduleId: schedule.id
      }
    });
    
    console.log(`🗑️  Cleared ${deletedGames.count} historical games`);
    
    // STEP 4: Reset all team stats for Division 7 Alpha teams
    await prisma.team.updateMany({
      where: {
        division: 7,
        subdivision: 'alpha'
      },
      data: {
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0
      }
    });
    
    console.log('📊 Reset all team standings to 0-0-0');
    
    // STEP 5: Reset season to Day 1
    await prisma.season.update({
      where: { id: currentSeason.id },
      data: { currentDay: 1 }
    });
    
    console.log('📅 Reset season to Day 1');
    
    // STEP 6: Generate complete 14-game round-robin schedule
    console.log('🎯 Generating 14-game round-robin schedule...');
    
    const games = [];
    const teams = division7AlphaTeams;
    const seasonStartDate = new Date(currentSeason.startDate);
    
    // Round-robin algorithm: each team plays each other team twice (home/away)
    for (let round = 0; round < 14; round++) {
      const dayGames = [];
      const usedTeams = new Set();
      
      // Generate 4 games for this day (8 teams = 4 games)
      for (let i = 0; i < teams.length && dayGames.length < 4; i++) {
        for (let j = i + 1; j < teams.length && dayGames.length < 4; j++) {
          const homeTeam = teams[i];
          const awayTeam = teams[j];
          
          // Skip if either team is already playing today
          if (usedTeams.has(homeTeam.id) || usedTeams.has(awayTeam.id)) {
            continue;
          }
          
          // Determine home/away based on round to ensure balance
          const shouldSwap = Math.floor(round / 7) === 1; // Second half of season
          const finalHome = shouldSwap ? awayTeam : homeTeam;
          const finalAway = shouldSwap ? homeTeam : awayTeam;
          
          dayGames.push({
            homeTeamId: finalHome.id,
            awayTeamId: finalAway.id,
            gameDate: new Date(seasonStartDate.getTime() + (round * 24 * 60 * 60 * 1000)),
            scheduleId: schedule.id,
            matchType: 'LEAGUE',
            status: 'SCHEDULED',
            simulated: false,
            homeScore: 0,
            awayScore: 0
          });
          
          usedTeams.add(homeTeam.id);
          usedTeams.add(awayTeam.id);
        }
      }
      
      // If we couldn't generate 4 games with the simple algorithm, use round-robin
      if (dayGames.length < 4) {
        dayGames.length = 0; // Clear and try different approach
        usedTeams.clear();
        
        // Use proper round-robin scheduling
        const roundMatches = generateRoundRobinDay(teams, round);
        for (const match of roundMatches) {
          if (dayGames.length >= 4) break;
          
          dayGames.push({
            homeTeamId: match.home.id,
            awayTeamId: match.away.id,
            gameDate: new Date(seasonStartDate.getTime() + (round * 24 * 60 * 60 * 1000)),
            scheduleId: schedule.id,
            matchType: 'LEAGUE',
            status: 'SCHEDULED',
            simulated: false,
            homeScore: 0,
            awayScore: 0
          });
        }
      }
      
      games.push(...dayGames);
      console.log(`   Day ${round + 1}: ${dayGames.length} games scheduled`);
    }
    
    // STEP 7: Insert all games
    const createdGames = await prisma.game.createMany({
      data: games
    });
    
    console.log(`✅ Created ${createdGames.count} new games`);
    
    // STEP 8: Verify schedule requirements
    console.log('🔍 Verifying schedule requirements...');
    
    // Count games per team
    const gameStats = {};
    for (const team of teams) {
      gameStats[team.id] = {
        name: team.name,
        total: 0,
        home: 0,
        away: 0,
        opponents: new Set()
      };
    }
    
    for (const game of games) {
      // Home team stats
      gameStats[game.homeTeamId].total++;
      gameStats[game.homeTeamId].home++;
      gameStats[game.homeTeamId].opponents.add(game.awayTeamId);
      
      // Away team stats
      gameStats[game.awayTeamId].total++;
      gameStats[game.awayTeamId].away++;
      gameStats[game.awayTeamId].opponents.add(game.homeTeamId);
    }
    
    // Print verification results
    console.log('\n📊 SCHEDULE VERIFICATION:');
    let allValid = true;
    
    for (const team of teams) {
      const stats = gameStats[team.id];
      const isValid = stats.total === 14 && stats.home === 7 && stats.away === 7 && stats.opponents.size === 7;
      
      console.log(`   ${stats.name}: ${stats.total} games (${stats.home}H/${stats.away}A) vs ${stats.opponents.size} opponents ${isValid ? '✅' : '❌'}`);
      
      if (!isValid) allValid = false;
    }
    
    // Verify daily game counts
    console.log('\n📅 DAILY SCHEDULE:');
    const gamesByDay = {};
    for (const game of games) {
      const day = Math.floor((game.gameDate.getTime() - seasonStartDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
      if (!gamesByDay[day]) gamesByDay[day] = 0;
      gamesByDay[day]++;
    }
    
    for (let day = 1; day <= 14; day++) {
      const count = gamesByDay[day] || 0;
      console.log(`   Day ${day}: ${count} games ${count === 4 ? '✅' : '❌'}`);
      if (count !== 4) allValid = false;
    }
    
    if (allValid) {
      console.log('\n🎉 SUCCESS: All schedule requirements met!');
      console.log(`✅ 8 teams, each playing 14 games (7H/7A)`);
      console.log(`✅ 14 days with 4 games per day`);
      console.log(`✅ Each team plays each opponent twice`);
    } else {
      console.log('\n❌ WARNING: Some schedule requirements not met');
    }
    
    console.log('\n🏁 Division 7 Alpha reset complete!');
    
  } catch (error) {
    console.error('❌ Error during reset:', error);
    throw error;
  } finally {
    // Don't disconnect the shared Prisma client
  }
}

// Helper function for round-robin scheduling
function generateRoundRobinDay(teams, round) {
  const n = teams.length;
  const matches = [];
  
  if (n % 2 !== 0) {
    throw new Error('Round-robin requires even number of teams');
  }
  
  // Use standard round-robin algorithm
  const teamsArray = [...teams];
  const rounds = n - 1;
  const currentRound = round % rounds;
  
  for (let i = 0; i < n / 2; i++) {
    const home = (currentRound + i) % (n - 1);
    const away = (currentRound + n - 1 - i) % (n - 1);
    
    // Handle the fixed team (last team in array)
    const homeTeam = home === n - 1 ? teamsArray[n - 1] : teamsArray[home];
    const awayTeam = away === n - 1 ? teamsArray[n - 1] : teamsArray[away];
    
    if (homeTeam !== awayTeam) {
      matches.push({
        home: homeTeam,
        away: awayTeam
      });
    }
  }
  
  return matches;
}

// Run the script
resetDivision7Alpha()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });