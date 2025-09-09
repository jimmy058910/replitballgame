/**
 * Shared TypeScript types for Competition Center components
 * Extracted from ComprehensiveCompetitionCenter.tsx for reuse
 */

export type CompetitionTeam = {
  id: string;
  name: string;
  division: number;
  subdivision?: string;
  wins: number;
  losses: number;
  draws?: number;
  points: number;
  teamPower?: number;
  goalsFor?: number;
  goalsAgainst?: number;
  goalDifference?: number;
  gamesPlayed?: number;
  played?: number;
  totalScores?: number; // TS - Total Scores For
  scoresAgainst?: number; // SA - Scores Against  
  scoreDifference?: number; // SD - Score Difference
  players?: any[];
};

export type GlobalRanking = {
  id: string;
  name: string;
  division: number;
  trueStrengthRating: number;
  globalRank: number;
  winPercentage: number;
};

export type Match = {
  id: string;
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string };
  homeScore: number;
  awayScore: number;
  gameDate: string;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED';
  matchType: 'LEAGUE' | 'TOURNAMENT' | 'EXHIBITION';
};

export type Tournament = {
  id: string;
  name: string;
  type: string;
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'REGISTRATION_OPEN' | 'IN_PROGRESS';
  entryFeeCredits?: number;
  entryFeeGems?: number;
  prizePool?: any;
  registrationEndTime?: string;
  startTime?: string;
};

export type Exhibition = {
  id: string;
  type: 'INSTANT' | 'CHOOSE_OPPONENT';
  availableOpponents?: CompetitionTeam[];
  freeEntriesRemaining: number;
  extraTokens: number;
};

export type TournamentStatus = 'UPCOMING' | 'ACTIVE' | 'COMPLETED';

export type CompetitionTab = 'live' | 'league' | 'tournaments' | 'exhibitions' | 'schedule';

// Helper type for component props
export interface CompetitionComponentProps {
  team: any; // TODO: Replace with proper Team type from models
  userId?: string;
  onTeamSelect?: (teamId: number) => void;
}

// Division reward structures
export interface DailyTournamentRewards {
  champion: number;
  runnerUp: number;
  championGems?: number;
}

export interface MidSeasonCupRewards {
  champion: number;
  runnerUp: number;
  championGems: number;
  semifinalist?: number;
}

export interface EntryFees {
  credits: number;
  gems: number;
}