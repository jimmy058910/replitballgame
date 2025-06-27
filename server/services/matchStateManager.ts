import { storage } from "../storage";
import type { Match, Player } from "@shared/schema";

interface LiveMatchState {
  matchId: string;
  startTime: Date;
  gameTime: number; // in seconds
  maxTime: number; // total game time in seconds  
  currentHalf: 1 | 2;
  team1Score: number;
  team2Score: number;
  status: 'live' | 'completed' | 'paused';
  gameEvents: MatchEvent[];
  lastUpdateTime: Date;
}

interface MatchEvent {
  time: number;
  type: string;
  description: string;
  player?: string;
  team?: string;
  data?: any;
}

class MatchStateManager {
  private liveMatches: Map<string, LiveMatchState> = new Map();
  private matchIntervals: Map<string, NodeJS.Timeout> = new Map();

  // Start a new live match with server-side state management
  async startLiveMatch(matchId: string, isExhibition: boolean = false): Promise<LiveMatchState> {
    const match = await storage.getMatchById(matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    // Get team players for simulation
    const homeTeamPlayers = await storage.getPlayersByTeamId(match.homeTeamId);
    const awayTeamPlayers = await storage.getPlayersByTeamId(match.awayTeamId);

    const maxTime = isExhibition ? 1200 : 1800; // 20 min exhibition, 30 min league
    const matchState: LiveMatchState = {
      matchId,
      startTime: new Date(),
      gameTime: 0,
      maxTime,
      currentHalf: 1,
      team1Score: 0,
      team2Score: 0,
      status: 'live',
      gameEvents: [{
        time: 0,
        type: 'kickoff',
        description: 'Match begins!',
        data: { homeTeam: match.homeTeamId, awayTeam: match.awayTeamId }
      }],
      lastUpdateTime: new Date()
    };

    this.liveMatches.set(matchId, matchState);
    
    // Start the match simulation loop
    this.startMatchSimulation(matchId, homeTeamPlayers, awayTeamPlayers);
    
    // Update match status in database
    await storage.updateMatch(matchId, { 
      status: 'live',
      scheduledTime: new Date()
    });

    return matchState;
  }

  // Get current match state for synchronization
  getMatchState(matchId: string): LiveMatchState | null {
    return this.liveMatches.get(matchId) || null;
  }

  // Synchronize client with server state
  async syncMatchState(matchId: string): Promise<LiveMatchState | null> {
    const state = this.liveMatches.get(matchId);
    if (!state) {
      // Check if match exists in database but not in memory
      const match = await storage.getMatchById(matchId);
      if (match && match.status === 'live') {
        // Restart the match state from database
        return await this.restartMatchFromDatabase(matchId);
      }
      return null;
    }
    
    // Update last access time
    state.lastUpdateTime = new Date();
    return state;
  }

  private async restartMatchFromDatabase(matchId: string): Promise<LiveMatchState | null> {
    const match = await storage.getMatchById(matchId);
    if (!match || match.status !== 'live') {
      return null;
    }

    // Calculate elapsed time since match started
    const startTime = match.scheduledTime || match.createdAt;
    if (!startTime) {
      return null;
    }
    const elapsedSeconds = Math.floor((Date.now() - startTime.getTime()) / 1000);
    const isExhibition = match.matchType === 'exhibition';
    const maxTime = isExhibition ? 1200 : 1800;

    // If match should have ended, complete it
    if (elapsedSeconds >= maxTime) {
      await this.completeMatch(matchId);
      return null;
    }

    // Reconstruct match state
    const currentHalf = elapsedSeconds < (maxTime / 2) ? 1 : 2;
    const matchState: LiveMatchState = {
      matchId,
      startTime: startTime,
      gameTime: elapsedSeconds,
      maxTime,
      currentHalf,
      team1Score: match.homeScore || 0,
      team2Score: match.awayScore || 0,
      status: 'live',
      gameEvents: (match.gameData as any)?.events || [],
      lastUpdateTime: new Date()
    };

    this.liveMatches.set(matchId, matchState);

    // Resume simulation
    const homeTeamPlayers = await storage.getPlayersByTeamId(match.homeTeamId);
    const awayTeamPlayers = await storage.getPlayersByTeamId(match.awayTeamId);
    this.startMatchSimulation(matchId, homeTeamPlayers, awayTeamPlayers);

    return matchState;
  }

  private startMatchSimulation(matchId: string, homeTeamPlayers: Player[], awayTeamPlayers: Player[]) {
    // Clear existing interval if any
    const existingInterval = this.matchIntervals.get(matchId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Update every 3 seconds (3x speed: 3 real seconds = 9 game seconds)
    const interval = setInterval(async () => {
      await this.updateMatchState(matchId, homeTeamPlayers, awayTeamPlayers);
    }, 3000);

    this.matchIntervals.set(matchId, interval);
  }

  private async updateMatchState(matchId: string, homeTeamPlayers: Player[], awayTeamPlayers: Player[]) {
    const state = this.liveMatches.get(matchId);
    if (!state || state.status !== 'live') {
      return;
    }

    // Advance game time by 9 seconds (3x speed)
    state.gameTime += 9;
    state.lastUpdateTime = new Date();

    // Check for half-time
    if (state.currentHalf === 1 && state.gameTime >= state.maxTime / 2) {
      state.currentHalf = 2;
      state.gameEvents.push({
        time: state.gameTime,
        type: 'halftime',
        description: 'Half-time break',
      });
    }

    // Generate random events
    if (Math.random() < 0.4) { // 40% chance of event each update
      const event = this.generateMatchEvent(state.gameTime, homeTeamPlayers, awayTeamPlayers, state);
      state.gameEvents.push(event);

      // Update scores
      if (event.type === 'score') {
        if (event.team === 'home') {
          state.team1Score++;
        } else {
          state.team2Score++;
        }
      }
    }

    // Check if match is complete
    if (state.gameTime >= state.maxTime) {
      await this.completeMatch(matchId);
      return;
    }

    // Update database periodically
    if (state.gameTime % 30 === 0) { // Every 30 game seconds
      await storage.updateMatch(matchId, {
        homeScore: state.team1Score,
        awayScore: state.team2Score,
        gameData: {
          events: state.gameEvents.slice(-20), // Keep last 20 events
          currentTime: state.gameTime,
          currentHalf: state.currentHalf
        }
      });
    }
  }

  private generateMatchEvent(time: number, homeTeamPlayers: Player[], awayTeamPlayers: Player[], state: LiveMatchState): MatchEvent {
    const isHomeTeam = Math.random() < 0.5;
    const team = isHomeTeam ? 'home' : 'away';
    const players = isHomeTeam ? homeTeamPlayers : awayTeamPlayers;
    
    if (players.length === 0) {
      return {
        time,
        type: 'play',
        description: 'Play continues...',
        team
      };
    }

    const randomPlayer = players[Math.floor(Math.random() * players.length)];
    const eventTypes = ['pass', 'run', 'tackle', 'interception', 'score'];
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];

    let description = '';
    
    switch (eventType) {
      case 'pass':
        description = `${randomPlayer.lastName} completes a pass down field!`;
        break;
      case 'run':
        description = `${randomPlayer.lastName} breaks through the defense!`;
        break;
      case 'tackle':
        description = `${randomPlayer.lastName} makes a solid tackle!`;
        break;
      case 'interception':
        description = `${randomPlayer.lastName} intercepts the ball!`;
        break;
      case 'score':
        description = `SCORE! ${randomPlayer.lastName} reaches the end zone!`;
        break;
    }

    return {
      time,
      type: eventType,
      description,
      player: randomPlayer.lastName,
      team,
      data: { playerId: randomPlayer.id }
    };
  }

  private async completeMatch(matchId: string): Promise<void> {
    const state = this.liveMatches.get(matchId);
    if (!state) return;

    state.status = 'completed';
    
    // Clear interval
    const interval = this.matchIntervals.get(matchId);
    if (interval) {
      clearInterval(interval);
      this.matchIntervals.delete(matchId);
    }

    // Update database with final results
    await storage.updateMatch(matchId, {
      status: 'completed',
      homeScore: state.team1Score,
      awayScore: state.team2Score,
      completedAt: new Date(),
      gameData: {
        events: state.gameEvents,
        finalStats: {
          duration: state.gameTime,
          halves: state.currentHalf
        }
      }
    });

    // Remove from active matches
    this.liveMatches.delete(matchId);
    console.log(`Match ${matchId} completed with score ${state.team1Score}-${state.team2Score}`);
  }

  // Stop a match manually
  async stopMatch(matchId: string): Promise<void> {
    const state = this.liveMatches.get(matchId);
    if (state) {
      await this.completeMatch(matchId);
    }
  }

  // Get all active matches
  getActiveMatches(): LiveMatchState[] {
    return Array.from(this.liveMatches.values());
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
        await this.completeMatch(matchId);
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