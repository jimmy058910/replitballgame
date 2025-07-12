/**
 * Test Match Completion Workflow
 * Verifies that matches are properly removed from live matches when completed
 */

const BASE_URL = 'http://localhost:5000';

async function makeRequest(method, path, data = null) {
  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token'
    }
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  const response = await fetch(`${BASE_URL}${path}`, config);
  const result = await response.json();
  return { status: response.status, data: result };
}

async function testMatchCompletionWorkflow() {
  console.log('🏁 TESTING MATCH COMPLETION WORKFLOW');
  console.log('=' .repeat(40));

  let testsPassed = 0;
  let totalTests = 0;

  // Test 1: Verify no live matches initially
  console.log('\n1. Testing initial state (no live matches)');
  totalTests++;
  const initialLiveMatches = await makeRequest('GET', '/api/matches/live');
  if (initialLiveMatches.status === 200 && initialLiveMatches.data.length === 0) {
    console.log('✅ No live matches initially - clean state');
    testsPassed++;
  } else {
    console.log('❌ Expected no live matches initially');
  }

  // Test 2: Create an exhibition match
  console.log('\n2. Creating exhibition match');
  totalTests++;
  const exhibition = await makeRequest('POST', '/api/exhibitions/instant');
  if (exhibition.status === 200) {
    console.log('✅ Exhibition match created successfully');
    testsPassed++;
  } else {
    console.log('❌ Failed to create exhibition match');
    console.log('   Status:', exhibition.status);
    console.log('   Data:', exhibition.data);
  }

  // Test 3: Verify match appears in live matches
  console.log('\n3. Verifying match appears in live matches');
  totalTests++;
  const liveMatchesWithNew = await makeRequest('GET', '/api/matches/live');
  if (liveMatchesWithNew.status === 200 && liveMatchesWithNew.data.length > 0) {
    console.log('✅ Match appears in live matches');
    console.log(`   Match ID: ${liveMatchesWithNew.data[0].id}`);
    console.log(`   Status: ${liveMatchesWithNew.data[0].status}`);
    testsPassed++;
  } else {
    console.log('❌ Match not found in live matches');
  }

  // Test 4: Complete the match immediately
  if (liveMatchesWithNew.data.length > 0) {
    const matchId = liveMatchesWithNew.data[0].id;
    console.log('\n4. Completing match immediately');
    totalTests++;
    
    const completeResult = await makeRequest('POST', `/api/matches/${matchId}/complete-now`);
    if (completeResult.status === 200) {
      console.log('✅ Match completed successfully');
      testsPassed++;
    } else {
      console.log('❌ Failed to complete match');
      console.log('   Status:', completeResult.status);
      console.log('   Data:', completeResult.data);
    }

    // Test 5: Verify match is removed from live matches
    console.log('\n5. Verifying match is removed from live matches');
    totalTests++;
    
    // Wait a moment for the completion to be processed
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const finalLiveMatches = await makeRequest('GET', '/api/matches/live');
    if (finalLiveMatches.status === 200 && finalLiveMatches.data.length === 0) {
      console.log('✅ Match successfully removed from live matches');
      testsPassed++;
    } else {
      console.log('❌ Match still appears in live matches');
      console.log(`   Live matches count: ${finalLiveMatches.data.length}`);
    }

    // Test 6: Verify match is marked as completed in database
    console.log('\n6. Verifying match status in database');
    totalTests++;
    
    const completedMatch = await makeRequest('GET', `/api/matches/${matchId}`);
    if (completedMatch.status === 200 && completedMatch.data.status === 'COMPLETED') {
      console.log('✅ Match marked as COMPLETED in database');
      console.log(`   Final score: ${completedMatch.data.homeScore || 0} - ${completedMatch.data.awayScore || 0}`);
      testsPassed++;
    } else {
      console.log('❌ Match not properly marked as completed');
      console.log(`   Status: ${completedMatch.data?.status}`);
    }
  } else {
    console.log('\n❌ Cannot test completion - no live match found');
    totalTests += 3; // Skip tests 4, 5, 6
  }

  // Results
  console.log('\n' + '='.repeat(40));
  console.log('🎯 MATCH COMPLETION WORKFLOW TEST RESULTS');
  console.log('='.repeat(40));
  console.log(`✅ Tests Passed: ${testsPassed}/${totalTests}`);
  console.log(`📊 Success Rate: ${(testsPassed/totalTests*100).toFixed(1)}%`);
  
  if (testsPassed === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✅ Match completion workflow is working correctly!');
    console.log('✅ Completed matches are properly removed from live matches!');
  } else {
    console.log('\n⚠️  Some tests failed - details above');
  }

  return { testsPassed, totalTests };
}

// Run the test
testMatchCompletionWorkflow().catch(console.error);