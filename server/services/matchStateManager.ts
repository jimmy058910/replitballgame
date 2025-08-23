import { getPrismaClient } from "../database.js";
import type { Game, Player, Stadium, Team } from "@prisma/client";
import { commentaryService } from "./commentaryService.js";
import { injuryStaminaService } from "./injuryStaminaService.js";
import { simulateEnhancedMatch } from "./matchSimulation.js";
import logger from '../utils/logger';
import { PaymentHistoryService } from "./paymentHistoryService.js";
import { getGameDurationSeconds, type MatchType } from "../utils/gameTimeUtils.js";

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
  tackles: number;
  knockdownsInflicted: number;
  passesDefended: number;
};

// Helper type for team stats snapshot
type TeamStatsSnapshot = {
  possessionTime: number;
  totalYards: number;
  passYards: number;
  carrierYards: number;
  firstDowns: number;
  penalties: number;
  penaltyYards: number;
  timeOfPossessionSeconds?: number;
  passingYards?: number;
  totalOffensiveYards?: number;
  totalKnockdownsInflicted?: number;
  turnovers?: number;
};

// Player match time tracking interface
interface PlayerMatchTime {
  playerId: string;
  timeEntered: number;  // Game time in seconds when player entered field
  timeExited?: number;  // Game time in seconds when player left field (undefined if currently playing)
  totalMinutes: number; // Accumulated time on field in minutes
  isCurrentlyPlaying: boolean;
  substitutionReason?: 'stamina' | 'injury' | 'tactical' | 'starter'; // Why they entered/left
}

// Active field players tracking
interface FieldPlayers {
  passers: string[];    // Player IDs currently on field in passer role
  runners: string[];    // Player IDs currently on field in runner role  
  blockers: string[];   // Player IDs currently on field in blocker role
  wildcards: string[];  // Player IDs currently on field as wildcards
}

// Substitution queue from tactical setup
interface SubstitutionQueue {
  passers: string[];    // Ordered list of passer substitutes
  runners: string[];    // Ordered list of runner substitutes
  blockers: string[];   // Ordered list of blocker substitutes
  wildcards: string[];  // Ordered list of wildcard substitutes
}


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

  // NEW: Player time tracking system
  playerMatchTimes: Map<string, PlayerMatchTime>; // Track all player minutes (keyed by playerId)
  activeFieldPlayers: {
    home: FieldPlayers;
    away: FieldPlayers;
  };
  substitutionQueues: {
    home: SubstitutionQueue;
    away: SubstitutionQueue;
  };
}

interface MatchEvent {
  time: number;
  type: string; // e.g., 'pass_attempt', 'pass_complete', 'rush', 'tackle', 'score'
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
  private webSocketService: any = null; // Will be injected by WebSocket service

  // Set WebSocket service for broadcasting
  setWebSocketService(webSocketService: any) {
    this.webSocketService = webSocketService;
  }

  // Clean up any existing live matches for a team
  async cleanupTeamMatches(teamId: string): Promise<void> {
    try {
      // Find all live matches involving this team
      const matchesToCleanup = Array.from(this.liveMatches.values())
        .filter((match: any) => match.homeTeamId === teamId || match.awayTeamId === teamId);
      
      logger.info(`🧹 Found ${matchesToCleanup.length} live matches to clean up for team ${teamId}`);
      
      for (const match of matchesToCleanup) {
        logger.info(`🧹 Cleaning up match ${match.matchId}`);
        await this.stopMatch(match.matchId);
      }
    } catch (error) {
      console.error(`Error cleaning up team matches for team ${teamId}:`, error);
    }
  }

  // NEW: Initialize player match times for starters
  private initializePlayerMatchTimes(
    state: LiveMatchState, 
    homeStarters: Player[], 
    awayStarters: Player[]
  ): void {
    const gameStartTime = 0; // Match starts at time 0

    // Initialize home team starters
    homeStarters.forEach(player => {
      const playerMatchTime: PlayerMatchTime = {
        playerId: player.id.toString(),
        timeEntered: gameStartTime,
        totalMinutes: 0,
        isCurrentlyPlaying: true,
        substitutionReason: 'starter'
      };
      state.playerMatchTimes.set(player.id.toString(), playerMatchTime);
      
      // Add to active field players based on role
      const role = player.role?.toLowerCase();
      if (role === 'passer') {
        state.activeFieldPlayers.home.passers.push(player.id.toString());
      } else if (role === 'runner') {
        state.activeFieldPlayers.home.runners.push(player.id.toString());
      } else if (role === 'blocker') {
        state.activeFieldPlayers.home.blockers.push(player.id.toString());
      }
    });

    // Initialize away team starters
    awayStarters.forEach(player => {
      const playerMatchTime: PlayerMatchTime = {
        playerId: player.id.toString(),
        timeEntered: gameStartTime,
        totalMinutes: 0,
        isCurrentlyPlaying: true,
        substitutionReason: 'starter'
      };
      state.playerMatchTimes.set(player.id.toString(), playerMatchTime);
      
      // Add to active field players based on role
      const role = player.role?.toLowerCase();
      if (role === 'passer') {
        state.activeFieldPlayers.away.passers.push(player.id.toString());
      } else if (role === 'runner') {
        state.activeFieldPlayers.away.runners.push(player.id.toString());
      } else if (role === 'blocker') {
        state.activeFieldPlayers.away.blockers.push(player.id.toString());
      }
    });

    logger.info(`⏱️ Initialized match time tracking for ${homeStarters.length + awayStarters.length} starters`);
  }

  // NEW: Check for substitution triggers during match simulation
  private checkSubstitutionTriggers(
    state: LiveMatchState, 
    allPlayers: Player[]
  ): void {
    const currentTime = state.gameTime;
    const playersToSubstitute: { playerId: string, reason: 'stamina' | 'injury', teamSide: 'home' | 'away' }[] = [];

    // Check stamina levels for auto-substitution (50% threshold)
    for (const [playerId, playerTime] of state.playerMatchTimes.entries()) {
      if (!playerTime.isCurrentlyPlaying) continue;

      const player = allPlayers.find((p: any) => p.id.toString() === playerId);
      if (!player) continue;

      const currentStamina = player.dailyStaminaLevel || 100;
      const teamSide = state.homeTeamId === player.teamId?.toString() ? 'home' : 'away';

      // Auto-substitute at 50% stamina or if severely injured
      if (currentStamina <= 50) {
        playersToSubstitute.push({ playerId, reason: 'stamina', teamSide });
      } else if (player.injuryStatus === 'SEVERE' as any) {
        playersToSubstitute.push({ playerId, reason: 'injury', teamSide });
      }
    }

    // Process substitutions
    for (const substitution of playersToSubstitute) {
      this.processSubstitution(state, substitution.playerId, substitution.reason, currentTime);
    }
  }

  // NEW: Process individual player substitution
  private processSubstitution(
    state: LiveMatchState,
    outgoingPlayerId: string,
    reason: 'stamina' | 'injury' | 'tactical',
    currentTime: number
  ): void {
    const playerTime = state.playerMatchTimes.get(outgoingPlayerId);
    if (!playerTime || !playerTime.isCurrentlyPlaying) return;

    // Calculate time played for outgoing player
    const timePlayedInSeconds = currentTime - playerTime.timeEntered;
    const timePlayedInMinutes = timePlayedInSeconds / 60;
    
    // Update outgoing player's record
    playerTime.timeExited = currentTime;
    playerTime.totalMinutes += timePlayedInMinutes;
    playerTime.isCurrentlyPlaying = false;

    // Find a suitable substitute (this is a simplified version - in full implementation would use substitution queues)
    const incomingPlayerId = this.findSubstitute(state, outgoingPlayerId);
    
    if (incomingPlayerId) {
      // Create or update incoming player's time record
      let incomingPlayerTime = state.playerMatchTimes.get(incomingPlayerId);
      if (!incomingPlayerTime) {
        incomingPlayerTime = {
          playerId: incomingPlayerId,
          timeEntered: currentTime,
          totalMinutes: 0,
          isCurrentlyPlaying: true,
          substitutionReason: reason
        };
        state.playerMatchTimes.set(incomingPlayerId, incomingPlayerTime);
      } else {
        incomingPlayerTime.timeEntered = currentTime;
        incomingPlayerTime.isCurrentlyPlaying = true;
      }

      // Update active field players lists
      this.updateActiveFieldPlayers(state, outgoingPlayerId, incomingPlayerId);

      logger.info(`🔄 SUBSTITUTION: Player ${outgoingPlayerId} out (${timePlayedInMinutes.toFixed(1)} min, ${reason}) → Player ${incomingPlayerId} in`);
    }
  }

