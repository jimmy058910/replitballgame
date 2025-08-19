// Direct database update to fix the day progression issue
console.log('🔧 DIRECT DATABASE FIX: Manually advancing season days...');

// Use fetch to update via API instead of direct database access
async function fixProgression() {
  try {
    // First, let's get the current season data
    console.log('📊 Getting current season data...');
    const seasonResponse = await fetch('http://localhost:5000/api/season/current-cycle');
    const seasonData = await seasonResponse.json();
    
    console.log('Current season:', seasonData);
    
    // Calculate what day we should be on
    const seasonStartDate = new Date('2025-08-16T15:40:19.081Z'); // From logs
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - seasonStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const correctDay = Math.min((daysSinceStart % 17) + 1, 17);
    
    console.log('Calculation:', {
      seasonStart: seasonStartDate.toISOString(),
      now: now.toISOString(),
      daysSinceStart,
      currentDay: seasonData.currentDay,
      correctDay,
      needsAdvancement: correctDay > seasonData.currentDay
    });
    
    if (correctDay > seasonData.currentDay) {
      console.log(`🚀 Need to advance from Day ${seasonData.currentDay} to Day ${correctDay}`);
      
      // Try to trigger manual progression via API
      console.log('🔄 Attempting manual progression trigger...');
      
      for (let day = seasonData.currentDay + 1; day <= correctDay; day++) {
        console.log(`📅 Advancing to Day ${day}...`);
        
        const progressResponse = await fetch('http://localhost:5000/api/daily-progression/force-execute', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer fake-token-for-dev',
            'Content-Type': 'application/json'
          }
        });
        
        if (progressResponse.ok) {
          const result = await progressResponse.text();
          console.log(`✅ Day ${day} progression result:`, result.substring(0, 100));
        } else {
          console.log(`❌ Day ${day} progression failed:`, progressResponse.status);
          break;
        }
        
        // Wait a moment between progressions
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Check final result
      const finalResponse = await fetch('http://localhost:5000/api/season/current-cycle');
      const finalData = await finalResponse.json();
      console.log('Final result:', finalData);
      
    } else {
      console.log('✅ Season day is already correct');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixProgression();