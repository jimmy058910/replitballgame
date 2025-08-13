import { getPrismaClient } from "../database.js";

// Simple logging function for now
function logInfo(message: string) {
  console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
}

interface TournamentFlowService {
  startTournamentCountdown(tournamentId: number): void;
  startRoundWithBuffer(tournamentId: number, roundNumber: number): void;
  handleMatchCompletion(matchId: number): void;
}

class TournamentFlowServiceImpl implements TournamentFlowService {
  private tournamentTimers: Map<string, NodeJS.Timeout> = new Map();
  private roundTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Manual method to start tournament round (for testing/debugging)
   */
  async manuallyStartTournamentRound(tournamentId: number, roundNumber: number): Promise<void> {
    console.log(`Manually starting tournament ${tournamentId} round ${roundNumber}...`);
    return this.startTournamentRound(tournamentId, roundNumber);
  }

  /**
   * Start 10-minute countdown when tournament is full
   */
  startTournamentCountdown(tournamentId: number): void {
    const timerKey = `tournament_${tournamentId}`;
    
    // Clear existing timer
    if (this.tournamentTimers.has(timerKey)) {
      clearTimeout(this.tournamentTimers.get(timerKey)!);
    }

    // Start 10-minute countdown
    const timer = setTimeout(async () => {
      try {
        await this.startTournamentRound(tournamentId, 1); // Start quarterfinals
        logInfo(`Tournament ${tournamentId} started - quarterfinals beginning`);
      } catch (error) {
        console.error(`Error starting tournament ${tournamentId}:`, error);
      }
    }, 10 * 60 * 1000); // 10 minutes

    this.tournamentTimers.set(timerKey, timer);
    logInfo(`Tournament ${tournamentId} countdown started - 10 minutes until start`);
  }

  /**
   * Start tournament round with live simulation
   */
  private async startTournamentRound(tournamentId: number, roundNumber: number): Promise<void> {
    try {
      // Get matches for this round
      const matches = await prisma.game.findMany({
        where: { 
          tournamentId: tournamentId,
          round: roundNumber,
          status: 'SCHEDULED'
        }
      });

      if (matches.length === 0) {
        console.error(`No matches found for tournament ${tournamentId} round ${roundNumber}`);
        return;
      }

      // Start live simulation for all matches in the round
      const { matchStateManager } = await import('./matchStateManager');
      const matchPromises = matches.map(async (match: any) => {
        try {
          // Set match status to IN_PROGRESS
          await prisma.game.update({
            where: { id: match.id },
            data: {
              status: 'IN_PROGRESS',
              gameDate: new Date()
            }
          });

          // Start live simulation
          await matchStateManager.startLiveMatch(match.id.toString());
          logInfo(`Started live simulation for tournament ${tournamentId} round ${roundNumber} match ${match.id}`);
          
          return match.id;
        } catch (error) {
          console.error(`Error starting live simulation for match ${match.id}:`, error);
          return null;
        }
      });

      const startedMatches = await Promise.all(matchPromises);
      const successfulMatches = startedMatches.filter(id => id !== null);

      logInfo(`Tournament ${tournamentId} round ${roundNumber} started - ${successfulMatches.length} live matches`);
    } catch (error) {
      console.error(`Error starting tournament round ${tournamentId}-${roundNumber}:`, error);
    }
  }

  /**
   * Start round with 2-minute buffer - Enhanced with immediate fallback
   */
  startRoundWithBuffer(tournamentId: number, roundNumber: number): void {
    const timerKey = `round_${tournamentId}_${roundNumber}`;
    
    // Clear existing timer
    if (this.roundTimers.has(timerKey)) {
      clearTimeout(this.roundTimers.get(timerKey)!);
    }

    logInfo(`Tournament ${tournamentId} round ${roundNumber} buffer started - 2 minutes until start`);
    
    // Start 2-minute buffer with enhanced error handling
    const timer = setTimeout(async () => {
      try {
        logInfo(`Tournament ${tournamentId} round ${roundNumber} timer executing...`);
        await this.startTournamentRound(tournamentId, roundNumber);
        logInfo(`Tournament ${tournamentId} round ${roundNumber} started after 2-minute buffer`);
      } catch (error) {
        console.error(`Error starting tournament ${tournamentId} round ${roundNumber}:`, error);
        
        // Fallback: Try to start immediately if timer fails
        try {
          logInfo(`Tournament ${tournamentId} round ${roundNumber} attempting immediate fallback start...`);
          await this.startTournamentRound(tournamentId, roundNumber);
        } catch (fallbackError) {
          console.error(`Fallback failed for tournament ${tournamentId} round ${roundNumber}:`, fallbackError);
        }
      } finally {
        // Clean up timer
        this.roundTimers.delete(timerKey);
      }
    }, 2 * 60 * 1000); // 2 minutes

    this.roundTimers.set(timerKey, timer);
    
    // Alternative immediate trigger for testing - remove the timer delay for now
    // TODO: Remove this once timer system is confirmed working
    setTimeout(async () => {
      try {
        logInfo(`Tournament ${tournamentId} round ${roundNumber} immediate trigger executing...`);
        await this.startTournamentRound(tournamentId, roundNumber);
      } catch (error) {
        console.error(`Immediate trigger failed for tournament ${tournamentId} round ${roundNumber}:`, error);
      }
    }, 5000); // 5 seconds for testing
  }

