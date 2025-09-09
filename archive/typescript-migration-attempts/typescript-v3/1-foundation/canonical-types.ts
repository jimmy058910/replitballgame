/**
 * CANONICAL TYPE DEFINITIONS - TypeScript Migration v3.0
 * 
 * Single source of truth for ALL types in Realm Rivalry
 * Built from 7 iterations of migration learning and CLAUDE.md specifications
 * 
 * CRITICAL: This file eliminates property access errors (TS2339) 
 * which represent 47% of all TypeScript errors (412/880 errors)
 * 
 * Sources:
 * - Prisma schema (authoritative for database models)  
 * - CLAUDE.md (business rules and naming conventions)
 * - 7 iterations of agent learning (what properties are actually used)
 * - Current shared/types/models.ts (existing partial definitions)
 */

// ============================================
// ENUMS - Match Prisma schema EXACTLY
// ============================================

export enum Race {
  HUMAN = 'HUMAN',
  SYLVAN = 'SYLVAN', 
  GRYLL = 'GRYLL',
  LUMINA = 'LUMINA',
  UMBRA = 'UMBRA'
}

export enum PlayerRole {
  PASSER = 'PASSER',
  RUNNER = 'RUNNER', 
  BLOCKER = 'BLOCKER'
}

export enum InjuryStatus {
  HEALTHY = 'HEALTHY',
  INJURED = 'INJURED',
  RECOVERING = 'RECOVERING'
}

export enum MatchType {
  LEAGUE = 'LEAGUE',
  TOURNAMENT = 'TOURNAMENT', 
  EXHIBITION = 'EXHIBITION',
  PLAYOFF = 'PLAYOFF'
}

export enum MatchStatus {
  SCHEDULED = 'SCHEDULED',
  LIVE = 'LIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum StaffType {
  HEAD_COACH = 'HEAD_COACH',
  ASSISTANT_COACH = 'ASSISTANT_COACH',
  SCOUT = 'SCOUT',
  TRAINER = 'TRAINER',
  DOCTOR = 'DOCTOR'
}

// ============================================
// CORE DATABASE MODELS (from Prisma)
// ============================================

export interface UserProfile {
  id: number;
  userId: string;  // Firebase UID
  email: string;
  firstName?: string;
  lastName?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  Team?: Team[];
}

export interface Team {
  id: number;
  name: string;
  userProfileId: number;  // NOT userId - critical from CLAUDE.md
  
  // Stats (from Prisma schema)
  wins: number;
  losses: number; 
  draws: number;
  points: number;
  
  // Financial
  credits: bigint;
  gems: number;
  
  // Meta
  createdAt: Date;
  updatedAt: Date;  // NOT lastUpdated - critical mapping
  
  // Relations
  userProfile?: UserProfile;
  players?: Player[];
  stadium?: Stadium;
  finances?: TeamFinances;  // NOT TeamFinance - use singular
  staff?: Staff[];
  contracts?: Contract[];
}

export interface Player {
  id: number;
  teamId: number;
  firstName: string;
  lastName: string;
  race: Race;
  age: number;
  role: PlayerRole;
  
  // Core attributes (Prisma schema)
  speed: number;
  power: number;
  throwing: number;
  catching: number;
  kicking: number;
  staminaAttribute: number;
  leadership: number;
  agility: number;
  potentialRating: number;
  
  // Status tracking
  stamina?: number;
  dailyStaminaLevel?: number;
  injuryStatus?: InjuryStatus;
  injuryRecoveryPointsNeeded?: number;
  injuryRecoveryPointsCurrent?: number;
  
  // Season tracking
  seasonMinutesLeague?: number;
  seasonMinutesTournament?: number; 
  seasonMinutesExhibition?: number;
  
