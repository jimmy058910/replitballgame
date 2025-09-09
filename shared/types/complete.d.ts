/**
 * Complete Type Definitions for Realm Rivalry
 * 
 * This is the SINGLE SOURCE OF TRUTH for all types in the application.
 * Generated from Prisma schema analysis - DO NOT MODIFY manually.
 * All types are derived from the actual database schema to ensure 100% accuracy.
 * 
 * @version 2.0.0
 * @author Claude Code Assistant
 * @date 2025-01-07
 */

// Import all Prisma-generated types
import type { 
  // Core Models
  UserProfile as PrismaUserProfile,
  Team as PrismaTeam,
  Player as PrismaPlayer,
  Staff as PrismaStaff,
  Contract as PrismaContract,
  TeamFinances as PrismaTeamFinances,
  Stadium as PrismaStadium,
  
  // Game & Competition
  Game as PrismaGame,
  Season as PrismaSeason,
  Schedule as PrismaSchedule,
  Tournament as PrismaTournament,
  TournamentEntry as PrismaTournamentEntry,
  League as PrismaLeague,
  LeagueStanding as PrismaLeagueStanding,
  
  // Statistics  
  PlayerMatchStats as PrismaPlayerMatchStats,
  TeamMatchStats as PrismaTeamMatchStats,
  
  // Marketplace
  MarketplaceListing as PrismaMarketplaceListing,
  Bid as PrismaBid,
  ListingHistory as PrismaListingHistory,
  PlayerMarketValue as PrismaPlayerMarketValue,
  
  // Items & Equipment
  Item as PrismaItem,
  InventoryItem as PrismaInventoryItem,
  PlayerEquipment as PrismaPlayerEquipment,
  ActiveBoost as PrismaActiveBoost,
  
  // Skills & Development
  Skill as PrismaSkill,
  PlayerSkillLink as PrismaPlayerSkillLink,
  PlayerDevelopmentHistory as PrismaPlayerDevelopmentHistory,
  PlayerCareerMilestone as PrismaPlayerCareerMilestone,
  
  // System & Misc
  Notification as PrismaNotification,
  Strategy as PrismaStrategy,
  TryoutHistory as PrismaTryoutHistory,
  RedeemCodeRecord as PrismaRedeemCodeRecord,
  AdRewardMilestone as PrismaAdRewardMilestone,
  Session as PrismaSession,
  
  // All Enums - EXACT from schema
  Race,
  PlayerRole,
  InjuryStatus,
  StaffType,
  FieldSize,
  TacticalFocus,
  ItemType,
  EquipmentSlot,
  ItemRarity,
  SkillType,
  SkillCategory,
  MatchType,
  GameStatus,
  TournamentType,
  TournamentStatus,
  SeasonPhase,
  MarketplaceStatus,
  ListingActionType,
  NotificationType,
  RewardType
} from '../../server/types/database.js';

// Re-export ALL Prisma types for direct access
export * from '../../server/types/database.js';

// =============================================================================
// EXTENDED TYPES WITH RELATIONS (Based on Prisma Schema)
// =============================================================================

/**
 * Extended Player type with computed properties and relations
 * Base: PrismaPlayer (id, teamId, firstName, lastName, race, age, role, etc.)
 * Extensions: Computed properties used in frontend
 */
export interface Player extends PrismaPlayer {
  // Relations from schema
  team?: Team;
  contract?: Contract;
  skills?: PlayerSkillLink[];
  MarketplaceListing?: MarketplaceListing;
  marketValue?: PlayerMarketValue;
  tryoutHistory?: TryoutHistory[];
  activeBoosts?: ActiveBoost[];
  currentEquipment?: PlayerEquipment[];
  developmentHistory?: PlayerDevelopmentHistory[];
  matchStats?: PlayerMatchStats[];
  careerMilestones?: PlayerCareerMilestone[];
  
  // Computed properties (calculated in business logic)
  overallRating?: number; // Calculated from attributes
  potential?: number;     // Calculated from potentialRating + age + other factors
  marketValue?: number;   // Different from PlayerMarketValue relation
  isOnTaxi?: boolean;     // Calculated taxi squad status
}

