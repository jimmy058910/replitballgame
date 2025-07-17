// Direct script to manually trigger tournament matches for #0851
const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

async function startTournamentMatches() {
  try {
    console.log('Triggering tournament #0851 quarterfinal matches...');
    
    // Get all IN_PROGRESS matches for tournament 5
    const matches = await prisma.game.findMany({
      where: { 
        tournamentId: 5,
        round: 1,
        status: 'IN_PROGRESS'
      }
    });
    
    console.log(`Found ${matches.length} matches to trigger`);
    
    // Make API calls to start each match
    const fetch = require('node-fetch');
    
    for (const match of matches) {
      try {
        console.log(`Triggering live simulation for match ${match.id}...`);
        
        // Call the tournament API with admin credentials 
        const response = await fetch(`http://localhost:5000/api/tournament-status/${match.id}/start-match`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-User-ID': '44010914' // Admin user ID
          },
          body: JSON.stringify({})
        });
        
        console.log(`Response status: ${response.status}`);
        const responseText = await response.text();
        console.log(`Response: ${responseText}`);
        
        if (response.ok) {
          console.log(`✓ Match ${match.id} API call successful`);
        } else {
          console.error(`✗ API error for match ${match.id}: ${responseText}`);
        }
      } catch (error) {
        console.error(`✗ Error with match ${match.id}:`, error.message);
      }
    }
    
    console.log('Tournament quarterfinals API calls completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error triggering tournament matches:', error);
    process.exit(1);
  }
}

startTournamentMatches();