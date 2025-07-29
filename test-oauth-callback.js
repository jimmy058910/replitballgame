// Test OAuth callback with a mock Google response
import http from 'http';

function testOAuthCallback() {
  console.log('🧪 Testing OAuth callback simulation...\n');
  
  // Test the callback endpoint with a mock scenario
  const callbackPath = '/auth/google/callback?code=mock_authorization_code&state=mock_state';
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: callbackPath,
    method: 'GET',
    headers: {
      'User-Agent': 'Test-Client',
      'Cookie': '' // Start with no cookies
    }
  };

  const req = http.request(options, (res) => {
    console.log(`Callback Status: ${res.statusCode}`);
    console.log(`Callback Headers:`, res.headers);
    
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      if (data) {
        console.log(`Response body: ${data.substring(0, 200)}...`);
      }
      
      // Check if we get redirected properly
      if (res.statusCode === 302) {
        console.log('✅ Got redirect response');
        const location = res.headers.location;
        if (location === '/') {
          console.log('✅ Redirected to homepage - authentication likely successful');
        } else if (location === '/login') {
          console.log('❌ Redirected to login - authentication failed');
        } else {
          console.log(`❓ Unexpected redirect: ${location}`);
        }
      } else if (res.statusCode === 500) {
        console.log('❌ Internal Server Error - this is the issue!');
        console.log('Response:', data);
      } else {
        console.log(`❓ Unexpected status: ${res.statusCode}`);
      }
    });
  });

  req.on('error', (e) => {
    console.error('❌ Callback test failed:', e.message);
  });

  req.end();
}

testOAuthCallback();