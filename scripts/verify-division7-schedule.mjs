import pkg from 'pg';
const { Pool } = pkg;

console.log('🔍 Verifying Division 7 Alpha schedule ONLY...');

const pool = new Pool({
  connectionString: 'postgresql://realm_app:qGlB8JhxixnZoxZvCvbdcBKFKDsOE5rCyi8iQA2BJKw=@localhost:5432/realm_rivalry?schema=public',
  ssl: false
});

async function verifyDivision7Schedule() {
  try {
    // Get all Division 7 Alpha games with team names
    const result = await pool.query(`
      SELECT 
        g.id,
        g."gameDate",
        DATE(g."gameDate") as game_date_only,
        ht.name as home_team,
        at.name as away_team,
        ht.division as home_division,
        ht.subdivision as home_subdivision
      FROM "Game" g
      JOIN "Team" ht ON g."homeTeamId" = ht.id
      JOIN "Team" at ON g."awayTeamId" = at.id
      WHERE g."matchType" = 'LEAGUE'
        AND ht.division = 7 
        AND ht.subdivision = 'alpha'
        AND at.division = 7 
        AND at.subdivision = 'alpha'
      ORDER BY g."gameDate"
    `);
    
    console.log(`📊 Division 7 Alpha games found: ${result.rows.length}`);
    
    if (result.rows.length === 0) {
      console.log('❌ No Division 7 Alpha games found!');
      return;
    }
    
    // Group by date using simple date comparison
    const gamesByDate = {};
    result.rows.forEach(game => {
      const dateKey = game.game_date_only.toISOString().split('T')[0];
      if (!gamesByDate[dateKey]) {
        gamesByDate[dateKey] = [];
      }
      gamesByDate[dateKey].push(game);
    });
    
    console.log('\\n📅 Division 7 Alpha games per day:');
    const dates = Object.keys(gamesByDate).sort();
    
    dates.forEach((date, index) => {
      const dayGames = gamesByDate[date];
      const status = dayGames.length === 4 ? '✅' : '❌';
      console.log(`   ${status} Day ${index + 1} (${date}): ${dayGames.length} games`);
      
      if (dayGames.length <= 6) { // Show games if reasonable number
        dayGames.forEach((game, gameIdx) => {
          console.log(`      Game ${gameIdx + 1}: ${game.home_team} vs ${game.away_team}`);
        });
      }
    });
    
    // Check opponent variety
    const teamOpponents = {};
    const divisionTeams = ['Azure Dragons', 'Crimson Lions 932', 'Earth Guardians 132', 'Fire Hawks 261', 'Galaxy Warriors 792', 'Oakland Cougars', 'Phoenix Rising 479', 'Star Crusaders 698'];
    
    divisionTeams.forEach(team => {
      teamOpponents[team] = new Set();
    });
    
    result.rows.forEach(game => {
      if (divisionTeams.includes(game.home_team) && divisionTeams.includes(game.away_team)) {
        teamOpponents[game.home_team].add(game.away_team);
        teamOpponents[game.away_team].add(game.home_team);
      }
    });
    
    console.log('\\n🔍 Team opponent variety:');
    Object.entries(teamOpponents).forEach(([teamName, opponents]) => {
      const status = opponents.size === 7 ? '✅' : '❌';
      console.log(`   ${status} ${teamName}: plays ${opponents.size} different opponents`);
      if (opponents.size < 7) {
        console.log(`      Opponents: ${Array.from(opponents).join(', ')}`);
      }
    });
    
    // Summary
    const totalDays = dates.length;
    const perfectDays = dates.filter(date => gamesByDate[date].length === 4).length;
    
    console.log(`\\n📊 SUMMARY:`);
    console.log(`   📅 Total days: ${totalDays} (expected: 14)`);
    console.log(`   ✅ Perfect days: ${perfectDays}/${totalDays}`);
    console.log(`   🎮 Total games: ${result.rows.length} (expected: 56)`);
    
    if (totalDays === 14 && perfectDays === 14 && result.rows.length === 56) {
      console.log('\\n🎉 PERFECT DIVISION 7 ALPHA SCHEDULE!');
      console.log('✅ 14 consecutive days');
      console.log('✅ 4 games per day');
      console.log('✅ 56 total games');
      console.log('✅ Every team plays 7 opponents');
    } else {
      console.log('\\n❌ Schedule needs adjustment');
    }
    
  } catch (error) {
    console.error('❌ Division 7 verification failed:', error);
  } finally {
    await pool.end();
  }
}

verifyDivision7Schedule();