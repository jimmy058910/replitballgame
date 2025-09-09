import { getPrismaClient } from "../database.js";
import { logInfo, logError } from './errorService.js';
import type { League } from '@shared/types/models';


/**
 * Dynamic Playoff Service
 * 
 * Handles dynamic scheduling of playoff rounds based on actual match completion times.
 * Each subsequent round is scheduled 30 minutes after the latest match in the previous round completes.
 */
export class DynamicPlayoffService {

  /**
   * Check for completed playoff rounds and schedule the next round if ready
   * Called periodically during Day 15 playoff execution
   */
  static async checkAndAdvancePlayoffRounds(): Promise<{
    roundsAdvanced: number;
    newMatchesScheduled: number;
    errors: string[];
  }> {
    const prisma = await getPrismaClient();
    const errors: string[] = [];
    let roundsAdvanced = 0;
    let newMatchesScheduled = 0;

    try {
      logInfo('🏆 [DYNAMIC PLAYOFFS] Checking for completed playoff rounds...');

      // Get all leagues with playoff matches on Day 15
      const currentSeason = await prisma.season.findFirst({
        orderBy: { createdAt: 'desc' }
      });

      if (!currentSeason) {
        errors.push('No current season found');
        return { roundsAdvanced, newMatchesScheduled, errors };
      }

      // Calculate Day 15 date range
      const day15Date = new Date(currentSeason.startDate);
      day15Date.setDate(day15Date.getDate() + 14); // Day 15
      
      const day15Start = new Date(day15Date);
      day15Start.setUTCHours(0, 0, 0, 0);
      
      const day15End = new Date(day15Date);
      day15End.setUTCHours(23, 59, 59, 999);

      // Get all leagues with playoff matches
      const leagues = await prisma.league.findMany({
        where: {
          seasonId: currentSeason.id,
          schedule: {
            some: {
              matchType: 'PLAYOFF',
              gameDate: {
                gte: day15Start,
                lte: day15End
              }
            }
          }
        }
      });

      // Process each league individually
      for (const league of leagues) {
        try {
          const result = await this.checkLeaguePlayoffAdvancement(league.id, currentSeason.seasonNumber);
          roundsAdvanced += result.roundsAdvanced;
          newMatchesScheduled += result.newMatchesScheduled;
        } catch (error) {
          const errorMsg = `Failed to advance playoffs for league ${league.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          logError(new Error(errorMsg));
        }
      }

      if (roundsAdvanced > 0) {
        logInfo(`🏆 [DYNAMIC PLAYOFFS] Advanced ${roundsAdvanced} playoff rounds, scheduled ${newMatchesScheduled} new matches`);
      }

    } catch (error) {
      const errorMsg = `Dynamic playoff check failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      logError(new Error(errorMsg));
    }

    return { roundsAdvanced, newMatchesScheduled, errors };
  }

  /**
   * Check playoff advancement for a specific league
   */
  private static async checkLeaguePlayoffAdvancement(leagueId: number, seasonNumber: number): Promise<{
    roundsAdvanced: number;
    newMatchesScheduled: number;
  }> {
    const prisma = await getPrismaClient();
    let roundsAdvanced = 0;
    let newMatchesScheduled = 0;

    // Get current season and calculate Day 15 date range
    const currentSeason = await prisma.season.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    
    if (!currentSeason) {
      return { roundsAdvanced, newMatchesScheduled };
    }
    
    const day15Date = new Date(currentSeason.startDate);
    day15Date.setDate(day15Date.getDate() + 14); // Day 15
    
    const day15Start = new Date(day15Date);
    day15Start.setUTCHours(0, 0, 0, 0);
    
    const day15End = new Date(day15Date);
    day15End.setUTCHours(23, 59, 59, 999);

    // Get all playoff matches for this league, grouped by round
    const playoffMatches = await prisma.game.findMany({
      where: {
        leagueId: leagueId,
        matchType: 'PLAYOFF',
        // Only look at Day 15 matches
        gameDate: {
          gte: day15Start,
          lte: day15End
        }
      },
      orderBy: [
        { round: 'asc' },
        { gameDate: 'asc' }
      ]
    });

    if (playoffMatches.length === 0) {
      return { roundsAdvanced, newMatchesScheduled };
    }

    // Group matches by round
    const matchesByRound = new Map<number, typeof playoffMatches>();
    for (const match of playoffMatches) {
      const round = match.round || 1;
      if (!matchesByRound.has(round)) {
        matchesByRound.set(round, []);
      }
      matchesByRound.get(round)!.push(match);
    }

    const sortedRounds = Array.from(matchesByRound.keys()).sort((a, b) => a - b);

    // Check each round for completion and advancement opportunity
    for (let i = 0; i < sortedRounds.length; i++) {
      const currentRound = sortedRounds[i];
      const nextRound = sortedRounds[i + 1];
      const currentRoundMatches = matchesByRound.get(currentRound)!;

      // Check if current round is complete
      const allMatchesComplete = currentRoundMatches.every(match => 
        match.status === 'COMPLETED' && match.homeScore !== null && match.awayScore !== null
      );

      if (allMatchesComplete && !nextRound) {
        // Current round is complete and there's no next round scheduled
        // Schedule the next round!
        
        const nextRoundNumber = currentRound + 1;
        const nextRoundMatches = await this.scheduleNextPlayoffRound(
          leagueId, 
          currentRoundMatches, 
          nextRoundNumber, 
          seasonNumber
        );

        if (nextRoundMatches.length > 0) {
          roundsAdvanced++;
          newMatchesScheduled += nextRoundMatches.length;
          logInfo(`🏆 [PLAYOFF ADVANCEMENT] League ${leagueId}: Scheduled ${nextRoundMatches.length} matches for Round ${nextRoundNumber}`);
        }
        break; // Only advance one round at a time
      }
    }

    return { roundsAdvanced, newMatchesScheduled };
  }

  /**
   * Schedule the next playoff round based on completed matches
   */
  private static async scheduleNextPlayoffRound(
    leagueId: number,
    completedMatches: any[],
    nextRoundNumber: number,
    seasonNumber: number
  ): Promise<any[]> {
    const prisma = await getPrismaClient();

    // Find the latest completion time from the previous round
    let latestCompletionTime = new Date(0); // Start with epoch
    
    for (const match of completedMatches) {
      if (match.gameDate && new Date(match.gameDate) > latestCompletionTime) {
        latestCompletionTime = new Date(match.gameDate);
      }
    }

    // Add match duration (estimated 10-15 minutes) and 30-minute buffer
    const matchDuration = 15 * 60 * 1000; // 15 minutes in milliseconds
    const buffer = 30 * 60 * 1000; // 30 minutes in milliseconds
    const nextRoundStartTime = new Date(latestCompletionTime.getTime() + matchDuration + buffer);

    logInfo(`🏆 [SCHEDULING] Round ${nextRoundNumber} will start at ${nextRoundStartTime.toLocaleString('en-US', { timeZone: 'America/New_York' })} EST (30 min after latest match completion)`);

    // Determine winners from completed matches
    const winners: { teamId: number; seed: number }[] = [];
    
    for (const match of completedMatches) {
      if (match.homeScore !== null && match.awayScore !== null) {
        const winnerTeamId = match.homeScore > match.awayScore ? match.homeTeamId : match.awayTeamId;
        winners.push({ teamId: winnerTeamId, seed: winners.length + 1 });
      }
    }

    if (winners.length < 2) {
      logError(new Error(`Insufficient winners (${winners.length}) to create next playoff round`));
      return [];
    }

    // Create next round matches
    const nextRoundMatches: any[] = [];
    
    // Pair winners for next round (1v2, 3v4, etc.)
    for (let i = 0; i < winners.length; i += 2) {
      if (i + 1 < winners.length) {
        nextRoundMatches.push({
          leagueId: leagueId,
          homeTeamId: winners[i].teamId,
          awayTeamId: winners[i + 1].teamId,
          gameDate: nextRoundStartTime,
          status: 'SCHEDULED' as const,
          matchType: 'PLAYOFF' as const,
          round: nextRoundNumber
        });
      }
    }

    // Insert the new matches into the database
    if (nextRoundMatches.length > 0) {
      await prisma.game.createMany({
        data: nextRoundMatches
      });
    }

    return nextRoundMatches;
  }
}