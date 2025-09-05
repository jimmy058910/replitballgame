import pkg from 'pg';
const { Pool } = pkg;

console.log('🔍 Testing daily schedule API after fixes...');

const pool = new Pool({
  connectionString: 'postgresql://realm_app:qGlB8JhxixnZoxZvCvbdcBKFKDsOE5rCyi8iQA2BJKw=@localhost:5432/realm_rivalry?schema=public',
  ssl: false
});

async function testDailySchedule() {
  try {
    // Get updated season info  
    const season = await pool.query(`SELECT * FROM "Season" ORDER BY id DESC LIMIT 1`);
    const currentSeason = season.rows[0];
    
    console.log('📊 Updated Season Info:');
    console.log('   Start Date:', currentSeason.startDate);  
    console.log('   Current Day:', currentSeason.currentDay);
    
    // Get Division 7 Alpha teams
    const teams = await pool.query(`
      SELECT id, name FROM "Team" 
      WHERE division = 7 AND subdivision = 'alpha'
    `);
    const teamIds = teams.rows.map(t => t.id);
    
    // Get all games and organize by date
    const games = await pool.query(`
      SELECT 
        g.id,
        g."gameDate",
        ht.name as home_team,
        at.name as away_team
      FROM "Game" g
      JOIN "Team" ht ON g."homeTeamId" = ht.id
      JOIN "Team" at ON g."awayTeamId" = at.id
      WHERE g."matchType" = 'LEAGUE'
        AND (ht.id = ANY($1) OR at.id = ANY($1))
      ORDER BY g."gameDate"
    `, [teamIds]);
    
    // Group by date and calculate day numbers using corrected season start
    const gamesByDate = {};
    const seasonStart = new Date(currentSeason.startDate);
    
    games.rows.forEach(game => {
      const gameDate = new Date(game.gameDate);
      const dateKey = gameDate.toISOString().split('T')[0];
      
      // Calculate day number using corrected season start
      const daysSinceStart = Math.floor((gameDate.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24));
      const dayNumber = daysSinceStart + 1;
      
      if (!gamesByDate[dateKey]) {
        gamesByDate[dateKey] = { dayNumber, games: [] };
      }
      gamesByDate[dateKey].games.push(game);
    });
    
    console.log('\n📅 CORRECTED SCHEDULE ANALYSIS:');
    console.log(`   Season Start: ${seasonStart.toDateString()}`);
    console.log(`   Total game dates: ${Object.keys(gamesByDate).length}`);
    
    const sortedDates = Object.keys(gamesByDate).sort();
    sortedDates.forEach(date => {
      const dayData = gamesByDate[date];
      const jsDate = new Date(date);
      const dayName = jsDate.toLocaleDateString('en-US', { weekday: 'short' });
      console.log(`   Day ${dayData.dayNumber}: ${date} (${dayName}) - ${dayData.games.length} games`);
    });
    
    // Check if we now have Day 1
    const day1Games = Object.values(gamesByDate).filter(d => d.dayNumber === 1);
    if (day1Games.length > 0) {
      console.log('\n✅ SUCCESS: Day 1 games found!');
      console.log(`   Day 1 has ${day1Games[0].games.length} games`);
    } else {
      console.log('\n❌ STILL MISSING: Day 1 games not found');
    }
    
    // Check complete range
    const dayNumbers = Object.values(gamesByDate).map(d => d.dayNumber).sort((a, b) => a - b);
    const expectedDays = Array.from({length: 14}, (_, i) => i + 1);
    const missingDays = expectedDays.filter(day => !dayNumbers.includes(day));
    
    if (missingDays.length === 0) {
      console.log('\n🎉 PERFECT: All 14 days present');
    } else {
      console.log(`\n⚠️ Missing days: ${missingDays.join(', ')}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

testDailySchedule();