  // UI Properties (identified from 7 iterations)
  starter?: boolean;           // LineupRosterBoard usage
  isOnMarket?: boolean;        // MobileRosterHQ usage
  rosterPosition?: string;     // MobileRosterHQ usage (NOT number)
  position?: string;           // Alternative property name
  marketValue?: number;        // Market calculations
  potentialStars?: number;     // UI display
  overallPotentialStars?: number;  // Alternative name
  yearsOnTeam?: number;        // Contract tracking
  camaraderie?: number;        // Team chemistry
  camaraderieScore?: number;   // Alternative name
  isOnTaxi?: boolean;          // Taxi squad management
  isInjured?: boolean;         // Injury status helper
  isRetired?: boolean;         // Retirement tracking
  
  // Relations
  team?: Team;
  contract?: Contract;
  abilities?: PlayerAbility[];
}

export interface Staff {
  id: number;
  teamId: number;
  firstName: string;
  lastName: string;
  type: StaffType;  // NOT role - critical from CLAUDE.md
  
  // Attributes
  experience: number;
  tacticsSkill?: number;  // Head coach specific
  
  // Contract info (flattened from Contract relation)
  salary?: number;        // Direct property, not staff.contract.salary
  bonus?: number;         // Direct property, not staff.contract.bonus
  startSeason?: number;   // Contract start
  endSeason?: number;     // Contract end
  
  // Relations
  team?: Team;
  contract?: Contract;
}

export interface Contract {
  id: number;
  playerId?: number;  // Optional - can be staff contract
  staffId?: number;   // Optional - can be player contract
  teamId: number;
  
  salary: number;
  bonus?: number;
  startSeason: number;
  endSeason: number;
  
  // Contract metadata
  signedAt?: Date;    // NOT signedDate - from agent learning
  isActive?: boolean;
  
  // Relations
  player?: Player;
  staff?: Staff;      // Critical - FinancesTab needs this
  team?: Team;
}

export interface Stadium {
  id: number;
  teamId: number;
  name: string;
  capacity: number;
  
  // Stadium features
  tier: number;
  ticketPrice: number;
  
  // Relations  
  team?: Team;
}

export interface TeamFinances {
  id: number;
  teamId: number;
  
  // Core financials
  balance: number;
  revenue: number;
  expenses: number;
  
  // Projections (mixed types from usage analysis)
  projectedIncome?: number | string;  // DramaticTeamHQ uses both
  projectedExpenses?: number;
  
  // Relations
  team?: Team;
}

// ============================================
// GAME MODELS (Critical: Use 'Game' not 'Match')
// ============================================

export interface Game {  // Prisma model is 'Game' NOT 'Match'
  id: number;
  homeTeamId: number;
  awayTeamId: number;
  
  matchType: MatchType;  // But property is still 'matchType'
  status: MatchStatus;
  
  // Game data
  homeScore?: number;
  awayScore?: number;
  currentMinute?: number;
  
  // Timing
  scheduledTime: Date;
  startTime?: Date;
  endTime?: Date;
  
  // Relations
  homeTeam?: Team;
  awayTeam?: Team;
}

export interface MatchEvent {  // Used in simulation
  id: number;
  gameId: number;
  minute: number;
  type: string;
  description: string;
  text?: string;  // GameSimulationUI needs this property
  
  // Relations
  game?: Game;
}

// ============================================
// TOURNAMENT & LEAGUE MODELS  
// ============================================

export interface Tournament {
  id: number;
  name: string;
  division: number;
  subdivision: string;  // Greek alphabet (alpha, beta, etc.)
  
  // Tournament data
  maxTeams: number;
  currentRound: number;
  status: string;
  
  // Timing
  registrationDeadline: Date;
  startDate: Date;
  
  // Relations
  entries?: TournamentEntry[];
}

export interface TournamentEntry {
  id: number;
  tournamentId: number;
  teamId: number;
  
  registeredAt: Date;  // NOT seed - critical from agent learning
  eliminated?: boolean;
  
  // Relations
  tournament?: Tournament;
  team?: Team;
}

export interface League {
  id: number;
  division: number;
  subdivision: string;
  season: number;
  
  // Relations
  teams?: Team[];
  standings?: LeagueStanding[];
}

export interface LeagueStanding {
  id: number;
  leagueId: number;
  teamId: number;
  
