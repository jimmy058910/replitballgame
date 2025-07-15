import { prisma } from "../db";
import { logInfo } from "../logging";

interface TournamentFlowService {
  startTournamentCountdown(tournamentId: number): void;
  startRoundWithBuffer(tournamentId: number, roundNumber: number): void;
  handleMatchCompletion(matchId: number): void;
}

class TournamentFlowServiceImpl implements TournamentFlowService {
  private tournamentTimers: Map<string, NodeJS.Timeout> = new Map();
  private roundTimers: Map<string, NodeJS.Timeout> = new Map();

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
      const { matchStateManager } = require('./matchStateManager');
      const matchPromises = matches.map(async (match) => {
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
          await matchStateManager.startLiveMatch(match.id);
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
   * Start round with 2-minute buffer
   */
  startRoundWithBuffer(tournamentId: number, roundNumber: number): void {
    const timerKey = `round_${tournamentId}_${roundNumber}`;
    
    // Clear existing timer
    if (this.roundTimers.has(timerKey)) {
      clearTimeout(this.roundTimers.get(timerKey)!);
    }

    // Start 2-minute buffer
    const timer = setTimeout(async () => {
      try {
        await this.startTournamentRound(tournamentId, roundNumber);
        logInfo(`Tournament ${tournamentId} round ${roundNumber} started after 2-minute buffer`);
      } catch (error) {
        console.error(`Error starting tournament ${tournamentId} round ${roundNumber}:`, error);
      }
    }, 2 * 60 * 1000); // 2 minutes

    this.roundTimers.set(timerKey, timer);
    logInfo(`Tournament ${tournamentId} round ${roundNumber} buffer started - 2 minutes until start`);
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
        return; // Not a tournament match
      }

      // Apply stamina and injury logic
      await this.applyPostMatchEffects(match.homeTeamId, match.awayTeamId);

      // Check if round is complete and advance if necessary
      await this.checkAndAdvanceRound(match.tournamentId, match.round);
      
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
          newInjuryStatus = 'MAJOR_INJURY';
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
      // Get all matches for this round
      const roundMatches = await prisma.game.findMany({
        where: {
          tournamentId: tournamentId,
          round: completedRound
        }
      });

      // Check if all matches in this round are completed
      const completedMatches = roundMatches.filter(m => m.status === 'COMPLETED');
      
      if (completedMatches.length === roundMatches.length && roundMatches.length > 0) {
        // All matches in this round are complete
        const nextRound = completedRound + 1;
        
        // Check if next round already exists
        const nextRoundMatches = await prisma.game.findMany({
          where: {
            tournamentId: tournamentId,
            round: nextRound
          }
        });

        if (nextRoundMatches.length === 0) {
          // Generate next round matches
          await this.generateNextRoundMatches(tournamentId, completedRound);
          
          // Start next round with 2-minute buffer
          if (nextRound <= 3) { // Only up to finals
            this.startRoundWithBuffer(tournamentId, nextRound);
          }
        }
      }
    } catch (error) {
      console.error(`Error checking round advancement:`, error);
    }
  }

  /**
   * Generate next round matches
   */
  private async generateNextRoundMatches(tournamentId: number, completedRound: number): Promise<void> {
    try {
      // Get winners from completed round
      const completedMatches = await prisma.game.findMany({
        where: {
          tournamentId: tournamentId,
          round: completedRound,
          status: 'COMPLETED'
        },
        orderBy: { id: 'asc' }
      });

      if (completedMatches.length === 0) return;

      // Determine winners
      const winners = completedMatches.map(match => {
        if (match.homeScore > match.awayScore) {
          return match.homeTeamId;
        } else if (match.awayScore > match.homeScore) {
          return match.awayTeamId;
        } else {
          // No draws in tournament - this shouldn't happen
          return match.homeTeamId;
        }
      });

      // Generate next round matches
      const nextRound = completedRound + 1;
      const nextRoundMatches = [];
      
      for (let i = 0; i < winners.length; i += 2) {
        if (i + 1 < winners.length) {
          nextRoundMatches.push({
            tournamentId: tournamentId,
            homeTeamId: winners[i],
            awayTeamId: winners[i + 1],
            round: nextRound,
            status: 'SCHEDULED',
            matchType: 'TOURNAMENT_DAILY',
            gameDate: new Date(Date.now() + (2 * 60 * 1000)), // 2 minutes from now
            simulated: false
          });
        }
      }

      if (nextRoundMatches.length > 0) {
        await prisma.game.createMany({
          data: nextRoundMatches
        });
        
        logInfo(`Generated ${nextRoundMatches.length} matches for tournament ${tournamentId} round ${nextRound}`);
      }
    } catch (error) {
      console.error("Error generating next round matches:", error);
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

export const tournamentFlowService = new TournamentFlowServiceImpl();