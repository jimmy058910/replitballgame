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

  // Save live match state to database
  private async saveLiveStateToDatabase(matchId: string, liveState: LiveMatchState): Promise<void> {
    try {
      // Convert Maps to objects for JSON storage
      const playerStatsObj: Record<string, PlayerStatsSnapshot> = {};
      liveState.playerStats.forEach((stats, playerId) => {
        playerStatsObj[playerId] = stats;
      });

      const teamStatsObj: Record<string, TeamStatsSnapshot> = {};
      liveState.teamStats.forEach((stats, teamId) => {
        teamStatsObj[teamId] = stats;
      });

      const persistableState = {
        ...liveState,
        playerStats: playerStatsObj,
        teamStats: teamStatsObj,
        lastSavedAt: new Date().toISOString()
      };

      await prisma.game.update({
        where: { id: parseInt(matchId) },
        data: {
          simulationLog: persistableState,
          homeScore: liveState.homeScore,
          awayScore: liveState.awayScore,
          status: liveState.status === 'live' ? 'IN_PROGRESS' : 
                  liveState.status === 'completed' ? 'COMPLETED' : 'IN_PROGRESS'
        }
      });
    } catch (error) {
      console.error(`Failed to save live state for match ${matchId}:`, error);
    }
  }

  // Load live match state from database
  private async loadLiveStateFromDatabase(matchId: string): Promise<LiveMatchState | null> {
    try {
      const match = await prisma.game.findUnique({
        where: { id: parseInt(matchId) }
      });

      if (!match || !match.simulationLog || match.status !== 'IN_PROGRESS') {
        return null;
      }

      const persistedState = match.simulationLog as any;
      
      // Convert objects back to Maps
      const playerStats = new Map<string, PlayerStatsSnapshot>();
      if (persistedState.playerStats) {
        Object.entries(persistedState.playerStats).forEach(([playerId, stats]) => {
          playerStats.set(playerId, stats as PlayerStatsSnapshot);
        });
      }

      const teamStats = new Map<string, TeamStatsSnapshot>();
      if (persistedState.teamStats) {
        Object.entries(persistedState.teamStats).forEach(([teamId, stats]) => {
          teamStats.set(teamId, stats as TeamStatsSnapshot);
        });
      }

      const liveState: LiveMatchState = {
        ...persistedState,
        playerStats,
        teamStats,
        startTime: new Date(persistedState.startTime),
        lastUpdateTime: new Date(persistedState.lastUpdateTime || persistedState.startTime),
        gameEvents: persistedState.gameEvents || []
      };

      console.log(`🔄 Restored live state for match ${matchId} with ${liveState.gameEvents.length} events`);
      return liveState;
    } catch (error) {
      console.error(`Failed to load live state for match ${matchId}:`, error);
      return null;
    }
  }

  // Auto-recovery: Restore all active live matches from database on server start
  async recoverLiveMatches(): Promise<void> {
    try {
      const activeMatches = await prisma.game.findMany({
        where: { 
          status: 'IN_PROGRESS',
          simulationLog: { not: null }
        }
      });

      console.log(`🔄 Attempting to recover ${activeMatches.length} live matches from database`);

      for (const match of activeMatches) {
        const liveState = await this.loadLiveStateFromDatabase(match.id.toString());
        if (liveState) {
          this.liveMatches.set(match.id.toString(), liveState);
          
          // Get players for continued simulation
          const homeTeamPlayers = await prisma.player.findMany({
            where: { teamId: match.homeTeamId, isOnMarket: false }
          });
          const awayTeamPlayers = await prisma.player.findMany({
            where: { teamId: match.awayTeamId, isOnMarket: false }
          });

          // Resume match simulation
          this.startMatchSimulation(match.id.toString(), homeTeamPlayers, awayTeamPlayers);
          console.log(`✅ Recovered live match ${match.id} with ${liveState.gameEvents.length} events`);
        }
      }
    } catch (error) {
      console.error("Failed to recover live matches:", error);
    }
  }

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
    initialTeamStats.set(match.homeTeamId.toString(), {
      totalOffensiveYards: 0, passingYards: 0, carrierYards: 0,
      timeOfPossessionSeconds: 0, turnovers: 0, totalKnockdownsInflicted: 0,
    });
    initialTeamStats.set(match.awayTeamId.toString(), {
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
    
    // Save initial state to database
    await this.saveLiveStateToDatabase(matchId, matchState);

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
    try {
      const liveState = await this.loadLiveStateFromDatabase(matchId);
      if (!liveState) {
        return null;
      }

      this.liveMatches.set(matchId, liveState);

      // Get players for continued simulation
      const homeTeamPlayers = await prisma.player.findMany({
        where: { teamId: liveState.homeTeamId, isOnMarket: false }
      });
      const awayTeamPlayers = await prisma.player.findMany({
        where: { teamId: liveState.awayTeamId, isOnMarket: false }
      });

      // Resume match simulation if not completed
      if (liveState.status === 'live') {
        this.startMatchSimulation(matchId, homeTeamPlayers, awayTeamPlayers);
      }

      console.log(`🔄 Restarted match ${matchId} from database with ${liveState.gameEvents.length} events`);
      return liveState;
    } catch (error) {
      console.error(`Failed to restart match ${matchId} from database:`, error);
      return null;
    }
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
      try {
        const enhancedEvent = await this.generateEnhancedMatchEvent(homeTeamPlayers, awayTeamPlayers, state);
        if (enhancedEvent) {
          state.gameEvents.push(enhancedEvent);
          console.log(`[DEBUG] Generated event: ${enhancedEvent.type} by ${enhancedEvent.actingPlayerId}`);
        } else {
          console.log(`[DEBUG] Event generation returned null`);
        }
      } catch (error) {
        console.error(`[ERROR] Event generation failed:`, error);
      }
    }

    if (state.gameTime >= state.maxTime) {
      await this.completeMatch(matchId, state.homeTeamId, state.awayTeamId, homeTeamPlayers, awayTeamPlayers);
      return;
    }

    // Save state to database periodically
    if (state.gameTime % 30 === 0) { // Every 30 game seconds
      await this.saveLiveStateToDatabase(matchId, state);
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
    // Generate a single incremental event using enhanced mechanics
    const gamePhase = this.determineGamePhase(state.gameTime, state.maxTime);
    
    // Choose a random active player to generate event for
    const allPlayers = [...homePlayers, ...awayPlayers];
    const activePlayer = allPlayers[Math.floor(Math.random() * allPlayers.length)];
    const isHomeTeam = activePlayer.teamId.toString() === state.homeTeamId;
    
    // Generate event based on player role and current situation
    const eventTypes = ['pass', 'run', 'tackle', 'score', 'fumble', 'interception'];
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    
    // Get player stats for this match
    const playerStats = state.playerStats.get(activePlayer.id.toString());
    if (!playerStats) return null;
    
    // Generate event based on type and update stats
    let event: MatchEvent;
    const teamType = isHomeTeam ? 'home' : 'away';
    
    switch (eventType) {
      case 'pass':
        const passSuccess = Math.random() < 0.65; // 65% completion rate
        const passYards = Math.floor(Math.random() * 25) + 5;
        if (passSuccess) {
          playerStats.passingAttempts += 1;
          playerStats.passesCompleted += 1;
          playerStats.passingYards += passYards;
          event = {
            time: state.gameTime,
            type: 'pass',
            description: `${activePlayer.firstName} ${activePlayer.lastName} completes a ${passYards}-yard pass downfield!`,
            actingPlayerId: activePlayer.id.toString(),
            teamId: teamType,
            data: { yards: passYards }
          };
        } else {
          playerStats.passingAttempts += 1;
          event = {
            time: state.gameTime,
            type: 'pass',
            description: `${activePlayer.firstName} ${activePlayer.lastName}'s pass falls incomplete under pressure.`,
            actingPlayerId: activePlayer.id.toString(),
            teamId: teamType,
            data: { yards: 0 }
          };
        }
        break;
        
      case 'run':
        const runYards = Math.floor(Math.random() * 15) + 1;
        playerStats.carrierYards += runYards;
        event = {
          time: state.gameTime,
          type: 'run',
          description: `${activePlayer.firstName} ${activePlayer.lastName} carries the orb for ${runYards} yards through the scrum!`,
          actingPlayerId: activePlayer.id.toString(),
          teamId: teamType,
          data: { yards: runYards }
        };
        break;
        
      case 'tackle':
        playerStats.tackles += 1;
        event = {
          time: state.gameTime,
          type: 'tackle',
          description: `${activePlayer.firstName} ${activePlayer.lastName} makes a solid tackle to bring down the carrier!`,
          actingPlayerId: activePlayer.id.toString(),
          teamId: teamType,
          data: {}
        };
        break;
        
      case 'score':
        if (Math.random() < 0.05) { // 5% chance of scoring
          playerStats.scores += 1;
          if (isHomeTeam) {
            state.homeScore += 1;
          } else {
            state.awayScore += 1;
          }
          event = {
            time: state.gameTime,
            type: 'score',
            description: `SCORE! ${activePlayer.firstName} ${activePlayer.lastName} finds the end zone! What a magnificent effort!`,
            actingPlayerId: activePlayer.id.toString(),
            teamId: teamType,
            data: { score: 1 }
          };
        } else {
          // Default to tackle if score doesn't happen
          return this.generateEnhancedMatchEvent(homePlayers, awayPlayers, state);
        }
        break;
        
      case 'interception':
        if (Math.random() < 0.03) { // 3% chance of interception
          playerStats.interceptionsCaught += 1;
          event = {
            time: state.gameTime,
            type: 'interception',
            description: `${activePlayer.firstName} ${activePlayer.lastName} reads the play perfectly and intercepts the orb!`,
            actingPlayerId: activePlayer.id.toString(),
            teamId: teamType,
            data: {}
          };
        } else {
          // Default to tackle if interception doesn't happen
          return this.generateEnhancedMatchEvent(homePlayers, awayPlayers, state);
        }
        break;
        
      default:
        // Default tackle event
        playerStats.tackles += 1;
        event = {
          time: state.gameTime,
          type: 'tackle',
          description: `${activePlayer.firstName} ${activePlayer.lastName} makes a defensive play to stop the advance!`,
          actingPlayerId: activePlayer.id.toString(),
          teamId: teamType,
          data: {}
        };
    }
    
    return event;
  }
  
  private determineGamePhase(time: number, maxTime: number): string {
    const timePercent = time / maxTime;
    const halfTime = maxTime / 2;
    
    // First Half
    if (time < halfTime) {
      const firstHalfPercent = time / halfTime;
      if (firstHalfPercent < 0.3) return 'early';
      if (firstHalfPercent < 0.8) return 'middle';
      return 'late';
    }
    
    // Second Half
    const secondHalfTime = time - halfTime;
    const secondHalfPercent = secondHalfTime / halfTime;
    
    if (secondHalfPercent < 0.3) return 'early';
    if (secondHalfPercent < 0.7) return 'middle';
    if (secondHalfPercent < 0.9) return 'late';
    return 'clutch'; // Only final 10% of 2nd half
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

      // Update the match itself - check if it exists first
      const existingGame = await prisma.game.findUnique({
        where: { id: parseInt(matchId) }
      });
      
      if (existingGame) {
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
      } else {
        console.warn(`Game ${matchId} not found in database, cannot update completion status`);
      }

      console.log(`Match ${matchId} stats persisted successfully.`);

    } catch (error) {
      console.error(`Error persisting stats for match ${matchId}:`, error);
      
      // Check if the game exists before trying to update it
      try {
        const existingGame = await prisma.game.findUnique({
          where: { id: parseInt(matchId) }
        });
        
        if (existingGame) {
          // Game exists, update it with error info
          await prisma.game.update({
            where: { id: parseInt(matchId) },
            data: {
              status: 'COMPLETED',
              homeScore: state.homeScore,
              awayScore: state.awayScore,
              simulationLog: {
                events: state.gameEvents.slice(-50),
                finalScores: { home: state.homeScore, away: state.awayScore },
                error: `Error persisting stats: ${(error as Error).message}`
              }
            }
          });
        } else {
          console.warn(`Game ${matchId} not found in database, cannot update completion status`);
        }
      } catch (updateError) {
        console.error(`Error updating game ${matchId} after stats error:`, updateError);
        // Continue with match cleanup even if we can't update the database
      }
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

// Initialize auto-recovery system to restore live matches from database on server startup
(async () => {
  try {
    console.log('🔄 Initializing match state recovery system...');
    await matchStateManager.recoverLiveMatches();
    console.log('✅ Match state recovery system initialized');
  } catch (error) {
    console.error('❌ Failed to initialize match state recovery:', error);
  }
})();

// Clean up old matches every 30 minutes
setInterval(() => {
  matchStateManager.cleanupOldMatches();
}, 30 * 60 * 1000);