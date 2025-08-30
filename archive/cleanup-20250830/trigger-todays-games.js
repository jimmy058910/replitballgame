// Quick script to trigger today's game simulations
import fetch from 'node-fetch';

async function triggerTodaysGames() {
  try {
    console.log('🎮 Fetching today\'s scheduled games...');
    
    // Get all scheduled matches
    const response = await fetch('http://localhost:5000/api/matches/schedule', {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const matches = await response.json();
    console.log(`📊 Found ${matches.length} total matches`);
    
    // Filter for today's games
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const todaysGames = matches.filter(match => 
      match.gameDate.includes(today) && match.status === 'SCHEDULED'
    );
    
    console.log(`🎯 Found ${todaysGames.length} scheduled games for today (${today})`);
    
    if (todaysGames.length === 0) {
      console.log('ℹ️ No scheduled games found for today');
      return;
    }
    
    // Simulate each game
    let simulatedCount = 0;
    for (const game of todaysGames) {
      try {
        console.log(`⚽ Simulating: ${game.homeTeam.name} vs ${game.awayTeam.name}`);
        
        const simResponse = await fetch(`http://localhost:5000/api/matches/${game.id}/simulate`, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json'
          }
        });
        
        if (simResponse.ok) {
          const result = await simResponse.json();
          console.log(`   ✅ Result: ${game.homeTeam.name} ${result.homeScore} - ${result.awayScore} ${game.awayTeam.name}`);
          simulatedCount++;
        } else {
          console.log(`   ❌ Failed: ${simResponse.statusText}`);
        }
        
        // Small delay between simulations
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`   ❌ Error simulating game ${game.id}:`, error.message);
      }
    }
    
    console.log(`🏆 Successfully simulated ${simulatedCount}/${todaysGames.length} games!`);
    
  } catch (error) {
    console.error('❌ Failed to trigger game simulations:', error.message);
  }
}

triggerTodaysGames();