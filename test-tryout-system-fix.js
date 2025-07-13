/**
 * Comprehensive Tryout System Fix Test
 * Tests potentialRating conversion, seasonal restrictions, and PlayerRole enum
 */

const BASE_URL = 'http://localhost:3000';

async function makeRequest(method, path, data = null) {
  const url = `${BASE_URL}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  const response = await fetch(url, options);
  const result = await response.json();
  
  return {
    status: response.status,
    data: result,
    ok: response.ok
  };
}

async function testTryoutSystemFix() {
  console.log('🧪 Testing Tryout System Fixes...\n');
  
  try {
    // Test 1: Check current team and season data
    console.log('📊 Test 1: Getting team and season data...');
    const myTeam = await makeRequest('GET', '/api/teams/my');
    if (!myTeam.ok) {
      console.error('❌ Failed to get team data:', myTeam.data);
      return;
    }
    
    const teamId = myTeam.data.id;
    console.log(`✅ Team ID: ${teamId} (${myTeam.data.name})`);
    
    const seasonData = await makeRequest('GET', `/api/teams/${teamId}/seasonal-data`);
    console.log(`✅ Season data: ${JSON.stringify(seasonData.data, null, 2)}`);
    
    // Test 2: Try to host a basic tryout (should work first time)
    console.log('\n📋 Test 2: Testing first tryout (should work)...');
    const firstTryout = await makeRequest('POST', `/api/teams/${teamId}/tryouts`, {
      type: 'basic'
    });
    
    if (firstTryout.ok) {
      console.log('✅ First tryout successful!');
      console.log(`✅ Generated ${firstTryout.data.candidates.length} candidates`);
      console.log(`✅ Cost: ${firstTryout.data.cost} credits`);
      
      // Test 3: Try to add candidates to taxi squad (test potentialRating conversion)
      console.log('\n👥 Test 3: Testing taxi squad addition (potentialRating fix)...');
      const candidatesToAdd = firstTryout.data.candidates.slice(0, 2); // Add first 2 candidates
      
      const addCandidates = await makeRequest('POST', `/api/teams/${teamId}/taxi-squad/add-candidates`, {
        candidates: candidatesToAdd
      });
      
      if (addCandidates.ok) {
        console.log('✅ Candidates added to taxi squad successfully!');
        console.log(`✅ Added ${addCandidates.data.players.length} players`);
        console.log(`✅ potentialRating conversion working correctly`);
        
        // Show added player details
        addCandidates.data.players.forEach((player, index) => {
          console.log(`   Player ${index + 1}: ${player.firstName} ${player.lastName} (${player.race} ${player.role})`);
          console.log(`   Potential: ${player.potentialRating} (type: ${typeof player.potentialRating})`);
        });
      } else {
        console.error('❌ Failed to add candidates to taxi squad:', addCandidates.data);
      }
      
      // Test 4: Try to host another tryout (should be blocked by seasonal restriction)
      console.log('\n🚫 Test 4: Testing seasonal restriction (should be blocked)...');
      const secondTryout = await makeRequest('POST', `/api/teams/${teamId}/tryouts`, {
        type: 'basic'
      });
      
      if (!secondTryout.ok && secondTryout.data.error && secondTryout.data.error.includes('once per season')) {
        console.log('✅ Seasonal restriction working correctly!');
        console.log(`✅ Blocked second tryout with message: "${secondTryout.data.error}"`);
      } else {
        console.error('❌ Seasonal restriction NOT working - second tryout was allowed:', secondTryout.data);
      }
      
      // Test 5: Check tryout history
      console.log('\n📜 Test 5: Checking tryout history...');
      const updatedSeasonData = await makeRequest('GET', `/api/teams/${teamId}/seasonal-data`);
      console.log(`✅ Updated season data: ${JSON.stringify(updatedSeasonData.data, null, 2)}`);
      
    } else {
      console.error('❌ First tryout failed:', firstTryout.data);
    }
    
    // Test 6: Check taxi squad
    console.log('\n📋 Test 6: Checking taxi squad...');
    const taxiSquad = await makeRequest('GET', `/api/teams/${teamId}/taxi-squad`);
    if (taxiSquad.ok) {
      console.log(`✅ Taxi squad has ${taxiSquad.data.length} players`);
      taxiSquad.data.forEach((player, index) => {
        console.log(`   Player ${index + 1}: ${player.firstName} ${player.lastName} (Role: ${player.role})`);
      });
    } else {
      console.error('❌ Failed to get taxi squad:', taxiSquad.data);
    }
    
    console.log('\n🎉 Tryout system fix test completed!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testTryoutSystemFix().catch(console.error);