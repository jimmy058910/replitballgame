import { prisma } from "../db";
// import { logInfo } from "../logging"; // Commented out for production
const logInfo = (message: string) => console.log(`[INFO] ${message}`);
import { tournamentFlowService } from "./tournamentFlowService";

/**
 * Emergency tournament recovery service
 * Handles manual tournament match starting for stuck tournaments
 */
export class TournamentRecoveryService {
  /**
   * Start all scheduled matches for a tournament
   */
  async startScheduledMatches(tournamentId: number): Promise<void> {
    try {
      logInfo(`Starting recovery for tournament ${tournamentId}`);
      
      // Get all scheduled matches for this tournament
      const scheduledMatches = await prisma.game.findMany({
        where: {
          tournamentId: tournamentId,
          status: 'SCHEDULED'
        },
        orderBy: {
          round: 'asc'
        }
      });
      
      if (scheduledMatches.length === 0) {
        logInfo(`No scheduled matches found for tournament ${tournamentId}`);
        return;
      }
      
      // Group matches by round
      const matchesByRound = new Map<number, any[]>();
      scheduledMatches.forEach(match => {
        const round = match.round || 1; // Default to round 1 if null
        if (!matchesByRound.has(round)) {
          matchesByRound.set(round, []);
        }
        matchesByRound.get(round)!.push(match);
      });
      
      // Start matches round by round
      for (const [round, matches] of matchesByRound) {
        logInfo(`Starting ${matches.length} matches for tournament ${tournamentId} round ${round}`);
        
        // Start all matches in this round
        await this.startMatchesInRound(tournamentId, round);
        
        // Wait a bit between rounds
        if (round < Math.max(...matchesByRound.keys())) {
          await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
        }
      }
      
      logInfo(`Tournament ${tournamentId} recovery completed`);
    } catch (error) {
      console.error(`Error during tournament recovery for ${tournamentId}:`, error);
    }
  }
  
  /**
   * Start all matches in a specific round
   */
  private async startMatchesInRound(tournamentId: number, round: number): Promise<void> {
    try {
      const { matchStateManager } = await import('./matchStateManager');
      
      // Get matches for this round
      const matches = await prisma.game.findMany({
        where: {
          tournamentId: tournamentId,
          round: round,
          status: 'SCHEDULED'
        }
      });
      
      for (const match of matches) {
        try {
          // Update match status to IN_PROGRESS
          await prisma.game.update({
            where: { id: match.id },
            data: {
              status: 'IN_PROGRESS',
              gameDate: new Date()
            }
          });
          
          // Start live simulation
          await matchStateManager.startLiveMatch(match.id.toString());
          logInfo(`Started live simulation for tournament ${tournamentId} round ${round} match ${match.id}`);
          
        } catch (error) {
          console.error(`Error starting match ${match.id}:`, error);
        }
      }
      
    } catch (error) {
      console.error(`Error starting matches for tournament ${tournamentId} round ${round}:`, error);
    }
  }
  
  /**
   * Check and recover all stuck tournaments
   */
  async recoverAllStuckTournaments(): Promise<void> {
    try {
      logInfo('Checking for stuck tournaments...');
      
      // Find tournaments that are IN_PROGRESS but have scheduled matches
      const stuckTournaments = await prisma.tournament.findMany({
        where: {
          status: 'IN_PROGRESS'
        },
        include: {
          games: {
            where: {
              status: 'SCHEDULED'
            }
          }
        }
      });
      
      for (const tournament of stuckTournaments) {
        if (tournament.games.length > 0) {
          logInfo(`Found stuck tournament ${tournament.id} with ${tournament.games.length} scheduled matches`);
          await this.startScheduledMatches(tournament.id);
        }
      }
      
      logInfo('Tournament recovery check completed');
    } catch (error) {
      console.error('Error during tournament recovery check:', error);
    }
  }
}

export const tournamentRecoveryService = new TournamentRecoveryService();