import { storage } from './server/storage/index.js';

async function deleteDuplicateMatches() {
  try {
    console.log('🔍 DIRECT STORAGE: Finding all Oakland Cougars matches on Aug 21...');
    
    // Get all matches for team ID 4 (Oakland Cougars)
    const allMatches = await storage.matches.getUpcomingMatchesForTeam(4);
    
    const todayMatches = allMatches.filter(match => {
      const matchDate = new Date(match.gameDate);
      const today = new Date('2025-08-21');
      return matchDate.toDateString() === today.toDateString();
    });

    console.log(`Found ${todayMatches.length} matches for Oakland Cougars today:`);
    todayMatches.forEach(match => {
      console.log(`- Match ${match.id}: vs ${match.homeTeamId === 4 ? match.awayTeam?.name || 'Unknown' : match.homeTeam?.name || 'Unknown'} at ${match.gameDate} (${match.status})`);
    });

    if (todayMatches.length <= 1) {
      console.log('✅ No duplicate matches to delete.');
      return;
    }

    // Keep only the match scheduled for 8:30 PM EDT (20:30 UTC)
    const correctMatch = todayMatches.find(match => {
      const matchTime = new Date(match.gameDate);
      return matchTime.getUTCHours() === 20 && matchTime.getUTCMinutes() === 30;
    });

    if (!correctMatch) {
      console.log('❌ Could not find the 8:30 PM EDT match to keep.');
      return;
    }

    console.log(`✅ Keeping match ${correctMatch.id} at ${correctMatch.gameDate}`);

    // Delete all other matches
    for (const match of todayMatches) {
      if (match.id !== correctMatch.id) {
        console.log(`🗑️ Deleting duplicate match ${match.id}`);
        await storage.matches.deleteMatch(match.id);
        console.log(`✅ Deleted match ${match.id}`);
      }
    }

    console.log('🎯 SUCCESS: Duplicate matches removed!');

  } catch (error) {
    console.error('❌ Error deleting duplicate matches:', error);
  }
}

deleteDuplicateMatches();