  /**
   * Handle match completion and check for round advancement
   */
  async handleMatchCompletion(matchId: number): Promise<void> {
    try {
      const match = await prisma.game.findUnique({
        where: { id: matchId },
        include: {
          tournament: true
        }
      });

      if (!match || !match.tournament || !match.tournamentId) {
        console.log(`Match ${matchId} is not a tournament match - skipping tournament flow`);
        return; // Not a tournament match
      }

      logInfo(`Tournament match ${matchId} completed - processing tournament flow`);

      // Apply stamina and injury logic
      await this.applyPostMatchEffects(match.homeTeamId, match.awayTeamId);

      // Check if round is complete and advance if necessary
      await this.checkAndAdvanceRound(match.tournamentId, match.round || 1);
      
      logInfo(`Tournament match ${matchId} completed - checked for round advancement`);
    } catch (error) {
      console.error(`Error handling match completion ${matchId}:`, error);
    }
  }

  /**
   * Apply stamina and injury logic after each game
   */
  private async applyPostMatchEffects(homeTeamId: number, awayTeamId: number): Promise<void> {
    try {
      // Get all players from both teams
      const players = await prisma.player.findMany({
        where: {
          teamId: { in: [homeTeamId, awayTeamId] },
          isRetired: false
        }
      });

      // Apply stamina reduction and injury risk
      for (const player of players) {
        // Reduce stamina (tournament matches are more demanding)
        const staminaReduction = Math.floor(Math.random() * 20) + 10; // 10-30 stamina reduction
        const newStamina = Math.max(0, player.dailyStaminaLevel - staminaReduction);

        // Injury risk (slightly higher for tournament matches)
        const injuryRisk = Math.random() * 100;
        let newInjuryStatus = player.injuryStatus;
        let newRecoveryPoints = player.injuryRecoveryPointsNeeded;

        if (injuryRisk < 5) { // 5% injury chance
          newInjuryStatus = 'MINOR_INJURY';
          newRecoveryPoints = Math.floor(Math.random() * 7) + 3; // 3-10 days recovery
        } else if (injuryRisk < 2) { // 2% major injury chance
          newInjuryStatus = 'MINOR_INJURY';
          newRecoveryPoints = Math.floor(Math.random() * 14) + 7; // 7-21 days recovery
        }

        // Update player
        await prisma.player.update({
          where: { id: player.id },
          data: {
            dailyStaminaLevel: newStamina,
            injuryStatus: newInjuryStatus,
            injuryRecoveryPointsNeeded: newRecoveryPoints,
            injuryRecoveryPointsCurrent: newInjuryStatus !== 'HEALTHY' ? 0 : player.injuryRecoveryPointsCurrent
          }
        });
      }

      logInfo(`Applied post-match effects to players from teams ${homeTeamId} and ${awayTeamId}`);
    } catch (error) {
      console.error(`Error applying post-match effects:`, error);
    }
  }