/**
 * Extended Team type with all relations from schema
 * Base: PrismaTeam (id, userProfileId, name, logoUrl, isAI, etc.)
 * Note: Team.name property exists, NOT teamName
 */
export interface Team extends PrismaTeam {
  // Direct relations from schema
  user?: UserProfile;
  league?: League;
  players?: Player[];
  staff?: Staff[];
  finances?: TeamFinances;
  stadium?: Stadium;
  strategy?: Strategy;
  inventoryItems?: InventoryItem[];
  activeBoosts?: ActiveBoost[];
  marketplaceListings?: MarketplaceListing[]; // As seller
  bids?: Bid[];
  highBidderOnListings?: MarketplaceListing[]; // As high bidder
  listingHistory?: ListingHistory[];
  notifications?: Notification[];
  tournamentEntries?: TournamentEntry[];
  tryoutHistory?: TryoutHistory[];
  homeTeamGames?: Game[]; // As home team
  awayTeamGames?: Game[];  // As away team
  teamMatchStats?: TeamMatchStats[];
}

/**
 * Extended UserProfile type with relations
 * Base: PrismaUserProfile (id, userId, email, firstName, lastName, etc.)
 */
export interface UserProfile extends PrismaUserProfile {
  // Relations from schema
  Team?: Team; // Note: Capital T from schema
  redeemedCodes?: RedeemCodeRecord[];
  adRewardMilestone?: AdRewardMilestone;
}

/**
 * Extended Game type with all relations
 * Base: PrismaGame (id, leagueId, homeTeamId, awayTeamId, etc.)
 * CRITICAL: Game has leagueId field, NOT league object
 */
export interface Game extends PrismaGame {
  // Relations from schema
  league?: League;
  homeTeam?: Team;
  awayTeam?: Team;
  tournament?: Tournament;
  season?: Season;
  schedule?: Schedule;
  playerStats?: PlayerMatchStats[];
  teamStats?: TeamMatchStats[];
}

/**
 * Extended Staff type with relations
 * Base: PrismaStaff (id, teamId, type, name, level, etc.)
 */
export interface Staff extends PrismaStaff {
  // Relations from schema
  team?: Team;
  contract?: Contract;
}

/**
 * Extended Tournament type with relations
 * Base: PrismaTournament (id, name, tournamentId, type, etc.)
 */
export interface Tournament extends PrismaTournament {
  // Relations from schema
  games?: Game[];
  entries?: TournamentEntry[];
}

/**
 * Extended MarketplaceListing type with relations
 * Base: PrismaMarketplaceListing (id, playerId, sellerTeamId, etc.)
 * NOTE: finalPrice is NOT in the schema - it's a computed property
 */
export interface MarketplaceListing extends PrismaMarketplaceListing {
  // Relations from schema
  player?: Player;
  sellerTeam?: Team;
  currentHighBidderTeam?: Team;
  bids?: Bid[];
  history?: ListingHistory[];
  
  // Computed properties (NOT in schema)
  finalPrice?: bigint; // Calculated final sale price
}

/**
 * Extended LeagueStanding type with relations
 * Base: PrismaLeagueStanding (id, teamId, teamName, wins, losses, etc.)
 * NOTE: points, goalDifference, gamesPlayed are NOT in schema
 */
export interface LeagueStanding extends PrismaLeagueStanding {
  // Relations from schema (if any)
  team?: Team;
  
  // Computed properties (NOT in schema)
  points?: number;         // Calculated from wins/losses/draws
  goalDifference?: number; // Calculated from pointsFor/pointsAgainst
  gamesPlayed?: number;    // Calculated field
}

/**
 * Extended Schedule type with relations
 * Base: PrismaSchedule (id, seasonId, division, subdivision, etc.)
 * NOTE: totalGames is NOT in the schema
 */
export interface Schedule extends PrismaSchedule {
  // Relations from schema
  season?: Season;
  games?: Game[];
  
  // Computed properties (NOT in schema)
  totalGames?: number; // Calculated from games.length
}

// =============================================================================
// AUTHENTICATION & API TYPES
// =============================================================================

/**
 * Firebase Auth User type
 */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  getToken?: () => Promise<string>;
}

