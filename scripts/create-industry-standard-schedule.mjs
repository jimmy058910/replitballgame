import pkg from 'pg';
const { Pool } = pkg;

console.log('🏆 Creating INDUSTRY STANDARD Round-Robin Schedule...');

const pool = new Pool({
  connectionString: 'postgresql://realm_app:qGlB8JhxixnZoxZvCvbdcBKFKDsOE5rCyi8iQA2BJKw=@localhost:5432/realm_rivalry?schema=public',
  ssl: false
});

async function getTeamsInDivision() {
  const result = await pool.query(`
    SELECT id, name 
    FROM "Team" 
    WHERE division = 7 AND subdivision = 'alpha'
    ORDER BY name
  `);
  return result.rows;
}

/**
 * INDUSTRY STANDARD Round-Robin Algorithm
 * Based on the classic table rotation method where team 0 stays fixed
 * Reference: https://stackoverflow.com/questions/6648512/scheduling-algorithm-for-a-round-robin-tournament
 */
function createIndustryStandardSchedule(teams) {
  console.log('🎯 Using INDUSTRY STANDARD table rotation algorithm...');
  
  if (teams.length !== 8) {
    throw new Error(`Need exactly 8 teams, got ${teams.length}`);
  }
  
  const schedule = [];
  const numTeams = teams.length;
  const numRounds = numTeams - 1; // 7 rounds for 8 teams
  
  // Initialize team positions for rotation
  // Team 0 stays fixed, teams 1-7 rotate
  let positions = [0, 1, 2, 3, 4, 5, 6, 7];
  
  console.log('📋 Teams for rotation:');
  teams.forEach((team, idx) => {
    console.log(`   Position ${idx}: ${team.name}`);
  });
  
  // Generate dates (September 2-15, 2025 in EDT)
  const startDate = new Date('2025-09-02');
  const gameDates = [];
  for (let day = 0; day < 14; day++) {
    const gameDate = new Date(startDate);
    gameDate.setDate(startDate.getDate() + day);
    // Set to 6 PM EDT 
    gameDate.setHours(18, 0, 0, 0);
    gameDates.push({
      day: day + 1,
      date: gameDate
    });
  }
  
  console.log(`\\n🗓️ Generated ${gameDates.length} consecutive dates for double round-robin\\n`);
  
  // Generate double round-robin (2 cycles of 7 rounds each = 14 rounds total)
  for (let cycle = 0; cycle < 2; cycle++) {
    console.log(`🔄 CYCLE ${cycle + 1} (${cycle === 0 ? 'First' : 'Second'} Round-Robin):`);
    
    for (let round = 0; round < numRounds; round++) {
      const overallRound = cycle * numRounds + round;
      const dayData = gameDates[overallRound];
      
      console.log(`\\n📅 Round ${overallRound + 1} - Day ${dayData.day} (${dayData.date.toDateString()}):`);
      console.log(`   Current positions: [${positions.join(', ')}]`);
      
      // Create pairings using the table method
      // Top row: positions 0, 1, 2, 3
      // Bottom row: positions 7, 6, 5, 4 (reversed)
      const topRow = [positions[0], positions[1], positions[2], positions[3]];
      const bottomRow = [positions[7], positions[6], positions[5], positions[4]];
      
      console.log(`   Top row:    [${topRow.join(', ')}]`);
      console.log(`   Bottom row: [${bottomRow.join(', ')}]`);
      
      const roundMatches = [];
      
      // Create 4 matches by pairing columns
      for (let match = 0; match < 4; match++) {
        const team1Idx = topRow[match];
        const team2Idx = bottomRow[match];
        
        // For second cycle, reverse home/away
        let homeTeam, awayTeam;
        if (cycle === 0) {
          homeTeam = teams[team1Idx];
          awayTeam = teams[team2Idx];
        } else {
          homeTeam = teams[team2Idx];  // Reversed
          awayTeam = teams[team1Idx];
        }
        
        // Create game time (staggered by 30 minutes)
        const gameTime = new Date(dayData.date);
        gameTime.setMinutes(match * 30);
        
        const game = {
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          homeTeamName: homeTeam.name,
          awayTeamName: awayTeam.name,
          gameDate: gameTime,
          day: dayData.day,
          round: overallRound + 1
        };
        
        roundMatches.push(game);
        console.log(`   Match ${match + 1}: ${homeTeam.name} vs ${awayTeam.name}`);
      }
      
      schedule.push(...roundMatches);
      
      // CRITICAL: Proper rotation for next round
      // Keep position 0 (team 0) fixed, rotate positions 1-7 clockwise
      if (round < numRounds - 1) { // Don't rotate after last round of cycle
        const temp = positions[7]; // Save last position
        for (let i = 7; i > 1; i--) {
          positions[i] = positions[i - 1]; // Shift right
        }
        positions[1] = temp; // Move saved position to position 1
        
        console.log(`   After rotation: [${positions.join(', ')}]`);
      }
    }
    
    // Reset positions for second cycle if needed
    if (cycle === 0) {
      positions = [0, 1, 2, 3, 4, 5, 6, 7];
      console.log(`\\n🔄 Resetting positions for Cycle 2: [${positions.join(', ')}]`);
    }
  }
  
  return schedule;
}

