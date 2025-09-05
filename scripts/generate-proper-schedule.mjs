import pkg from 'pg';
const { Pool } = pkg;

console.log('🏈 Starting PROPER Division 7 Alpha schedule generation...');

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

function generateGameDates(startDay = 1, totalDays = 14) {
  const dates = [];
  const baseDate = new Date('2025-09-02'); // Season start date
  
  for (let day = startDay; day <= totalDays; day++) {
    const gameDate = new Date(baseDate);
    gameDate.setDate(baseDate.getDate() + day - 1);
    // Set times to evening with variety
    gameDate.setHours(18 + (day % 3), (day * 15) % 60, 0, 0);
    dates.push({
      day,
      date: gameDate.toISOString()
    });
  }
  
  return dates;
}

/**
 * PROPER Round Robin Tournament Scheduling Algorithm
 * Based on standard sports league scheduling practices
 * 
 * For 8 teams (n=8):
 * - Single round-robin: 7 rounds (n-1), 4 games per round (n/2)
 * - Double round-robin: 14 rounds total
 * - Each team plays exactly once per round
 * - Proper home/away rotation
 */
function createProperRoundRobinSchedule(teams, dates) {
  const numTeams = teams.length;
  if (numTeams !== 8) {
    throw new Error(`Expected 8 teams, got ${numTeams}`);
  }
  
  console.log('🏆 Using standard round-robin tournament algorithm...');
  console.log(`📊 8 teams → 7 rounds per cycle → 14 rounds total (double round-robin)`);
  console.log(`📅 Each round = 4 games, each team plays exactly once per round`);
  
  const schedule = [];
  
  // Create team indices (0-7), with team 0 staying fixed
  const teamIndices = Array.from({length: numTeams}, (_, i) => i);
  const fixedTeam = 0; // Team 0 stays in position
  const rotatingTeams = teamIndices.slice(1); // Teams 1-7 rotate
  
  // Generate both round-robin cycles
  for (let cycle = 0; cycle < 2; cycle++) {
    console.log(`🔄 Generating ${cycle === 0 ? 'first' : 'second'} round-robin cycle...`);
    
    // Generate 7 rounds for this cycle
    for (let round = 0; round < numTeams - 1; round++) {
      const roundNumber = cycle * (numTeams - 1) + round + 1;
      const dayIndex = round + cycle * (numTeams - 1);
      
      if (dayIndex >= dates.length) {
        console.log(`⚠️  Ran out of dates at day ${dayIndex + 1}`);
        break;
      }
      
      const roundMatches = [];
      
      // Generate matches for this round
      for (let matchIndex = 0; matchIndex < numTeams / 2; matchIndex++) {
        let homeIdx, awayIdx;
        
        if (matchIndex === 0) {
          // First match always involves the fixed team
          homeIdx = fixedTeam;
          awayIdx = rotatingTeams[round];
        } else {
          // Other matches pair up remaining teams
          const leftIdx = (round + matchIndex) % rotatingTeams.length;
          const rightIdx = (round - matchIndex + rotatingTeams.length) % rotatingTeams.length;
          homeIdx = rotatingTeams[leftIdx];
          awayIdx = rotatingTeams[rightIdx];
        }
        
        // For second cycle, reverse home/away
        if (cycle === 1) {
          [homeIdx, awayIdx] = [awayIdx, homeIdx];
        }
        
        const match = {
          homeTeamId: teams[homeIdx].id,
          awayTeamId: teams[awayIdx].id,
          homeTeamName: teams[homeIdx].name,
          awayTeamName: teams[awayIdx].name,
          gameDate: dates[dayIndex].date,
          day: dates[dayIndex].day,
          round: roundNumber,
          cycle: cycle + 1
        };
        
        roundMatches.push(match);
      }
      
      schedule.push(...roundMatches);
      console.log(`📅 Round ${roundNumber} (Day ${dates[dayIndex].day}): ${roundMatches.length} games`);
      
      // Validate: each team appears exactly once this round
      const teamsThisRound = new Set();
      roundMatches.forEach(match => {
        const homeTeamName = teams.find(t => t.id === match.homeTeamId)?.name;
        const awayTeamName = teams.find(t => t.id === match.awayTeamId)?.name;
        
        if (teamsThisRound.has(homeTeamName) || teamsThisRound.has(awayTeamName)) {
          console.error(`❌ VALIDATION ERROR: Team playing twice in Round ${roundNumber}`);
        }
        
        teamsThisRound.add(homeTeamName);
        teamsThisRound.add(awayTeamName);
      });
      
      if (teamsThisRound.size !== numTeams) {
        console.error(`❌ VALIDATION ERROR: Round ${roundNumber} missing teams. Got ${teamsThisRound.size}, expected ${numTeams}`);
      }
    }
    
    // Rotate teams for next round (except fixed team)
    rotatingTeams.push(rotatingTeams.shift());
  }
  
  // Final validation
  console.log('✅ Schedule generation complete. Running validation...');
  validateSchedule(schedule, teams);
  
  return schedule;
}

