import fetch from 'node-fetch';

console.log('🔍 Testing APIs directly to find fake data source...');

const baseUrl = 'http://localhost:5001';
const testToken = 'test-token'; // This will fail auth but show response structure

async function testAPIs() {
  try {
    console.log('\n📡 Testing /api/leagues/daily-schedule:');
    try {
      const scheduleRes = await fetch(`${baseUrl}/api/leagues/daily-schedule`, {
        headers: { 'Authorization': `Bearer ${testToken}` }
      });
      const scheduleData = await scheduleRes.json();
      
      if (scheduleRes.ok) {
        console.log('✅ Daily schedule API works');
        console.log('  Schedule keys:', Object.keys(scheduleData.schedule || {}));
        console.log('  Current day:', scheduleData.currentDay);
      } else {
        console.log('❌ Auth required (expected):', scheduleData.message);
      }
    } catch (error) {
      console.log('❌ API not responding:', error.message);
    }

    console.log('\n📡 Testing /api/leagues/7/standings:');
    try {
      const standingsRes = await fetch(`${baseUrl}/api/leagues/7/standings`, {
        headers: { 'Authorization': `Bearer ${testToken}` }
      });
      const standingsData = await standingsRes.json();
      
      if (standingsRes.ok) {
        console.log('✅ Standings API works');
        console.log('  Teams found:', standingsData.length);
        const oakland = standingsData.find(t => t.name.includes('Oakland'));
        if (oakland) {
          console.log('  Oakland Cougars:', {
            wins: oakland.wins,
            losses: oakland.losses,
            points: oakland.points,
            played: oakland.played
          });
        }
      } else {
        console.log('❌ Auth required (expected):', standingsData.message);
      }
    } catch (error) {
      console.log('❌ API not responding:', error.message);
    }

    // Check if development server is running
    console.log('\n🔧 Checking development server status:');
    try {
      const healthRes = await fetch(`${baseUrl}/health`);
      if (healthRes.ok) {
        console.log('✅ Development server is running');
      } else {
        console.log('⚠️ Development server responding but not healthy');
      }
    } catch (error) {
      console.log('❌ Development server not responding - start with: npm run dev:local');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAPIs();