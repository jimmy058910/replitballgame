// Simple debug script to check API status
const http = require('http');

async function checkStatus() {
  console.log('🧪 Checking late signup status...');
  
  // Check status via API
  try {
    const response = await fetch('http://localhost:5000/api/late-signup/status', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('📊 Late Signup Status:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Status check failed:', response.status);
    }
  } catch (error) {
    console.log('❌ API call failed:', error.message);
  }
  
  // Trigger processing via API
  try {
    console.log('🔧 Triggering late signup processing...');
    const response = await fetch('http://localhost:5000/api/late-signup/test-daily-processing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Processing triggered:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Processing trigger failed:', response.status);
    }
  } catch (error) {
    console.log('❌ Processing trigger failed:', error.message);
  }
}

checkStatus();