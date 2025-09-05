/**
 * Team Standings Synchronization Script
 * 
 * Fixes data inconsistencies by recalculating Team table standings 
 * from actual completed Game results.
 */

import { getPrismaClient } from '../database.js';

interface TeamStanding {
  teamId: number;
  teamName: string;
  wins: number;
  draws: number;  
  losses: number;
  points: number;
  gamesPlayed: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

export class TeamStandingsSyncService {
  
  /**
   * Complete synchronization of all team standings from game results
   */
  static async syncAllTeamStandings(): Promise<void> {
    console.log('🔄 [SYNC] Starting comprehensive team standings synchronization...');
    
    const prisma = await getPrismaClient();
    
    // Get all teams
    const teams = await prisma.team.findMany({
      select: { 
        id: true, 
        name: true,
        wins: true,
        losses: true,
        draws: true,
        points: true
      }
    });
    
    console.log(`📊 [SYNC] Found ${teams.length} teams to synchronize`);
    
    // Process each team
    for (const team of teams) {
      await this.syncTeamStanding(team.id, team.name);
    }
    
    console.log('✅ [SYNC] Team standings synchronization completed');
  }
  
  /**
   * Synchronize standings for a specific team
   */
  static async syncTeamStanding(teamId: number, teamName: string): Promise<void> {
    console.log(`🔍 [SYNC] Processing team: ${teamName} (ID: ${teamId})`);
    
    const prisma = await getPrismaClient();
    
    // Get all completed league games for this team
    const completedGames = await prisma.game.findMany({
      where: {
        OR: [
          { homeTeamId: teamId },
          { awayTeamId: teamId }
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
        simulated: true,
        gameDate: true
      },
      orderBy: { gameDate: 'asc' }
    });
    
    console.log(`📋 [SYNC] Found ${completedGames.length} completed games for ${teamName}`);
    
    // Calculate standings from game results
    const standings: TeamStanding = {
      teamId,
      teamName,
      wins: 0,
      draws: 0,
      losses: 0,
      points: 0,
      gamesPlayed: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0
    };
    
    // Process each game
    for (const game of completedGames) {
      if (game.homeScore === null || game.awayScore === null) {
        continue; // Skip incomplete games
      }
      
      const isHome = game.homeTeamId === teamId;
      const teamScore = isHome ? game.homeScore : game.awayScore;
      const opponentScore = isHome ? game.awayScore : game.homeScore;
      
      standings.gamesPlayed++;
      standings.goalsFor += teamScore;
      standings.goalsAgainst += opponentScore;
      
      if (teamScore > opponentScore) {
        standings.wins++;
        standings.points += 3;
      } else if (teamScore === opponentScore) {
        standings.draws++;  
        standings.points += 1;
      } else {
        standings.losses++;
      }
      
      console.log(`   Game ${game.id}: ${isHome ? teamScore + '-' + opponentScore : opponentScore + '-' + teamScore} ${teamScore > opponentScore ? 'WIN' : teamScore === opponentScore ? 'DRAW' : 'LOSS'}`);
    }
    
    standings.goalDifference = standings.goalsFor - standings.goalsAgainst;
    
    // Get current database values for comparison
    const currentTeam = await prisma.team.findUnique({
      where: { id: teamId },
      select: { wins: true, draws: true, losses: true, points: true }
    });
    
    console.log(`📊 [SYNC] ${teamName} calculations:`);
    console.log(`   Database: ${currentTeam?.wins}W-${currentTeam?.draws}D-${currentTeam?.losses}L = ${currentTeam?.points} pts`);
    console.log(`   Calculated: ${standings.wins}W-${standings.draws}D-${standings.losses}L = ${standings.points} pts`);
    console.log(`   Games Played: ${standings.gamesPlayed}, Goal Diff: ${standings.goalDifference > 0 ? '+' : ''}${standings.goalDifference}`);
    
    // Check if update is needed
    const needsUpdate = (
      currentTeam?.wins !== standings.wins ||
      currentTeam?.draws !== standings.draws ||
      currentTeam?.losses !== standings.losses ||
      currentTeam?.points !== standings.points
    );
    
    if (needsUpdate) {
      // Update team in database
      await prisma.team.update({
        where: { id: teamId },
        data: {
          wins: standings.wins,
          draws: standings.draws,
          losses: standings.losses,
          points: standings.points
        }
      });
      
      console.log(`✅ [SYNC] ${teamName} standings updated in database`);
    } else {
      console.log(`✅ [SYNC] ${teamName} standings already correct`);
    }
  }
  
  /**
   * Sync standings for a specific division/league
   */
  static async syncDivisionStandings(division: number): Promise<void> {
    console.log(`🏆 [SYNC] Synchronizing Division ${division} standings...`);
    
    const prisma = await getPrismaClient();
    
    // Get all teams in this division
    const teams = await prisma.team.findMany({
      where: { division },
      select: { id: true, name: true }
    });
    
    console.log(`📊 [SYNC] Found ${teams.length} teams in Division ${division}`);
    
    for (const team of teams) {
      await this.syncTeamStanding(team.id, team.name);
    }
    
    console.log(`✅ [SYNC] Division ${division} synchronization completed`);
  }
}

// Export for use in other modules
export { TeamStandingsSyncService as default };