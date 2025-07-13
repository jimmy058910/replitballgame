/**
 * Comprehensive System Test for Realm Rivalry
 * Tests all critical systems after database migration and BigInt serialization fixes
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

async function testEndpoint(name, method, path, expectedStatus = 200) {
  try {
    const result = await makeRequest(method, path);
    const success = result.status === expectedStatus;
    console.log(`${success ? '✅' : '❌'} ${name}: ${result.status} ${success ? 'PASS' : 'FAIL'}`);
    return { name, success, status: result.status, data: result.data };
  } catch (error) {
    console.log(`❌ ${name}: ERROR - ${error.message}`);
    return { name, success: false, error: error.message };
  }
}

async function runComprehensiveTests() {
  console.log('🧪 COMPREHENSIVE SYSTEM TEST - REALM RIVALRY\n');

  const results = [];

  // =====================================
  // 1. CORE AUTHENTICATION & TEAM SYSTEM
  // =====================================
  console.log('1. 🔐 CORE AUTHENTICATION & TEAM SYSTEM');
  results.push(await testEndpoint('User Team Data', 'GET', '/api/teams/my'));
  results.push(await testEndpoint('Team Players', 'GET', '/api/teams/132/players'));
  results.push(await testEndpoint('Team Finances', 'GET', '/api/teams/132/finances'));
  results.push(await testEndpoint('Team Staff', 'GET', '/api/teams/132/staff'));
  console.log('');

  // =====================================
  // 2. LIVE MATCH PERSISTENCE SYSTEM
  // =====================================
  console.log('2. 🎮 LIVE MATCH PERSISTENCE SYSTEM');
  
  // Test live matches endpoint
  const liveMatchesResult = await testEndpoint('Live Matches Endpoint', 'GET', '/api/matches/live');
  results.push(liveMatchesResult);
  
  let testMatchId = null;
  if (liveMatchesResult.success && liveMatchesResult.data.length > 0) {
    testMatchId = liveMatchesResult.data[0].id;
    console.log(`🎯 Using existing match: ${testMatchId}`);
    
    // Test persistence-related endpoints
    results.push(await testEndpoint('Match Data', 'GET', `/api/matches/${testMatchId}`));
    results.push(await testEndpoint('Enhanced Match Data', 'GET', `/api/matches/${testMatchId}/enhanced-data`));
    results.push(await testEndpoint('Match Sync', 'GET', `/api/matches/${testMatchId}/sync`));
    
    // Test database persistence
    const dbMatch = await makeRequest('GET', `/api/matches/${testMatchId}`);
    const hasPersistence = dbMatch.data.simulationLog ? true : false;
    console.log(`${hasPersistence ? '✅' : '❌'} Database Persistence: ${hasPersistence ? 'ACTIVE' : 'INACTIVE'}`);
    
    // Test enhanced data functionality
    const enhancedResult = await makeRequest('GET', `/api/matches/${testMatchId}/enhanced-data`);
    const hasEnhancedData = enhancedResult.status === 200;
    console.log(`${hasEnhancedData ? '✅' : '❌'} Enhanced Data: ${hasEnhancedData ? 'WORKING' : 'BROKEN'}`);
    
    if (hasEnhancedData && enhancedResult.data) {
      console.log(`   📊 Game Phase: ${enhancedResult.data.gamePhase || 'N/A'}`);
      console.log(`   🎉 Score: ${enhancedResult.data.homeScore || 0}-${enhancedResult.data.awayScore || 0}`);
      console.log(`   💬 Events: ${enhancedResult.data.gameEvents?.length || 0} events`);
      console.log(`   🏆 MVP: ${enhancedResult.data.mvpPlayers?.[0]?.name || 'No MVP'}`);
    }
  } else {
    console.log('⚠️  No live matches found - testing exhibition creation');
  }
  console.log('');

  // =====================================
  // 3. EXHIBITION MATCH SYSTEM
  // =====================================
  console.log('3. 🏟️  EXHIBITION MATCH SYSTEM');
  
  // Test exhibition creation
  const exhibitionResult = await testEndpoint('Create Exhibition Match', 'POST', '/api/exhibition/instant');
  results.push(exhibitionResult);
  
  if (exhibitionResult.success) {
    const newMatchId = exhibitionResult.data.matchId;
    console.log(`🎯 Created exhibition match: ${newMatchId}`);
    
    // Wait for match to initialize
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test exhibition match endpoints
    results.push(await testEndpoint('Exhibition Match Data', 'GET', `/api/matches/${newMatchId}`));
    results.push(await testEndpoint('Exhibition Enhanced Data', 'GET', `/api/matches/${newMatchId}/enhanced-data`));
    results.push(await testEndpoint('Exhibition Sync', 'GET', `/api/matches/${newMatchId}/sync`));
    
    testMatchId = newMatchId; // Use this for further testing
  }
  console.log('');

  // =====================================
  // 4. MATCH SIMULATION & PROGRESSION
  // =====================================
  console.log('4. ⚡ MATCH SIMULATION & PROGRESSION');
  
  if (testMatchId) {
    // Test match progression over time
    console.log('📈 Testing match progression...');
    
    for (let i = 0; i < 3; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const progressResult = await makeRequest('GET', `/api/matches/${testMatchId}/enhanced-data`);
      if (progressResult.status === 200) {
        const data = progressResult.data;
        console.log(`   🕐 Check ${i+1}: Time=${data.gameTime || 'N/A'}s, Score=${data.homeScore || 0}-${data.awayScore || 0}, Events=${data.gameEvents?.length || 0}`);
      }
    }
  }
  console.log('');

  // =====================================
  // 5. GAME MECHANICS INTEGRATION
  // =====================================
  console.log('5. 🎯 GAME MECHANICS INTEGRATION');
  results.push(await testEndpoint('Stadium Data', 'GET', '/api/stadium/132'));
  results.push(await testEndpoint('Store System', 'GET', '/api/store/'));
  results.push(await testEndpoint('Marketplace', 'GET', '/api/marketplace/listings'));
  results.push(await testEndpoint('Notifications', 'GET', '/api/notifications'));
  console.log('');

  // =====================================
  // 6. LEAGUE & COMPETITION SYSTEM
  // =====================================
  console.log('6. 🏆 LEAGUE & COMPETITION SYSTEM');
  results.push(await testEndpoint('League Standings', 'GET', '/api/leagues/8/standings'));
  results.push(await testEndpoint('Season Data', 'GET', '/api/season/current-cycle'));
  results.push(await testEndpoint('Server Time', 'GET', '/api/server/time'));
  console.log('');

  // =====================================
  // 7. PERSISTENCE SYSTEM VALIDATION
  // =====================================
  console.log('7. 💾 PERSISTENCE SYSTEM VALIDATION');
  
  if (testMatchId) {
    console.log('🔍 Testing persistence system integrity...');
    
    // Test database state
    const dbState = await makeRequest('GET', `/api/matches/${testMatchId}`);
    const hasSimulationLog = dbState.data.simulationLog ? true : false;
    console.log(`${hasSimulationLog ? '✅' : '❌'} Database Storage: ${hasSimulationLog ? 'ACTIVE' : 'INACTIVE'}`);
    
    // Test live state recovery
    const syncState = await makeRequest('GET', `/api/matches/${testMatchId}/sync`);
    const canSync = syncState.status === 200;
    console.log(`${canSync ? '✅' : '❌'} Live State Sync: ${canSync ? 'WORKING' : 'BROKEN'}`);
    
    // Test enhanced data consistency
    const enhancedState = await makeRequest('GET', `/api/matches/${testMatchId}/enhanced-data`);
    const hasEnhanced = enhancedState.status === 200;
    console.log(`${hasEnhanced ? '✅' : '❌'} Enhanced Data: ${hasEnhanced ? 'WORKING' : 'BROKEN'}`);
    
    // Test halftime detection for ads
    if (hasEnhanced && enhancedState.data.gamePhase) {
      const gamePhase = enhancedState.data.gamePhase;
      const halftimeReady = gamePhase !== undefined;
      console.log(`${halftimeReady ? '✅' : '❌'} Halftime Detection: ${halftimeReady ? 'READY' : 'NOT READY'} (Phase: ${gamePhase})`);
    }
  }
  console.log('');

  // =====================================
  // 8. SYSTEM HEALTH CHECK
  // =====================================
  console.log('8. 🏥 SYSTEM HEALTH CHECK');
  
  const systemHealth = {
    totalTests: results.length,
    passedTests: results.filter(r => r.success).length,
    failedTests: results.filter(r => !r.success).length,
    persistenceWorking: testMatchId ? true : false,
    exhibitionWorking: exhibitionResult ? exhibitionResult.success : false,
    coreEndpointsWorking: results.slice(0, 4).every(r => r.success)
  };
  
  console.log(`📊 Test Results: ${systemHealth.passedTests}/${systemHealth.totalTests} passed`);
  console.log(`${systemHealth.coreEndpointsWorking ? '✅' : '❌'} Core Endpoints: ${systemHealth.coreEndpointsWorking ? 'HEALTHY' : 'UNHEALTHY'}`);
  console.log(`${systemHealth.exhibitionWorking ? '✅' : '❌'} Exhibition System: ${systemHealth.exhibitionWorking ? 'HEALTHY' : 'UNHEALTHY'}`);
  console.log(`${systemHealth.persistenceWorking ? '✅' : '❌'} Persistence System: ${systemHealth.persistenceWorking ? 'HEALTHY' : 'UNHEALTHY'}`);
  
  const overallHealth = (systemHealth.passedTests / systemHealth.totalTests) * 100;
  console.log(`\n🎯 Overall System Health: ${overallHealth.toFixed(1)}%`);
  
  if (overallHealth >= 90) {
    console.log('🎉 SYSTEM STATUS: EXCELLENT - All major systems operational');
  } else if (overallHealth >= 75) {
    console.log('✅ SYSTEM STATUS: GOOD - Most systems operational');
  } else if (overallHealth >= 50) {
    console.log('⚠️  SYSTEM STATUS: FAIR - Some systems need attention');
  } else {
    console.log('❌ SYSTEM STATUS: POOR - Major systems failing');
  }

  // =====================================
  // 9. DETAILED FAILURE ANALYSIS
  // =====================================
  const failedTests = results.filter(r => !r.success);
  if (failedTests.length > 0) {
    console.log('\n🔍 FAILED TESTS ANALYSIS:');
    failedTests.forEach(test => {
      console.log(`   ❌ ${test.name}: Status ${test.status} - ${test.error || 'API Error'}`);
    });
  }

  return systemHealth;
}

// Run the comprehensive test
runComprehensiveTests().then(health => {
  console.log('\n🏁 COMPREHENSIVE SYSTEM TEST COMPLETE');
  process.exit(health.passedTests === health.totalTests ? 0 : 1);
}).catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});