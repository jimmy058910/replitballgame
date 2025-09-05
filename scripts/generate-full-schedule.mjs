import pkg from 'pg';
const { Pool } = pkg;

console.log('🏈 Starting COMPLETE Division 7 Alpha schedule generation...');

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
  const baseDate = new Date('2025-09-02'); // Season start date
  
  for (let day = startDay; day <= totalDays; day++) {
    const gameDate = new Date(baseDate);
    gameDate.setDate(baseDate.getDate() + day - 1);
    // Set times to evening (6-8 PM range) with variety
    gameDate.setHours(18 + (day % 3), (day * 15) % 60, 0, 0);
    dates.push({
      day,
      date: gameDate.toISOString()
    });
  }
  
  return dates;
}

// Create COMPLETE double round-robin schedule for 8 teams (14 days, 4 games per day)
function createDoubleRoundRobinSchedule(teams, dates) {
  const schedule = [];
  const numTeams = teams.length;
  
  if (numTeams !== 8) {
    throw new Error(`Expected 8 teams, got ${numTeams}`);
  }
  
  console.log('🔄 Creating double round-robin schedule...');
  console.log(`📊 Expected: ${numTeams} teams × 14 games = ${numTeams * 14} game instances = ${(numTeams * 14) / 2} actual games`);
  
  // Double round-robin: each team plays every other team twice (home and away)
  // For 8 teams: 7 opponents × 2 rounds = 14 games per team
  // Total: 8 teams × 14 games = 112 game instances = 56 actual games
  
  const allMatches = [];
  
  // First round-robin (everyone plays everyone once)
  for (let homeIdx = 0; homeIdx < numTeams; homeIdx++) {
    for (let awayIdx = 0; awayIdx < numTeams; awayIdx++) {
      if (homeIdx !== awayIdx) {
        allMatches.push({
          homeTeam: teams[homeIdx],
          awayTeam: teams[awayIdx],
          round: 1
        });
      }
    }
  }
  
  // Second round-robin (reverse home/away from first round)
  for (let homeIdx = 0; homeIdx < numTeams; homeIdx++) {
    for (let awayIdx = 0; awayIdx < numTeams; awayIdx++) {
      if (homeIdx !== awayIdx) {
        allMatches.push({
          homeTeam: teams[awayIdx], // Reversed from first round
          awayTeam: teams[homeIdx], // Reversed from first round
          round: 2
        });
      }
    }
  }
  
  console.log(`📋 Generated ${allMatches.length} total matchups`);
  
  // Now distribute matches across 14 days (4 games per day)
  const gamesPerDay = 4;
  const expectedGames = dates.length * gamesPerDay;
  
  if (allMatches.length !== expectedGames) {
    console.log(`⚠️  Match count mismatch: Generated ${allMatches.length}, expected ${expectedGames}`);
  }
  
  // Distribute games across days
  let matchIndex = 0;
  for (let dayIdx = 0; dayIdx < dates.length && matchIndex < allMatches.length; dayIdx++) {
    const dayMatches = [];
    
    for (let gameInDay = 0; gameInDay < gamesPerDay && matchIndex < allMatches.length; gameInDay++) {
      const match = allMatches[matchIndex];
      dayMatches.push({
        homeTeamId: match.homeTeam.id,
        awayTeamId: match.awayTeam.id,
        homeTeamName: match.homeTeam.name,
        awayTeamName: match.awayTeam.name,
        gameDate: dates[dayIdx].date,
        day: dates[dayIdx].day,
        round: match.round
      });
      matchIndex++;
    }
    
    schedule.push(...dayMatches);
    console.log(`📅 Day ${dates[dayIdx].day}: ${dayMatches.length} games scheduled`);
  }
  
  return schedule;
}

async function generateCompleteSchedule() {
  try {
    // First, clear existing games
    console.log('🧹 Clearing existing games...');
    const deleteResult = await pool.query('DELETE FROM "Game" WHERE "matchType" = \'LEAGUE\'');
    console.log(`✅ Cleared ${deleteResult.rowCount} existing league games`);
    
    console.log('📋 Getting Division 7 Alpha teams...');
    const teams = await getTeamsInDivision();
    console.log(`✅ Found ${teams.length} teams:`, teams.map(t => t.name).join(', '));
    
    if (teams.length !== 8) {
      throw new Error(`Expected 8 teams for proper schedule, got ${teams.length}`);
    }
    
    console.log('📅 Generating game dates for 14 days...');
    const dates = generateGameDates(1, 14);
    
    console.log('🏆 Creating COMPLETE double round-robin schedule...');
    const matches = createDoubleRoundRobinSchedule(teams, dates);
    
    console.log(`📝 Generated ${matches.length} matches. Inserting into database...`);
    
    // Insert matches into database
    let insertedCount = 0;
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
      
      insertedCount++;
      if (insertedCount % 10 === 0) {
        console.log(`✅ Inserted ${insertedCount}/${matches.length} games...`);
      }
    }
    
    console.log('🎉 COMPLETE schedule generation finished!');
    console.log(`📊 Created ${matches.length} league games for full 14-day season`);
    console.log(`🏟️  Each team will play 14 games (7 home, 7 away)`);
    console.log(`📅 Season spans Days 1-14 with 4 games per day`);
    
    // Verification query
    const verification = await pool.query(`
      SELECT COUNT(*) as total_games,
             MIN(DATE("gameDate")) as first_game,
             MAX(DATE("gameDate")) as last_game
      FROM "Game" 
      WHERE "matchType" = 'LEAGUE'
    `);
    
    console.log('✅ VERIFICATION:', verification.rows[0]);
    
  } catch (error) {
    console.error('❌ Complete schedule generation failed:', error.message);
  } finally {
    await pool.end();
  }
}

generateCompleteSchedule();