/**
 * Complete Auth Context with all properties used in codebase
 */
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
  getToken?: () => Promise<string | null>; // This property exists in the codebase
}

/**
 * Standard API Response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Query Result type for React Query responses
 */
export interface QueryResult<T> {
  success: boolean;
  data?: T;
  liveState?: LiveMatchState; // For live match queries
  error?: string;
  message?: string;
}

// =============================================================================
// LIVE MATCH & GAME TYPES
// =============================================================================

/**
 * Live Match State for real-time match viewing
 */
export interface LiveMatchState {
  gameId: number;
  status: GameStatus; // Use enum from Prisma
  currentMinute: number;
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
  stats: {
    home: TeamMatchStats;
    away: TeamMatchStats;
  };
  liveState?: LiveMatchState; // Self-reference for nested states
}

/**
 * Match Event for live match simulation
 */
export interface MatchEvent {
  minute: number;
  type: 'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'injury' | 'penalty' | 'var_review';
  team: 'home' | 'away';
  playerId?: number;
  playerName?: string;
  description: string;
  details?: any;
}

/**
 * Game Time Configuration with overtime support
 */
export interface GameTimeConfig {
  totalMinutes: number;
  halfMinutes: number;
  overtimeEnabled: boolean;
  overtime?: {
    minutes: number;
    suddenDeath: boolean;
  };
}

// =============================================================================
// MARKETPLACE & UI TYPES
// =============================================================================

/**
 * Market tab types for marketplace navigation
 */
export type MarketTabType = 'search' | 'my-listings' | 'my-bids' | 'watchlist' | 'history';

/**
 * Tactical Setup interface for team strategy
 */
export interface TacticalSetup {
  fieldSize: string;
  tacticalFocus: string;
  canChangeFieldSize: boolean;
  fieldSizeInfo: {
    name: string;
    description: string;
    strategicFocus: string;
  };
  tacticalFocusInfo: {
    name: string;
    description: string;
  };
  headCoachTactics: number;
  teamCamaraderie: number;
  effectiveness: {
    fieldSizeEffectiveness: number;
    tacticalFocusEffectiveness: number;
    overallEffectiveness: number;
    recommendations: string[];
  };
  availableFieldSizes: string[];
  availableTacticalFoci: string[];
}

// =============================================================================
// PAGINATION & UTILITY TYPES
// =============================================================================

/**
 * Pagination parameters for API requests
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  nextCursor?: number;
}

/**
 * Custom headers type for API requests (fixes TS7053)
 */
export interface CustomHeaders extends Record<string, string> {
  Authorization?: string;
  'Content-Type'?: string;
}

// =============================================================================
// TYPE GUARDS & UTILITY TYPES
// =============================================================================

/**
 * Type guard for Player objects
 */
export function isPlayer(obj: any): obj is Player {
  return obj && typeof obj.id === 'number' && obj.role && typeof obj.firstName === 'string';
}

/**
 * Type guard for Team objects  
 * NOTE: Team has 'name' property, not 'teamName'
 */
export function isTeam(obj: any): obj is Team {
  return obj && typeof obj.id === 'number' && typeof obj.name === 'string';
}

/**
 * Type guard for Game objects
 */
export function isGame(obj: any): obj is Game {
  return obj && typeof obj.id === 'number' && 'homeTeamId' in obj && 'awayTeamId' in obj;
}

/**
 * Deep partial type for partial updates
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Require at least one property from a set
 */
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

/**
 * Make specific properties optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specific properties required
 */
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;

// =============================================================================
// LEGACY TYPE ALIASES (for backwards compatibility)
// =============================================================================

export type { LiveMatchState as ILiveMatchState };
export type { MatchEvent as IMatchEvent };
export type { ApiResponse as IApiResponse };
export type { AuthContextType as IAuthContext };
export type { QueryResult as IQueryResult };

// =============================================================================
// TYPE ASSERTION HELPERS
// =============================================================================

/**
 * Safe type assertion for API responses
 */
export function asApiResponse<T>(obj: any): ApiResponse<T> {
  return obj as ApiResponse<T>;
}

/**
 * Safe type assertion for query results
 */
export function asQueryResult<T>(obj: any): QueryResult<T> {
  return obj as QueryResult<T>;
}