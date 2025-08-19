// Test the automation service directly
async function debugAutomation() {
  try {
    console.log('🧪 Testing automation service status...');
    
    // Make a simple API call to check what's happening
    const response = await fetch('http://localhost:5000/api/season/current-cycle');
    const data = await response.json();
    console.log('Current season status:', data);
    
    // Check current time in EDT
    const now = new Date();
    const edtTime = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
    console.log('Current EDT time:', edtTime);
    
    // Calculate next 3:00 AM EDT
    const nextThreeAM = new Date();
    nextThreeAM.setDate(nextThreeAM.getDate() + (nextThreeAM.getHours() >= 3 ? 1 : 0));
    nextThreeAM.setHours(3, 0, 0, 0);
    
    const hoursUntil3AM = Math.round((nextThreeAM.getTime() - now.getTime()) / (1000 * 60 * 60));
    console.log(`Next daily progression: ${nextThreeAM.toLocaleString('en-US', { timeZone: 'America/New_York' })} (${hoursUntil3AM} hours from now)`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugAutomation();