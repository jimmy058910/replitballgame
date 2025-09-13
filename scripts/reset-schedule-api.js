#!/usr/bin/env node

/**
 * SCHEDULE RESET API CALL
 * Uses curl to call a temporary development endpoint to reset the schedule
 */

const http = require('http');

async function callResetEndpoint() {
  console.log('🔧 [SCHEDULE RESET] Calling development server to reset schedule...');
  
  const postData = JSON.stringify({
    action: 'reset_schedule',
    days: [8, 9, 10, 11, 12, 13, 14],
    reason: 'Fix Day 8 wrong scoring + Days 9-14 premature simulation'
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/reset-schedule',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('✅ [SCHEDULE RESET] Response:', response);
          resolve(response);
        } catch (error) {
          console.log('📄 [SCHEDULE RESET] Raw response:', data);
          resolve(data);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ [SCHEDULE RESET] Request failed:', error.message);
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

// Run the reset
callResetEndpoint().catch(console.error);