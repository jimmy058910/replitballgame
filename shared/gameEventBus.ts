// Game Event Bus - Centralized event system for decoupling game mechanics

// Browser-compatible EventEmitter implementation
class EventEmitter {
  private events: { [key: string]: Function[] } = {};
  private maxListeners = 10;

  setMaxListeners(n: number) {
    this.maxListeners = n;
  }

  on(event: string, listener: Function) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    
    if (this.events[event].length > this.maxListeners) {
      console.warn(`Possible EventEmitter memory leak detected. ${this.events[event].length} listeners added for event "${event}". Use setMaxListeners() to increase limit.`);
    }
  }

  off(event: string, listener: Function) {
    if (!this.events[event]) return;
    
    const index = this.events[event].indexOf(listener);
    if (index > -1) {
      this.events[event].splice(index, 1);
    }
  }

  emit(event: string, ...args: any[]) {
    if (!this.events[event]) return false;
    
    this.events[event].forEach(listener => {
      try {
        listener(...args);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
    
    return true;
  }

  removeAllListeners(event?: string) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }
}

// Event type definitions
export interface GameEvent {
  id: string;
  timestamp: Date;
  type: string;
  data: any;
}

export interface PlayerEvent extends GameEvent {
  playerId: number;
  teamId: number;
}

export interface MatchEvent extends GameEvent {
  matchId: number;
  homeTeamId: number;
  awayTeamId: number;
}

export interface EconomyEvent extends GameEvent {
  userId: number;
  teamId?: number;
}

// Specific event types
export interface InjuryEvent extends PlayerEvent {
  type: 'player.injured';
  data: {
    injuryType: string;
    severity: 'minor' | 'moderate' | 'major';
    estimatedRecovery: number; // days
    cause: string;
  };
}

export interface ScoreEvent extends MatchEvent {
  type: 'match.score';
  data: {
    scoringPlayerId: number;
    scoringTeamId: number;
    scoreType: 'touchdown' | 'field_goal' | 'safety';
    homeScore: number;
    awayScore: number;
    gameTime: number;
  };
}

export interface StaminaEvent extends PlayerEvent {
  type: 'player.stamina';
  data: {
    currentStamina: number;
    maxStamina: number;
    changeAmount: number;
    reason: string;
  };
}

export interface MoraleEvent extends PlayerEvent {
  type: 'player.morale' | 'team.morale';
  data: {
    currentMorale: number;
    changeAmount: number;
    reason: string;
  };
}

export interface ProgressionEvent extends PlayerEvent {
  type: 'player.progression';
  data: {
    attribute: string;
    oldValue: number;
    newValue: number;
    reason: string;
  };
}

export interface EconomicEvent extends EconomyEvent {
  type: 'economy.transaction' | 'economy.revenue' | 'economy.expense';
  data: {
    amount: number;
    currency: 'credits' | 'gems';
    category: string;
    description: string;
  };
}

export interface TournamentEvent extends GameEvent {
  type: 'tournament.registered' | 'tournament.started' | 'tournament.completed';
  data: {
    tournamentId: number;
    teamId?: number;
    phase?: string;
    result?: string;
  };
}

// Union type for all events
export type AllGameEvents = 
  | InjuryEvent 
  | ScoreEvent 
  | StaminaEvent 
  | MoraleEvent 
  | ProgressionEvent 
  | EconomicEvent 
  | TournamentEvent;

// Event Bus Class
class GameEventBus extends EventEmitter {
  private eventHistory: GameEvent[] = [];
  private readonly maxHistorySize = 1000;

  constructor() {
    super();
    this.setMaxListeners(100); // Increase max listeners for complex game systems
  }

  // Emit a typed event
  emitGameEvent<T extends AllGameEvents>(event: T): void {
    // Add to history
    this.eventHistory.push(event);
    
    // Trim history if too large
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }

    // Emit the event
    this.emit(event.type, event);
    
    // Also emit a generic 'game.event' for global listeners
    this.emit('game.event', event);
  }

  // Get event history
  getEventHistory(type?: string, limit?: number): GameEvent[] {
    let events = type ? this.eventHistory.filter(e => e.type === type) : this.eventHistory;
    return limit ? events.slice(-limit) : events;
  }

  // Get events for a specific player
  getPlayerEvents(playerId: number, limit?: number): PlayerEvent[] {
    const events = this.eventHistory.filter(e => 
      'playerId' in e && e.playerId === playerId
    ) as PlayerEvent[];
    return limit ? events.slice(-limit) : events;
  }

  // Get events for a specific match
  getMatchEvents(matchId: number, limit?: number): MatchEvent[] {
    const events = this.eventHistory.filter(e => 
      'matchId' in e && e.matchId === matchId
    ) as MatchEvent[];
    return limit ? events.slice(-limit) : events;
  }

  // Clear event history
  clearHistory(): void {
    this.eventHistory = [];
  }

  // Create event helpers
  static createInjuryEvent(
    playerId: number, 
    teamId: number, 
    injuryData: InjuryEvent['data']
  ): InjuryEvent {
    return {
      id: `injury_${Date.now()}_${playerId}`,
      timestamp: new Date(),
      type: 'player.injured',
      playerId,
      teamId,
      data: injuryData
    };
  }

  static createScoreEvent(
    matchId: number,
    homeTeamId: number,
    awayTeamId: number,
    scoreData: ScoreEvent['data']
  ): ScoreEvent {
    return {
      id: `score_${Date.now()}_${matchId}`,
      timestamp: new Date(),
      type: 'match.score',
      matchId,
      homeTeamId,
      awayTeamId,
      data: scoreData
    };
  }

  static createProgressionEvent(
    playerId: number,
    teamId: number,
    progressionData: ProgressionEvent['data']
  ): ProgressionEvent {
    return {
      id: `progression_${Date.now()}_${playerId}`,
      timestamp: new Date(),
      type: 'player.progression',
      playerId,
      teamId,
      data: progressionData
    };
  }

  static createEconomicEvent(
    userId: number,
    teamId: number | undefined,
    economicData: EconomicEvent['data']
  ): EconomicEvent {
    return {
      id: `economy_${Date.now()}_${userId}`,
      timestamp: new Date(),
      type: 'economy.transaction',
      userId,
      teamId,
      data: economicData
    };
  }
}

// Singleton instance
export const gameEventBus = new GameEventBus();

// Export the class for testing
export { GameEventBus };