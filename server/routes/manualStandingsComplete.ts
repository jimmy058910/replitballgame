import { Router } from 'express';
import { getPrismaClient } from '../database.js';
import { requireAuth } from '../middleware/firebaseAuth.js';

const router = Router();

/**
 * COMPREHENSIVE STANDINGS FIX - ALL 12 GAMES
 * Based on user's exact game data
 */
router.post('/complete-standings-fix', requireAuth, async (req, res) => {
  console.log('🔧 COMPREHENSIVE STANDINGS FIX - ALL 12 GAMES');
  console.log('==============================================');
  
  try {
    const prisma = await getPrismaClient();
    
    // Reset all Division 8 Alpha teams to 0
    console.log('🔄 Resetting all Division 8 Alpha team standings to 0...');
    await prisma.team.updateMany({
      where: {
        division: 8,
        subdivision: 'alpha'
      },
      data: {
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0
      }
    });
    
    // Get team IDs for mapping
    const teams = await prisma.team.findMany({
      where: { division: 8, subdivision: 'alpha' },
      select: { id: true, name: true }
    });
    
    const getTeamId = (name: string) => teams.find(t => t.name === name)?.id;
    
    // ALL 12 COMPLETED GAMES - EXACT DATA FROM USER
    const allGames = [
      // Day 7 (4 games)
      { home: 'Desert Hawks 2025', away: 'Oakland Cougars', homeScore: 0, awayScore: 3 },
      { home: 'Thunder Eagles', away: 'Fire Hawks 509', homeScore: 0, awayScore: 5 },
      { home: 'Storm Breakers 346', away: 'Fire Hawks 261', homeScore: 1, awayScore: 5 },
      { home: 'Iron Wolves 858', away: 'Iron Wolves 686', homeScore: 7, awayScore: 1 },
      
      // Day 8 (4 games)
      { home: 'Iron Wolves 858', away: 'Desert Hawks 2025', homeScore: 2, awayScore: 2 },
      { home: 'Fire Hawks 509', away: 'Iron Wolves 686', homeScore: 3, awayScore: 2 },
      { home: 'Storm Breakers 346', away: 'Fire Hawks 261', homeScore: 1, awayScore: 2 },
      { home: 'Oakland Cougars', away: 'Thunder Eagles', homeScore: 4, awayScore: 0 },
      
      // Day 9 (4 games) - THESE WERE MISSING!
      { home: 'Storm Breakers 346', away: 'Thunder Eagles', homeScore: 3, awayScore: 0 },
      { home: 'Fire Hawks 509', away: 'Desert Hawks 2025', homeScore: 1, awayScore: 0 },
      { home: 'Fire Hawks 261', away: 'Iron Wolves 686', homeScore: 2, awayScore: 0 },
      { home: 'Iron Wolves 858', away: 'Oakland Cougars', homeScore: 1, awayScore: 1 } // CRITICAL DRAW
    ];
    
    console.log(`📊 Processing ${allGames.length} completed games...`);
    
    const results = [];
    
    // Process each game
    for (const game of allGames) {
      const homeTeamId = getTeamId(game.home);
      const awayTeamId = getTeamId(game.away);
      
      if (!homeTeamId || !awayTeamId) {
        console.log(`⚠️ Team not found: ${game.home} or ${game.away}`);
        continue;
      }
      
      console.log(`\n🏈 Processing: ${game.home} (${game.homeScore}) vs ${game.away} (${game.awayScore})`);
      
      if (game.homeScore > game.awayScore) {
        // Home team wins
        const homeUpdate = await prisma.team.update({
          where: { id: homeTeamId },
          data: {
            wins: { increment: 1 },
            points: { increment: 3 }
          }
        });
        
        const awayUpdate = await prisma.team.update({
          where: { id: awayTeamId },
          data: {
            losses: { increment: 1 }
          }
        });
        
        console.log(`🏆 ${game.home} wins: W=${homeUpdate.wins}, L=${homeUpdate.losses}, D=${homeUpdate.draws}, Pts=${homeUpdate.points}`);
        console.log(`😞 ${game.away} loses: W=${awayUpdate.wins}, L=${awayUpdate.losses}, D=${awayUpdate.draws}, Pts=${awayUpdate.points}`);
        
      } else if (game.awayScore > game.homeScore) {
        // Away team wins
        const awayUpdate = await prisma.team.update({
          where: { id: awayTeamId },
          data: {
            wins: { increment: 1 },
            points: { increment: 3 }
          }
        });
        
        const homeUpdate = await prisma.team.update({
          where: { id: homeTeamId },
          data: {
            losses: { increment: 1 }
          }
        });
        
        console.log(`🏆 ${game.away} wins: W=${awayUpdate.wins}, L=${awayUpdate.losses}, D=${awayUpdate.draws}, Pts=${awayUpdate.points}`);
        console.log(`😞 ${game.home} loses: W=${homeUpdate.wins}, L=${homeUpdate.losses}, D=${homeUpdate.draws}, Pts=${homeUpdate.points}`);
        
      } else {
        // Draw - CRITICAL FOR OAKLAND COUGARS
        const homeUpdate = await prisma.team.update({
          where: { id: homeTeamId },
          data: {
            draws: { increment: 1 },
            points: { increment: 1 }
          }
        });
        
        const awayUpdate = await prisma.team.update({
          where: { id: awayTeamId },
          data: {
            draws: { increment: 1 },
            points: { increment: 1 }
          }
        });
        
        console.log(`🤝 DRAW: ${game.home}: W=${homeUpdate.wins}, L=${homeUpdate.losses}, D=${homeUpdate.draws}, Pts=${homeUpdate.points}`);
        console.log(`🤝 DRAW: ${game.away}: W=${awayUpdate.wins}, L=${awayUpdate.losses}, D=${awayUpdate.draws}, Pts=${awayUpdate.points}`);
      }
      
      results.push({
        home: game.home,
        away: game.away,
        score: `${game.homeScore}-${game.awayScore}`,
        processed: true
      });
    }
    
    // Display final corrected standings
    const finalStandings = await prisma.team.findMany({
      where: {
        division: 8,
        subdivision: 'alpha'
      },
      select: {
        name: true,
        wins: true,
        losses: true,
        draws: true,
        points: true
      },
      orderBy: [
        { points: 'desc' },
        { wins: 'desc' },
        { name: 'asc' }
      ]
    });
    
    console.log('\n📊 FINAL CORRECTED DIVISION 8 ALPHA STANDINGS:');
    console.log('==============================================');
    finalStandings.forEach((team, index) => {
      const gamesPlayed = (team.wins || 0) + (team.losses || 0) + (team.draws || 0);
      console.log(`${index + 1}. ${team.name}: GP=${gamesPlayed}, W=${team.wins || 0}, L=${team.losses || 0}, D=${team.draws || 0}, Pts=${team.points || 0}`);
    });
    
    res.json({
      success: true,
      message: 'ALL 12 games processed - standings completely fixed',
      gamesProcessed: allGames.length,
      results,
      finalStandings
    });
    
  } catch (error) {
    console.error('Complete standings fix error:', error);
    res.status(500).json({ error: 'Failed to fix standings completely' });
  }
});

export default router;