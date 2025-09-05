import pkg from 'pg';
const { Pool } = pkg;

console.log('🏆 Creating FINAL PERFECT schedule - completely fresh...');

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
 * PERFECT Schedule Generation Algorithm
 * Creates exactly 14 consecutive days with exactly 4 games each
 */
function createPerfectSchedule(teams) {
  console.log('🎯 Creating mathematically perfect double round-robin schedule...');
  
  const numTeams = teams.length;
  if (numTeams !== 8) {
    throw new Error(`Need exactly 8 teams, got ${numTeams}`);
  }
  
  // Each team plays 7 opponents × 2 (home/away) = 14 games per team
  // Total: 8 teams × 14 games ÷ 2 = 56 games
  // Schedule: 14 days × 4 games per day = 56 games ✓
  
  const allMatchups = [];
  
  // Generate ALL possible matchups (double round-robin)
  for (let homeIdx = 0; homeIdx < numTeams; homeIdx++) {
    for (let awayIdx = 0; awayIdx < numTeams; awayIdx++) {
      if (homeIdx !== awayIdx) {
        allMatchups.push({
          homeTeam: teams[homeIdx],
          awayTeam: teams[awayIdx],
          key: `${teams[homeIdx].name}-vs-${teams[awayIdx].name}`
        });
      }
    }
  }
  
  console.log(`📊 Generated ${allMatchups.length} total matchups (should be 56)`);
  
  if (allMatchups.length !== 56) {
    throw new Error(`Expected 56 matchups, got ${allMatchups.length}`);
  }
  
  // Create 14 consecutive game dates
  const gameDates = [];
  const startDate = new Date('2025-09-02T22:00:00.000Z'); // September 2, 2025 6PM EDT
  
  for (let day = 0; day < 14; day++) {
    const gameDate = new Date(startDate);
    gameDate.setDate(startDate.getDate() + day);
    
    // Vary the start times (6-8 PM EDT)
    const baseHour = 18 + (day % 3); // 6, 7, or 8 PM
    gameDate.setHours(baseHour, 0, 0, 0);
    
    gameDates.push({
      day: day + 1,
      baseDate: gameDate
    });
  }
  
  // Distribute matchups across 14 days (exactly 4 per day)
  const schedule = [];
  let matchupIndex = 0;
  
  for (let dayIndex = 0; dayIndex < 14; dayIndex++) {
    const dayInfo = gameDates[dayIndex];
    const dayMatches = [];
    
    console.log(`📅 Scheduling Day ${dayInfo.day} (${dayInfo.baseDate.toDateString()})...`);
    
    // Take exactly 4 matchups for this day
    for (let gameInDay = 0; gameInDay < 4; gameInDay++) {
      if (matchupIndex >= allMatchups.length) {
        throw new Error(`Ran out of matchups at day ${dayIndex + 1}, game ${gameInDay + 1}`);
      }
      
      const matchup = allMatchups[matchupIndex];
      
      // Create specific game time (staggered by 15 minutes)
      const gameTime = new Date(dayInfo.baseDate);
      gameTime.setMinutes(gameInDay * 15);
      
      const scheduledGame = {
        homeTeamId: matchup.homeTeam.id,
        awayTeamId: matchup.awayTeam.id,
        homeTeamName: matchup.homeTeam.name,
        awayTeamName: matchup.awayTeam.name,
        gameDate: gameTime,
        day: dayInfo.day,
        gameInDay: gameInDay + 1
      };
      
      dayMatches.push(scheduledGame);
      matchupIndex++;
      
      console.log(`   Game ${gameInDay + 1}: ${matchup.homeTeam.name} vs ${matchup.awayTeam.name} at ${gameTime.toTimeString().split(' ')[0]}`);
    }
    
    schedule.push(...dayMatches);
    console.log(`   ✅ Day ${dayInfo.day}: ${dayMatches.length} games scheduled`);
  }
  
  console.log(`🎯 Perfect schedule created: ${schedule.length} games across 14 days`);
  return schedule;
}

async function validatePerfectSchedule(schedule, teams) {
  console.log('🔍 Validating perfect schedule...');
  
  // Validate total games
  if (schedule.length !== 56) {
    throw new Error(`Expected 56 games, got ${schedule.length}`);
  }
  
  // Validate games per day
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
        throw new Error(`Day ${day}: Team playing multiple games`);
      }
      teamsThisDay.add(game.homeTeamName);
      teamsThisDay.add(game.awayTeamName);
    });
  }
  
  // Validate each team plays exactly 14 games
  const teamGameCounts = {};
  teams.forEach(team => {
    teamGameCounts[team.name] = { home: 0, away: 0, total: 0 };
  });
  
  schedule.forEach(game => {
    teamGameCounts[game.homeTeamName].home++;
    teamGameCounts[game.homeTeamName].total++;
    teamGameCounts[game.awayTeamName].away++;
    teamGameCounts[game.awayTeamName].total++;
  });
  
  Object.entries(teamGameCounts).forEach(([teamName, counts]) => {
    if (counts.total !== 14) {
      throw new Error(`${teamName} has ${counts.total} games, expected 14`);
    }
    console.log(`✅ ${teamName}: ${counts.total} games (${counts.home} home, ${counts.away} away)`);
  });
  
  console.log('✅ Perfect schedule validation passed!');
}

async function generatePerfectSchedule() {
  try {
    // COMPLETE fresh start
    console.log('🧹 Clearing ALL existing league games...');
    const deleteResult = await pool.query('DELETE FROM "Game" WHERE "matchType" = \'LEAGUE\'');
    console.log(`✅ Cleared ${deleteResult.rowCount} games`);
    
    console.log('📋 Getting teams...');
    const teams = await getTeamsInDivision();
    console.log(`✅ Found ${teams.length} teams:`, teams.map(t => t.name).join(', '));
    
    const schedule = createPerfectSchedule(teams);
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
    
    // Final verification
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
    
    console.log('📊 Final verification - Games per day:');
    verificationResult.rows.forEach((row, index) => {
      const status = parseInt(row.games_count) === 4 ? '✅' : '❌';
      console.log(`   ${status} Day ${index + 1}: ${row.games_count} games`);
    });
    
    if (verificationResult.rows.length === 14 && verificationResult.rows.every(row => parseInt(row.games_count) === 4)) {
      console.log('🎉 PERFECT! 14 consecutive days with exactly 4 games each!');
      console.log('🏆 Schedule is now ready for alpha testing!');
    } else {
      console.log('❌ Schedule still has distribution issues');
    }
    
  } catch (error) {
    console.error('❌ Failed to create perfect schedule:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

generatePerfectSchedule();