  /**
   * Check if round is complete and advance to next round
   */
  private async checkAndAdvanceRound(tournamentId: number, completedRound: number): Promise<void> {
    try {
      logInfo(`Checking round advancement for tournament ${tournamentId}, round ${completedRound}`);
      
      // Get all matches for this round
      const roundMatches = await prisma.game.findMany({
        where: {
          tournamentId: tournamentId,
          round: completedRound
        }
      });

      logInfo(`Found ${roundMatches.length} matches in round ${completedRound}`);

      // Check if all matches in this round are completed
      const completedMatches = roundMatches.filter((m: any) => m.status === 'COMPLETED');
      
      logInfo(`${completedMatches.length} of ${roundMatches.length} matches completed in round ${completedRound}`);
      
      if (completedMatches.length === roundMatches.length && roundMatches.length > 0) {
        // All matches in this round are complete
        const nextRound = completedRound + 1;
        
        logInfo(`All matches in round ${completedRound} completed, checking for round ${nextRound}`);
        
        // Check if next round already exists
        const nextRoundMatches = await prisma.game.findMany({
          where: {
            tournamentId: tournamentId,
            round: nextRound
          }
        });

        logInfo(`Found ${nextRoundMatches.length} existing matches in round ${nextRound}`);

        if (nextRoundMatches.length === 0) {
          // Check if tournament is complete (finals are done)
          if (completedRound === 3) {
            // Finals completed - complete tournament
            logInfo(`Tournament ${tournamentId} completed - finals finished`);
            await this.completeTournament(tournamentId);
          } else {
            // REMOVED: Tournament bracket generation logic - now handled by UnifiedTournamentAutomation only
            // This prevents duplicate bracket generation race conditions
            logInfo(`Matches for round ${nextRound} would be generated by UnifiedTournamentAutomation`);
            
            // Start next round with 2-minute buffer
            if (nextRound <= 3) { // Only up to finals
              logInfo(`Starting round ${nextRound} with buffer`);
              this.startRoundWithBuffer(tournamentId, nextRound);
            }
          }
        } else {
          logInfo(`Round ${nextRound} already exists, skipping generation`);
        }
      } else {
        logInfo(`Round ${completedRound} not yet complete - need ${roundMatches.length - completedMatches.length} more matches`);
      }
    } catch (error) {
      console.error(`Error checking round advancement:`, error);
    }
  }

  // REMOVED: Duplicate generateNextRoundMatches function - now using UnifiedTournamentAutomation only
  // This prevents duplicate bracket generation race conditions

  /**
   * Complete tournament and distribute prizes
   */
  private async completeTournament(tournamentId: number): Promise<void> {
    try {
      // Get the finals match to determine winner
      const finalsMatch = await prisma.game.findFirst({
        where: {
          tournamentId,
          round: 3,
          status: 'COMPLETED'
        },
        include: {
          homeTeam: true,
          awayTeam: true
        }
      });

      if (!finalsMatch) {
        console.error(`No completed finals match found for tournament ${tournamentId}`);
        return;
      }

      // Determine winner and runner-up
      const winner = (finalsMatch.homeScore || 0) > (finalsMatch.awayScore || 0) ? finalsMatch.homeTeam : finalsMatch.awayTeam;
      const runnerUp = (finalsMatch.homeScore || 0) > (finalsMatch.awayScore || 0) ? finalsMatch.awayTeam : finalsMatch.homeTeam;

      // Get tournament details for prize calculation
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: { entries: true }
      });

      if (!tournament) {
        console.error(`Tournament ${tournamentId} not found`);
        return;
      }

      // Calculate prizes based on tournament type and division
      const { tournamentService } = await import('./tournamentService');
      const divisionNames = ["", "Diamond", "Platinum", "Gold", "Silver", "Bronze", "Iron", "Stone", "Copper"];
      
      let championPrize = { credits: 1500, gems: 0 }; // Default Stone division
      let runnerUpPrize = { credits: 500, gems: 0 };

      if (tournament.type === "DAILY_DIVISIONAL") {
        const rewardTable: Record<number, any> = {
          2: { champion: { credits: 16000, gems: 8 }, runnerUp: { credits: 6000, gems: 0 } },
          3: { champion: { credits: 12000, gems: 5 }, runnerUp: { credits: 4500, gems: 0 } },
          4: { champion: { credits: 9000, gems: 3 }, runnerUp: { credits: 3000, gems: 0 } },
          5: { champion: { credits: 6000, gems: 0 }, runnerUp: { credits: 2000, gems: 0 } },
          6: { champion: { credits: 4000, gems: 0 }, runnerUp: { credits: 1500, gems: 0 } },
          7: { champion: { credits: 2500, gems: 0 }, runnerUp: { credits: 1000, gems: 0 } },
          8: { champion: { credits: 1500, gems: 0 }, runnerUp: { credits: 500, gems: 0 } }
        };
        const rewards = rewardTable[tournament.division || 8] || rewardTable[8];
        championPrize = rewards.champion;
        runnerUpPrize = rewards.runnerUp;
      }

