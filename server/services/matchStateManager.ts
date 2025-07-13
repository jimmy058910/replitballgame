import { prisma } from "../db";
import type { Game, Player, Stadium, Team } from "../../generated/prisma";
import { commentaryService } from "./commentaryService";
import { injuryStaminaService } from "./injuryStaminaService";
import { simulateEnhancedMatch } from "./matchSimulation";

// Helper type for player stats snapshot
type PlayerStatsSnapshot = {
  scores: number;
  passingAttempts: number;
  passesCompleted: number;
  passingYards: number;
  carrierYards: number;
  catches: number;
  receivingYards: number;
  drops: number;
  fumblesLost: number;
  tackles: number;
  knockdownsInflicted: number;
  interceptionsCaught: number;
  passesDefended: number;
};

// Helper type for team stats snapshot
type TeamStatsSnapshot = {
  possessionTime: number;
  turnovers: number;
  totalYards: number;
  passYards: number;
  carrierYards: number;
  firstDowns: number;
  penalties: number;
  penaltyYards: number;
};


interface LiveMatchState {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  startTime: Date;
  gameTime: number; // in seconds
  maxTime: number; // total game time in seconds  
  currentHalf: 1 | 2;
  homeScore: number;
  awayScore: number;
  status: 'live' | 'completed' | 'paused';
  gameEvents: MatchEvent[];
  lastUpdateTime: Date;

  // Detailed in-match stats
  playerStats: Map<string, PlayerStatsSnapshot>; // Keyed by playerId
  teamStats: Map<string, TeamStatsSnapshot>; // Keyed by teamId (home/away)

  // Possession tracking
  possessingTeamId: string | null; // Which team has the ball
  possessionStartTime: number; // Game time when current possession started
}

interface MatchEvent {
  time: number;
  type: string; // e.g., 'pass_attempt', 'pass_complete', 'rush', 'tackle', 'score', 'interception', 'fumble'
  description: string;
  actingPlayerId?: string; // Player performing the action
  targetPlayerId?: string; // Player targeted (e.g., receiver)
  defensivePlayerId?: string; // Player making a defensive play
  teamId?: string; // Team associated with the event (e.g., team that scored)
  data?: any; // yards, new ball position, etc.
}

class MatchStateManager {
  private liveMatches: Map<string, LiveMatchState> = new Map();
  private matchIntervals: Map<string, NodeJS.Timeout> = new Map();