  // NEW: Find suitable substitute (simplified version)
  private findSubstitute(state: LiveMatchState, outgoingPlayerId: string): string | null {
    // This is a simplified version - in the full implementation, this would:
    // 1. Determine the team and role of the outgoing player
    // 2. Check the substitution queue for that role
    // 3. Find the next available substitute with sufficient stamina
    // 4. Return the appropriate substitute player ID
    
    // For now, return null to indicate no substitute found
    return null;
  }

  // NEW: Update active field players after substitution
  private updateActiveFieldPlayers(state: LiveMatchState, outgoingPlayerId: string, incomingPlayerId: string): void {
    // Update home team active players
    ['passers', 'runners', 'blockers', 'wildcards'].forEach(position => {
      const homeIndex = state.activeFieldPlayers.home[position as keyof FieldPlayers].indexOf(outgoingPlayerId);
      if (homeIndex !== -1) {
        state.activeFieldPlayers.home[position as keyof FieldPlayers][homeIndex] = incomingPlayerId;
      }
      
      const awayIndex = state.activeFieldPlayers.away[position as keyof FieldPlayers].indexOf(outgoingPlayerId);
      if (awayIndex !== -1) {
        state.activeFieldPlayers.away[position as keyof FieldPlayers][awayIndex] = incomingPlayerId;
      }
    });
  }

  // NEW: Calculate final minutes played for all players at match end
  private calculateFinalMinutesPlayed(state: LiveMatchState): Map<string, number> {
    const finalMinutes = new Map<string, number>();
    const matchEndTime = state.gameTime;

    for (const [playerId, playerTime] of state.playerMatchTimes.entries()) {
      let totalMinutes = playerTime.totalMinutes;
      
      // If player is still on field at match end, add final segment
      if (playerTime.isCurrentlyPlaying) {
        const finalSegmentSeconds = matchEndTime - playerTime.timeEntered;
        const finalSegmentMinutes = finalSegmentSeconds / 60;
        totalMinutes += finalSegmentMinutes;
      }
      
      finalMinutes.set(playerId, Math.max(0, totalMinutes)); // Ensure non-negative
    }

    return finalMinutes;
  }

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

      // Convert playerMatchTimes Map to object for JSON storage
      const playerMatchTimesObj: Record<string, PlayerMatchTime> = {};
      liveState.playerMatchTimes.forEach((time, playerId) => {
        playerMatchTimesObj[playerId] = time;
      });

      const persistableState = {
        ...liveState,
        playerStats: playerStatsObj,
        teamStats: teamStatsObj,
        playerMatchTimes: playerMatchTimesObj,
        lastSavedAt: new Date().toISOString()
      };

