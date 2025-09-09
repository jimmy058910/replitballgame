import { PrismaClient } from '../server/types/database.js';
import * as fs from 'fs';
import * as path from 'path';

// This script generates comprehensive TypeScript types from Prisma schema
// It creates a complete type foundation for achieving zero TypeScript errors

const prisma = new PrismaClient();

// Generate complete type definitions
async function generateCompleteTypes() {
  console.log('🚀 Starting comprehensive type generation from Prisma schema...');
  
  // Create the comprehensive types file content
  const typeDefinitions = `// AUTO-GENERATED: Complete TypeScript definitions from Prisma schema
// Generated at: ${new Date().toISOString()}
// This file provides the single source of truth for all types in the application

import type { 
  Player as PrismaPlayer,
  Team as PrismaTeam,
  UserProfile as PrismaUserProfile,
  Game as PrismaGame,
  TeamFinances as PrismaTeamFinances,
  Staff as PrismaStaff,
  PlayerContract as PrismaPlayerContract,
  Equipment as PrismaEquipment,
  InventoryItem as PrismaInventoryItem,
  Tournament as PrismaTournament,
  TournamentEntry as PrismaTournamentEntry,
  MarketplaceListing as PrismaMarketplaceListing,
  Bid as PrismaBid,
  TradeOffer as PrismaTradeOffer,
  PlayerMatchStats as PrismaPlayerMatchStats,
  TeamMatchStats as PrismaTeamMatchStats,
  Season as PrismaSeason,
  Division as PrismaDivision,
  Consumable as PrismaConsumable,
  TeamConsumable as PrismaTeamConsumable,
  ConsumableEffect as PrismaConsumableEffect,
  NewsItem as PrismaNewsItem,
  Trophy as PrismaTrophy,
  TeamTrophy as PrismaTeamTrophy,
  Notification as PrismaNotification,
  AchievementProgress as PrismaAchievementProgress,
  DailyChallenge as PrismaDailyChallenge,
  PlayerInjury as PrismaPlayerInjury,
  TradingCard as PrismaTradingCard,
  TradingCardCollection as PrismaTradingCardCollection,
  StadiumUpgrade as PrismaStadiumUpgrade,
  TeamStadiumUpgrade as PrismaTeamStadiumUpgrade,
  SponsorshipDeal as PrismaSponsorshipDeal,
  TeamSponsorship as PrismaTeamSponsorship,
  DraftPick as PrismaDraftPick,
  ScoutingReport as PrismaScoutingReport,
  TrainingSession as PrismaTrainingSession,
  PlayerTraining as PrismaPlayerTraining,
  Prisma
} from '../server/types/database.js';

// Re-export Prisma types with application-specific extensions
export type Player = PrismaPlayer & {
  team?: Team;
  contract?: PlayerContract;
  matchStats?: PlayerMatchStats[];
  equipment?: Equipment[];
  injuries?: PlayerInjury[];
  trainingProgress?: PlayerTraining[];
  overallRating?: number;
  potential?: number;
  marketValue?: number;
  isOnTaxi?: boolean;
};

export type Team = PrismaTeam & {
  players?: Player[];
  userProfile?: UserProfile;
  finances?: TeamFinances;
  staff?: Staff[];
  trophies?: TeamTrophy[];
  consumables?: TeamConsumable[];
  stadiumUpgrades?: TeamStadiumUpgrade[];
  sponsorships?: TeamSponsorship[];
  homeGames?: Game[];
  awayGames?: Game[];
  tournamentEntries?: TournamentEntry[];
  marketplaceListings?: MarketplaceListing[];
  season?: number;
  divisionRank?: number;
};

export type UserProfile = PrismaUserProfile & {
  Team?: Team;
  notifications?: Notification[];
  achievements?: AchievementProgress[];
};

export type Game = PrismaGame & {
  homeTeam?: Team;
  awayTeam?: Team;
  tournament?: Tournament;
  playerStats?: PlayerMatchStats[];
  teamStats?: TeamMatchStats[];
};

export type TeamFinances = PrismaTeamFinances & {
  team?: Team;
  creditBalance?: number;
  gemBalance?: number;
};

export type Staff = PrismaStaff & {
  team?: Team;
};

export type PlayerContract = PrismaPlayerContract & {
  player?: Player;
  team?: Team;
};

export type Equipment = PrismaEquipment & {
  player?: Player;
};

export type InventoryItem = PrismaInventoryItem & {
  team?: Team;
};

export type Tournament = PrismaTournament & {
  entries?: TournamentEntry[];
  games?: Game[];
};

export type TournamentEntry = PrismaTournamentEntry & {
  tournament?: Tournament;
  team?: Team;
};

export type MarketplaceListing = PrismaMarketplaceListing & {
  team?: Team;
  player?: Player;
  bids?: Bid[];
};

export type Bid = PrismaBid & {
  listing?: MarketplaceListing;
  team?: Team;
};

export type TradeOffer = PrismaTradeOffer & {
  fromTeam?: Team;
  toTeam?: Team;
  offeredPlayers?: Player[];
  requestedPlayers?: Player[];
};

export type PlayerMatchStats = PrismaPlayerMatchStats & {
  player?: Player;
  game?: Game;
};

export type TeamMatchStats = PrismaTeamMatchStats & {
  team?: Team;
  game?: Game;
};

export type Season = PrismaSeason;

export type Division = PrismaDivision & {
  teams?: Team[];
};

export type Consumable = PrismaConsumable & {
  effects?: ConsumableEffect[];
  teamConsumables?: TeamConsumable[];
};

export type TeamConsumable = PrismaTeamConsumable & {
  team?: Team;
  consumable?: Consumable;
};

export type ConsumableEffect = PrismaConsumableEffect & {
  consumable?: Consumable;
};

export type NewsItem = PrismaNewsItem;

export type Trophy = PrismaTrophy & {
  teamTrophies?: TeamTrophy[];
};

export type TeamTrophy = PrismaTeamTrophy & {
  team?: Team;
  trophy?: Trophy;
};

export type Notification = PrismaNotification & {
  userProfile?: UserProfile;
};

export type AchievementProgress = PrismaAchievementProgress & {
  userProfile?: UserProfile;
};

export type DailyChallenge = PrismaDailyChallenge;

export type PlayerInjury = PrismaPlayerInjury & {
  player?: Player;
};

export type TradingCard = PrismaTradingCard & {
  player?: Player;
  collections?: TradingCardCollection[];
};

export type TradingCardCollection = PrismaTradingCardCollection & {
  team?: Team;
  card?: TradingCard;
};

export type StadiumUpgrade = PrismaStadiumUpgrade & {
  teamUpgrades?: TeamStadiumUpgrade[];
};

export type TeamStadiumUpgrade = PrismaTeamStadiumUpgrade & {
  team?: Team;
  upgrade?: StadiumUpgrade;
};

export type SponsorshipDeal = PrismaSponsorshipDeal & {
  teamSponsorships?: TeamSponsorship[];
};

export type TeamSponsorship = PrismaTeamSponsorship & {
  team?: Team;
  sponsorship?: SponsorshipDeal;
};

export type DraftPick = PrismaDraftPick & {
  team?: Team;
  player?: Player;
};

export type ScoutingReport = PrismaScoutingReport & {
  team?: Team;
  player?: Player;
};

export type TrainingSession = PrismaTrainingSession & {
  playerTraining?: PlayerTraining[];
};

export type PlayerTraining = PrismaPlayerTraining & {
  player?: Player;
  session?: TrainingSession;
};

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Auth Types
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}

export interface AuthContextType {
  user: AuthUser | null;
  userProfile: UserProfile | null;
  team: Team | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, userData?: any) => Promise<void>;
  getToken: () => Promise<string | null>;
  refreshAuth: () => Promise<void>;
}

// Game Simulation Types
export interface LiveMatchState {
  matchId: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  currentMinute: number;
  isPlaying: boolean;
  events: MatchEvent[];
  playerStats: Map<number, PlayerMatchStats>;
  teamStats: {
    home: TeamMatchStats;
    away: TeamMatchStats;
  };
}

export interface MatchEvent {
  id: string;
  minute: number;
  type: 'goal' | 'assist' | 'tackle' | 'interception' | 'injury' | 'substitution' | 'yellow_card' | 'red_card';
  playerId?: number;
  playerName?: string;
  teamId: number;
  description: string;
  importance: 'low' | 'medium' | 'high';
}

// Form Types
export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
  teamName?: string;
}

export interface TeamFormData {
  name: string;
  division?: number;
  subdivision?: string;
  stadium?: string;
  tacticalFocus?: string;
  fieldSize?: string;
}

// Query Hook Types
export interface QueryOptions<T = any> {
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  refetchInterval?: number;
  staleTime?: number;
  gcTime?: number;
  retry?: boolean | number;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

// Utility Types
export type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>;
} : T;

export type RequireAtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<keyof T, K>>>;
}[keyof T];

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type MaybePromise<T> = T | Promise<T>;

// Enum re-exports
export { 
  GameStatus,
  MatchType,
  StaffType,
  TournamentStatus,
  ListingStatus,
  BidStatus,
  TradeStatus,
  NotificationType,
  InjuryType,
  ConsumableType,
  EffectType,
  TrophyType,
  Race,
  FieldSize,
  TacticalFocus
} from '../server/types/database.js';

// Type Guards
export function isPlayer(obj: any): obj is Player {
  return obj && typeof obj === 'object' && 'firstName' in obj && 'lastName' in obj && 'position' in obj;
}

export function isTeam(obj: any): obj is Team {
  return obj && typeof obj === 'object' && 'name' in obj && 'division' in obj;
}

export function isUserProfile(obj: any): obj is UserProfile {
  return obj && typeof obj === 'object' && 'userId' in obj && 'email' in obj;
}

export function isGame(obj: any): obj is Game {
  return obj && typeof obj === 'object' && 'homeTeamId' in obj && 'awayTeamId' in obj;
}

// Export everything for convenience
export * from '../server/types/database.js';
`;

  // Write the types file
  const typesPath = path.join(process.cwd(), 'shared', 'types', 'complete.ts');
  fs.writeFileSync(typesPath, typeDefinitions);
  console.log('✅ Generated comprehensive types at shared/types/complete.ts');

  // Create index file that exports everything
  const indexContent = `// Central type export file
export * from './complete';
export * from './api';
export * from './LiveMatchState';

// Re-export commonly used types at root level for convenience
export type {
  Player,
  Team,
  UserProfile,
  Game,
  TeamFinances,
  Staff,
  Tournament,
  MarketplaceListing,
  AuthContextType,
  LiveMatchState,
  MatchEvent,
  ApiResponse
} from './complete';
`;

  const indexPath = path.join(process.cwd(), 'shared', 'types', 'index.ts');
  fs.writeFileSync(indexPath, indexContent);
  console.log('✅ Updated shared/types/index.ts with comprehensive exports');

  return true;
}

// Run the generation
generateCompleteTypes()
  .then(() => {
    console.log('🎉 Type generation complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Type generation failed:', error);
    process.exit(1);
  });