  // Start a new live match with server-side state management
  async startLiveMatch(matchId: string, isExhibition: boolean = false): Promise<LiveMatchState> {
    const match = await prisma.game.findUnique({
      where: { id: parseInt(matchId) }
    });
    
    if (!match) {
      throw new Error("Match not found");
    }

    // Get team players for simulation
    const homeTeamPlayers = await prisma.player.findMany({
      where: { 
        teamId: match.homeTeamId,
        isOnMarket: false
      }
    });
    
    const awayTeamPlayers = await prisma.player.findMany({
      where: { 
        teamId: match.awayTeamId,
        isOnMarket: false
      }
    });

    const maxTime = isExhibition ? 1200 : 1800; // 20 min exhibition, 30 min league

    const initialPlayerStats = new Map<string, PlayerStatsSnapshot>();
    const allPlayers = [...homeTeamPlayers, ...awayTeamPlayers];
    allPlayers.forEach(player => {
      initialPlayerStats.set(player.id.toString(), {
        scores: 0, passingAttempts: 0, passesCompleted: 0, passingYards: 0,
        carrierYards: 0, catches: 0, receivingYards: 0, drops: 0, fumblesLost: 0,
        tackles: 0, knockdownsInflicted: 0, interceptionsCaught: 0, passesDefended: 0,
      });
    });

    const initialTeamStats = new Map<string, TeamStatsSnapshot>();
    initialTeamStats.set(match.homeTeamId, {
      totalOffensiveYards: 0, passingYards: 0, carrierYards: 0,
      timeOfPossessionSeconds: 0, turnovers: 0, totalKnockdownsInflicted: 0,
    });
    initialTeamStats.set(match.awayTeamId, {
      totalOffensiveYards: 0, passingYards: 0, carrierYards: 0,
      timeOfPossessionSeconds: 0, turnovers: 0, totalKnockdownsInflicted: 0,
    });

    // Determine initial possession (e.g., coin toss or home team starts)
    const initialPossessingTeam = Math.random() < 0.5 ? match.homeTeamId : match.awayTeamId;

    const matchState: LiveMatchState = {
      matchId,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      startTime: new Date(),
      gameTime: 0,
      maxTime,
      currentHalf: 1,
      homeScore: 0,
      awayScore: 0,
      status: 'live',
      gameEvents: [{
        time: 0,
        type: 'kickoff',
        description: commentaryService.generateKickoffCommentary(initialPossessingTeam === match.homeTeamId ? 'Home' : 'Away'),
        teamId: initialPossessingTeam,
        data: { homeTeam: match.homeTeamId, awayTeam: match.awayTeamId }
      }],
      lastUpdateTime: new Date(),
      playerStats: initialPlayerStats,
      teamStats: initialTeamStats,
      possessingTeamId: initialPossessingTeam,
      possessionStartTime: 0,
    };

    this.liveMatches.set(matchId, matchState);
    
    // Set appropriate stamina levels for match type (risk-free for exhibitions)
    const gameMode = isExhibition ? 'exhibition' : match.matchType === 'tournament' ? 'tournament' : 'league';
    for (const player of allPlayers) {
      await injuryStaminaService.setMatchStartStamina(player.id, gameMode);
    }
    
    // Start the match simulation loop
    this.startMatchSimulation(matchId, homeTeamPlayers, awayTeamPlayers);
    
    // Update match status in database with initial state
    await prisma.game.update({
      where: { id: parseInt(matchId) },
      data: { 
        status: 'IN_PROGRESS',
        gameDate: new Date(),
        homeScore: 0,
        awayScore: 0,
        simulationLog: {
          events: matchState.gameEvents,
          currentTime: 0,
          currentHalf: 1,
          maxTime: maxTime
        }
      }
    });

    return matchState;
  }

  // Get current match state for synchronization
  getMatchState(matchId: string): LiveMatchState | null {
    return this.liveMatches.get(matchId) || null;
  }

  // Synchronize client with server state
  async syncMatchState(matchId: string | number): Promise<LiveMatchState | null> {
    const matchIdStr = matchId.toString();
    const matchIdNum = parseInt(matchIdStr);
    
    const state = this.liveMatches.get(matchIdStr);
    if (!state) {
      // Check if match exists in database but not in memory
      const match = await prisma.game.findFirst({
        where: { id: matchIdNum }
      });
      if (match && match.status === 'IN_PROGRESS') {
        // Restart the match state from database
        return await this.restartMatchFromDatabase(matchIdStr);
      }
      return null;
    }
    
    // Update last access time
    state.lastUpdateTime = new Date();
    return state;
  }

