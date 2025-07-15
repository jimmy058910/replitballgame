const fetch = require('node-fetch');

const API_BASE = 'http://localhost:5000';

async function testLateSignup() {
  console.log('🔄 Testing Late Signup System...\n');
  
  try {
    // Test 1: Check late signup window status
    console.log('1. Testing late signup window status...');
    const windowResponse = await fetch(`${API_BASE}/api/late-signup/window`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const windowData = await windowResponse.json();
    console.log('   Window Status:', windowData.success ? 'SUCCESS' : 'FAILED');
    console.log('   Is Late Signup Window:', windowData.data?.isLateSignupWindow);
    console.log('   Message:', windowData.data?.message);
    
    // Test 2: Check late signup statistics
    console.log('\n2. Testing late signup statistics...');
    const statsResponse = await fetch(`${API_BASE}/api/late-signup/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const statsData = await statsResponse.json();
    console.log('   Stats Status:', statsData.success ? 'SUCCESS' : 'FAILED');
    console.log('   Is Late Signup Window:', statsData.data?.isLateSignupWindow);
    console.log('   Active Subdivisions:', statsData.data?.activeSubdivisions?.length || 0);
    console.log('   Total Late Signup Teams:', statsData.data?.totalLateSignupTeams || 0);
    
    // Test 3: Check current season data
    console.log('\n3. Testing current season data...');
    const seasonResponse = await fetch(`${API_BASE}/api/season/current-cycle`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const seasonData = await seasonResponse.json();
    console.log('   Season Status:', seasonResponse.status === 200 ? 'SUCCESS' : 'FAILED');
    console.log('   Current Season:', seasonData.currentSeason);
    console.log('   Season Day:', seasonData.currentDayInCycle);
    console.log('   Season Description:', seasonData.description);
    
    // Test 4: Test team creation (this would be late signup if in window)
    console.log('\n4. Testing team creation logic...');
    const teamResponse = await fetch(`${API_BASE}/api/teams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test Late Signup Team',
        description: 'Testing late signup functionality'
      })
    });
    
    const teamData = await teamResponse.json();
    console.log('   Team Creation Status:', teamResponse.status === 201 ? 'SUCCESS' : 'FAILED');
    if (teamData.success) {
      console.log('   Team ID:', teamData.data?.id);
      console.log('   Team Name:', teamData.data?.name);
      console.log('   Division:', teamData.data?.division);
      console.log('   Subdivision:', teamData.data?.subdivision);
      console.log('   Is Late Signup:', teamData.isLateSignup);
    } else {
      console.log('   Error:', teamData.error || teamData.message);
    }
    
    console.log('\n✅ Late signup system testing completed!');
    
  } catch (error) {
    console.error('❌ Error during late signup testing:', error.message);
  }
}

// Run the test
testLateSignup();