/**
 * Focused Production Test - Quick System Validation
 * Tests critical systems for production readiness
 */

import http from 'http';

const BASE_URL = 'http://localhost:5000';
const authCookie = 'connect.sid=s%3AjZGjlLmOG9w3FzwKvSJgEIAa6CgwCdXP.7B3dDgmjYFZOsYwNZWQpPQ8pMpqQxgHZKfD6vqYyFPy';

async function quickTest(name, method, path, data = null) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      timeout: 3000,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookie
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        const success = res.statusCode >= 200 && res.statusCode < 300;
        console.log(`${success ? '✅' : '❌'} ${name} - ${res.statusCode}`);
        resolve({ success, status: res.statusCode, body });
      });
    });

    req.on('error', (err) => {
      console.log(`❌ ${name} - Error: ${err.message}`);
      resolve({ success: false, error: err.message });
    });

    req.on('timeout', () => {
      console.log(`❌ ${name} - Timeout`);
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });

    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runFocusedTest() {
  console.log('🎯 FOCUSED PRODUCTION TEST - CRITICAL SYSTEMS');
  console.log('============================================');
  
  const tests = [
    ['Server Health', 'GET', '/api/server/time'],
    ['Authentication', 'GET', '/api/auth/user'],
    ['Team Data', 'GET', '/api/teams/my'],
    ['Player Roster', 'GET', '/api/players'],
    ['Staff Roster', 'GET', '/api/staff'],
    ['Store Items', 'GET', '/api/store/items'],
    ['Marketplace', 'GET', '/api/marketplace/listings'],
    ['Tactical Formation', 'GET', '/api/tactical/formation'],
    ['Exhibition Stats', 'GET', '/api/exhibitions/stats'],
    ['League Standings', 'GET', '/api/leagues/8/standings'],
    ['Tournament System', 'GET', '/api/tournaments/8'],
    ['Tryout Candidates', 'GET', '/api/tryouts/candidates'],
    ['Daily Schedule', 'GET', '/api/leagues/daily-schedule'],
    ['Ad System', 'GET', '/api/store/ads'],
    ['Stadium Revenue', 'GET', '/api/stadium/revenue']
  ];

  let passed = 0;
  let total = tests.length;

  for (const [name, method, path] of tests) {
    const result = await quickTest(name, method, path);
    if (result.success) passed++;
  }

  console.log('\n📊 FOCUSED TEST RESULTS');
  console.log('======================');
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`📈 Success Rate: ${Math.round((passed/total)*100)}%`);
  
  if (passed === total) {
    console.log('🎉 ALL CRITICAL SYSTEMS OPERATIONAL');
    console.log('🚀 PRODUCTION READY - Alpha release approved!');
  } else if (passed >= total * 0.9) {
    console.log('✅ ALPHA READY - Minor issues present');
  } else {
    console.log('⚠️  NEEDS ATTENTION - Critical issues detected');
  }

  // Test specific functionality
  console.log('\n🔧 TESTING SPECIFIC FUNCTIONALITY');
  console.log('=================================');
  
  // Test store purchase
  await quickTest('Store Purchase', 'POST', '/api/store/purchase/worn_cleats', {
    currency: 'credits',
    expectedPrice: 1500
  });
  
  // Test exhibition challenge
  await quickTest('Exhibition Challenge', 'POST', '/api/exhibitions/challenge', {});
  
  // Test exhibition instant
  await quickTest('Exhibition Instant', 'POST', '/api/exhibitions/instant', {});
  
  // Test ad watching
  await quickTest('Watch Ad', 'POST', '/api/store/watch-ad', {
    adType: 'rewarded_video',
    placement: 'test'
  });

  console.log('\n🎯 FOCUSED PRODUCTION TEST COMPLETE');
  console.log('==================================');
}

// Run focused test
runFocusedTest().catch(console.error);