  private async restartMatchFromDatabase(matchId: string): Promise<LiveMatchState | null> {
    const match = await prisma.game.findFirst({
      where: { id: parseInt(matchId) }
    });
    if (!match || match.status !== 'IN_PROGRESS') {
      return null;
    }

    // Calculate elapsed time since match started
    const startTime = match.gameDate || match.createdAt;
    if (!startTime) {
      return null;
    }
    const elapsedSeconds = Math.floor((Date.now() - startTime.getTime()) / 1000);
    const isExhibition = match.matchType === 'exhibition';
    const maxTime = isExhibition ? 1200 : 1800;

    // If match should have ended, complete it
    if (elapsedSeconds >= maxTime) {
      // Ensure this match instance is cleaned up if it's being restarted past its end time.
      const existingState = this.liveMatches.get(matchId);
      if (existingState) {
         const homeTeamPlayers = await prisma.player.findMany({
           where: { teamId: existingState.homeTeamId, isOnMarket: false }
         });
         const awayTeamPlayers = await prisma.player.findMany({
           where: { teamId: existingState.awayTeamId, isOnMarket: false }
         });
         await this.completeMatch(matchId, existingState.homeTeamId, existingState.awayTeamId, homeTeamPlayers, awayTeamPlayers);
      } else {
        // If no state, perhaps just update DB if needed, though this scenario is less likely.
        await prisma.game.update({
          where: { id: parseInt(matchId.toString()) },
          data: { status: 'COMPLETED' }
        });
      }
      return null;
    }

    const homeTeamPlayers = await prisma.player.findMany({
      where: { teamId: match.homeTeamId, isOnMarket: false }
    });
    const awayTeamPlayers = await prisma.player.findMany({
      where: { teamId: match.awayTeamId, isOnMarket: false }
    });

    // Reconstruct match state (simplified, full stat reconstruction might be complex)
    const currentHalf = elapsedSeconds < (maxTime / 2) ? 1 : 2;

    const initialPlayerStats = new Map<string, PlayerStatsSnapshot>();
    [...homeTeamPlayers, ...awayTeamPlayers].forEach(player => {
      initialPlayerStats.set(player.id, {
        scores: 0, passingAttempts: 0, passesCompleted: 0, passingYards: 0,
        carrierYards: 0, catches: 0, receivingYards: 0, drops: 0, fumblesLost: 0,
        tackles: 0, knockdownsInflicted: 0, interceptionsCaught: 0, passesDefended: 0,
      });
    });

    const initialTeamStats = new Map<string, TeamStatsSnapshot>();
    initialTeamStats.set(match.homeTeamId, {
      totalOffensiveYards: 0, passingYards: 0, carrierYards: 0,
      timeOfPossessionSeconds: 0, turnovers: 0, totalKnockdownsInflicted: 0,
    });
    initialTeamStats.set(match.awayTeamId, {
      totalOffensiveYards: 0, passingYards: 0, carrierYards: 0,
      timeOfPossessionSeconds: 0, turnovers: 0, totalKnockdownsInflicted: 0,
    });

    // Attempt to load some existing game data if available, but stats are tricky to reconstruct mid-game accurately
    // For now, restarting a live match will reset its detailed stats but keep score and time.
    // A more robust solution would involve serializing/deserializing the live stats maps.
    const gameEvents = (match.gameData as any)?.events || [];
    const possessingTeamId = gameEvents.length > 0 ? gameEvents[gameEvents.length - 1]?.teamId : (Math.random() < 0.5 ? match.homeTeamId : match.awayTeamId);


    const matchState: LiveMatchState = {
      matchId,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      startTime: startTime,
      gameTime: elapsedSeconds,
      maxTime,
      currentHalf,
      homeScore: match.homeScore || 0,
      awayScore: match.awayScore || 0,
      status: 'live',
      gameEvents,
      lastUpdateTime: new Date(),
      playerStats: initialPlayerStats, // Stats are reset for simplicity on restart
      teamStats: initialTeamStats,     // Stats are reset for simplicity on restart
      possessingTeamId: possessingTeamId || match.homeTeamId, // Default if no events
      possessionStartTime: elapsedSeconds, // Assume current possession started now
    };

    this.liveMatches.set(matchId, matchState);

    this.startMatchSimulation(matchId, homeTeamPlayers, awayTeamPlayers);

    return matchState;
  }

