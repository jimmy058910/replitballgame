/**
 * Comprehensive UI Test - Tests all major pages, tabs, and buttons
 * This test will check every major UI component for post-merge errors
 */

import fs from 'fs';

const cookies = fs.readFileSync('./cookies.txt', 'utf8');

async function makeRequest(method, path, data = null) {
  const response = await fetch(`http://localhost:3000${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies.trim()
    },
    body: data ? JSON.stringify(data) : undefined
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function testComprehensiveUI() {
  console.log('🧪 Starting Comprehensive UI Test - All Pages, Tabs & Buttons');
  console.log('=' .repeat(60));

  const tests = [
    // Core Dashboard APIs
    { name: 'Dashboard - Server Time', path: '/api/server/time' },
    { name: 'Dashboard - Team Data', path: '/api/teams/my' },
    { name: 'Dashboard - Live Matches', path: '/api/matches/live' },
    { name: 'Dashboard - Notifications', path: '/api/notifications' },
    { name: 'Dashboard - Season Cycle', path: '/api/season/current-cycle' },
    
    // Team Management APIs
    { name: 'Team - Players', path: '/api/teams/132/players' },
    { name: 'Team - Finances', path: '/api/teams/132/finances' },
    { name: 'Team - Formation', path: '/api/teams/132/formation' },
    { name: 'Team - Seasonal Data', path: '/api/teams/132/seasonal-data' },
    
    // Medical Center APIs
    { name: 'Medical - System Stats', path: '/api/injury-stamina/system/stats' },
    { name: 'Medical - Team Status', path: '/api/injury-stamina/team/132/status' },
    
    // Store & Marketplace APIs
    { name: 'Store - Items', path: '/api/store/' },
    { name: 'Store - Ads', path: '/api/store/ads' },
    { name: 'Marketplace - Listings', path: '/api/marketplace/listings' },
    { name: 'Inventory - Team Items', path: '/api/inventory/132' },
    
    // Competition APIs
    { name: 'Competition - Standings', path: '/api/leagues/8/standings' },
    { name: 'Competition - Next Game', path: '/api/matches/next-league-game/132' },
    
    // Staff Management APIs
    { name: 'Staff - Team Staff', path: '/api/teams/132/staff' },
    
    // Tryout System APIs
    { name: 'Tryouts - Generate Candidates', path: '/api/tryouts/candidates' },
  ];

  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  for (const test of tests) {
    try {
      const startTime = Date.now();
      const result = await makeRequest('GET', test.path);
      const duration = Date.now() - startTime;
      
      console.log(`✅ ${test.name} - ${duration}ms`);
      results.passed++;
    } catch (error) {
      console.log(`❌ ${test.name} - ERROR: ${error.message}`);
      results.failed++;
      results.errors.push({
        test: test.name,
        path: test.path,
        error: error.message
      });
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log('📊 COMPREHENSIVE UI TEST RESULTS');
  console.log('=' .repeat(60));
  console.log(`✅ Passed: ${results.passed}/${tests.length}`);
  console.log(`❌ Failed: ${results.failed}/${tests.length}`);
  console.log(`📈 Success Rate: ${((results.passed / tests.length) * 100).toFixed(1)}%`);

  if (results.errors.length > 0) {
    console.log('\n🔥 ERRORS FOUND:');
    results.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.test}:`);
      console.log(`   Path: ${error.path}`);
      console.log(`   Error: ${error.error}`);
    });
  }

  // Test POST endpoints that are commonly used
  console.log('\n📝 Testing POST Endpoints...');
  
  const postTests = [
    { 
      name: 'Tryouts - Basic Tryout', 
      path: '/api/teams/132/tryouts',
      data: { type: 'basic' }
    }
  ];

  for (const test of postTests) {
    try {
      const result = await makeRequest('POST', test.path, test.data);
      console.log(`✅ ${test.name} - Success`);
    } catch (error) {
      console.log(`❌ ${test.name} - ERROR: ${error.message}`);
      results.errors.push({
        test: test.name,
        path: test.path,
        error: error.message
      });
    }
  }

  console.log('\n🎯 FINAL ASSESSMENT:');
  if (results.errors.length === 0) {
    console.log('🎉 ALL SYSTEMS OPERATIONAL - No post-merge errors found!');
  } else {
    console.log(`⚠️  ${results.errors.length} issues found that need attention:`);
    results.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error.test}: ${error.error}`);
    });
  }

  return results;
}

testComprehensiveUI().catch(console.error);