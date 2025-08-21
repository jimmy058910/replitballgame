// Simple test to check Oakland Cougars games and simulate one
console.log('🔍 Testing Oakland Cougars games...');

const headers = {
  'Authorization': 'Bearer test-token',
  'Content-Type': 'application/json'
};

// Test the team API first
fetch('http://localhost:5000/api/teams/4', { headers })
  .then(res => res.json())
  .then(team => {
    console.log('✅ Team loaded:', team.name);
    return fetch('http://localhost:5000/api/games', { headers });
  })
  .then(res => res.json())
  .then(games => {
    console.log('📊 Found', games.length, 'total games');
    
    // Find today's games for Oakland Cougars
    const today = new Date().toISOString().split('T')[0];
    const todaysGames = games.filter(game => 
      game.gameDate.includes(today) && 
      game.status === 'SCHEDULED' &&
      (game.homeTeam.name === 'Oakland Cougars' || game.awayTeam.name === 'Oakland Cougars')
    );
    
    console.log('🎯 Oakland Cougars games today:', todaysGames.length);
    
    if (todaysGames.length > 0) {
      const firstGame = todaysGames[0];
      console.log('⚽ First game:', firstGame.homeTeam.name, 'vs', firstGame.awayTeam.name);
      console.log('🕐 Time:', firstGame.gameDate);
      console.log('📍 Status:', firstGame.status);
      
      // Try to simulate the first game
      console.log('🎮 Attempting to simulate game', firstGame.id, '...');
      
      return fetch(`http://localhost:5000/api/matches/${firstGame.id}/simulate`, {
        method: 'POST',
        headers
      });
    } else {
      console.log('ℹ️ No Oakland Cougars games scheduled for today');
    }
  })
  .then(res => {
    if (res) {
      console.log('🏆 Simulation result status:', res.status);
      return res.json();
    }
  })
  .then(result => {
    if (result) {
      console.log('🎯 Game result:', result);
    }
  })
  .catch(error => {
    console.error('❌ Error:', error.message);
  });