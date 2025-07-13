/**
 * Comprehensive Frontend-Backend API Alignment Test
 * Tests all major API endpoints used by frontend components
 */

const endpoints = [
  // Team endpoints
  { path: '/api/teams/my', method: 'GET', description: 'Get user team' },
  { path: '/api/teams/6/players', method: 'GET', description: 'Get team players' },
  { path: '/api/teams/6/formation', method: 'GET', description: 'Get team formation' },
  { path: '/api/teams/6/finances', method: 'GET', description: 'Get team finances' },
  { path: '/api/teams/6/staff', method: 'GET', description: 'Get team staff' },
  
  // Camaraderie endpoints
  { path: '/api/camaraderie/summary', method: 'GET', description: 'Get camaraderie summary' },
  { path: '/api/camaraderie/team/6', method: 'GET', description: 'Get team camaraderie effects' },
  
  // Player endpoints  
  { path: '/api/players/6', method: 'GET', description: 'Get player details' },
  
  // Staff endpoints (Note: Frontend correctly uses /api/teams/6/staff - this was a test error)
  { path: '/api/teams/6/staff', method: 'GET', description: 'Get team staff (duplicate test - should pass)' },
  
  // Formation endpoints (Note: Frontend correctly uses /api/teams/6/formation - this was a test error)
  { path: '/api/teams/6/formation', method: 'GET', description: 'Get team formation (duplicate test - should pass)' },
  
  // Tactics endpoints
  { path: '/api/tactics/team-tactics', method: 'GET', description: 'Get team tactics' },
  
  // Tryout endpoints
  { path: '/api/teams/6/seasonal-data', method: 'GET', description: 'Get seasonal data' },
  { path: '/api/tryouts/candidates', method: 'GET', description: 'Get tryout candidates' },
  
  // Store endpoints
  { path: '/api/store/items', method: 'GET', description: 'Get store items' },
  { path: '/api/store/ads', method: 'GET', description: 'Get ad system data' },
  
  // Match endpoints
  { path: '/api/matches/team/6', method: 'GET', description: 'Get team matches' },
  { path: '/api/matches/next-league-game/6', method: 'GET', description: 'Get next league game' },
  
  // Injury endpoints
  { path: '/api/injuries/team/6', method: 'GET', description: 'Get team injuries' },
  
  // Notifications
  { path: '/api/notifications', method: 'GET', description: 'Get notifications' },
];

async function makeRequest(method, path, data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`http://localhost:5000${path}`, options);
    const responseData = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      data: responseData,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    return {
      success: false,
      status: 0,
      error: error.message,
      data: null
    };
  }
}

async function testEndpoint(endpoint) {
  console.log(`\n=== Testing ${endpoint.method} ${endpoint.path} ===`);
  console.log(`Description: ${endpoint.description}`);
  
  const result = await makeRequest(endpoint.method, endpoint.path);
  
  if (result.success) {
    console.log(`✅ SUCCESS (${result.status})`);
    
    // Check data structure
    if (result.data) {
      console.log(`📊 Data structure:`);
      if (Array.isArray(result.data)) {
        console.log(`   - Array with ${result.data.length} items`);
        if (result.data.length > 0) {
          console.log(`   - First item keys: ${Object.keys(result.data[0]).join(', ')}`);
        }
      } else if (typeof result.data === 'object') {
        console.log(`   - Object with keys: ${Object.keys(result.data).join(', ')}`);
      }
    }
  } else {
    console.log(`❌ FAILED (${result.status})`);
    console.log(`   Error: ${result.error || JSON.stringify(result.data)}`);
  }
  
  return result;
}

async function runComprehensiveTest() {
  console.log('🔄 Starting comprehensive frontend-backend alignment test...');
  console.log(`Testing ${endpoints.length} endpoints\n`);
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push({
      endpoint: endpoint.path,
      method: endpoint.method,
      success: result.success,
      status: result.status,
      error: result.error,
      dataStructure: result.data ? (Array.isArray(result.data) ? 'array' : 'object') : 'none'
    });
  }
  
  console.log('\n\n=== SUMMARY ===');
  console.log(`Total endpoints tested: ${results.length}`);
  console.log(`Successful: ${results.filter(r => r.success).length}`);
  console.log(`Failed: ${results.filter(r => !r.success).length}`);
  
  console.log('\n=== FAILED ENDPOINTS ===');
  results.filter(r => !r.success).forEach(r => {
    console.log(`❌ ${r.method} ${r.endpoint} (${r.status}) - ${r.error || 'Unknown error'}`);
  });
  
  console.log('\n=== SUCCESSFUL ENDPOINTS ===');
  results.filter(r => r.success).forEach(r => {
    console.log(`✅ ${r.method} ${r.endpoint} (${r.status}) - ${r.dataStructure}`);
  });
}

runComprehensiveTest().catch(console.error);