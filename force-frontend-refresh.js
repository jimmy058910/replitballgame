/**
 * FORCE COMPLETE FRONTEND DATA REFRESH
 * Test all API routes and verify data consistency
 */

import fetch from 'node-fetch';

async function testAllAPIs() {
  console.log('🔍 TESTING ALL CRITICAL API ROUTES...');
  
  const testRoutes = [
    'http://localhost:5000/api/teams/user-team',
    'http://localhost:5000/api/teams/8/standings', 
    'http://localhost:5000/api/leagues/daily-schedule',
    'http://localhost:5000/api/teams/my-schedule/comprehensive'
  ];
  
  for (const url of testRoutes) {
    try {
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${url}:`);
        
        if (url.includes('user-team')) {
          console.log(`   Team: ${data.name}, Record: ${data.record?.wins || 0}W-${data.record?.losses || 0}L`);
        } else if (url.includes('standings')) {
          console.log(`   Teams: ${data.length}, Top team: ${data[0]?.name} (${data[0]?.points} pts)`);
        } else if (url.includes('daily-schedule')) {
          const dayCount = Object.keys(data.schedule || {}).length;
          console.log(`   Schedule days: ${dayCount}`);
          if (data.schedule && data.schedule['Day 6']) {
            const day6Games = data.schedule['Day 6'];
            console.log(`   Day 6 games: ${day6Games.length} games, Status: ${day6Games[0]?.status || 'unknown'}`);
          }
        } else if (url.includes('comprehensive')) {
          console.log(`   Games: ${data.games?.length || 0}`);
        }
      } else {
        console.log(`❌ ${url}: HTTP ${response.status}`);
        if (response.status === 404) console.log('   Route not found');
        if (response.status === 401) console.log('   Authentication required');
      }
    } catch (error) {
      console.log(`❌ ${url}: ${error.message}`);
    }
  }
}

testAllAPIs();