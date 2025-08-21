// Simple test to simulate games via direct curl to the server
const https = require('http');

async function testGameSimulation() {
  console.log('🎮 Testing game simulation trigger...');
  
  const postData = JSON.stringify({
    action: 'simulate_todays_games',
    day: 6
  });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/trigger-simulation',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Response:', data);
    });
  });

  req.on('error', (err) => {
    console.error('Request error:', err.message);
  });

  req.write(postData);
  req.end();
}

testGameSimulation();