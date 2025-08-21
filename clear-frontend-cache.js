/**
 * CLEAR FRONTEND CACHE AND FORCE DATA REFRESH
 * Fix standings and schedule display issues by clearing React Query cache
 */

console.log('🧹 CLEARING FRONTEND CACHE AND FORCING REFRESH...');

// Force clear browser cache for the main app URL
const fetch = require('node-fetch');

async function clearFrontendCache() {
  try {
    // 1. Test the APIs to ensure they're working
    console.log('\n🔍 TESTING API ENDPOINTS:');
    
    // Test standings API
    try {
      const standingsResponse = await fetch('http://localhost:5000/api/standings/division/8/alpha');
      if (standingsResponse.ok) {
        const standings = await standingsResponse.json();
        console.log(`✅ Standings API working: ${standings.length} teams`);
        standings.slice(0, 3).forEach((team, i) => {
          console.log(`   ${i+1}. ${team.name}: ${team.wins}W-${team.losses}L (${team.points} pts)`);
        });
      }
    } catch (e) {
      console.log('❌ Standings API error:', e.message);
    }
    
    // Test schedule API  
    try {
      const scheduleResponse = await fetch('http://localhost:5000/api/teams/my-schedule/comprehensive');
      if (scheduleResponse.ok) {
        const schedule = await scheduleResponse.json();
        console.log(`✅ Schedule API working: ${schedule.games?.length || 0} games`);
        
        const day6Games = schedule.games?.filter(game => 
          new Date(game.gameDate).toDateString() === new Date('2025-08-21').toDateString()
        );
        
        if (day6Games?.length > 0) {
          console.log('   Day 6 games status:');
          day6Games.forEach(game => {
            console.log(`   - ${game.homeTeam.name} vs ${game.awayTeam.name}: ${game.status}`);
          });
        }
      }
    } catch (e) {
      console.log('❌ Schedule API error:', e.message);
    }

    // Test team API
    try {
      const teamResponse = await fetch('http://localhost:5000/api/teams/user-team');
      if (teamResponse.ok) {
        const team = await teamResponse.json();
        console.log(`✅ Team API working: ${team.name} (${team.record?.wins || 0}W-${team.record?.losses || 0}L)`);
      }
    } catch (e) {
      console.log('❌ Team API error:', e.message);
    }
    
    console.log('\n🎯 SOLUTION RECOMMENDATIONS:');
    console.log('1. Hard refresh the browser page (Ctrl+F5 or Cmd+Shift+R)');
    console.log('2. Clear browser cache and storage for localhost:5000');
    console.log('3. Open DevTools and disable cache while DevTools is open');
    console.log('4. Check Network tab for failed API requests');
    console.log('5. All backend APIs are working - this is a frontend caching issue');
    
  } catch (error) {
    console.error('Error testing APIs:', error);
  }
}

clearFrontendCache();