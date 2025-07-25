// API Response Types - Centralized type definitions
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

// Team related types
export interface Team {
  id: string;
  name: string;
  division: number;
  subdivision?: string;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  goalDifference?: number;
  teamPower: number;
  teamCamaraderie: number;
  credits: number;
  userProfileId?: string;
  logoUrl?: string;
  camaraderie?: number;
  fanLoyalty?: number;
  homeField?: string;
  tacticalFocus?: string;
  leagueId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Store and Market types
export interface StoreItem {
  id: string;
  name: string;
  description: string;
  price?: number;
  priceGems?: number;
  credits?: number;
  gems?: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  tier?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  category: string;
  dailyLimit?: number;
  purchased?: number;
  canPurchase?: boolean;
  effect?: string;
  statEffects?: Record<string, number>;
  statBoosts?: Record<string, number>;
  itemType?: string;
  slot?: string;
  raceRestriction?: string;
  cosmetic?: boolean;
}

export interface TeamFinances {
  id?: string;
  teamId?: string;
  credits: number;
  gems: number;
  premiumCurrency?: number;
  netRevenue?: number;
  stadiumRevenue?: number;
  maintenanceCosts?: number;
  projectedIncome?: number;
  projectedExpenses?: number;
  lastSeasonRevenue?: number;
  lastSeasonExpenses?: number;
  facilitiesMaintenanceCost?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Match and Tournament types
export interface MatchHistory {
  id: string;
  type: string;
  opponent: string;
  result: string;
  score: string;
  date: string;
  matchType?: string;
  homeScore?: number;
  awayScore?: number;
  status?: string;
}

export interface TournamentEntry {
  id: string;
  name: string;
  status: string;
  entryDate: string;
  placement?: number;
  rewards?: any;
}

export interface LeagueStanding {
  id: string;
  name: string;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  position: number;
  goalDifference?: number;
}

// Seasonal and Exhibition types
export interface SeasonalCycle {
  season: string;
  currentDay: number;
  phase: string;
  description: string;
  details: string;
  daysUntilPlayoffs: number;
  daysUntilNewSeason: number;
}

export interface ExhibitionStats {
  gamesPlayedToday: number;
  exhibitionEntriesUsedToday: number;
  maxGamesPerDay: number;
  maxEntriesPerDay: number;
}

export interface TournamentStats {
  gamesPlayedToday: number;
  tournamentEntriesUsedToday: number;
  maxGamesPerDay: number;
  maxEntriesPerDay: number;
}

export interface ExhibitionMatch {
  id: string;
  type: string;
  team1: string;
  team2: string;
  status: string;
  score?: string;
  matchId?: string;
}

// Challenge and response types
export interface ChallengeResponse {
  matchId: string;
  success: boolean;
  message?: string;
  isHome?: boolean;
  opponentName?: string;
}