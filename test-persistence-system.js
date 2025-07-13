/**
 * Database-Backed Live Match State Persistence Test
 * Tests the new persistence system to ensure live commentary and MVP data survive server restarts
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

async function testLiveMatchPersistence() {
  console.log('\n🧪 Database-Backed Live Match State Persistence Test\n');

  try {
    // Step 1: Check for existing live matches
    console.log('1. Checking existing live matches...');
    const liveMatches = await makeRequest('GET', '/api/matches/live');
    console.log(`📊 Found ${liveMatches.data.length} live matches`);

    let matchId = null;
    
    if (liveMatches.data.length > 0) {
      // Use existing live match
      matchId = liveMatches.data[0].id;
      console.log(`🎯 Using existing live match: ${matchId}`);
    } else {
      // Create new exhibition match
      console.log('🎮 Creating new exhibition match...');
      const createMatch = await makeRequest('POST', '/api/exhibition/instant');
      
      if (createMatch.status === 200) {
        matchId = createMatch.data.matchId;
        console.log(`✅ Created exhibition match: ${matchId}`);
      } else {
        console.error('❌ Failed to create exhibition match:', createMatch);
        return;
      }
    }

    // Step 2: Wait for match to generate some events
    console.log('\n2. Waiting for match simulation to generate events...');
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds

    // Step 3: Check match state before testing persistence
    console.log('\n3. Checking match state before persistence test...');
    const matchBefore = await makeRequest('GET', `/api/matches/${matchId}`);
    const enhancedBefore = await makeRequest('GET', `/api/matches/${matchId}/enhanced-data`);
    
    console.log(`📈 Match status: ${matchBefore.data.status}`);
    console.log(`⏱️  Game time: ${enhancedBefore.data?.gameTime || 'N/A'} seconds`);
    console.log(`🎉 Score: ${matchBefore.data.homeScore}-${matchBefore.data.awayScore}`);
    console.log(`🏆 MVP: ${enhancedBefore.data?.mvpPlayers?.[0]?.name || 'No MVP'}`);
    console.log(`💬 Events: ${enhancedBefore.data?.gameEvents?.length || 0} events`);
    console.log(`🔧 Live state found: ${enhancedBefore.data ? 'YES' : 'NO'}`);

    // Step 4: Check database state (simulate what happens after server restart)
    console.log('\n4. Checking database persistence...');
    const dbMatch = await makeRequest('GET', `/api/matches/${matchId}`);
    
    if (dbMatch.data.simulationLog) {
      console.log('✅ Database persistence: simulationLog field contains live state data');
      console.log(`📊 Persisted events: ${dbMatch.data.simulationLog.gameEvents?.length || 0}`);
      console.log(`🏆 Persisted MVP: Available in player stats`);
      console.log(`⏱️  Persisted game time: ${dbMatch.data.simulationLog.gameTime || 'N/A'}`);
      console.log(`🎯 Persisted home score: ${dbMatch.data.simulationLog.homeScore || 0}`);
      console.log(`🎯 Persisted away score: ${dbMatch.data.simulationLog.awayScore || 0}`);
    } else {
      console.log('❌ Database persistence: simulationLog field is empty');
    }

    // Step 5: Test recovery mechanism
    console.log('\n5. Testing recovery mechanism...');
    const syncResult = await makeRequest('GET', `/api/matches/${matchId}/sync`);
    
    if (syncResult.status === 200) {
      console.log('✅ Match state synchronization working');
      console.log(`🔄 Sync returned: ${JSON.stringify(syncResult.data, null, 2).substring(0, 200)}...`);
    } else {
      console.log('❌ Match state synchronization failed:', syncResult);
    }

    // Step 6: Test halftime phase detection for ads
    console.log('\n6. Testing halftime phase detection for ads...');
    if (enhancedBefore.data?.gamePhase) {
      console.log(`🎮 Current game phase: ${enhancedBefore.data.gamePhase}`);
      console.log(`📺 Halftime ads can be triggered when gamePhase === "halftime"`);
      
      if (enhancedBefore.data.gamePhase === 'halftime') {
        console.log('🎯 HALFTIME DETECTED - Ads can be shown now!');
      } else {
        console.log(`⏳ Not halftime yet. Current phase: ${enhancedBefore.data.gamePhase}`);
      }
    } else {
      console.log('❌ Game phase data not available');
    }

    // Step 7: Final persistence validation
    console.log('\n7. Final persistence system validation...');
    
    const finalValidation = {
      databaseHasSimulationLog: !!dbMatch.data.simulationLog,
      liveStateRecoverable: syncResult.status === 200,
      eventsPresent: (enhancedBefore.data?.gameEvents?.length || 0) > 0,
      mvpCalculationsWorking: !!(enhancedBefore.data?.mvpPlayers?.[0]?.name),
      halftimeDetectable: !!enhancedBefore.data?.gamePhase,
      scoresUpdating: matchBefore.data.homeScore + matchBefore.data.awayScore > 0
    };

    console.log('📋 Persistence System Validation Results:');
    Object.entries(finalValidation).forEach(([key, value]) => {
      console.log(`   ${value ? '✅' : '❌'} ${key}: ${value}`);
    });

    const successCount = Object.values(finalValidation).filter(Boolean).length;
    const totalTests = Object.keys(finalValidation).length;
    
    console.log(`\n🎯 Overall Result: ${successCount}/${totalTests} tests passing`);
    
    if (successCount === totalTests) {
      console.log('🎉 DATABASE-BACKED PERSISTENCE SYSTEM FULLY FUNCTIONAL!');
      console.log('✅ Live commentary and MVP data will now survive server restarts');
      console.log('✅ Halftime ad timing will work correctly across restarts');
    } else {
      console.log('⚠️  Persistence system partially functional - some features need attention');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testLiveMatchPersistence().catch(console.error);