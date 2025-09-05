import pkg from 'pg';
const { Pool } = pkg;

console.log('🏈 Starting Division 7 Alpha schedule generation...');

const pool = new Pool({
  connectionString: 'postgresql://realm_app:qGlB8JhxixnZoxZvCvbdcBKFKDsOE5rCyi8iQA2BJKw=@localhost:5432/realm_rivalry?schema=public',
  ssl: false
});

// Helper function to get teams in Division 7 Alpha
async function getTeamsInDivision() {
  const result = await pool.query(`
    SELECT id, name 
    FROM "Team" 
    WHERE division = 7 AND subdivision = 'alpha'
    ORDER BY name
  `);
  return result.rows;
}

// Helper function to create game dates starting from today
function generateGameDates(startDay = 1, totalDays = 14) {
  const dates = [];
  const baseDate = new Date('2025-09-05'); // Today as reference
  
  for (let day = startDay; day <= totalDays; day++) {
    const gameDate = new Date(baseDate);
    gameDate.setDate(baseDate.getDate() + day - 1);
    // Set times to evening (6-8 PM range)
    gameDate.setHours(18 + (day % 3), (day * 15) % 60, 0, 0);
    dates.push({
      day,
      date: gameDate.toISOString()
    });
  }
  
  return dates;
}

// Create round-robin schedule for 8 teams
function createRoundRobinSchedule(teams, dates) {
  const schedule = [];
  const numTeams = teams.length;
  
  if (numTeams < 2) {
    console.log('❌ Not enough teams for scheduling');
    return schedule;
  }
  
  // Round-robin algorithm for even number of teams
  const rounds = numTeams - 1;
  const matchesPerRound = numTeams / 2;
  
  for (let round = 0; round < rounds && round < dates.length; round++) {
    const roundMatches = [];
    
    for (let match = 0; match < matchesPerRound; match++) {
      let home = (round + match) % (numTeams - 1);
      let away = (numTeams - 1 - match + round) % (numTeams - 1);
      
      // Last team stays in place, others rotate
      if (match === 0) {
        away = numTeams - 1;
      }
      
      // Ensure we have valid team indices
      if (home >= 0 && home < teams.length && away >= 0 && away < teams.length) {
        roundMatches.push({
          homeTeamId: teams[home].id,
          awayTeamId: teams[away].id,
          homeTeamName: teams[home].name,
          awayTeamName: teams[away].name,
          gameDate: dates[round].date,
          day: dates[round].day
        });
      }
    }
    
    schedule.push(...roundMatches);
  }
  
  return schedule;
}

async function generateSchedule() {
  try {
    console.log('📋 Getting Division 7 Alpha teams...');
    const teams = await getTeamsInDivision();
    console.log(`✅ Found ${teams.length} teams:`, teams.map(t => t.name).join(', '));
    
    if (teams.length < 2) {
      throw new Error('Need at least 2 teams to generate schedule');
    }
    
    console.log('📅 Generating game dates for 14 days...');
    const dates = generateGameDates(1, 14);
    
    console.log('🔄 Creating round-robin schedule...');
    const matches = createRoundRobinSchedule(teams, dates);
    
    console.log(`📝 Generated ${matches.length} matches. Inserting into database...`);
    
    // Insert matches into database
    for (const match of matches) {
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
      
      console.log(`✅ Day ${match.day}: ${match.homeTeamName} vs ${match.awayTeamName}`);
    }
    
    console.log('🎉 Schedule generation complete!');
    console.log(`📊 Created ${matches.length} league games for Division 7 Alpha`);
    
  } catch (error) {
    console.error('❌ Schedule generation failed:', error.message);
  } finally {
    await pool.end();
  }
}

generateSchedule();