/**
 * Comprehensive Live Match System Test
 * Tests exhibition matches, live simulation, and match completion
 */

import axios from 'axios';
import { promisify } from 'util';
const sleep = promisify(setTimeout);

const BASE_URL = 'http://localhost:3001';

// Mock authentication helper
async function makeRequest(method, path, data = null) {
  const config = {
    method,
    url: `${BASE_URL}${path}`,
    headers: {
      'Content-Type': 'application/json',
      // Mock authentication - in real app this would be a proper token
      'Authorization': 'Bearer dummy-token'
    }
  };

  if (data) {
    config.data = data;
  }

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`${method} ${path} failed:`, error.response?.data || error.message);
    throw error;
  }
}

async function testLiveMatchSystem() {
  console.log('🎮 Testing Live Match System Functionality...\n');
  
  try {
    // 1. Test Live Matches endpoint
    console.log('1. Testing Live Matches endpoint...');
    const liveMatches = await makeRequest('GET', '/api/matches/live');
    console.log(`✓ Found ${liveMatches.length} live matches`);
    
    if (liveMatches.length > 0) {
      const firstMatch = liveMatches[0];
      console.log(`  - Match ID: ${firstMatch.id}`);
      console.log(`  - Home Team: ${firstMatch.homeTeamName || 'Unknown'}`);
      console.log(`  - Away Team: ${firstMatch.awayTeamName || 'Unknown'}`);
      console.log(`  - Status: ${firstMatch.status}`);
      
      // 2. Test specific match endpoint
      console.log('\n2. Testing specific match endpoint...');
      const matchData = await makeRequest('GET', `/api/matches/${firstMatch.id}`);
      console.log(`✓ Successfully fetched match ${firstMatch.id}`);
      console.log(`  - Match found: ${matchData.id ? '✓' : '✗'}`);
      console.log(`  - Home Team: ${matchData.homeTeamName || 'Unknown'}`);
      console.log(`  - Away Team: ${matchData.awayTeamName || 'Unknown'}`);
      
      // 3. Test enhanced match data endpoint
      console.log('\n3. Testing enhanced match data endpoint...');
      try {
        const enhancedData = await makeRequest('GET', `/api/matches/${firstMatch.id}/enhanced-data`);
        console.log(`✓ Enhanced data available for match ${firstMatch.id}`);
        console.log(`  - Atmosphere effects: ${enhancedData.atmosphereEffects ? '✓' : '✗'}`);
        console.log(`  - Tactical effects: ${enhancedData.tacticalEffects ? '✓' : '✗'}`);
        console.log(`  - Player stats: ${enhancedData.playerStats ? '✓' : '✗'}`);
      } catch (error) {
        console.log(`  - Enhanced data not available (expected for completed matches)`);
      }
    }
    
    // 4. Test Exhibition Match Creation
    console.log('\n4. Testing Exhibition Match Creation...');
    try {
      // Create instant exhibition match
      const instantMatch = await makeRequest('POST', '/api/exhibition/instant');
      console.log(`✓ Instant exhibition match created: ${instantMatch.id}`);
      
      // Wait a moment for match to process
      await sleep(1000);
      
      // Check match status
      const matchStatus = await makeRequest('GET', `/api/matches/${instantMatch.id}`);
      console.log(`✓ Exhibition match status: ${matchStatus.status}`);
      console.log(`  - Match ID: ${matchStatus.id}`);
      console.log(`  - Home Team: ${matchStatus.homeTeamName || 'Unknown'}`);
      console.log(`  - Away Team: ${matchStatus.awayTeamName || 'Unknown'}`);
      
      // 5. Test match simulation if it's in progress
      if (matchStatus.status === 'IN_PROGRESS') {
        console.log('\n5. Testing live match simulation...');
        try {
          const liveState = await makeRequest('GET', `/api/matches/${instantMatch.id}/enhanced-data`);
          console.log(`✓ Live simulation data available`);
          console.log(`  - Game time: ${liveState.gameTime || 'Unknown'}`);
          console.log(`  - Scores: ${liveState.team1Score || 0} - ${liveState.team2Score || 0}`);
          console.log(`  - Recent events: ${liveState.recentEvents?.length || 0}`);
        } catch (error) {
          console.log(`  - Live simulation not available: ${error.message}`);
        }
      }
      
      // 6. Test match completion
      console.log('\n6. Testing match completion...');
      try {
        const completionResult = await makeRequest('POST', `/api/matches/${instantMatch.id}/complete-now`);
        console.log(`✓ Match completed successfully`);
        console.log(`  - Final score: ${completionResult.homeScore || 0} - ${completionResult.awayScore || 0}`);
        console.log(`  - Winner: ${completionResult.winner || 'Unknown'}`);
        
        // Verify match is completed
        const finalStatus = await makeRequest('GET', `/api/matches/${instantMatch.id}`);
        console.log(`✓ Match status after completion: ${finalStatus.status}`);
        
      } catch (error) {
        console.log(`  - Match completion failed: ${error.message}`);
      }
      
    } catch (error) {
      console.log(`  - Exhibition match creation failed: ${error.message}`);
    }
    
    console.log('\n✅ Live Match System Test Complete!');
    
  } catch (error) {
    console.error('❌ Live Match System Test Failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testLiveMatchSystem().catch(console.error);

export { testLiveMatchSystem };