  private startMatchSimulation(matchId: string, homeTeamPlayers: Player[], awayTeamPlayers: Player[]) {
    const existingInterval = this.matchIntervals.get(matchId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    const interval = setInterval(async () => {
      await this.updateMatchState(matchId, homeTeamPlayers, awayTeamPlayers);
    }, 3000); // 3 real seconds = 9 game seconds (3x speed)

    this.matchIntervals.set(matchId, interval);
  }

  private async updateMatchState(matchId: string, homeTeamPlayers: Player[], awayTeamPlayers: Player[]) {
    const state = this.liveMatches.get(matchId);
    if (!state || state.status !== 'live') {
      return;
    }

    const gameTimeIncrement = 9; // 9 game seconds per tick
    state.gameTime += gameTimeIncrement;
    state.lastUpdateTime = new Date();

    // Update Time of Possession for current possessing team
    if (state.possessingTeamId) {
      const teamStats = state.teamStats.get(state.possessingTeamId);
      if (teamStats) {
        teamStats.timeOfPossessionSeconds += gameTimeIncrement;
      }
    }

    if (state.currentHalf === 1 && state.gameTime >= state.maxTime / 2) {
      this.handlePossessionChange(state, state.possessingTeamId, null, state.gameTime); // End of half might mean ball goes to other team or neutral
      state.currentHalf = 2;
      state.gameEvents.push({
        time: state.gameTime,
        type: 'halftime',
        description: commentaryService.generateHalftimeCommentary(),
      });
      // Typically, the team that kicked off to start the game receives the ball in the second half.
      // For simplicity, let's give it to the team that didn't have it last, or random if null.
      const newPossessingTeam = state.possessingTeamId === state.homeTeamId ? state.awayTeamId : state.homeTeamId;
      this.handlePossessionChange(state, null, newPossessingTeam, state.gameTime);
    }

    // Generate enhanced match events using the comprehensive simulation engine
    if (Math.random() < 0.7) { // 70% chance of an event each update cycle
      const enhancedEvent = await this.generateEnhancedMatchEvent(homeTeamPlayers, awayTeamPlayers, state);
      if (enhancedEvent) {
        state.gameEvents.push(enhancedEvent);
        // Score updates are now handled by the enhanced event generation logic
      }
    }

    if (state.gameTime >= state.maxTime) {
      await this.completeMatch(matchId, state.homeTeamId, state.awayTeamId, homeTeamPlayers, awayTeamPlayers);
      return;
    }

    if (state.gameTime % 30 === 0) { // Every 30 game seconds
      await prisma.game.update({
        where: { id: parseInt(matchId) },
        data: {
          homeScore: state.homeScore,
          awayScore: state.awayScore,
          simulationLog: {
            events: state.gameEvents.slice(-30), // Keep last 30 events
            currentTime: state.gameTime,
            currentHalf: state.currentHalf,
            maxTime: state.maxTime,
            // Consider adding current possession to simulationLog if useful for client UI
          }
        }
      });
    }
  }

  private handlePossessionChange(state: LiveMatchState, oldPossessingTeamId: string | null, newPossessingTeamId: string | null, gameTime: number) {
    if (oldPossessingTeamId && oldPossessingTeamId !== newPossessingTeamId) {
      const possessionDuration = gameTime - state.possessionStartTime;
      const teamStats = state.teamStats.get(oldPossessingTeamId);
      if (teamStats) {
        // This was adding increment twice, time is added per tick now.
        // teamStats.timeOfPossessionSeconds += possessionDuration;
      }
    }
    state.possessingTeamId = newPossessingTeamId;
    state.possessionStartTime = gameTime;
  }

  // ### Main Event Generation Logic ###
  private async generateEnhancedMatchEvent(homePlayers: Player[], awayPlayers: Player[], state: LiveMatchState): Promise<MatchEvent | null> {
    // Use the comprehensive enhanced simulation engine for event generation
    const simulationResult = await simulateEnhancedMatch(homePlayers, awayPlayers, state.homeTeamId, state.awayTeamId);
    
    // Extract a single event from the comprehensive simulation
    const recentEvents = simulationResult.gameData.events.slice(-1); // Get the latest event
    if (recentEvents.length === 0) return null;
    
    const event = recentEvents[0];
    
    // Update player stats from comprehensive simulation
    for (const [playerId, stats] of Object.entries(simulationResult.gameData.playerStats)) {
      const playerStats = state.playerStats.get(playerId);
      if (playerStats) {
        // Incrementally update stats instead of replacing
        playerStats.scores += stats.scores;
        playerStats.passingAttempts += stats.passingAttempts;
        playerStats.passesCompleted += stats.passesCompleted;
        playerStats.passingYards += stats.passingYards;
        playerStats.carrierYards += stats.rushingYards;
        playerStats.catches += stats.catches;
        playerStats.receivingYards += stats.receivingYards;
        playerStats.drops += stats.drops;
        playerStats.tackles += stats.tackles;
        playerStats.knockdownsInflicted += stats.knockdownsInflicted;
        playerStats.interceptionsCaught += stats.interceptionsCaught;
        playerStats.fumblesLost += stats.fumblesLost;
      }
    }
    
    // Update team scores from comprehensive simulation
    state.homeScore += simulationResult.homeScore;
    state.awayScore += simulationResult.awayScore;
    
    return {
      time: state.gameTime,
      type: event.type,
      description: event.description,
      actingPlayerId: event.player,
      teamId: event.team,
      data: event.data
    };
  }

  // OLD BASIC SIMULATION ENGINE REMOVED - Only enhanced simulation is now used


  private async completeMatch(matchId: string, homeTeamId: string, awayTeamId: string, homePlayers: Player[], awayPlayers: Player[]): Promise<void> {
    const state = this.liveMatches.get(matchId);
    if (!state) return;

    // Get match details to check if it's an exhibition match
    const matchDetails = await prisma.game.findFirst({
      where: { id: parseInt(matchId.toString()) }
    });
    const isExhibitionMatch = matchDetails?.matchType === 'exhibition';

    // Final possession update
    if (state.possessingTeamId) {
       const possessionDuration = state.gameTime - state.possessionStartTime;
       const teamStats = state.teamStats.get(state.possessingTeamId);
       if (teamStats) {
        // teamStats.timeOfPossessionSeconds += possessionDuration; // Already added per tick
       }
    }

    state.status = 'completed';
    
    // Clear the match interval
    const interval = this.matchIntervals.get(matchId);
    if (interval) {
      clearInterval(interval);
      this.matchIntervals.delete(matchId);
    }
    
    // Remove from live matches to prevent it from showing as live
    this.liveMatches.delete(matchId);

    // Persist detailed player and team stats
    try {
      const playerStatsToInsert: PlayerMatchStats[] = [];
      const playerUpdates: Promise<any>[] = [];

      for (const [playerId, pStats] of state.playerStats.entries()) {
        const playerTeam = homePlayers.find(p => p.id === playerId) ? homeTeamId : awayTeamId;
        playerStatsToInsert.push({
          id: undefined, // Let DB generate UUID
          playerId,
          matchId,
          teamId: playerTeam,
          createdAt: new Date(),
          ...pStats,
        });

        // Update lifetime stats (skip for exhibition matches to maintain risk-free gameplay)
        if (!isExhibitionMatch) {
          const playerToUpdate = await prisma.player.findFirst({
            where: { id: parseInt(playerId) }
          });
          if (playerToUpdate) {
            const updatedLifetimeStats: Partial<Player> = {
              totalGamesPlayed: (playerToUpdate.totalGamesPlayed || 0) + 1,
              totalScores: (playerToUpdate.totalScores || 0) + (pStats.scores || 0),
              totalPassingAttempts: (playerToUpdate.totalPassingAttempts || 0) + (pStats.passingAttempts || 0),
              totalPassesCompleted: (playerToUpdate.totalPassesCompleted || 0) + (pStats.passesCompleted || 0),
              totalPassingYards: (playerToUpdate.totalPassingYards || 0) + (pStats.passingYards || 0),
              totalCarrierYards: (playerToUpdate.totalCarrierYards || 0) + (pStats.carrierYards || 0),
              totalCatches: (playerToUpdate.totalCatches || 0) + (pStats.catches || 0),
              totalReceivingYards: (playerToUpdate.totalReceivingYards || 0) + (pStats.receivingYards || 0),
              totalDrops: (playerToUpdate.totalDrops || 0) + (pStats.drops || 0),
              totalFumblesLost: (playerToUpdate.totalFumblesLost || 0) + (pStats.fumblesLost || 0),
              totalTackles: (playerToUpdate.totalTackles || 0) + (pStats.tackles || 0),
              totalKnockdownsInflicted: (playerToUpdate.totalKnockdownsInflicted || 0) + (pStats.knockdownsInflicted || 0),
              totalInterceptionsCaught: (playerToUpdate.totalInterceptionsCaught || 0) + (pStats.interceptionsCaught || 0),
              totalPassesDefended: (playerToUpdate.totalPassesDefended || 0) + (pStats.passesDefended || 0),
            };
            playerUpdates.push(prisma.player.update({
              where: { id: parseInt(playerId) },
              data: updatedLifetimeStats
            }));
          }
        }
      }

      const teamStatsToInsert: TeamMatchStats[] = [];
      for (const [teamId, tStats] of state.teamStats.entries()) {
        teamStatsToInsert.push({
          id: undefined, // Let DB generate UUID
          teamId,
          matchId,
          createdAt: new Date(),
          ...tStats,
        });
      }

      // Insert player match stats
      if (playerStatsToInsert.length > 0) {
        await prisma.playerMatchStats.createMany({
          data: playerStatsToInsert
        });
      }
      
      // Insert team match stats
      if (teamStatsToInsert.length > 0) {
        await prisma.teamMatchStats.createMany({
          data: teamStatsToInsert
        });
      }

      // Update player lifetime stats if not exhibition
      if (playerUpdates.length > 0 && !isExhibitionMatch) {
        await Promise.all(playerUpdates);
      }

      // Update the match itself
      await prisma.game.update({
        where: { id: parseInt(matchId) },
        data: {
          status: 'COMPLETED',
          homeScore: state.homeScore,
          awayScore: state.awayScore,
          simulationLog: {
            events: state.gameEvents.slice(-50), // Store last 50 events
            finalScores: { home: state.homeScore, away: state.awayScore },
          }
        }
      });

      console.log(`Match ${matchId} stats persisted successfully.`);

    } catch (error) {
      console.error(`Error persisting stats for match ${matchId}:`, error);
      // Potentially re-throw or handle more gracefully (e.g., mark match as 'error_in_stats')
      // For now, we'll update the match to completed anyway, but log the error.
       await prisma.game.update({
        where: { id: parseInt(matchId) },
        data: {
          status: 'COMPLETED', // Or a special status like 'completed_stats_error'
          homeScore: state.homeScore,
          awayScore: state.awayScore,
          simulationLog: {
            events: state.gameEvents.slice(-50),
            finalScores: { home: state.homeScore, away: state.awayScore },
            error: `Error persisting stats: ${(error as Error).message}`
          }
        }
      });
    }

    // Apply stamina depletion after match completion (skip for exhibition matches)
    if (!isExhibitionMatch) {
      const gameMode = matchDetails?.matchType === 'tournament' ? 'tournament' : 'league';
      for (const player of [...homePlayers, ...awayPlayers]) {
        await injuryStaminaService.depleteStaminaAfterMatch(player.id, gameMode);
      }
    } else {
      // Award exhibition credits and team camaraderie for risk-free matches
      await this.awardExhibitionRewards(state.homeTeamId, state.awayTeamId, state.homeScore, state.awayScore);
    }

    this.liveMatches.delete(matchId);
    console.log(`Match ${matchId} completed with score ${state.homeScore}-${state.awayScore}${isExhibitionMatch ? ' (Exhibition - Risk-Free)' : ''}`);
  }

  async stopMatch(matchId: string): Promise<void> {
    console.log(`🔍 stopMatch called for matchId: ${matchId}`);
    const state = this.liveMatches.get(matchId);
    console.log(`🎯 Live match state found: ${state ? 'YES' : 'NO'}`);
    
    if (state) {
      console.log(`🏈 Completing match: ${matchId} between teams ${state.homeTeamId} and ${state.awayTeamId}`);
      try {
        // Need to pass all required parameters to completeMatch
        const homePlayers = await prisma.player.findMany({
          where: { teamId: parseInt(state.homeTeamId) }
        });
        const awayPlayers = await prisma.player.findMany({
          where: { teamId: parseInt(state.awayTeamId) }
        });
        console.log(`👥 Found ${homePlayers.length} home players and ${awayPlayers.length} away players`);
        await this.completeMatch(parseInt(matchId), state.homeTeamId, state.awayTeamId, homePlayers, awayPlayers);
        console.log(`✅ Match ${matchId} completion successful`);
      } catch (error) {
        console.error(`❌ Error completing match ${matchId}:`, error);
        throw error;
      }
    } else {
      console.warn(`⚠️  Match ${matchId} not found in live matches. Available matches: ${Array.from(this.liveMatches.keys()).join(', ')}`);
    }
  }

  // Get all active matches
  getActiveMatches(): LiveMatchState[] {
    return Array.from(this.liveMatches.values());
  }

  /**
   * Award exhibition match rewards based on match result
   * Rewards structure: Win: 500₡, Tie: 200₡, Loss: 100₡
   * Also provides team camaraderie boost for winning teams
   */
  private async awardExhibitionRewards(homeTeamId: string, awayTeamId: string, homeScore: number, awayScore: number): Promise<void> {
    try {
      let homeCredits = 100; // Default for loss
      let awayCredits = 100; // Default for loss
      let winningTeamId: string | null = null;

      // Determine match result and credit rewards
      if (homeScore > awayScore) {
        homeCredits = 500; // Win
        winningTeamId = homeTeamId;
      } else if (awayScore > homeScore) {
        awayCredits = 500; // Win
        winningTeamId = awayTeamId;
      } else {
        // Tie - both teams get 200 credits
        homeCredits = 200;
        awayCredits = 200;
      }

      // Award credits to both teams
      await prisma.team.update({
        where: { id: parseInt(homeTeamId) },
        data: {
          credits: {
            increment: homeCredits
          }
        }
      });

      await prisma.team.update({
        where: { id: parseInt(awayTeamId) },
        data: {
          credits: {
            increment: awayCredits
          }
        }
      });

      // Award team camaraderie boost to winning team players (if not a tie)
      if (winningTeamId) {
        // Get all players for the winning team and update their camaraderie
        const winningPlayers = await prisma.player.findMany({
          where: { teamId: parseInt(winningTeamId) }
        });
        
        for (const player of winningPlayers) {
          await prisma.player.update({
            where: { id: player.id },
            data: {
              camaraderie: Math.min(100, (player.camaraderie || 0) + 2)
            }
          });
        }
      }

      console.log(`Exhibition rewards awarded: Home Team (${homeScore}): ${homeCredits}₡, Away Team (${awayScore}): ${awayCredits}₡${winningTeamId ? ` + camaraderie boost` : ''}`);

    } catch (error) {
      console.error('Error awarding exhibition rewards:', error);
    }
  }

  // Clean up old matches (run periodically)
  async cleanupOldMatches(): Promise<void> {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago

    const matchIds = Array.from(this.liveMatches.keys());
    for (const matchId of matchIds) {
      const state = this.liveMatches.get(matchId);
      if (!state) continue;
      if (state.lastUpdateTime < cutoff) {
        console.log(`Cleaning up abandoned match: ${matchId}`);
        const homePlayers = await prisma.player.findMany({
          where: { teamId: state.homeTeamId }
        });
        const awayPlayers = await prisma.player.findMany({
          where: { teamId: state.awayTeamId }
        });
        await this.completeMatch(matchId, state.homeTeamId, state.awayTeamId, homePlayers, awayPlayers);
      }
    }
  }
}

// Create singleton instance
export const matchStateManager = new MatchStateManager();

// Clean up old matches every 30 minutes
setInterval(() => {
  matchStateManager.cleanupOldMatches();
}, 30 * 60 * 1000);