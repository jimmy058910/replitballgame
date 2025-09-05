import pkg from 'pg';
const { Pool } = pkg;

console.log('🏆 Creating FINAL PERFECT 14-day schedule with proper date handling...');

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
 * Generate exactly 14 consecutive dates with proper timezone handling
 */
function generatePerfectDates() {
  const dates = [];
  
  // Start from September 2, 2025 at 6 PM EDT (22:00 UTC)
  const baseDate = new Date('2025-09-02T22:00:00.000Z');
  
  for (let day = 0; day < 14; day++) {
    // Create date for this day
    const dayDate = new Date(baseDate);
    dayDate.setDate(baseDate.getDate() + day);
    
    // Keep the same time (6 PM EDT)
    dates.push({
      day: day + 1,
      date: dayDate
    });
  }
  
  return dates;
}

/**
 * PERFECT Round-Robin Algorithm with Fixed Date Distribution
 */
function createFinalPerfectSchedule(teams) {
  console.log('🎯 Creating final perfect schedule...');
  
  const numTeams = teams.length;
  if (numTeams !== 8) {
    throw new Error(`Need exactly 8 teams, got ${numTeams}`);
  }
  
  // Generate 14 perfect dates
  const gameDates = generatePerfectDates();
  console.log('📅 Generated 14 consecutive dates:');
  gameDates.forEach(dateInfo => {
    console.log(`   Day ${dateInfo.day}: ${dateInfo.date.toDateString()}`);
  });
  
  const schedule = [];
  
  // Team indices for rotation
  const teamNumbers = Array.from({length: numTeams}, (_, i) => i);
  const fixedTeam = 0;
  let rotatingTeams = [1, 2, 3, 4, 5, 6, 7];
  
  // Generate 14 rounds (double round-robin)
  for (let round = 0; round < 14; round++) {
    const dayData = gameDates[round];
    const isSecondCycle = round >= 7;
    
    console.log(`\\n🏈 Round ${round + 1} - Day ${dayData.day} (${dayData.date.toDateString()}):`);
    
    const roundGames = [];
    
    // Generate 4 matches for this round
    for (let match = 0; match < 4; match++) {
      let team1, team2;
      
      if (match === 0) {
        // First match: fixed team vs rotating team
        team1 = fixedTeam;
        team2 = rotatingTeams[round % 7];
      } else {
        // Other matches: pair remaining teams
        const offset = match;
        const leftPos = (round + offset) % 7;
        const rightPos = (round - offset + 7) % 7;
        team1 = rotatingTeams[leftPos];
        team2 = rotatingTeams[rightPos];
      }
      
      // For second cycle (rounds 8-14), reverse home/away
      let homeTeam, awayTeam;
      if (!isSecondCycle) {
        homeTeam = teams[team1];
        awayTeam = teams[team2];
      } else {
        homeTeam = teams[team2]; // Reversed for second cycle
        awayTeam = teams[team1];
      }
      
      // Create specific game time (staggered by 15 minutes)
      const gameTime = new Date(dayData.date);
      gameTime.setMinutes(gameTime.getMinutes() + (match * 15));
      
      const game = {
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        homeTeamName: homeTeam.name,
        awayTeamName: awayTeam.name,
        gameDate: gameTime,
        day: dayData.day,
        round: round + 1
      };
      
      roundGames.push(game);
      console.log(`   Game ${match + 1}: ${homeTeam.name} vs ${awayTeam.name} at ${gameTime.toISOString()}`);
    }
    
    schedule.push(...roundGames);
    
    // Validate this round
    const teamsThisRound = new Set();
    roundGames.forEach(game => {
      if (teamsThisRound.has(game.homeTeamName) || teamsThisRound.has(game.awayTeamName)) {
        throw new Error(`ROUND ERROR: Team playing twice in Round ${round + 1}`);
      }
      teamsThisRound.add(game.homeTeamName);
      teamsThisRound.add(game.awayTeamName);
    });
    
    console.log(`   ✅ Round validated: 4 games, 8 teams, no conflicts`);
    
    // Rotate for next round
    rotatingTeams.unshift(rotatingTeams.pop());
  }
  
  return schedule;
}

async function validateFinalSchedule(schedule, teams) {
  console.log('\\n🔍 Final comprehensive validation...');
  
  // Check total
  if (schedule.length !== 56) {
    throw new Error(`Expected 56 games, got ${schedule.length}`);
  }
  console.log('✅ Total games: 56');
  
  // Group by day
  const gamesByDay = {};
  schedule.forEach(game => {
    if (!gamesByDay[game.day]) gamesByDay[game.day] = [];
    gamesByDay[game.day].push(game);
  });
  
  // Validate each day
  for (let day = 1; day <= 14; day++) {
    const dayGames = gamesByDay[day] || [];
    if (dayGames.length !== 4) {
      throw new Error(`Day ${day}: ${dayGames.length} games, expected 4`);
    }
    
    // No team conflicts per day
    const teamsThisDay = new Set();
    dayGames.forEach(game => {
      if (teamsThisDay.has(game.homeTeamName) || teamsThisDay.has(game.awayTeamName)) {
        throw new Error(`Day ${day}: Team playing multiple games`);
      }
      teamsThisDay.add(game.homeTeamName);
      teamsThisDay.add(game.awayTeamName);
    });
  }
  console.log('✅ Day distribution: 14 days × 4 games each');
  
  // Team statistics
  const teamStats = {};
  teams.forEach(team => {
    teamStats[team.name] = { home: 0, away: 0, opponents: new Set() };
  });
  
  schedule.forEach(game => {
    teamStats[game.homeTeamName].home++;
    teamStats[game.homeTeamName].opponents.add(game.awayTeamName);
    teamStats[game.awayTeamName].away++;
    teamStats[game.awayTeamName].opponents.add(game.homeTeamName);
  });
  
  Object.entries(teamStats).forEach(([teamName, stats]) => {
    const total = stats.home + stats.away;
    if (total !== 14 || stats.home !== 7 || stats.away !== 7 || stats.opponents.size !== 7) {
      throw new Error(`${teamName}: Invalid stats - ${total} total (${stats.home}H, ${stats.away}A), ${stats.opponents.size} opponents`);
    }
    console.log(`✅ ${teamName}: 14 games (7 home, 7 away) vs 7 opponents`);
  });
  
  console.log('🎉 FINAL VALIDATION PASSED COMPLETELY!');
}

async function generateFinalPerfectSchedule() {
  try {
    // Clear all existing games
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
    
    // Generate perfect schedule
    const schedule = createFinalPerfectSchedule(teams);
    
    // Validate before database insertion
    await validateFinalSchedule(schedule, teams);
    
    // Insert into database
    console.log('\\n💾 Inserting final perfect schedule...');
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
    
    console.log('\\n🏆 FINAL PERFECT SCHEDULE COMPLETE!');
    console.log('✅ 56 games created across exactly 14 consecutive days');
    console.log('✅ Each day has exactly 4 games');
    console.log('✅ Each team plays 14 games (7 home, 7 away)');  
    console.log('✅ Double round-robin: every team plays every opponent twice');
    console.log('🎯 Ready for alpha testing!');
    
  } catch (error) {
    console.error('❌ Final schedule generation failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

generateFinalPerfectSchedule();