async function validateIndustrySchedule(schedule, teams) {
  console.log('\\n🔍 Validating industry standard schedule...');
  
  // Check total games
  console.log(`📊 Total games: ${schedule.length} (expected: 56)`);
  if (schedule.length !== 56) {
    throw new Error(`Expected 56 games, got ${schedule.length}`);
  }
  
  // Check team opponent counts
  const teamOpponents = {};
  teams.forEach(team => {
    teamOpponents[team.name] = new Set();
  });
  
  schedule.forEach(game => {
    teamOpponents[game.homeTeamName].add(game.awayTeamName);
    teamOpponents[game.awayTeamName].add(game.homeTeamName);
  });
  
  console.log('\\n🔍 Team opponent validation:');
  Object.entries(teamOpponents).forEach(([teamName, opponents]) => {
    const status = opponents.size === 7 ? '✅' : '❌';
    console.log(`   ${status} ${teamName}: plays ${opponents.size} different opponents`);
    if (opponents.size !== 7) {
      throw new Error(`${teamName} only plays ${opponents.size} opponents, expected 7`);
    }
  });
  
  // Check game distribution by day
  const gamesByDay = {};
  schedule.forEach(game => {
    if (!gamesByDay[game.day]) gamesByDay[game.day] = [];
    gamesByDay[game.day].push(game);
  });
  
  console.log('\\n📅 Game distribution validation:');
  for (let day = 1; day <= 14; day++) {
    const dayGames = gamesByDay[day] || [];
    const status = dayGames.length === 4 ? '✅' : '❌';
    console.log(`   ${status} Day ${day}: ${dayGames.length} games`);
    if (dayGames.length !== 4) {
      throw new Error(`Day ${day} has ${dayGames.length} games, expected 4`);
    }
  }
  
  console.log('🎉 Industry standard validation PASSED!');
}

async function generateIndustryStandardSchedule() {
  try {
    // Clear existing games
    console.log('🧹 Clearing all existing league games...');
    const deleteResult = await pool.query('DELETE FROM "Game" WHERE "matchType" = \'LEAGUE\'');
    console.log(`✅ Cleared ${deleteResult.rowCount} existing games`);
    
    // Get teams
    console.log('📋 Getting Division 7 Alpha teams...');
    const teams = await getTeamsInDivision();
    console.log(`✅ Found ${teams.length} teams:`, teams.map(t => t.name).join(', '));
    
    if (teams.length !== 8) {
      throw new Error(`Expected exactly 8 teams, got ${teams.length}`);
    }
    
    // Generate industry standard schedule
    const schedule = createIndustryStandardSchedule(teams);
    
    // Validate before inserting
    await validateIndustrySchedule(schedule, teams);
    
    console.log('\\n💾 Inserting industry standard schedule...');
    for (let i = 0; i < schedule.length; i++) {
      const game = schedule[i];
      await pool.query(`
        INSERT INTO "Game" (
          "homeTeamId", "awayTeamId", "gameDate", 
          "status", "matchType", "createdAt"
        ) VALUES (
          $1, $2, $3, 'SCHEDULED', 'LEAGUE', NOW()
        )
      `, [
        game.homeTeamId,
        game.awayTeamId,
        game.gameDate.toISOString()
      ]);
      
      if ((i + 1) % 14 === 0) {
        console.log(`✅ Inserted ${i + 1}/${schedule.length} games...`);
      }
    }
    
    console.log(`\\n🏆 INDUSTRY STANDARD SCHEDULE COMPLETE!`);
    console.log(`✅ Generated 56 games using proper table rotation algorithm`);
    console.log(`✅ Each team plays every other team exactly twice`);
    console.log(`✅ Perfect 14-day distribution with 4 games per day`);
    console.log(`🎯 Ready for alpha testing!`);
    
  } catch (error) {
    console.error('❌ Industry standard schedule generation failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

generateIndustryStandardSchedule();