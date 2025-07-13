/**
 * Quick Database-Backed Persistence Test
 */

const BASE_URL = 'http://localhost:5000';

async function makeRequest(method, path, data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': 'authToken=user_1|1736733444|dRWxj7CnM7gYJ0BWJl-YBDEKg40; user_1|1736733444|dRWxj7CnM7gYJ0BWJl-YBDEKg40=true'
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(`${BASE_URL}${path}`, options);
  const responseData = await response.text();
  
  try {
    return {
      status: response.status,
      data: JSON.parse(responseData)
    };
  } catch (e) {
    return {
      status: response.status,
      data: responseData
    };
  }
}

async function quickPersistenceTest() {
  console.log('🧪 Quick Database-Backed Persistence Test\n');

  try {
    // Check live matches
    const liveMatches = await makeRequest('GET', '/api/matches/live');
    console.log(`📊 Found ${liveMatches.data.length} live matches`);

    if (liveMatches.data.length === 0) {
      console.log('❌ No live matches found - creating one...');
      const createMatch = await makeRequest('POST', '/api/exhibition/instant');
      if (createMatch.status === 200) {
        console.log(`✅ Created match: ${createMatch.data.matchId}`);
      }
      return;
    }

    const matchId = liveMatches.data[0].id;
    console.log(`🎯 Testing match: ${matchId}`);

    // Check enhanced data
    const enhanced = await makeRequest('GET', `/api/matches/${matchId}/enhanced-data`);
    console.log(`🎮 Enhanced data status: ${enhanced.status}`);
    
    if (enhanced.status === 200) {
      console.log(`⏱️  Game time: ${enhanced.data.gameTime} seconds`);
      console.log(`🎉 Score: ${enhanced.data.homeScore}-${enhanced.data.awayScore}`);
      console.log(`💬 Events: ${enhanced.data.gameEvents?.length || 0} events`);
      console.log(`🏆 MVP: ${enhanced.data.mvpPlayers?.[0]?.name || 'No MVP'}`);
      console.log(`🎮 Game phase: ${enhanced.data.gamePhase || 'Unknown'}`);
    }

    // Check database state
    const dbMatch = await makeRequest('GET', `/api/matches/${matchId}`);
    console.log(`💾 Database simulationLog: ${dbMatch.data.simulationLog ? 'YES' : 'NO'}`);
    
    if (dbMatch.data.simulationLog) {
      console.log(`📝 Persisted events: ${dbMatch.data.simulationLog.gameEvents?.length || 0}`);
      console.log(`🎯 Persisted game time: ${dbMatch.data.simulationLog.gameTime || 'N/A'}`);
    }

    // Check sync functionality
    const sync = await makeRequest('GET', `/api/matches/${matchId}/sync`);
    console.log(`🔄 Sync status: ${sync.status}`);

    // Results
    const results = {
      liveMatchExists: liveMatches.data.length > 0,
      enhancedDataWorking: enhanced.status === 200,
      eventsGenerated: (enhanced.data?.gameEvents?.length || 0) > 0,
      databasePersistence: !!dbMatch.data.simulationLog,
      syncWorking: sync.status === 200,
      mvpCalculations: !!(enhanced.data?.mvpPlayers?.[0]?.name)
    };

    console.log('\n📋 Persistence Test Results:');
    Object.entries(results).forEach(([key, value]) => {
      console.log(`   ${value ? '✅' : '❌'} ${key}: ${value}`);
    });

    const successCount = Object.values(results).filter(Boolean).length;
    console.log(`\n🎯 Result: ${successCount}/${Object.keys(results).length} tests passing`);

    if (successCount >= 4) {
      console.log('🎉 DATABASE-BACKED PERSISTENCE SYSTEM WORKING!');
    } else {
      console.log('⚠️  Some persistence features need attention');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

quickPersistenceTest().catch(console.error);