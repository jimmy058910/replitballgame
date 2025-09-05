/**
 * Quick Fix for Oakland Cougars Team Statistics
 * 
 * Simple script to synchronize Oakland Cougars' team statistics
 * with their actual game results
 */

import { getPrismaClient } from '../database.js';

export async function fixOaklandCougarsStats() {
  console.log('🔧 Starting Oakland Cougars statistics fix...');
  
  const prisma = await getPrismaClient();
  
  try {
    // Find Oakland Cougars team
    const oaklandCougars = await prisma.team.findFirst({
      where: {
        name: {
          contains: 'Oakland Cougars',
          mode: 'insensitive'
        }
      }
    });
    
    if (!oaklandCougars) {
      throw new Error('Oakland Cougars team not found');
    }
    
    console.log(`✅ Found Oakland Cougars (ID: ${oaklandCougars.id})`);
    console.log(`📊 Current stats: ${oaklandCougars.wins}W-${oaklandCougars.draws}D-${oaklandCougars.losses}L = ${oaklandCougars.points} pts`);
    
    // Get all completed league games involving Oakland Cougars
    const completedGames = await prisma.game.findMany({
      where: {
        OR: [
          { homeTeamId: oaklandCougars.id },
          { awayTeamId: oaklandCougars.id }
        ],
        matchType: 'LEAGUE',
        AND: [
          {
            OR: [
              { status: 'COMPLETED' },
              { simulated: true },
              { 
                AND: [
                  { homeScore: { not: null } },
                  { awayScore: { not: null } }
                ]
              }
            ]
          }
        ]
      },
      select: {
        id: true,
        homeTeamId: true,
        awayTeamId: true,
        homeScore: true,
        awayScore: true,
        status: true,
        gameDate: true
      },
      orderBy: { gameDate: 'asc' }
    });
    
    console.log(`📋 Found ${completedGames.length} completed games`);
    
    // Calculate correct statistics
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let points = 0;
    
    for (const game of completedGames) {
      if (game.homeScore === null || game.awayScore === null) {
        continue;
      }
      
      const isHome = game.homeTeamId === oaklandCougars.id;
      const teamScore = isHome ? game.homeScore : game.awayScore;
      const opponentScore = isHome ? game.awayScore : game.homeScore;
      
      console.log(`   Game ${game.id}: ${isHome ? 'vs' : '@'} - Score ${teamScore}-${opponentScore}`);
      
      if (teamScore > opponentScore) {
        wins++;
        points += 3;
        console.log(`     ✅ WIN`);
      } else if (teamScore === opponentScore) {
        draws++;
        points += 1;
        console.log(`     🤝 DRAW`);
      } else {
        losses++;
        console.log(`     ❌ LOSS`);
      }
    }
    
    console.log(`\n📊 Calculated stats: ${wins}W-${draws}D-${losses}L = ${points} pts`);
    console.log(`📊 Database stats:   ${oaklandCougars.wins}W-${oaklandCougars.draws}D-${oaklandCougars.losses}L = ${oaklandCougars.points} pts`);
    
    // Update team statistics if different
    const needsUpdate = (
      oaklandCougars.wins !== wins ||
      oaklandCougars.draws !== draws ||
      oaklandCougars.losses !== losses ||
      oaklandCougars.points !== points
    );
    
    if (needsUpdate) {
      const updatedTeam = await prisma.team.update({
        where: { id: oaklandCougars.id },
        data: {
          wins: wins,
          draws: draws,
          losses: losses,
          points: points
        }
      });
      
      console.log(`✅ Oakland Cougars statistics updated!`);
      console.log(`📊 New stats: ${updatedTeam.wins}W-${updatedTeam.draws}D-${updatedTeam.losses}L = ${updatedTeam.points} pts`);
      
      return {
        success: true,
        message: 'Oakland Cougars statistics synchronized successfully',
        before: { wins: oaklandCougars.wins, draws: oaklandCougars.draws, losses: oaklandCougars.losses, points: oaklandCougars.points },
        after: { wins, draws, losses, points },
        gamesProcessed: completedGames.length
      };
    } else {
      console.log(`✅ Oakland Cougars statistics are already correct!`);
      return {
        success: true,
        message: 'Oakland Cougars statistics were already correct',
        stats: { wins, draws, losses, points },
        gamesProcessed: completedGames.length
      };
    }
    
  } catch (error) {
    console.error('❌ Error fixing Oakland Cougars stats:', error);
    throw error;
  }
}