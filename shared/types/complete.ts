// AUTO-GENERATED: Complete TypeScript definitions from Prisma schema
// This file provides the single source of truth for all types in the application

import type { 
  Player as PrismaPlayer,
  Team as PrismaTeam,
  UserProfile as PrismaUserProfile,
  Game as PrismaGame,
  TeamFinances as PrismaTeamFinances,
  Staff as PrismaStaff,
  Contract as PrismaContract,
  Item as PrismaItem,
  InventoryItem as PrismaInventoryItem,
  Tournament as PrismaTournament,
  TournamentEntry as PrismaTournamentEntry,
  MarketplaceListing as PrismaMarketplaceListing,
  Bid as PrismaBid,
  PlayerMatchStats as PrismaPlayerMatchStats,
  TeamMatchStats as PrismaTeamMatchStats,
  Season as PrismaSeason,
  League as PrismaLeague,
  LeagueStanding as PrismaLeagueStanding,
  Stadium as PrismaStadium,
  Notification as PrismaNotification,
  PlayerSkillLink as PrismaPlayerSkillLink,
  Skill as PrismaSkill,
  Schedule as PrismaSchedule,
  ActiveBoost as PrismaActiveBoost,
  PlayerDevelopmentHistory as PrismaPlayerDevelopmentHistory,
  PlayerCareerMilestone as PrismaPlayerCareerMilestone,
  PlayerMarketValue as PrismaPlayerMarketValue,
  ListingHistory as PrismaListingHistory,
  Strategy as PrismaStrategy,
  PaymentTransaction as PrismaPaymentTransaction,
  TryoutHistory as PrismaTryoutHistory,
  TryoutPack as PrismaTryoutPack,
  GemPack as PrismaGemPack,
  CreditExchangeRate as PrismaCreditExchangeRate,
  Referral as PrismaReferral,
  RedeemCode as PrismaRedeemCode,
  RedeemCodeRecord as PrismaRedeemCodeRecord,
  AdRewardMilestone as PrismaAdRewardMilestone,
  PremiumBoxReward as PrismaPremiumBoxReward,
  EquipmentReward as PrismaEquipmentReward,
  PlayerEquipment as PrismaPlayerEquipment,
  Session as PrismaSession,
  Prisma
} from '../../prisma/generated/client';

// Re-export Prisma types with application-specific extensions
export type Player = PrismaPlayer & {
  team?: Team;
  contract?: Contract;
  matchStats?: PlayerMatchStats[];
  skills?: PlayerSkillLink[];
  equipment?: PlayerEquipment[];
  marketValue?: PlayerMarketValue;
  developmentHistory?: PlayerDevelopmentHistory[];
  careerMilestones?: PlayerCareerMilestone[];
  tryoutHistory?: TryoutHistory[];
};

export type Team = PrismaTeam & {
  players?: Player[];
  staff?: Staff[];
  finances?: TeamFinances;
  stadium?: Stadium;
  league?: League;
  inventoryItems?: InventoryItem[];
  activeBoosts?: ActiveBoost[];
  strategy?: Strategy;
  marketplaceListings?: MarketplaceListing[];
  bids?: Bid[];
  notifications?: Notification[];
  homeGames?: Game[];
  awayGames?: Game[];
  playerMatchStats?: PlayerMatchStats[];
  teamMatchStats?: TeamMatchStats[];
  tryoutHistory?: TryoutHistory[];
};

export type UserProfile = PrismaUserProfile & {
  team?: Team;
  notifications?: Notification[];
  redeemedCodes?: RedeemCodeRecord[];
  adRewardMilestone?: AdRewardMilestone;
};

export type Game = PrismaGame & {
  homeTeam?: Team;
  awayTeam?: Team;
  tournament?: Tournament;
  league?: League;
  schedule?: Schedule;
  playerMatchStats?: PlayerMatchStats[];
  teamMatchStats?: TeamMatchStats[];
};

export type TeamFinances = PrismaTeamFinances & {
  team?: Team;
  transactions?: PaymentTransaction[];
};

export type Staff = PrismaStaff & {
  team?: Team;
  contract?: Contract;
};

export type Contract = PrismaContract & {
  player?: Player;
  staff?: Staff;
};

export type Item = PrismaItem & {
  inventoryItems?: InventoryItem[];
  activeBoosts?: ActiveBoost[];
  playerEquipment?: PlayerEquipment[];
  premiumBoxRewards?: PremiumBoxReward[];
  equipmentRewards?: EquipmentReward[];
};

