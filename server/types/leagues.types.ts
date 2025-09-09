/**
 * League Domain Types
 * 
 * Type definitions for league-related entities
 * Following Domain-Driven Design principles
 * 
 * @module LeagueTypes
 */

/**
 * League standing entry
 */
export interface LeagueStanding {
  position: number;
  teamId: number;
  teamName: string;
  logoUrl?: string | null;
  division: number;
  subdivision?: string;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifference: number;
  gamesPlayed: number;
  winPercentage?: number;
  pointsPerGame?: number;
  form?: string;
  streak?: string;
  recentGames?: RecentGame[];
}

/**
 * Detailed team standing with additional stats
 */
export interface TeamStanding extends LeagueStanding {
  recentForm: TeamGameResult[];
  headToHead: HeadToHeadRecord[];
  projectedFinish: number;
}

/**
 * Recent game summary
 */
export interface RecentGame {
  gameId: number;
  date: Date;
  opponent: string;
  isHome: boolean;
  teamScore: number | null;
  opponentScore: number | null;
  result: 'WIN' | 'LOSS' | 'DRAW' | 'PENDING';
}

/**
 * Team game result
 */
export interface TeamGameResult {
  gameId: number;
  date: Date;
  opponent: string;
  isHome: boolean;
  teamScore: number | null;
  opponentScore: number | null;
  result: 'WIN' | 'LOSS' | 'DRAW' | 'PENDING';
}

/**
 * Head-to-head record against another team
 */
export interface HeadToHeadRecord {
  opponentId: number;
  opponentName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
}

/**
 * Standings history entry
 */
export interface StandingsHistory {
  teamId: number;
  teamName: string;
  date: string;
  points: number;
  position: number;
}

/**
 * League schedule entry
 */
export interface LeagueScheduleEntry {
  gameId: number;
  gameDay: number;
  gameDate: Date;
  homeTeamId: number;
  homeTeamName: string;
  awayTeamId: number;
  awayTeamName: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  homeScore?: number | null;
  awayScore?: number | null;
  subdivision?: string;
}

/**
 * League configuration
 */
export interface LeagueConfig {
  leagueId: number;
  name: string;
  divisions: number;
  teamsPerDivision: number;
  gamesPerSeason: number;
  playoffTeams: number;
  promotionSpots: number;
  relegationSpots: number;
  seasonDuration: number;
  currentSeason?: {
    id: string;
    startDate: Date;
    endDate: Date;
    currentDay: number;
    phase: 'REGULAR' | 'PLAYOFFS' | 'OFFSEASON';
  };
}