/**
 * Comprehensive Component Test - Tests all major UI components
 * Using curl to test the key endpoints that components rely on
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testEndpoint(name, endpoint) {
  try {
    const { stdout, stderr } = await execAsync(`curl -s "http://localhost:3000${endpoint}" | head -c 500`);
    
    if (stderr) {
      console.log(`❌ ${name} - STDERR: ${stderr}`);
      return false;
    }
    
    if (stdout.includes('error') || stdout.includes('Error') || stdout.includes('null')) {
      console.log(`⚠️  ${name} - Response may have issues: ${stdout.substring(0, 100)}...`);
      return false;
    }
    
    console.log(`✅ ${name} - OK`);
    return true;
  } catch (error) {
    console.log(`❌ ${name} - ERROR: ${error.message}`);
    return false;
  }
}

async function testAllComponents() {
  console.log('🧪 Testing All Major Components & Endpoints');
  console.log('=' .repeat(50));

  const tests = [
    { name: 'Server Time', endpoint: '/api/server/time' },
    { name: 'Team Data', endpoint: '/api/teams/my' },
    { name: 'Players', endpoint: '/api/teams/132/players' },
    { name: 'Finances', endpoint: '/api/teams/132/finances' },
    { name: 'Formation', endpoint: '/api/teams/132/formation' },
    { name: 'Staff', endpoint: '/api/teams/132/staff' },
    { name: 'Live Matches', endpoint: '/api/matches/live' },
    { name: 'Standings', endpoint: '/api/leagues/8/standings' },
    { name: 'Store', endpoint: '/api/store/' },
    { name: 'Notifications', endpoint: '/api/notifications' },
    { name: 'Season Cycle', endpoint: '/api/season/current-cycle' },
    { name: 'Injury Stats', endpoint: '/api/injury-stamina/system/stats' },
    { name: 'Marketplace', endpoint: '/api/marketplace/listings' },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const success = await testEndpoint(test.name, test.endpoint);
    if (success) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log('\n' + '=' .repeat(50));
  console.log(`📊 RESULTS: ${passed} passed, ${failed} failed`);
  console.log(`📈 Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('🎉 ALL COMPONENTS WORKING - No errors found!');
  } else {
    console.log(`⚠️  ${failed} components may have issues`);
  }
}

testAllComponents().catch(console.error);