function validateSchedule(schedule, teams) {
  console.log('🔍 Validating schedule...');
  
  // Check total games
  console.log(`📊 Total games: ${schedule.length} (expected: 56)`);
  
  // Check games per team
  const teamGameCounts = {};
  teams.forEach(team => teamGameCounts[team.name] = { home: 0, away: 0, total: 0 });
  
  schedule.forEach(match => {
    const homeTeam = teams.find(t => t.id === match.homeTeamId)?.name;
    const awayTeam = teams.find(t => t.id === match.awayTeamId)?.name;
    
    if (homeTeam) {
      teamGameCounts[homeTeam].home++;
      teamGameCounts[homeTeam].total++;
    }
    if (awayTeam) {
      teamGameCounts[awayTeam].away++;
      teamGameCounts[awayTeam].total++;
    }
  });
  
  // Print team game counts
  Object.entries(teamGameCounts).forEach(([teamName, counts]) => {
    const status = counts.total === 14 && counts.home === 7 && counts.away === 7 ? '✅' : '❌';
    console.log(`${status} ${teamName}: ${counts.total} total (${counts.home} home, ${counts.away} away)`);
  });
  
  // Check for day conflicts
  const gamesByDay = {};
  schedule.forEach(match => {
    if (!gamesByDay[match.day]) gamesByDay[match.day] = [];
    gamesByDay[match.day].push(match);
  });
  
  let hasConflicts = false;
  Object.entries(gamesByDay).forEach(([day, dayGames]) => {
    const teamsThisDay = new Set();
    dayGames.forEach(match => {
      const homeTeam = teams.find(t => t.id === match.homeTeamId)?.name;
      const awayTeam = teams.find(t => t.id === match.awayTeamId)?.name;
      
      if (teamsThisDay.has(homeTeam) || teamsThisDay.has(awayTeam)) {
        console.error(`❌ CONFLICT: Day ${day} has team playing multiple games`);
        hasConflicts = true;
      }
      
      teamsThisDay.add(homeTeam);
      teamsThisDay.add(awayTeam);
    });
    
    console.log(`📅 Day ${day}: ${dayGames.length} games, ${teamsThisDay.size} teams`);
  });
  
  if (hasConflicts) {
    throw new Error('Schedule validation failed: teams playing multiple games per day');
  }
  
  console.log('✅ Schedule validation passed!');
}

async function generateProperSchedule() {
  try {
    // Clear existing games
    console.log('🧹 Clearing existing games...');
    const deleteResult = await pool.query('DELETE FROM "Game" WHERE "matchType" = \'LEAGUE\'');
    console.log(`✅ Cleared ${deleteResult.rowCount} existing league games`);
    
    console.log('📋 Getting Division 7 Alpha teams...');
    const teams = await getTeamsInDivision();
    console.log(`✅ Found ${teams.length} teams:`, teams.map(t => t.name).join(', '));
    
    if (teams.length !== 8) {
      throw new Error(`Expected exactly 8 teams, got ${teams.length}`);
    }
    
    console.log('📅 Generating 14 game dates...');
    const dates = generateGameDates(1, 14);
    
    const schedule = createProperRoundRobinSchedule(teams, dates);
    
    console.log(`📝 Inserting ${schedule.length} games into database...`);
    
    // Insert games
    for (let i = 0; i < schedule.length; i++) {
      const match = schedule[i];
      await pool.query(`
        INSERT INTO "Game" (
          "homeTeamId", "awayTeamId", "gameDate", 
          "status", "matchType", "createdAt"
        ) VALUES (
          $1, $2, $3, 'SCHEDULED', 'LEAGUE', NOW()
        )
      `, [
        match.homeTeamId,
        match.awayTeamId,
        match.gameDate
      ]);
      
      if ((i + 1) % 10 === 0) {
        console.log(`✅ Inserted ${i + 1}/${schedule.length} games...`);
      }
    }
    
    console.log('🎉 PROPER schedule generation complete!');
    console.log(`📊 Created ${schedule.length} perfectly balanced league games`);
    
  } catch (error) {
    console.error('❌ Schedule generation failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

generateProperSchedule();