      await (await getPrismaClient()).game.update({
        where: { id: parseInt(matchId) },
        data: {
          simulationLog: persistableState as any,
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
      const match = await (await getPrismaClient()).game.findUnique({
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

      // Convert playerMatchTimes object back to Map
      const playerMatchTimes = new Map<string, PlayerMatchTime>();
      if (persistedState.playerMatchTimes) {
        Object.entries(persistedState.playerMatchTimes).forEach(([playerId, time]) => {
          playerMatchTimes.set(playerId, time as PlayerMatchTime);
        });
      }

      const liveState: LiveMatchState = {
        ...persistedState,
        playerStats,
        teamStats,
        playerMatchTimes,
        startTime: new Date(persistedState.startTime),
        lastUpdateTime: new Date(persistedState.lastUpdateTime || persistedState.startTime),
        gameEvents: persistedState.gameEvents || []
      };

      logger.info(`🔄 Restored live state for match ${matchId} with ${liveState.gameEvents.length} events`);
      return liveState;
    } catch (error) {
      console.error(`Failed to load live state for match ${matchId}:`, error);
      return null;
    }
  }

  // Auto-recovery: Restore all active live matches from database on server start
  async recoverLiveMatches(): Promise<void> {
    try {
      const activeMatches = await (await getPrismaClient()).game.findMany({
        where: { 
          status: 'IN_PROGRESS',
          simulationLog: { not: null as any }
        }
      });

      logger.info(`🔄 Attempting to recover ${activeMatches.length} live matches from database`);

      for (const match of activeMatches) {
        const liveState = await this.loadLiveStateFromDatabase(match.id.toString());
        if (liveState) {
          this.liveMatches.set(match.id.toString(), liveState);
          
          // Get players for continued simulation
          const homeTeamPlayers = await (await getPrismaClient()).player.findMany({
            where: { teamId: match.homeTeamId, isOnMarket: false }
          });
          const awayTeamPlayers = await (await getPrismaClient()).player.findMany({
            where: { teamId: match.awayTeamId, isOnMarket: false }
          });

          // Get formation data to determine starters
          const homeFormation = await this.getTeamFormation(match.homeTeamId);
          const awayFormation = await this.getTeamFormation(match.awayTeamId);

          // Apply formation data to determine starters
          const homeStarters = this.applyFormationToPlayers(homeTeamPlayers, homeFormation);
          const awayStarters = this.applyFormationToPlayers(awayTeamPlayers, awayFormation);

          // Resume match simulation with formation starters
          this.startMatchSimulation(match.id.toString(), homeStarters, awayStarters, homeTeamPlayers, awayTeamPlayers);
          logger.info(`✅ Recovered live match ${match.id} with ${liveState.gameEvents.length} events`);
        }
      }
    } catch (error) {
      logger.info(`❌ Failed to recover live matches: ${error}`);
    }
  }

  // Helper function to get formation data for a team
  private async getTeamFormation(teamId: number): Promise<{ starters: any[], formation: string } | null> {
    try {
      const strategy = await (await getPrismaClient()).strategy.findUnique({
        where: { teamId: teamId }
      });
      
      if (strategy && strategy.formationJson) {
        let formationData;
        
        logger.info(`🔍 Raw formation data for team ${teamId}: ${JSON.stringify(strategy.formationJson)} (type: ${typeof strategy.formationJson})`);
        
        // Handle both string and object format
        if (typeof strategy.formationJson === 'string') {
          formationData = JSON.parse(strategy.formationJson);
        } else if (typeof strategy.formationJson === 'object' && strategy.formationJson !== null) {
          // Already an object (Prisma JSON field)
          formationData = strategy.formationJson;
        } else {
          logger.info(`⚠️ Invalid formation data format for team ${teamId}:`, typeof strategy.formationJson);
          return null;
        }
        
        logger.info(`🔍 Parsed formation data for team ${teamId}:`, formationData);
        return formationData;
      }
      
      logger.info(`⚠️ No formation data found for team ${teamId}`);
      return null;
    } catch (error) {
      console.error(`Error getting formation for team ${teamId}:`, error);
      return null;
    }
  }

  // Helper function to apply formation data to select starters
  private applyFormationToPlayers(teamPlayers: Player[], formation: { starters: any[], formation: string } | null): Player[] {
    if (!formation || !formation.starters) {
      // No formation data - use default selection (first 6 players by role)
      logger.info(`🎯 Using default starter selection for team (no formation data)`);
      return this.selectDefaultStarters(teamPlayers);
    }

    // Formation data exists - use the specified starters
    logger.info(`🎯 Using formation starters:`, formation.starters);
    logger.info(`🔍 Available players:`, teamPlayers.map((p: any) => `${p.id}: ${p.firstName} ${p.lastName} (${p.role})`));
    
    // Handle both formats: array of objects with id property or array of numbers
    const starterIds = formation.starters.map(s => {
      if (typeof s === 'number') {
        return s; // Already a number
      } else if (typeof s === 'object' && s.id) {
        return parseInt(s.id.toString()); // Object with id property
      } else {
        console.warn(`⚠️ Unknown starter format:`, s);
        return parseInt(s.toString()); // Try to convert whatever it is
      }
    });
    logger.info(`🔍 Formation starter IDs:`, starterIds);
    
    const selectedStarters = teamPlayers.filter(player => {
      const playerIdNum = parseInt(player.id.toString());
      const isSelected = starterIds.includes(playerIdNum);
      logger.info(`🔍 Player ${playerIdNum} (${player.firstName} ${player.lastName}): ${isSelected ? 'SELECTED' : 'not selected'}`);
      return isSelected;
    });
    
    logger.info(`🎯 Selected ${selectedStarters.length} starters from formation`);
    
    if (selectedStarters.length !== 6) {
      console.warn(`⚠️ Formation has ${selectedStarters.length} starters instead of 6, falling back to default selection`);
      logger.info(`⚠️ Missing starters. Expected: ${starterIds}, Found: ${selectedStarters.map((p: any) => p.id)}`);
      return this.selectDefaultStarters(teamPlayers);
    }
    
    logger.info(`✅ Selected formation starters:`, selectedStarters.map((p: any) => `${p.firstName} ${p.lastName} (${p.role})`));
    return selectedStarters;
  }

  // Helper function to select default starters when no formation exists
  private selectDefaultStarters(teamPlayers: Player[]): Player[] {
    const blockers = teamPlayers.filter((p: any) => p.role === 'BLOCKER');
    const runners = teamPlayers.filter((p: any) => p.role === 'RUNNER');
    const passers = teamPlayers.filter((p: any) => p.role === 'PASSER');
    
    // Select 2 blockers, 2 runners, 2 passers (standard formation)
    const starters = [
      ...blockers.slice(0, 2),
      ...runners.slice(0, 2),
      ...passers.slice(0, 2)
    ];
    
    logger.info(`🎯 Default starters selected:`, starters.map((p: any) => `${p.firstName} ${p.lastName} (${p.role})`));
    return starters;
  }

  // Start a new live match with server-side state management
  async startLiveMatch(matchId: string, isExhibition: boolean = false): Promise<LiveMatchState> {
    const prisma = await getPrismaClient();
    const match = await (await getPrismaClient()).game.findUnique({
      where: { id: parseInt(matchId) }
    });
    
    if (!match) {
      throw new Error("Match not found");
    }

    // Get team players for simulation
    const homeTeamPlayers = await (await getPrismaClient()).player.findMany({
      where: { 
        teamId: match.homeTeamId,
        isOnMarket: false
      }
    });
    
    const awayTeamPlayers = await (await getPrismaClient()).player.findMany({
      where: { 
        teamId: match.awayTeamId,
        isOnMarket: false
      }
    });

    // Get formation data for both teams
    const homeFormation = await this.getTeamFormation(match.homeTeamId);
    const awayFormation = await this.getTeamFormation(match.awayTeamId);

    // Apply formation data to determine starters
    const homeStarters = this.applyFormationToPlayers(homeTeamPlayers, homeFormation);
    const awayStarters = this.applyFormationToPlayers(awayTeamPlayers, awayFormation);

    logger.info(`🏟️ Match ${matchId} starters:`, {
      home: homeStarters.map((p: any) => `${p.firstName} ${p.lastName} (${p.role})`),
      away: awayStarters.map((p: any) => `${p.firstName} ${p.lastName} (${p.role})`)
    });
    logger.info(`🔍 STARTER COUNT CHECK: Home has ${homeStarters.length} starters, Away has ${awayStarters.length} starters`);

    const matchType: any = isExhibition ? 'EXHIBITION' : 'LEAGUE';
    const maxTime = getGameDurationSeconds(matchType);

    const initialPlayerStats = new Map<string, PlayerStatsSnapshot>();
    const allPlayers = [...homeTeamPlayers, ...awayTeamPlayers];
    allPlayers.forEach(player => {
      initialPlayerStats.set(player.id.toString(), {
        scores: 0, passingAttempts: 0, passesCompleted: 0, passingYards: 0,
        carrierYards: 0, catches: 0, receivingYards: 0, drops: 0,
        tackles: 0, knockdownsInflicted: 0, passesDefended: 0,
      });
    });

    const initialTeamStats = new Map<string, TeamStatsSnapshot>();
    initialTeamStats.set(match.homeTeamId.toString(), {
      possessionTime: 0, totalYards: 0, passYards: 0, carrierYards: 0,
      firstDowns: 0, penalties: 0, penaltyYards: 0,
    });
    initialTeamStats.set(match.awayTeamId.toString(), {
      possessionTime: 0, totalYards: 0, passYards: 0, carrierYards: 0,
      firstDowns: 0, penalties: 0, penaltyYards: 0,
    });

    // Determine initial possession (e.g., coin toss or home team starts)
    const initialPossessingTeam = Math.random() < 0.5 ? match.homeTeamId.toString() : match.awayTeamId.toString();

    const matchState: LiveMatchState = {
      matchId,
      homeTeamId: match.homeTeamId.toString(),
      awayTeamId: match.awayTeamId.toString(),
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
        description: commentaryService.generateKickoffCommentary(initialPossessingTeam === match.homeTeamId.toString() ? 'Home' : 'Away'),
        teamId: initialPossessingTeam,
        data: { homeTeam: match.homeTeamId, awayTeam: match.awayTeamId }
      }],
      lastUpdateTime: new Date(),
      playerStats: initialPlayerStats,
      teamStats: initialTeamStats,
      possessingTeamId: initialPossessingTeam,
      possessionStartTime: 0,
      // NEW: Initialize player time tracking system
      playerMatchTimes: new Map(),
      activeFieldPlayers: {
        home: { passers: [], runners: [], blockers: [], wildcards: [] },
        away: { passers: [], runners: [], blockers: [], wildcards: [] }
      },
      substitutionQueues: {
        home: { passers: [], runners: [], blockers: [], wildcards: [] },
        away: { passers: [], runners: [], blockers: [], wildcards: [] }
      }
    };

    // NEW: Initialize player time tracking for starters
    this.initializePlayerMatchTimes(matchState, homeStarters, awayStarters);

    this.liveMatches.set(matchId, matchState);
    
    // Set appropriate stamina levels for match type (risk-free for exhibitions)
    const gameMode = isExhibition ? 'exhibition' : (match.matchType as any) === 'tournament' ? 'tournament' : 'league';
    for (const player of allPlayers) {
      await injuryStaminaService.setMatchStartStamina(player.id.toString(), gameMode);
    }
    
    // Start the match simulation loop with formation starters
    this.startMatchSimulation(matchId, homeStarters, awayStarters, homeTeamPlayers, awayTeamPlayers);
    
    // Save initial state to database
    await this.saveLiveStateToDatabase(matchId, matchState);

    return matchState;
  }

  // Get current match state for synchronization
  getMatchState(matchId: string): LiveMatchState | null {
    return this.liveMatches.get(matchId) || null;
  }

  // Get live match state (alias for WebSocket service)
  getLiveMatchState(matchId: string): LiveMatchState | null {
    return this.getMatchState(matchId);
  }

  // Pause match
  pauseMatch(matchId: string): void {
    const state = this.liveMatches.get(matchId);
    if (state) {
      state.status = 'paused';
      
      // Clear interval to stop simulation
      const interval = this.matchIntervals.get(matchId);
      if (interval) {
        clearInterval(interval);
        this.matchIntervals.delete(matchId);
      }
      
      logger.info(`⏸️ Match ${matchId} paused`);
    }
  }

  // Resume match
  resumeMatch(matchId: string): void {
    const state = this.liveMatches.get(matchId);
    if (state && state.status === 'paused') {
      state.status = 'live';
      
      // Restart simulation
      this.restartSimulationFromState(matchId);
      
      logger.info(`▶️ Match ${matchId} resumed`);
    }
  }

  // API-compatible async versions for enhanced match routes
  async pauseMatchAsync(matchId: string): Promise<void> {
    this.pauseMatch(matchId);
  }

  async resumeMatchAsync(matchId: string): Promise<void> {
    this.resumeMatch(matchId);
  }

  async restartMatch(matchId: string): Promise<void> {
    const state = this.liveMatches.get(matchId);
    if (state) {
      // Reset game state
      state.gameTime = 0;
      state.homeScore = 0;
      state.awayScore = 0;
      state.status = 'live';
      state.gameEvents = [];
      
      // Clear existing player match times
      state.playerMatchTimes.clear();
      
      // Clear existing intervals
      const interval = this.matchIntervals.get(matchId);
      if (interval) {
        clearInterval(interval);
        this.matchIntervals.delete(matchId);
      }
      
      // Restart simulation from beginning
      await this.restartSimulationFromState(matchId);
      
      logger.info(`🔄 Match ${matchId} restarted`);
    }
  }

  async setMatchSpeed(matchId: string, speed: number): Promise<void> {
    const state = this.liveMatches.get(matchId);
    if (state) {
      // Add speed property to state
      (state as any).playbackSpeed = speed;
      
      // Clear existing interval and restart with new speed
      const interval = this.matchIntervals.get(matchId);
      if (interval) {
        clearInterval(interval);
        this.matchIntervals.delete(matchId);
        
        // Restart simulation with new speed
        await this.restartSimulationFromState(matchId);
      }
      
      logger.info(`⚡ Match ${matchId} speed set to ${speed}x`);
    }
  }

  // Restart simulation from existing state
  private async restartSimulationFromState(matchId: string): Promise<void> {
    const state = this.liveMatches.get(matchId);
    if (!state) return;

    // Get players for continued simulation
    const homeTeamPlayers = await (await getPrismaClient()).player.findMany({
      where: { teamId: parseInt(state.homeTeamId), isOnMarket: false }
    });
    const awayTeamPlayers = await (await getPrismaClient()).player.findMany({
      where: { teamId: parseInt(state.awayTeamId), isOnMarket: false }
    });

    // Get formation data to determine starters
    const homeFormation = await this.getTeamFormation(parseInt(state.homeTeamId));
    const awayFormation = await this.getTeamFormation(parseInt(state.awayTeamId));

    // Apply formation data to determine starters
    const homeStarters = this.applyFormationToPlayers(homeTeamPlayers, homeFormation);
    const awayStarters = this.applyFormationToPlayers(awayTeamPlayers, awayFormation);

    // Resume match simulation with formation starters
    this.startMatchSimulation(matchId, homeStarters, awayStarters, homeTeamPlayers, awayTeamPlayers);
  }

  // Synchronize client with server state
  async syncMatchState(matchId: string | number): Promise<LiveMatchState | null> {
    const matchIdStr = matchId.toString();
    const matchIdNum = parseInt(matchIdStr);
    
    const state = this.liveMatches.get(matchIdStr);
    if (!state) {
      // Check if match exists in database but not in memory
      const match = await (await getPrismaClient()).game.findFirst({
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
      const homeTeamPlayers = await (await getPrismaClient()).player.findMany({
        where: { teamId: parseInt(liveState.homeTeamId), isOnMarket: false }
      });
      const awayTeamPlayers = await (await getPrismaClient()).player.findMany({
        where: { teamId: parseInt(liveState.awayTeamId), isOnMarket: false }
      });

      // Resume match simulation if not completed
      if (liveState.status === 'live') {
        // Get formation data to determine starters
        const homeFormation = await this.getTeamFormation(parseInt(liveState.homeTeamId));
        const awayFormation = await this.getTeamFormation(parseInt(liveState.awayTeamId));

        // Apply formation data to determine starters
        const homeStarters = this.applyFormationToPlayers(homeTeamPlayers, homeFormation);
        const awayStarters = this.applyFormationToPlayers(awayTeamPlayers, awayFormation);

        this.startMatchSimulation(matchId, homeStarters, awayStarters, homeTeamPlayers, awayTeamPlayers);
      }

      logger.info(`🔄 Restarted match ${matchId} from database with ${liveState.gameEvents.length} events`);
      return liveState;
    } catch (error) {
      console.error(`Failed to restart match ${matchId} from database:`, error);
      return null;
    }
  }

  private startMatchSimulation(matchId: string, homeStarters: Player[], awayStarters: Player[], homeTeamPlayers: Player[], awayTeamPlayers: Player[]) {
    const existingInterval = this.matchIntervals.get(matchId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    const interval = setInterval(async () => {
      await this.updateMatchState(matchId, homeStarters, awayStarters, homeTeamPlayers, awayTeamPlayers);
    }, 3000); // 3 real seconds = 9 game seconds (3x speed)

    this.matchIntervals.set(matchId, interval);
  }

  private async updateMatchState(matchId: string, homeStarters: Player[], awayStarters: Player[], homeTeamPlayers: Player[], awayTeamPlayers: Player[]) {
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
        teamStats.timeOfPossessionSeconds = (teamStats.timeOfPossessionSeconds || 0) + gameTimeIncrement;
      }
    }

    if (state.currentHalf === 1 && state.gameTime >= state.maxTime / 2) {
      this.handlePossessionChange(state, state.possessingTeamId, null, state.gameTime); // End of half might mean ball goes to other team or neutral
      state.currentHalf = 2;
      
      // Calculate current MVP for halftime display (use all players for stats)
      const currentMVP = this.calculateCurrentMVP(state, homeTeamPlayers, awayTeamPlayers);
      
      // Generate halftime event with team stats and MVP
      const halftimeStats = this.generateHalftimeStats(state, currentMVP);
      state.gameEvents.push({
        time: state.gameTime,
        type: 'halftime',
        description: commentaryService.generateHalftimeCommentary(),
        data: halftimeStats
      });
      
      // Typically, the team that kicked off to start the game receives the ball in the second half.
      // For simplicity, let's give it to the team that didn't have it last, or random if null.
      const newPossessingTeam = state.possessingTeamId === state.homeTeamId ? state.awayTeamId : state.homeTeamId;
      this.handlePossessionChange(state, null, newPossessingTeam, state.gameTime);
    }

    // Generate enhanced match events using the formation starters
    if (Math.random() < 0.7) { // 70% chance of an event each update cycle
      try {
        const enhancedEvent = await this.generateEnhancedMatchEvent(homeStarters, awayStarters, state);
        if (enhancedEvent) {
          state.gameEvents.push(enhancedEvent);
          logger.info(`[DEBUG] Generated event: ${enhancedEvent.type} by ${enhancedEvent.actingPlayerId}`);
          
          // Broadcast event to WebSocket clients
          if (this.webSocketService) {
            this.webSocketService.broadcastMatchEvent(matchId, enhancedEvent);
          }
        } else {
          logger.info(`[DEBUG] Event generation returned null`);
        }
      } catch (error) {
        console.error(`[ERROR] Event generation failed:`, error);
      }
    }

    // NEW: Check for substitution triggers after event generation
    this.checkSubstitutionTriggers(state, homeTeamPlayers.concat(awayTeamPlayers));

    if (state.gameTime >= state.maxTime) {
      // Check if match needs overtime/sudden death (tournaments and league playoffs)
      if (await this.needsOvertime(matchId, state)) {
        await this.startOvertime(state, matchId);
        return;
      }
      
      // Match completed
      await this.completeMatch(matchId, state.homeTeamId, state.awayTeamId, homeTeamPlayers, awayTeamPlayers);
      return;
    }

    // Save state to database periodically
    if (state.gameTime % 30 === 0) { // Every 30 game seconds
      await this.saveLiveStateToDatabase(matchId, state);
    }

    // Broadcast state update to WebSocket clients
    if (this.webSocketService) {
      this.webSocketService.broadcastMatchUpdate(matchId, state);
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
    const isHomeTeam = activePlayer.teamId.toString() === state.homeTeamId.toString();
    
    // Generate event based on player role and current situation
    const eventTypes = ['pass', 'run', 'tackle', 'score', 'pass_defense'];
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
        // Get a random teammate as the receiver
        const teamPlayers = isHomeTeam ? homePlayers : awayPlayers;
        const receiver = teamPlayers[Math.floor(Math.random() * teamPlayers.length)];
        
        if (passSuccess) {
          playerStats.passingAttempts += 1;
          playerStats.passesCompleted += 1;
          playerStats.passingYards += passYards;
          // Update receiver stats
          const receiverStats = state.playerStats.get(receiver.id.toString());
          if (receiverStats) {
            receiverStats.catches += 1;
            receiverStats.receivingYards += passYards;
          }
          // Update team stats
          const teamStats = state.teamStats.get(activePlayer.teamId.toString());
          if (teamStats) {
            teamStats.passingYards = (teamStats.passingYards || 0) + passYards;
            teamStats.totalOffensiveYards = (teamStats.totalOffensiveYards || 0) + passYards;
          }
          event = {
            time: state.gameTime,
            type: 'pass',
            description: `${activePlayer.firstName} ${activePlayer.lastName} completes a ${passYards}-yard pass to ${receiver.firstName} ${receiver.lastName}!`,
            actingPlayerId: activePlayer.id.toString(),
            targetPlayerId: receiver.id.toString(),
            teamId: teamType,
            data: { yards: passYards }
          };
        } else {
          playerStats.passingAttempts += 1;
          // Update receiver stats for drop
          const receiverStats = state.playerStats.get(receiver.id.toString());
          if (receiverStats) {
            receiverStats.drops += 1;
          }
          event = {
            time: state.gameTime,
            type: 'pass',
            description: `${activePlayer.firstName} ${activePlayer.lastName} attempts a pass to ${receiver.firstName} ${receiver.lastName}, but it falls incomplete.`,
            actingPlayerId: activePlayer.id.toString(),
            targetPlayerId: receiver.id.toString(),
            teamId: teamType,
            data: { yards: 0 }
          };
        }
        break;
        
      case 'run':
        const runYards = Math.floor(Math.random() * 15) + 1;
        playerStats.carrierYards += runYards;
        // Update team stats
        const teamStats = state.teamStats.get(activePlayer.teamId.toString());
        if (teamStats) {
          teamStats.carrierYards = (teamStats.carrierYards || 0) + runYards;
          teamStats.totalOffensiveYards = (teamStats.totalOffensiveYards || 0) + runYards;
        }
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
        // Get a random opponent as the ball carrier
        const opponentPlayers = isHomeTeam ? awayPlayers : homePlayers;
        const ballCarrier = opponentPlayers[Math.floor(Math.random() * opponentPlayers.length)];
        
        // Update team stats for defensive play
        const tackleTeamStats = state.teamStats.get(activePlayer.teamId.toString());
        if (tackleTeamStats) {
          tackleTeamStats.totalKnockdownsInflicted = (tackleTeamStats.totalKnockdownsInflicted || 0) + 1;
        }
        
        event = {
          time: state.gameTime,
          type: 'tackle',
          description: `${activePlayer.firstName} ${activePlayer.lastName} makes a solid tackle to bring down ${ballCarrier?.firstName || 'opponent'} ${ballCarrier?.lastName || 'player'}!`,
          actingPlayerId: activePlayer.id.toString(),
          targetPlayerId: ballCarrier?.id?.toString() || 'unknown',
          teamId: teamType,
          data: {}
        };
        break;
        
      case 'score':
        if (Math.random() < 0.12) { // 12% chance of scoring (increased from 5%)
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
        
      case 'pass_defense':
        if (Math.random() < 0.08) { // 8% chance of pass defense
          playerStats.passesDefended += 1;
          
          event = {
            time: state.gameTime,
            type: 'pass_defense',
            description: `${activePlayer.firstName} ${activePlayer.lastName} breaks up the pass with great coverage!`,
            actingPlayerId: activePlayer.id.toString(),
            teamId: teamType,
            data: {}
          };
        } else {
          // Default to tackle if pass defense doesn't happen
          return this.generateEnhancedMatchEvent(homePlayers, awayPlayers, state);
        }
        break;
        
      default:
        // Default tackle event
        playerStats.tackles += 1;
        // Get a random opponent as the ball carrier
        const defaultOpponentPlayers = isHomeTeam ? awayPlayers : homePlayers;
        const defaultBallCarrier = defaultOpponentPlayers[Math.floor(Math.random() * defaultOpponentPlayers.length)];
        
        event = {
          time: state.gameTime,
          type: 'tackle',
          description: `${activePlayer.firstName} ${activePlayer.lastName} makes a defensive play to stop ${defaultBallCarrier.firstName} ${defaultBallCarrier.lastName}!`,
          actingPlayerId: activePlayer.id.toString(),
          targetPlayerId: defaultBallCarrier.id.toString(),
          teamId: teamType,
          data: {}
        };
    }
    
    return event;
  }
  
  // Check if match needs overtime (tournaments and tied games)
  private async needsOvertime(matchId: string, state: LiveMatchState): Promise<boolean> {
    // Only applies to tied games
    if (state.homeScore !== state.awayScore) {
      return false;
    }

    // Get match details to check if it's a tournament match
    const match = await (await getPrismaClient()).game.findUnique({
      where: { id: parseInt(matchId) },
      include: { tournament: true }
    });

    if (!match) return false;

    // Tournament matches need overtime if tied
    if (match.matchType === 'TOURNAMENT_DAILY') {
      logger.info(`🏆 Tournament match ${matchId} is tied ${state.homeScore}-${state.awayScore}, starting sudden death overtime!`);
      return true;
    }

    // League playoff matches (you can add playoff detection logic here)
    // For now, assume regular league matches don't have playoffs
    
    return false;
  }

  // Start overtime/sudden death period
  private async startOvertime(state: LiveMatchState, matchId: string): Promise<void> {
    // Sudden death: first team to score wins
    state.gameEvents.push({
      time: state.gameTime,
      type: 'overtime_start',
      description: `🚨 SUDDEN DEATH OVERTIME! The game is tied ${state.homeScore}-${state.awayScore}. First team to score wins!`,
      data: { homeScore: state.homeScore, awayScore: state.awayScore }
    });

    // Extend max time for overtime (unlimited until first score)
    state.maxTime = state.gameTime + 600; // Add 10 minutes max for overtime
    
    logger.info(`⚡ Overtime started for match ${matchId} - sudden death until first score!`);

    // Broadcast overtime start
    if (this.webSocketService) {
      this.webSocketService.broadcastMatchEvent(matchId, {
        time: state.gameTime,
        type: 'overtime_start',
        description: `SUDDEN DEATH OVERTIME! First team to score wins!`,
        data: { homeScore: state.homeScore, awayScore: state.awayScore }
      });
    }
  }

  // Check for overtime completion (first score wins)
  private checkOvertimeCompletion(state: LiveMatchState, matchId: string, initialHomeScore: number, initialAwayScore: number): boolean {
    // If either team scored in overtime, end the game immediately
    if (state.homeScore > initialHomeScore || state.awayScore > initialAwayScore) {
      const winner = state.homeScore > initialHomeScore ? 'Home' : 'Away';
      
      state.gameEvents.push({
        time: state.gameTime,
        type: 'sudden_death_winner',
        description: `🏆 SUDDEN DEATH VICTORY! ${winner} team wins ${state.homeScore}-${state.awayScore}!`,
        data: { winner, finalScore: { home: state.homeScore, away: state.awayScore } }
      });

      logger.info(`🏆 Sudden death completed! ${winner} team wins ${state.homeScore}-${state.awayScore}`);
      return true;
    }
    
    return false;
  }

  private determineGamePhase(time: number, maxTime: number): string {
    const timePercent = time / maxTime;
    
    // Check for halftime (exactly at 50% of total game time)
    if (timePercent >= 0.48 && timePercent <= 0.52) {
      return 'halftime';
    }
    
    // Calculate game phase based on total game time, not halves
    if (timePercent < 0.25) return 'early';      // First 25% of total game
    if (timePercent < 0.65) return 'middle';     // 25-65% of total game  
    if (timePercent < 0.85) return 'late';       // 65-85% of total game
    return 'clutch';                             // Final 15% of total game
  }

  private calculateCurrentMVP(state: LiveMatchState, homePlayers: Player[], awayPlayers: Player[]) {
    let homeMVP = { playerId: '', playerName: '', score: 0 };
    let awayMVP = { playerId: '', playerName: '', score: 0 };
    
    // Ensure homePlayers and awayPlayers are arrays
    if (!Array.isArray(homePlayers) || !Array.isArray(awayPlayers)) {
      console.error('calculateCurrentMVP: homePlayers or awayPlayers is not an array', { homePlayers, awayPlayers });
      return { homeMVP, awayMVP };
    }
    
    for (const [playerId, stats] of state.playerStats.entries()) {
      const player = [...homePlayers, ...awayPlayers].find((p: any) => p.id.toString() === playerId);
      if (!player) continue;
      
      const mvpScore = (stats.scores * 10) + (stats.passingYards * 0.1) + (stats.carrierYards * 0.15) + 
                      (stats.catches * 2) + (stats.tackles * 1.5) + (stats.passesDefended * 3) + 
                      (stats.knockdownsInflicted * 2);
      
      if (player.teamId.toString() === state.homeTeamId) {
        if (mvpScore > homeMVP.score) {
          homeMVP = { playerId, playerName: `${player.firstName} ${player.lastName}`, score: mvpScore };
        }
      } else {
        if (mvpScore > awayMVP.score) {
          awayMVP = { playerId, playerName: `${player.firstName} ${player.lastName}`, score: mvpScore };
        }
      }
    }
    
    return { homeMVP, awayMVP };
  }

  private generateHalftimeStats(state: LiveMatchState, mvp: any) {
    const homeStats = state.teamStats.get(state.homeTeamId);
    const awayStats = state.teamStats.get(state.awayTeamId);
    
    return {
      homeScore: state.homeScore,
      awayScore: state.awayScore,
      homeStats: homeStats ? {
        possessionTime: Math.floor(homeStats.possessionTime / 60),
        totalYards: homeStats.totalYards,
        turnovers: homeStats.turnovers
      } : null,
      awayStats: awayStats ? {
        possessionTime: Math.floor(awayStats.possessionTime / 60),
        totalYards: awayStats.totalYards,
        turnovers: awayStats.turnovers
      } : null,
      mvp: mvp
    };
  }

  // OLD BASIC SIMULATION ENGINE REMOVED - Only enhanced simulation is now used


  private async completeMatch(matchId: string, homeTeamId: string, awayTeamId: string, homePlayers: Player[], awayPlayers: Player[]): Promise<void> {
    const state = this.liveMatches.get(matchId);
    if (!state) return;

    // Get match details to check if it's an exhibition match
    const matchDetails = await (await getPrismaClient()).game.findFirst({
      where: { id: parseInt(matchId.toString()) }
    });
    const isExhibitionMatch = matchDetails?.matchType === 'EXHIBITION';

    // Final possession update
    if (state.possessingTeamId) {
       const possessionDuration = state.gameTime - state.possessionStartTime;
       const teamStats = state.teamStats.get(state.possessingTeamId);
       if (teamStats) {
        // teamStats.timeOfPossessionSeconds += possessionDuration; // Already added per tick
       }
    }

    state.status = 'completed';
    
    // Calculate final MVP for match completion
    const finalMVP = this.calculateCurrentMVP(state, homePlayers, awayPlayers);
    
    // Add final match completion event with results and MVP
    state.gameEvents.push({
      time: state.gameTime,
      type: 'match_complete',
      description: `FINAL SCORE: ${state.homeScore} - ${state.awayScore}`,
      data: {
        finalScore: { home: state.homeScore, away: state.awayScore },
        mvp: finalMVP,
        status: 'COMPLETED'
      }
    });
    
    // Clear the match interval
    const interval = this.matchIntervals.get(matchId);
    if (interval) {
      clearInterval(interval);
      this.matchIntervals.delete(matchId);
    }
    
    // Broadcast match completion to WebSocket clients BEFORE removing from live matches
    if (this.webSocketService) {
      this.webSocketService.broadcastMatchComplete(matchId, state);
    }

    // Remove from live matches to prevent it from showing as live
    this.liveMatches.delete(matchId);

    // Persist detailed player and team stats
    try {
      const playerUpdates: Promise<any>[] = [];

      // Convert maps to objects for storage in simulationLog
      const playerStatsObj: Record<string, any> = {};
      const teamStatsObj: Record<string, any> = {};

      for (const [playerId, pStats] of state.playerStats.entries()) {
        playerStatsObj[playerId] = pStats;

        // Update basic player stats (skip for exhibition matches to maintain risk-free gameplay)
        if (!isExhibitionMatch) {
          const playerToUpdate = await (await getPrismaClient()).player.findFirst({
            where: { id: parseInt(playerId) }
          });
          if (playerToUpdate) {
            // Update only valid fields that exist in the Prisma schema
            const updatedStats = {
              gamesPlayedLastSeason: (playerToUpdate.gamesPlayedLastSeason || 0) + 1,
              // Store match participation but don't update non-existent lifetime stats
            };
            playerUpdates.push((await getPrismaClient()).player.update({
              where: { id: parseInt(playerId) },
              data: updatedStats
            }));
          }
        }
      }

      for (const [teamId, tStats] of state.teamStats.entries()) {
        teamStatsObj[teamId] = tStats;
      }

      // Update player lifetime stats if not exhibition
      if (playerUpdates.length > 0 && !isExhibitionMatch) {
        await Promise.all(playerUpdates);
      }

      // Update the match itself - check if it exists first
      const existingGame = await (await getPrismaClient()).game.findUnique({
        where: { id: parseInt(matchId) }
      });
      
      if (existingGame) {
        await (await getPrismaClient()).game.update({
          where: { id: parseInt(matchId) },
          data: {
            status: 'COMPLETED',
            homeScore: state.homeScore,
            awayScore: state.awayScore,
            simulationLog: {
              events: state.gameEvents.slice(-50), // Store last 50 events
              finalScores: { home: state.homeScore, away: state.awayScore },
              playerStats: playerStatsObj,
              teamStats: teamStatsObj,
              mvpData: finalMVP,
              completed: true
            } as any
          }
        });

        // Update team records ONLY for league matches (not exhibition or tournament matches)
        if (matchDetails?.matchType === 'LEAGUE') {
          logger.info(`🔥 UPDATING TEAM RECORDS: Match ${matchId} - Home: ${state.homeTeamId} (${state.homeScore}) vs Away: ${state.awayTeamId} (${state.awayScore})`);
          await this.updateTeamRecords(parseInt(state.homeTeamId), parseInt(state.awayTeamId), state.homeScore, state.awayScore);
          
          // Process stadium revenue for home team in league matches
          await this.processStadiumRevenue(parseInt(state.homeTeamId), matchId, state);
        } else if (isExhibitionMatch) {
          // Process exhibition rewards
          logger.info(`🎉 PROCESSING EXHIBITION REWARDS: Match ${matchId} - Home: ${state.homeTeamId} (${state.homeScore}) vs Away: ${state.awayTeamId} (${state.awayScore})`);
          await this.awardExhibitionRewards(state.homeTeamId, state.awayTeamId, state.homeScore, state.awayScore);
        } else {
          // Tournament matches - no team record updates, no exhibition rewards
          logger.info(`🏆 TOURNAMENT MATCH COMPLETED: Match ${matchId} - Home: ${state.homeTeamId} (${state.homeScore}) vs Away: ${state.awayTeamId} (${state.awayScore}) - No league standings update`);
        }

        // Update post-game camaraderie for ALL match types
        const { CamaraderieService } = await import('./camaraderieService');
        await CamaraderieService.updatePostGameCamaraderie(
          state.homeTeamId,
          state.awayTeamId,
          state.homeScore,
          state.awayScore,
          (matchDetails?.matchType as any) || 'EXHIBITION'
        );
        logger.info(`✨ POST-GAME CAMARADERIE UPDATE: Match ${matchId} - Updated team chemistry for both teams based on ${matchDetails?.matchType || 'EXHIBITION'} result`);

        // Clear active boosts for both teams after match completion
        await this.clearActiveBoosts(parseInt(state.homeTeamId), matchDetails?.matchType || 'EXHIBITION');
        await this.clearActiveBoosts(parseInt(state.awayTeamId), matchDetails?.matchType || 'EXHIBITION');
        logger.info(`🧹 ACTIVE BOOSTS CLEARED: Match ${matchId} - Cleared active boosts for both teams after ${matchDetails?.matchType || 'EXHIBITION'} match`);
        
      } else {
        console.warn(`Game ${matchId} not found in database, cannot update completion status`);
      }

      logger.info(`Match ${matchId} stats persisted successfully.`);

    } catch (error) {
      console.error(`Error persisting stats for match ${matchId}:`, error);
      
      // Check if the game exists before trying to update it
      try {
        const existingGame = await (await getPrismaClient()).game.findUnique({
          where: { id: parseInt(matchId) }
        });
        
        if (existingGame) {
          // Game exists, update it with error info
          await (await getPrismaClient()).game.update({
            where: { id: parseInt(matchId) },
            data: {
              status: 'COMPLETED',
              homeScore: state.homeScore,
              awayScore: state.awayScore,
              simulationLog: {
                events: state.gameEvents.slice(-50),
                finalScores: { home: state.homeScore, away: state.awayScore },
                error: `Error persisting stats: ${(error as Error).message}`
              } as any
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
      const gameMode = (matchDetails?.matchType as string) === 'tournament' ? 'tournament' : 'league';
      
      // NEW: Use real minutes played for stamina depletion instead of flat 40 minutes
      const finalMinutesPlayed = this.calculateFinalMinutesPlayed(state);
      
      for (const player of [...homePlayers, ...awayPlayers]) {
        const actualMinutesPlayed = finalMinutesPlayed.get(player.id.toString()) || 0;
        logger.info(`⏱️ PLAYER MINUTES: ${player.firstName} ${player.lastName} played ${actualMinutesPlayed.toFixed(1)} minutes`);
        
        // Use actual minutes played for stamina depletion
        await injuryStaminaService.depleteStaminaAfterMatch(player.id.toString(), gameMode, actualMinutesPlayed);
      }

      // Handle tournament flow progression for tournament matches
      if (matchDetails?.tournamentId) {
        try {
          const { UnifiedTournamentAutomation } = await import('./unifiedTournamentAutomation');
          await UnifiedTournamentAutomation.handleMatchCompletion(parseInt(matchId));
          logger.info(`Tournament flow processed for match ${matchId}`);
        } catch (error) {
          console.error(`Error handling tournament flow for match ${matchId}:`, error);
        }
      }
    } else {
      // Award exhibition credits and team camaraderie for risk-free matches
      await this.awardExhibitionRewards(state.homeTeamId, state.awayTeamId, state.homeScore, state.awayScore);
      
      // Record exhibition game result for stats tracking
      await this.recordExhibitionGameResult(parseInt(matchId), state.homeTeamId, state.awayTeamId, state.homeScore, state.awayScore);
    }

    this.liveMatches.delete(matchId);
    logger.info(`Match ${matchId} completed with score ${state.homeScore}-${state.awayScore}${isExhibitionMatch ? ' (Exhibition - Risk-Free)' : ''}`);
  }

  /**
   * Process stadium revenue for home team in league matches
   */
  private async processStadiumRevenue(homeTeamId: number, matchId: string, state: LiveMatchState): Promise<void> {
    try {
      // Get home team's stadium and finance data
      const homeTeam = await (await getPrismaClient()).team.findUnique({
        where: { id: homeTeamId },
        include: {
          stadium: true,
          finances: true
        }
      });

      if (!homeTeam || !homeTeam.stadium || !homeTeam) {
        logger.info(`⚠️  Stadium revenue: Missing data for team ${homeTeamId}`);
        return;
      }

      // Import stadium system functions
      const { calculateGameRevenue, calculateAttendance } = await import('../../shared/stadiumSystem.js');

      // Calculate attendance based on stadium capacity and fan loyalty
      const stadium = homeTeam.stadium;
      const fanLoyalty = Number((homeTeam as any).fanLoyalty) || 50;
      const opponentQuality = 70; // Default opponent quality
      
      const { attendance } = calculateAttendance(
        stadium,
        Number(fanLoyalty),
        opponentQuality,
        0, // not important game (numeric value)
        1 // weather (numeric value)
      );

      // Calculate comprehensive revenue
      const revenue = calculateGameRevenue(
        stadium,
        attendance,
        fanLoyalty,
        true // is home game
      );

      logger.info(`🏟️  Stadium Revenue - ${homeTeam.name}: ${attendance} fans, ${revenue.totalRevenue}₡ total revenue, ${revenue.netRevenue}₡ net (after ${revenue.maintenanceCost}₡ maintenance)`);

      // Apply revenue to team finances  
      const currentCredits = parseInt(((homeTeam.finances as any)?.credits || 0).toString()) || 0;
      const newCredits = currentCredits + revenue.netRevenue;

      await (await getPrismaClient()).teamFinances.update({
        where: { id: homeTeam.id },
        data: {
          credits: BigInt(newCredits)
        }
      });

      // Record revenue transaction in payment history
      const { PaymentHistoryService } = await import('./paymentHistoryService');
      await (PaymentHistoryService as any).recordRevenue(
        homeTeam.userProfileId,
        revenue.totalRevenue,
        'CREDITS',
        'Stadium Home Game Revenue',
        `Home league game revenue: ${attendance} fans vs opponent (Match ${matchId})`
      );

      // If there's a maintenance cost, record it as expense
      if (revenue.maintenanceCost > 0) {
        await (PaymentHistoryService as any).recordExpense(
          homeTeam.userProfileId,
          revenue.maintenanceCost,
          'CREDITS',
          'Stadium Game Day Maintenance',
          `Game day maintenance cost for match ${matchId}`
        );
      }

      logger.info(`💰 Stadium Revenue Applied: ${homeTeam.name} earned ${revenue.netRevenue}₡ net from home game (${currentCredits}₡ → ${newCredits}₡)`);

    } catch (error) {
      console.error(`❌ Error processing stadium revenue for team ${homeTeamId}:`, error);
    }
  }

  async stopMatch(matchId: string): Promise<void> {
    logger.info(`🔍 stopMatch called for matchId: ${matchId}`);
    const state = this.liveMatches.get(matchId);
    logger.info(`🎯 Live match state found: ${state ? 'YES' : 'NO'}`);
    
    if (state) {
      logger.info(`🏈 Completing match: ${matchId} between teams ${state.homeTeamId} and ${state.awayTeamId}`);
      try {
        // Need to pass all required parameters to completeMatch
        const homePlayers = await (await getPrismaClient()).player.findMany({
          where: { teamId: parseInt(state.homeTeamId) }
        });
        const awayPlayers = await (await getPrismaClient()).player.findMany({
          where: { teamId: parseInt(state.awayTeamId) }
        });
        logger.info(`👥 Found ${homePlayers.length} home players and ${awayPlayers.length} away players`);
        await this.completeMatch(matchId, state.homeTeamId, state.awayTeamId, homePlayers, awayPlayers);
        logger.info(`✅ Match ${matchId} completion successful`);
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
  public async awardExhibitionRewards(homeTeamId: string, awayTeamId: string, homeScore: number, awayScore: number): Promise<void> {
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

      // Award credits to both teams via their finance records
      logger.info(`🔍 Looking for TeamFinance records: homeTeamId=${homeTeamId}, awayTeamId=${awayTeamId}`);
      // Fixed prisma import
      
      const homeTeamFinance = await (await getPrismaClient()).teamFinances.findUnique({
        where: { teamId: parseInt(homeTeamId) }
      });
      
      const awayTeamFinance = await await (await getPrismaClient()).teamFinances.findUnique({
        where: { teamId: parseInt(awayTeamId) }
      });
      
      logger.info(`💰 Found TeamFinance records: home=${!!homeTeamFinance}, away=${!!awayTeamFinance}`);

      if (homeTeamFinance) {
        await await (await getPrismaClient()).teamFinances.update({
          where: { teamId: parseInt(homeTeamId) },
          data: {
            credits: {
              increment: homeCredits
            }
          }
        });

        // Log exhibition reward transaction for home team
        const homeTeam = await await (await getPrismaClient()).team.findUnique({
          where: { id: parseInt(homeTeamId) }
        });
        if (homeTeam?.userProfileId) {
          await PaymentHistoryService.recordReward(
            homeTeam.userProfileId.toString(),
            homeTeamId,
            `Exhibition ${homeScore > awayScore ? 'Win' : homeScore === awayScore ? 'Tie' : 'Loss'}`,
            homeCredits,
            0
          );
        }
      }

      if (awayTeamFinance) {
        await await (await getPrismaClient()).teamFinances.update({
          where: { teamId: parseInt(awayTeamId) },
          data: {
            credits: {
              increment: awayCredits
            }
          }
        });

        // Log exhibition reward transaction for away team
        const awayTeam = await await (await getPrismaClient()).team.findUnique({
          where: { id: parseInt(awayTeamId) }
        });
        if (awayTeam?.userProfileId) {
          await PaymentHistoryService.recordReward(
            awayTeam.userProfileId.toString(),
            awayTeamId,
            `Exhibition ${awayScore > homeScore ? 'Win' : awayScore === homeScore ? 'Tie' : 'Loss'}`,
            awayCredits,
            0
          );
        }
      }

      // Award team camaraderie boost to winning team players (if not a tie)
      if (winningTeamId) {
        // Get all players for the winning team and update their camaraderie
        const winningPlayers = await await (await getPrismaClient()).player.findMany({
          where: { teamId: parseInt(winningTeamId) }
        });
        
        for (const player of winningPlayers) {
          await await (await getPrismaClient()).player.update({
            where: { id: player.id },
            data: {
              camaraderieScore: Math.min(100, (player.camaraderieScore || 0) + 2)
            }
          });
        }
      }

      logger.info(`Exhibition rewards awarded: Home Team (${homeScore}): ${homeCredits}₡, Away Team (${awayScore}): ${awayCredits}₡${winningTeamId ? ` + camaraderie boost` : ''}`);

    } catch (error) {
      console.error('Error awarding exhibition rewards:', error);
    }
  }

  /**
   * Record exhibition game result for stats tracking
   */
  private async recordExhibitionGameResult(matchId: number, homeTeamId: string, awayTeamId: string, homeScore: number, awayScore: number): Promise<void> {
    try {
      // The game is already created in the Game table, we just need to ensure it's updated with the final result
      await (await getPrismaClient()).game.update({
        where: { id: matchId },
        data: {
          status: 'COMPLETED',
          homeScore,
          awayScore
        }
      });
      
      logger.info(`Exhibition game ${matchId} result recorded: ${homeScore}-${awayScore}`);
    } catch (error) {
      console.error('Error recording exhibition game result:', error);
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
        logger.info(`Cleaning up abandoned match: ${matchId}`);
        const homePlayers = await (await getPrismaClient()).player.findMany({
          where: { teamId: parseInt(state.homeTeamId) }
        });
        const awayPlayers = await (await getPrismaClient()).player.findMany({
          where: { teamId: parseInt(state.awayTeamId) }
        });
        await this.completeMatch(matchId, state.homeTeamId, state.awayTeamId, homePlayers, awayPlayers);
      }
    }
  }

  /**
   * Clear active boosts for a team after match completion
   */
  private async clearActiveBoosts(teamId: number, matchType: string): Promise<void> {
    try {
      // Find active boosts for the team that match the match type
      const activeBoosts = await (await getPrismaClient()).activeBoost.findMany({
        where: {
          teamId: teamId,
          isActive: true,
          matchType: matchType as any
        }
      });

      if (activeBoosts.length > 0) {
        // Deactivate all matching active boosts
        await (await getPrismaClient()).activeBoost.updateMany({
          where: {
            teamId: teamId,
            isActive: true,
            matchType: matchType as any
          },
          data: {
            isActive: false
          }
        });

        logger.info(`🧹 CLEARED ${activeBoosts.length} active ${matchType} boost(s) for team ${teamId}`);
      }
    } catch (error) {
      console.error(`Error clearing active boosts for team ${teamId}:`, error);
    }
  }

  /**
   * Update team records (wins/losses/draws) after match completion
   */
  private async updateTeamRecords(homeTeamId: number, awayTeamId: number, homeScore: number, awayScore: number): Promise<void> {
    try {
      logger.info(`🏆 TEAM RECORDS UPDATE: Home Team ${homeTeamId} (${homeScore}) vs Away Team ${awayTeamId} (${awayScore})`);
      
      // Convert team IDs to integers if they're strings
      const homeId = typeof homeTeamId === 'string' ? parseInt(homeTeamId) : homeTeamId;
      const awayId = typeof awayTeamId === 'string' ? parseInt(awayTeamId) : awayTeamId;
      
      logger.info(`🔄 Converted IDs: Home ${homeId}, Away ${awayId}`);
      
      // Determine winner and update standings
      if (homeScore > awayScore) {
        // Home team wins
        await (await getPrismaClient()).team.update({
          where: { id: homeId },
          data: { 
            wins: { increment: 1 }, 
            points: { increment: 3 }
          }
        });
        await (await getPrismaClient()).team.update({
          where: { id: awayId },
          data: { 
            losses: { increment: 1 }
          }
        });
        logger.info(`✅ STANDINGS: Home team ${homeId} wins (W+1, Pts+3), Away team ${awayId} loses (L+1)`);
      } else if (awayScore > homeScore) {
        // Away team wins
        await (await getPrismaClient()).team.update({
          where: { id: awayId },
          data: { 
            wins: { increment: 1 }, 
            points: { increment: 3 }
          }
        });
        await (await getPrismaClient()).team.update({
          where: { id: homeId },
          data: { 
            losses: { increment: 1 }
          }
        });
        logger.info(`✅ STANDINGS: Away team ${awayId} wins (W+1, Pts+3), Home team ${homeId} loses (L+1)`);
      } else {
        // Draw - award 1 point to each team
        await (await getPrismaClient()).team.update({
          where: { id: homeId },
          data: { 
            points: { increment: 1 }
          }
        });
        await (await getPrismaClient()).team.update({
          where: { id: awayId },
          data: { 
            points: { increment: 1 }
          }
        });
        logger.info(`✅ STANDINGS: Draw between teams ${homeId} and ${awayId} (both: Pts+1)`);
      }
    } catch (error) {
      console.error(`Error updating team records for teams ${homeTeamId} and ${awayTeamId}:`, error);
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