export type InventoryItem = PrismaInventoryItem & {
  team?: Team;
  item?: Item;
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
  player?: Player;
  sellerTeam?: Team;
  currentHighBidderTeam?: Team;
  bids?: Bid[];
  history?: ListingHistory[];
};

export type Bid = PrismaBid & {
  listing?: MarketplaceListing;
  bidderTeam?: Team;
};

export type PlayerMatchStats = PrismaPlayerMatchStats & {
  player?: Player;
  game?: Game;
  team?: Team;
};

export type TeamMatchStats = PrismaTeamMatchStats & {
  team?: Team;
  game?: Game;
};

export type Season = PrismaSeason & {
  schedules?: Schedule[];
  leagues?: League[];
};

export type League = PrismaLeague & {
  teams?: Team[];
  standings?: LeagueStanding[];
  games?: Game[];
  season?: Season;
};

export type LeagueStanding = PrismaLeagueStanding & {
  league?: League;
};

export type Stadium = PrismaStadium & {
  team?: Team;
};

export type Notification = PrismaNotification & {
  team?: Team;
};

export type PlayerSkillLink = PrismaPlayerSkillLink & {
  player?: Player;
  skill?: Skill;
};

export type Skill = PrismaSkill & {
  playerLinks?: PlayerSkillLink[];
};

export type Schedule = PrismaSchedule & {
  season?: Season;
  games?: Game[];
};

export type ActiveBoost = PrismaActiveBoost & {
  team?: Team;
  player?: Player;
  item?: Item;
};

export type PlayerDevelopmentHistory = PrismaPlayerDevelopmentHistory & {
  player?: Player;
};

export type PlayerCareerMilestone = PrismaPlayerCareerMilestone & {
  player?: Player;
};

export type PlayerMarketValue = PrismaPlayerMarketValue & {
  player?: Player;
};

export type ListingHistory = PrismaListingHistory & {
  listing?: MarketplaceListing;
  team?: Team;
};

export type Strategy = PrismaStrategy & {
  team?: Team;
};

export type PaymentTransaction = PrismaPaymentTransaction & {
  teamFinances?: TeamFinances;
};

export type TryoutHistory = PrismaTryoutHistory & {
  player?: Player;
  team?: Team;
  pack?: TryoutPack;
};

export type TryoutPack = PrismaTryoutPack & {
  tryoutHistory?: TryoutHistory[];
};

export type GemPack = PrismaGemPack;

export type CreditExchangeRate = PrismaCreditExchangeRate;

export type Referral = PrismaReferral;

export type RedeemCode = PrismaRedeemCode & {
  records?: RedeemCodeRecord[];
};

export type RedeemCodeRecord = PrismaRedeemCodeRecord & {
  userProfile?: UserProfile;
  code?: RedeemCode;
};

export type AdRewardMilestone = PrismaAdRewardMilestone & {
  userProfile?: UserProfile;
};

export type PremiumBoxReward = PrismaPremiumBoxReward & {
  item?: Item;
};

export type EquipmentReward = PrismaEquipmentReward & {
  item?: Item;
};

export type PlayerEquipment = PrismaPlayerEquipment & {
  player?: Player;
  item?: Item;
};

export type Session = PrismaSession;

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Authentication Context Type
export interface AuthContextType {
  user: AuthUser | null;
  userProfile: UserProfile | null;
  team: Team | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  signOut: () => Promise<void>;
  getToken?: () => Promise<string | null>;
  refreshAuth: () => Promise<void>;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// Live Match State Types
export interface LiveMatchState {
  matchId: number;
  isActive: boolean;
  currentTime: number;
  maxTime: number;
  currentHalf: number;
  homeScore: number;
  awayScore: number;
  isRunning: boolean;
  gameEvents: MatchEvent[];
  teamStats: any;
  playerStats: any;
}

export interface MatchEvent {
  id: string;
  time: number;
  type: string;
  description: string;
  teamId?: string;
  actingPlayerId?: string;
  critical?: boolean;
}

// Enum re-exports from Prisma
export {
  Race,
  PlayerRole,
  InjuryStatus,
  SkillType,
  SkillCategory,
  StaffType,
  ItemType,
  EquipmentSlot,
  ItemRarity,
  MatchType,
  MarketplaceStatus,
  TournamentType,
  TournamentStatus,
  GameStatus,
  FieldSize,
  TacticalFocus,
  SeasonPhase,
  NotificationType
} from '../../prisma/generated/client';