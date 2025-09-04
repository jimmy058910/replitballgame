import { getPrismaClient } from '../database.js';

interface LiveMatchState {
  matchId: number;
  status: string;
  gameTime: number;
  homeScore: number;
  awayScore: number;
  [key: string]: any;
}

class MatchStateManager {
  private liveMatches: Map<number, LiveMatchState> = new Map();

  async syncMatchState(matchId: number): Promise<LiveMatchState | null> {
    try {
      const prisma = await getPrismaClient();
      
      const match = await prisma.game.findUnique({
        where: { id: matchId },
        include: {
          homeTeam: true,
          awayTeam: true
        }
      });

      if (!match) {
        return null;
      }

      const liveState: LiveMatchState = {
        matchId: matchId,
        status: match.status,
        gameTime: 0, // Default value
        homeScore: match.homeScore || 0,
        awayScore: match.awayScore || 0,
        match: match
      };

      this.liveMatches.set(matchId, liveState);
      return liveState;
    } catch (error) {
      console.error('Error syncing match state:', error);
      return null;
    }
  }

  async getLiveMatchState(matchId: number): Promise<LiveMatchState | null> {
    return this.liveMatches.get(matchId) || null;
  }

  async stopMatch(matchId: number): Promise<void> {
    try {
      const prisma = await getPrismaClient();
      
      // Update match status to completed
      await prisma.game.update({
        where: { id: matchId },
        data: { 
          status: 'COMPLETED',
          simulated: true
        }
      });

      // Remove from live matches
      this.liveMatches.delete(matchId);
    } catch (error) {
      console.error('Error stopping match:', error);
    }
  }

  async updateTeamRecords(homeTeamId: number, awayTeamId: number, homeScore: number, awayScore: number): Promise<void> {
    try {
      const prisma = await getPrismaClient();
      
      // Update team records based on match result
      if (homeScore > awayScore) {
        // Home team wins
        await prisma.team.update({
          where: { id: homeTeamId },
          data: { 
            wins: { increment: 1 },
            points: { increment: 3 }
          }
        });
        await prisma.team.update({
          where: { id: awayTeamId },
          data: { losses: { increment: 1 } }
        });
      } else if (awayScore > homeScore) {
        // Away team wins
        await prisma.team.update({
          where: { id: awayTeamId },
          data: { 
            wins: { increment: 1 },
            points: { increment: 3 }
          }
        });
        await prisma.team.update({
          where: { id: homeTeamId },
          data: { losses: { increment: 1 } }
        });
      } else {
        // Draw
        await prisma.team.update({
          where: { id: homeTeamId },
          data: { 
            draws: { increment: 1 },
            points: { increment: 1 }
          }
        });
        await prisma.team.update({
          where: { id: awayTeamId },
          data: { 
            draws: { increment: 1 },
            points: { increment: 1 }
          }
        });
      }
    } catch (error) {
      console.error('Error updating team records:', error);
    }
  }
}

export const matchStateManager = new MatchStateManager();