      // Award prizes to winner and runner-up
      await this.awardTournamentPrize(winner.id, championPrize);
      await this.awardTournamentPrize(runnerUp.id, runnerUpPrize);

      // Update tournament status to COMPLETED
      await prisma.tournament.update({
        where: { id: tournamentId },
        data: {
          status: 'COMPLETED'
        }
      });

      // Update tournament entries with final rankings and rewards
      await prisma.tournamentEntry.updateMany({
        where: {
          tournamentId: tournamentId,
          teamId: winner.id
        },
        data: { 
          finalRank: 1
        }
      });

      await prisma.tournamentEntry.updateMany({
        where: {
          tournamentId: tournamentId,
          teamId: runnerUp.id
        },
        data: { 
          finalRank: 2
        }
      });

      // Update other participants with appropriate placements
      const semifinalLosers = await prisma.game.findMany({
        where: {
          tournamentId,
          round: 2,
          status: 'COMPLETED'
        }
      });

      for (const semifinalMatch of semifinalLosers) {
        const loser = (semifinalMatch.homeScore || 0) > (semifinalMatch.awayScore || 0) ? semifinalMatch.awayTeamId : semifinalMatch.homeTeamId;
        await prisma.tournamentEntry.updateMany({
          where: {
            tournamentId: tournamentId,
            teamId: loser
          },
          data: { finalRank: 3 } // Semifinalist
        });
      }

      // Update quarterfinal losers
      const quarterFinalMatches = await prisma.game.findMany({
        where: {
          tournamentId,
          round: 1,
          status: 'COMPLETED'
        }
      });

      for (const quarterMatch of quarterFinalMatches) {
        const loser = (quarterMatch.homeScore || 0) > (quarterMatch.awayScore || 0) ? quarterMatch.awayTeamId : quarterMatch.homeTeamId;
        await prisma.tournamentEntry.updateMany({
          where: {
            tournamentId: tournamentId,
            teamId: loser
          },
          data: { finalRank: 5 } // Quarterfinalist
        });
      }

      // Clean up timers
      this.cleanupTournamentTimers(tournamentId);

      logInfo(`Tournament ${tournamentId} completed successfully. Winner: ${winner.name}, Runner-up: ${runnerUp.name}`);
    } catch (error) {
      console.error(`Error completing tournament ${tournamentId}:`, error);
    }
  }

  /**
   * Award tournament prize to team
   */
  private async awardTournamentPrize(teamId: number, prize: { credits: number, gems: number }): Promise<void> {
    try {
      const teamFinances = await prisma.teamFinances.findUnique({
        where: { teamId }
      });

      if (!teamFinances) {
        console.error(`Team finances not found for team ${teamId}`);
        return;
      }

      // Award credits and gems
      await prisma.teamFinances.update({
        where: { teamId },
        data: {
          credits: {
            increment: BigInt(prize.credits)
          },
          gems: {
            increment: prize.gems
          }
        }
      });

      logInfo(`Awarded ${prize.credits} credits and ${prize.gems} gems to team ${teamId}`);
    } catch (error) {
      console.error(`Error awarding prize to team ${teamId}:`, error);
    }
  }

  /**
   * Clean up timers when tournament completes
   */
  cleanupTournamentTimers(tournamentId: number): void {
    const tournamentTimerKey = `tournament_${tournamentId}`;
    if (this.tournamentTimers.has(tournamentTimerKey)) {
      clearTimeout(this.tournamentTimers.get(tournamentTimerKey)!);
      this.tournamentTimers.delete(tournamentTimerKey);
    }

    // Clean up round timers
    for (let round = 1; round <= 3; round++) {
      const roundTimerKey = `round_${tournamentId}_${round}`;
      if (this.roundTimers.has(roundTimerKey)) {
        clearTimeout(this.roundTimers.get(roundTimerKey)!);
        this.roundTimers.delete(roundTimerKey);
      }
    }

    logInfo(`Cleaned up timers for tournament ${tournamentId}`);
  }
}

// Export singleton instance
export const tournamentFlowService = new TournamentFlowServiceImpl();

// Export for manual testing
export { TournamentFlowServiceImpl };