  // Stats
  wins: number;
  losses: number;
  draws: number;
  points: number;
  position: number;
  
  // Relations
  league?: League;
  team?: Team;
}

// ============================================
// ENHANCED INTERFACES (from iterations)
// ============================================

/**
 * Extended Player interface with contract and market data
 * Eliminates MobileRosterHQ property access errors
 */
export interface PlayerWithContract extends Player {
  // Contract information
  contract: Contract;
  contractSalary?: number;
  contractBonus?: number;
  contractStartSeason?: number;
  contractEndSeason?: number;
  
  // Market data (from iterations 4-7 analysis)
  isOnMarket: boolean;        // Required by MobileRosterHQ
  rosterPosition: string;     // Required by MobileRosterHQ (string, not number)
  marketValue: number;        // Market calculations
  potentialStars: number;     // UI display
  
  // Tactical data
  tacticalRole?: string;      // Formation usage
  tacticalRating?: number;    // Performance in role
  
  // Extended stats
  seasonGoals?: number;
  seasonAssists?: number;
  seasonGamesPlayed?: number;
  
  // Team chemistry
  loyaltyToTeam?: number;
  camaraderieWithTeam?: number;
}

/**
 * Season information interface 
 * Eliminates ComprehensiveCompetitionCenter property access errors
 */
export interface SeasonInfo {
  season: string;
  currentDay: number;
  phase: string;
  description: string;
  
  // Critical properties identified from iterations
  startDate?: Date | string;      // ComprehensiveCompetitionCenter needs this
  seasonNumber?: number;          // ComprehensiveCompetitionCenter needs this
  endDate?: Date | string;        // Completeness
  
  // Optional metadata
  daysUntilPlayoffs?: number;
  daysUntilNewSeason?: number;
}

/**
 * Exhibition stats interface
 * Eliminates DramaticTeamHQ query errors
 */
export interface ExhibitionStats {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winPercentage: number;
  
  // Team performance
  averageScore: number;
  averageOpponentScore: number;
  
  // Recent form
  lastFiveGames?: string[];
  currentStreak?: string;
}

/**
 * Camaraderie data interface
 * Eliminates DramaticTeamHQ property access errors
 */
export interface CamaraderieInfo {
  level: string;  // 'Excellent', 'Good', etc.
  score: number;  // Numeric value
  trend: string;  // 'improving', 'declining', 'stable'
  
  // Breakdown
  playerCount: number;
  averageIndividualCamaraderie: number;
  
  // Effects
  bonusPercentage?: number;
  description?: string;
}

// ============================================
// MARKETPLACE & ECONOMY
// ============================================

export interface MarketplaceListing {
  id: number;
  playerId: number;
  teamId: number;
  
  // Listing data
  askingPrice: number;
  listingType: string;
  
  // Timing
  listedAt: Date;
  expiresAt?: Date;
  
  // Relations
  player?: Player;
  team?: Team;
}

export interface PlayerAbility {
  id: number;
  playerId: number;
  name: string;
  description: string;
  cooldown?: number;
  
  // Relations
  player?: Player;
}

// ============================================
// API RESPONSE TYPES (from iterations)
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================
// UTILITY TYPES
// ============================================

export type ID = number | string;  // Flexible ID type
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// ============================================
// VALIDATION TYPES (for v3.0 system)
// ============================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FixResult {
  success: boolean;
  errorsBefore: number;
  errorsAfter: number;
  filesModified: string[];
  changes: ChangeRecord[];
}

export interface ChangeRecord {
  file: string;
  line: number;
  before: string;
  after: string;
  reason: string;
}

/**
 * EXPORT STATEMENT
 * 
 * This canonical types file serves as the SINGLE SOURCE OF TRUTH
 * for all TypeScript definitions in Realm Rivalry.
 * 
 * Usage in v3.0 system:
 * 1. Property mapper validates against these definitions
 * 2. Deterministic fixes use these as target types
 * 3. Validation agents ensure compliance with these interfaces
 * 
 * Expected impact: Eliminates 412+ property access errors (47% of total)
 */