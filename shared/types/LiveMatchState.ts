/**
 * Live Match State Types for Real-Time 2D Engine
 * Defines the structure for live match simulation data and events
 */

export interface LiveMatchState {
  // Match identification
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  
  // Match timing
  status: 'preparing' | 'live' | 'paused' | 'halftime' | 'completed';
  gameTime: number; // Current time in seconds
  maxTime: number; // Total match duration
  currentHalf: number;
  startTime: number; // Unix timestamp
  lastUpdate: number; // Unix timestamp
  
  // Scores
  homeScore: number;
  awayScore: number;
  
  // Field players (6v6 dome system)
  activeFieldPlayers: {
    home: FieldFormation;
    away: FieldFormation;
  };
  
  // Stadium and facilities
  facilityLevels: FacilityLevels;
  attendance: number;
  
  // Revenue tracking
  perTickRevenue: RevenueSnapshot[];
  
  // Match events and statistics
  gameEvents: MatchEvent[];
  playerStats: Map<string, PlayerMatchStats>;
  teamStats: Map<string, TeamMatchStats>;
  
  // Real-time data
  matchTick: number;
  simulationSpeed: number;
}

export interface FieldFormation {
  passer: FieldPlayer;
  runners: FieldPlayer[];
  blockers: FieldPlayer[];
  wildcard: FieldPlayer;
}

export interface FieldPlayer {
  id: string;
  name: string;
  position: { x: number; y: number };
  role: 'Passer' | 'Runner' | 'Blocker';
  stamina: number;
  attributes: {
    speed: number;
    power: number;
    throwing: number;
    catching: number;
    agility: number;
    leadership: number;
  };
  race: 'Human' | 'Sylvan' | 'Gryll' | 'Lumina' | 'Umbra';
  activeBoosts: string[];
}

export interface FacilityLevels {
  capacity: number;
  concessions: number;
  parking: number;
  vipSuites: number;
  merchandising: number;
  lightingScreens: number;
  security: number;
}

export interface RevenueSnapshot {
  tick: number;
  totalRevenue: number;
  ticketRevenue: number;
  concessionRevenue: number;
  parkingRevenue: number;
  vipRevenue: number;
  merchRevenue: number;
}

export interface MatchEvent {
  id: string;
  timestamp: number;
  tick: number;
  type: string;
  description: string;
  priority: EventPriority;
  position?: { x: number; y: number };
  playersInvolved?: string[];
  stats?: any;
}

export interface EventPriority {
  priority: number; // 1=Critical, 2=Important, 3=Standard, 4=Downtime
  label: string;
  speedMultiplier: number;
  visualsRequired: boolean;
}

export interface PlayerMatchStats {
  playerId: string;
  minutesPlayed: number;
  scores: number;
  assists: number;
  tackles: number;
  interceptions: number;
  passAttempts: number;
  passCompletions: number;
  staminaUsed: number;
  injuries: number;
}

export interface TeamMatchStats {
  teamId: string;
  possession: number;
  fieldPosition: number;
  passingAccuracy: number;
  tackles: number;
  turnovers: number;
  timeOfPossession: number;
}

export interface MatchCommand {
  type: 'pause' | 'resume' | 'scrub' | 'setSpeed';
  matchId: string;
  atSecond?: number;
  speed?: number;
  userId?: string;
}

// Event priority constants
export const EVENT_PRIORITIES: Record<string, EventPriority> = {
  CRITICAL: {
    priority: 1,
    label: 'Critical',
    speedMultiplier: 1.0,
    visualsRequired: true
  },
  IMPORTANT: {
    priority: 2,
    label: 'Important',
    speedMultiplier: 2.0,
    visualsRequired: true
  },
  STANDARD: {
    priority: 3,
    label: 'Standard',
    speedMultiplier: 8.0,
    visualsRequired: false
  },
  DOWNTIME: {
    priority: 4,
    label: 'Downtime',
    speedMultiplier: 8.0,
    visualsRequired: false
  }
};

// Match event types
export const MATCH_EVENT_TYPES = {
  // Critical events (1x speed)
  SCORE: 'SCORE',
  INJURY: 'INJURY', 
  MAJOR_TACKLE: 'MAJOR_TACKLE',
  INTERCEPTION: 'INTERCEPTION',
  SCORE_ATTEMPT: 'SCORE_ATTEMPT',
  HALFTIME: 'HALFTIME',
  FINAL_WHISTLE: 'FINAL_WHISTLE',
  
  // Important events (2x speed)
  SUCCESSFUL_PASS_SCORING: 'SUCCESSFUL_PASS_SCORING',
  DEFENSIVE_STOP: 'DEFENSIVE_STOP',
  PASS_ATTEMPT: 'PASS_ATTEMPT',
  SCRUM: 'SCRUM',
  SUBSTITUTION: 'SUBSTITUTION',
  
  // Standard events (visuals off)
  ROUTINE_PLAY: 'ROUTINE_PLAY',
  REGULAR_PASS: 'REGULAR_PASS', 
  STANDARD_MOVEMENT: 'STANDARD_MOVEMENT',
  
  // Downtime events (visuals off)
  TIMEOUT: 'TIMEOUT',
  INJURY_TIMEOUT: 'INJURY_TIMEOUT',
  REFEREE_CONFERENCE: 'REFEREE_CONFERENCE'
} as const;

export type MatchEventType = typeof MATCH_EVENT_TYPES[keyof typeof MATCH_EVENT_TYPES];

// WebSocket message types
export interface WebSocketMessage {
  type: string;
  data?: any;
  matchId?: string;
  userId?: string;
  timestamp?: number;
}

export interface MatchUpdateMessage extends WebSocketMessage {
  type: 'matchUpdate';
  data: LiveMatchState;
}

export interface MatchEventMessage extends WebSocketMessage {
  type: 'matchEvent';
  data: MatchEvent;
}

export interface MatchCommandMessage extends WebSocketMessage {
  type: 'matchCommand';
  data: MatchCommand;
}

// Live match engine interfaces
export interface LiveMatchEngine {
  startMatch(matchId: string): Promise<LiveMatchState>;
  pauseMatch(matchId: string): void;
  resumeMatch(matchId: string): void;
  getMatchState(matchId: string): LiveMatchState | null;
  stopMatch(matchId: string): void;
  updateMatchState(matchId: string, updates: Partial<LiveMatchState>): void;
  broadcastEvent(matchId: string, event: MatchEvent): void;
}

// MVP Summary interface for post-match
export interface MatchSummary {
  matchId: string;
  finalScore: {
    home: number;
    away: number;
  };
  matchType: string;
  date: number;
  mvp?: {
    playerId: string;
    name: string;
    position: string;
    headlineStats: string;
    avatar?: string;
  };
  keyPerformers: Array<{
    playerId: string;
    name: string;
    performanceIndex: number;
    keyStats: string;
  }>;
  matchStats: {
    possession: { home: number; away: number };
    fieldPosition: { home: number; away: number };
    turnovers: { home: number; away: number };
    passAccuracy: { home: number; away: number };
  };
  stadiumPerformance: {
    attendance: number;
    capacity: number;
    totalRevenue: number;
    crowdEnergy: number;
  };
  milestones: string[];
  achievements: string[];
}