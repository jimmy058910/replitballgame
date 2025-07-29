// Test authentication flow step by step
import http from 'http';
import querystring from 'querystring';

function testAuthFlow() {
  console.log('🧪 Testing authentication flow...\n');
  
  // Test 1: Check if Google OAuth redirect works
  console.log('📍 Test 1: Google OAuth endpoint');
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/auth/google',
    method: 'GET',
    headers: {
      'User-Agent': 'Test-Client'
    }
  };

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    
    if (res.statusCode === 302) {
      const location = res.headers.location;
      if (location && location.includes('accounts.google.com')) {
        console.log('✅ Google OAuth redirect working correctly');
        console.log(`Redirect to: ${location.substring(0, 50)}...`);
      } else {
        console.log('❌ Unexpected redirect location:', location);
      }
    } else {
      console.log('❌ Expected 302 redirect, got:', res.statusCode);
    }
    
    console.log('\n📍 Test 2: API endpoints');
    testApiEndpoints();
  });

  req.on('error', (e) => {
    console.error('❌ Request failed:', e.message);
  });

  req.end();
}

function testApiEndpoints() {
  // Test /api/me endpoint
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/me',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`/api/me Status: ${res.statusCode}`);
      try {
        const parsed = JSON.parse(data);
        if (parsed.message === 'You are not authenticated') {
          console.log('✅ Unauthenticated response correct');
        } else {
          console.log('Response:', parsed);
        }
      } catch (e) {
        console.log('Response body:', data);
      }
      
      console.log('\n📍 Test 3: Health check');
      testHealthCheck();
    });
  });

  req.on('error', (e) => {
    console.error('❌ /api/me request failed:', e.message);
  });

  req.end();
}

function testHealthCheck() {
  // Test health endpoint
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/health',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`/health Status: ${res.statusCode}`);
      try {
        const parsed = JSON.parse(data);
        if (parsed.status === 'healthy') {
          console.log('✅ Health check passing');
        } else {
          console.log('❓ Unexpected health response:', parsed);
        }
      } catch (e) {
        console.log('Health response body:', data);
      }
      
      console.log('\n🎯 Authentication test complete!');
      console.log('\n💡 Next step: Try OAuth flow in browser at http://localhost:5000/auth/google');
    });
  });

  req.on('error', (e) => {
    console.error('❌ /health request failed:', e.message);
  });

  req.end();
}

testAuthFlow();