import pkg from 'pg';
const { Pool } = pkg;

console.log('🏆 Creating PERFECT 14-day double round-robin schedule...');

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
 * PROPER Sports Tournament Round-Robin Algorithm
 * Uses the standard rotating table method to ensure no team plays twice on same day
 * 
 * For 8 teams (0-7):
 * - Team 0 stays fixed 
 * - Teams 1-7 rotate clockwise each round
 * - Each round has 4 games (n/2 where n=8)
 * - 7 rounds per cycle × 2 cycles = 14 rounds total
 */
function createPerfectRoundRobinSchedule(teams) {
  console.log('🎯 Using standard round-robin rotation algorithm...');
  
  const numTeams = teams.length;
  if (numTeams !== 8) {
    throw new Error(`Need exactly 8 teams, got ${numTeams}`);
  }
  
  const schedule = [];
  const teamNumbers = Array.from({length: numTeams}, (_, i) => i); // [0,1,2,3,4,5,6,7]
  
  // Team 0 stays fixed, teams 1-7 rotate
  const fixedTeam = 0;
  let rotatingTeams = [1, 2, 3, 4, 5, 6, 7];
  
  // Generate dates for 14 consecutive days starting September 1, 2025
  const gameDates = [];
  
  for (let day = 0; day < 14; day++) {
    // Create each day's date aligned with season start (Sept 1 00:00:00 UTC)
    const seasonStartUTC = new Date('2025-09-01T00:00:00.000Z');
    
    // Each game day starts at the season start + day offset
    const gameDate = new Date(seasonStartUTC);
    gameDate.setUTCDate(seasonStartUTC.getUTCDate() + day);
    
    // Set game time to evening EDT (22:00-24:00 UTC = 6-8 PM EDT)
    const baseHour = 22 + (day % 3); // 22, 23, 24 UTC = 6, 7, 8 PM EDT
    const gameHour = baseHour > 23 ? 23 : baseHour; // Cap at 23:00 UTC
    
    gameDate.setUTCHours(gameHour, 0, 0, 0);
    
    gameDates.push({
      day: day + 1,
      date: gameDate
    });
  }
  
  // Generate both round-robin cycles (14 rounds total)
  for (let cycle = 0; cycle < 2; cycle++) {
    console.log(`🔄 Generating cycle ${cycle + 1} (${cycle === 0 ? 'first' : 'second'} round-robin)...`);
    
    // 7 rounds per cycle
    for (let round = 0; round < 7; round++) {
      const absoluteRound = cycle * 7 + round;
      const dayData = gameDates[absoluteRound];
      
      console.log(`📅 Round ${absoluteRound + 1} - Day ${dayData.day} (${dayData.date.toDateString()}):`);
      
      const roundGames = [];
      
      // Generate 4 matches for this round
      for (let match = 0; match < 4; match++) {
        let team1, team2;
        
        if (match === 0) {
          // First match: fixed team vs rotating team at current position
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
        
        // For second cycle, swap home/away
        let homeTeam, awayTeam;
        if (cycle === 0) {
          homeTeam = teams[team1];
          awayTeam = teams[team2];
        } else {
          homeTeam = teams[team2]; // Reversed for second cycle
          awayTeam = teams[team1];
        }
        
        // Create specific game time (staggered by 15 minutes)
        const gameTime = new Date(dayData.date);
        gameTime.setMinutes(match * 15);
        
        const game = {
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          homeTeamName: homeTeam.name,
          awayTeamName: awayTeam.name,
          gameDate: gameTime,
          day: dayData.day,
          round: absoluteRound + 1,
          cycle: cycle + 1
        };
        
        roundGames.push(game);
        console.log(`   Game ${match + 1}: ${homeTeam.name} vs ${awayTeam.name} at ${gameTime.toTimeString().split(' ')[0]}`);
      }
      
      schedule.push(...roundGames);
      
      // Validate: no team appears twice this round
      const teamsThisRound = new Set();
      roundGames.forEach(game => {
        if (teamsThisRound.has(game.homeTeamName) || teamsThisRound.has(game.awayTeamName)) {
          throw new Error(`ALGORITHM ERROR: Team playing twice in Round ${absoluteRound + 1}`);
        }
        teamsThisRound.add(game.homeTeamName);
        teamsThisRound.add(game.awayTeamName);
      });
      
      console.log(`   ✅ Round complete: 4 games, 8 teams, no conflicts`);
    }
    
    // Rotate teams for next cycle
    rotatingTeams.unshift(rotatingTeams.pop()); // Move last to first
  }
  
  return schedule;
}

async function validatePerfectSchedule(schedule, teams) {
  console.log('🔍 Comprehensive schedule validation...');
  
  // 1. Total games check
  if (schedule.length !== 56) {
    throw new Error(`Expected 56 games, got ${schedule.length}`);
  }
  console.log('✅ Total games: 56 ✓');
  
  // 2. Games per day check
  const gamesByDay = {};
  schedule.forEach(game => {
    if (!gamesByDay[game.day]) gamesByDay[game.day] = [];
    gamesByDay[game.day].push(game);
  });
  
  for (let day = 1; day <= 14; day++) {
    const dayGames = gamesByDay[day] || [];
    if (dayGames.length !== 4) {
      throw new Error(`Day ${day} has ${dayGames.length} games, expected 4`);
    }
    
    // Check no team plays twice on same day
    const teamsThisDay = new Set();
    dayGames.forEach(game => {
      if (teamsThisDay.has(game.homeTeamName) || teamsThisDay.has(game.awayTeamName)) {
        throw new Error(`Day ${day}: Team ${game.homeTeamName} or ${game.awayTeamName} playing multiple games`);
      }
      teamsThisDay.add(game.homeTeamName);
      teamsThisDay.add(game.awayTeamName);
    });
  }
  console.log('✅ Game distribution: 14 days × 4 games = 56 ✓');
  
  // 3. Team game counts
  const teamStats = {};
  teams.forEach(team => {
    teamStats[team.name] = { home: 0, away: 0, total: 0, opponents: new Set() };
  });
  
  schedule.forEach(game => {
    teamStats[game.homeTeamName].home++;
    teamStats[game.homeTeamName].total++;
    teamStats[game.homeTeamName].opponents.add(game.awayTeamName);
    
    teamStats[game.awayTeamName].away++;
    teamStats[game.awayTeamName].total++;
    teamStats[game.awayTeamName].opponents.add(game.homeTeamName);
  });
  
  Object.entries(teamStats).forEach(([teamName, stats]) => {
    if (stats.total !== 14) {
      throw new Error(`${teamName}: ${stats.total} games, expected 14`);
    }
    if (stats.home !== 7) {
      throw new Error(`${teamName}: ${stats.home} home games, expected 7`);
    }
    if (stats.away !== 7) {
      throw new Error(`${teamName}: ${stats.away} away games, expected 7`);
    }
    if (stats.opponents.size !== 7) {
      throw new Error(`${teamName}: plays ${stats.opponents.size} opponents, expected 7`);
    }
    console.log(`✅ ${teamName}: 14 games (7 home, 7 away) vs 7 opponents ✓`);
  });
  
  // 4. Double round-robin check
  const matchupMatrix = {};
  teams.forEach(team1 => {
    matchupMatrix[team1.name] = {};
    teams.forEach(team2 => {
      if (team1.id !== team2.id) {
        matchupMatrix[team1.name][team2.name] = 0;
      }
    });
  });
  
  schedule.forEach(game => {
    matchupMatrix[game.homeTeamName][game.awayTeamName]++;
    matchupMatrix[game.awayTeamName][game.homeTeamName]++;
  });
  
  Object.entries(matchupMatrix).forEach(([team1, opponents]) => {
    Object.entries(opponents).forEach(([team2, count]) => {
      if (count !== 2) {
        throw new Error(`${team1} vs ${team2}: ${count} games, expected 2`);
      }
    });
  });
  console.log('✅ Double round-robin: Each team plays every opponent exactly twice ✓');
  
  console.log('🎉 PERFECT SCHEDULE VALIDATION PASSED!');
}

async function generatePerfectSchedule() {
  try {
    // Clear existing games
    console.log('🧹 Clearing existing league games...');
    const deleteResult = await pool.query('DELETE FROM "Game" WHERE "matchType" = \'LEAGUE\'');
    console.log(`✅ Cleared ${deleteResult.rowCount} existing games`);
    
    console.log('📋 Getting Division 7 Alpha teams...');
    const teams = await getTeamsInDivision();
    console.log(`✅ Found ${teams.length} teams:`, teams.map(t => t.name).join(', '));
    
    if (teams.length !== 8) {
      throw new Error(`Expected exactly 8 teams, got ${teams.length}`);
    }
    
    // Generate perfect schedule
    const schedule = createPerfectRoundRobinSchedule(teams);
    
    // Validate before inserting
    await validatePerfectSchedule(schedule, teams);
    
    console.log('💾 Inserting perfect schedule into database...');
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
    
    // Final database verification
    console.log('🔍 Final database verification...');
    const verificationResult = await pool.query(`
      SELECT 
        DATE("gameDate") as game_date,
        COUNT(*) as games_count
      FROM "Game" 
      WHERE "matchType" = 'LEAGUE'
      GROUP BY DATE("gameDate")
      ORDER BY game_date
    `);
    
    console.log('📊 Database verification - Games per day:');
    verificationResult.rows.forEach((row, index) => {
      const status = parseInt(row.games_count) === 4 ? '✅' : '❌';
      console.log(`   ${status} Day ${index + 1} (${row.game_date.toDateString()}): ${row.games_count} games`);
    });
    
    const totalDays = verificationResult.rows.length;
    const perfectDays = verificationResult.rows.filter(row => parseInt(row.games_count) === 4).length;
    
    if (totalDays === 14 && perfectDays === 14) {
      console.log('🏆 PERFECT SUCCESS!');
      console.log('✅ 14 consecutive days with exactly 4 games each');
      console.log('✅ Each team plays 14 games (7 home, 7 away)');
      console.log('✅ Double round-robin: every team plays every opponent twice');
      console.log('🎯 Schedule ready for alpha testing!');
    } else {
      console.log(`❌ Issues found: ${perfectDays}/${totalDays} days perfect`);
    }
    
  } catch (error) {
    console.error('❌ Perfect schedule generation failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

generatePerfectSchedule();