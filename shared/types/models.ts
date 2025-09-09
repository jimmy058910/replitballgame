/**
 * Core Type Definitions for Realm Rivalry
 * 
 * Based on Prisma schema and actual usage in codebase
 * This file will eliminate ~500+ TypeScript errors!
 */

// ============================================
// ENUMS - Match Prisma schema exactly
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

// ============================================
// CORE MODELS
// ============================================

export interface Player {
  id: number | string;  // Can be either based on context
  teamId: number;
  firstName: string;
  lastName: string;
  race: Race | string;  // Allow string for flexibility
  age: number;
  role: PlayerRole | string;
  
  // Core attributes
  speed: number;
  power: number;
  throwing: number;
  catching: number;
  kicking: number;
  staminaAttribute: number;
  leadership: number;
  agility: number;
  potentialRating: number;
  
  // Status
  stamina?: number;  // Current stamina (different from attribute)
  dailyStaminaLevel?: number;
  injuryStatus?: InjuryStatus | string;
  injuryRecoveryPointsNeeded?: number;
  injuryRecoveryPointsCurrent?: number;
  dailyItemsUsed?: number;
  careerInjuries?: number;
  
  // Season tracking
  seasonMinutesLeague?: number;
  seasonMinutesTournament?: number;
  seasonMinutesExhibition?: number;
  gamesPlayedLastSeason?: number;
  
  // UI/Display properties (not in DB but used in components)
  isOnTaxi?: boolean;
  isInjured?: boolean;
  isRetired?: boolean;
  position?: string;  // Used in some components
  yearsOnTeam?: number;
  camaraderie?: number;  // Individual camaraderie
  camaraderieScore?: number;  // Alternative property name
  overallPotentialStars?: number;  // UI display
  starter?: boolean;  // For lineup management
  
  // Relations
  contract?: Contract;
  team?: Team;
  abilities?: any[];  // Define more specifically if needed
}

export interface Contract {
  id: number;
  playerId: number;
  salary: number;
  length: number;
  yearsRemaining: number;
  signedAt?: Date | string;
  expiresAt?: Date | string;
  player?: Player;
  staff?: Staff;  // For staff contracts
  teamId?: number;  // Team association
  startSeason?: number;  // Contract start season
  endSeason?: number;  // Contract end season
  releaseClause?: number;  // Release clause amount
}

export interface TeamFinances {
  id: number;
  teamId: number;
  credits: number | string;  // Can be string from API
  gems: number | string;
  escrowCredits?: number | string;
  escrowGems?: number | string;
  projectedIncome?: number | string;
  projectedExpenses?: number | string;
  lastSeasonRevenue?: number | string;
  lastSeasonExpenses?: number | string;
  facilitiesMaintenanceCost?: number | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Stadium {
  id: number;
  teamId: number;
  name: string;
  capacity: number;
  fanLoyalty?: number;
  ticketPrice?: number;
  amenitiesLevel?: number;
  fieldType?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Team {
  id: number | string;
  userProfileId?: number;
  name: string;
  logoUrl?: string | null;
  isAI?: boolean;
  division: number | null;
  subdivision?: string | null;
  wins?: number;
  losses?: number;
  draws?: number;
  points?: number;
  
  // Team attributes
  camaraderie?: number;  // Team-wide camaraderie
  teamCamaraderie?: number;  // Alternative name
  fanLoyalty?: number;
  homeField?: string;
  tacticalFocus?: string;
  teamPower?: number;
  
  // Relations
  players?: Player[];
  finances?: TeamFinances;
  stadium?: Stadium;
  staff?: Staff[];
  
  // League info
  leagueId?: number | null;
  season?: number;
  
  // Timestamps
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Staff {
  id: number;
  teamId: number;
  name: string;
  firstName?: string;  // Separated name components
  lastName?: string;  // Separated name components
  type: 'HEAD_COACH' | 'ASSISTANT_COACH' | 'SCOUT' | string;
  role?: string;  // Some components use role instead of type
  skill: number;
  salary: number;
  contractLength?: number;
  contractEndSeason?: number;  // Contract end season
  team?: Team;
  contract?: Contract;  // Staff contract relation
}

export interface Match {
  id: number | string;
  homeTeamId: number;
  awayTeamId: number;
  homeScore?: number | null;
  awayScore?: number | null;
  status: MatchStatus | string;
  matchType: MatchType | string;
  type?: MatchType | string;  // Alternative property name
  scheduledTime?: Date | string | null;
  completedAt?: Date | string | null;
  
  // Relations
  homeTeam?: Team;
  awayTeam?: Team;
  
  // Live match data
  liveState?: LiveMatchState;
  
  // Tournament info
  tournamentId?: number;
  round?: number;
}

export interface LiveMatchState {
  id?: string;
  matchId: number | string;
  homeScore: number;
  awayScore: number;
  gameTime: number;
  currentHalf: number;
  status: 'scheduled' | 'live' | 'halftime' | 'completed' | string;
  isRunning?: boolean;
  possessingTeamId?: number | null;
  recentEvents?: MatchEvent[];
  
  // Enhanced data
  attendance?: number;
  weather?: string;
  gamePhase?: string;
}

export interface MatchEvent {
  id?: string;
  time: number;
  type: string;
  description: string;
  text?: string;  // Added for GameSimulationUI.tsx compatibility
  teamId?: number;
  playerId?: number;
  actingPlayerId?: number;
  data?: any;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
  };
}

// ============================================
// MARKETPLACE TYPES
// ============================================

export interface MarketplaceListing {
  id: number | string;
  playerId: number;
  sellerId: number;
  startingPrice: number;
  currentBid?: number;
  buyNowPrice?: number;
  status: string;
  expiresAt: Date | string;
  player: Player;
  seller?: Team;
  bids?: MarketplaceBid[];
  auctionExtensions?: number;
  totalListings?: number;
  totalBids?: number;
  escrowAmount?: number;
}

export interface MarketplaceBid {
  id: number | string;
  listingId: number;
  bidderId: number;
  amount: number;
  createdAt: Date | string;
  bidder?: Team;
}

// ============================================
// LEAGUE TYPES
// ============================================

export interface League {
  id: number | string;
  name: string;
  division: number;
  subdivision?: string;
  season: number;
  status?: string;
  teams?: Team[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// ============================================
// NOTIFICATION TYPES
// ============================================

export interface Notification {
  id: number | string;
  userId?: number;
  teamId?: number;
  title: string;
  message: string;
  type?: string;
  isRead: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// ============================================
// STORE/ITEM TYPES
// ============================================

export interface StoreItem {
  id: number | string;
  name: string;
  description?: string;
  price: number;
  gemPrice?: number;
  category?: string;
  type?: string;
  isAvailable?: boolean;
  storeItem?: any;  // Nested property in some responses
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;  // Amount of gems given
  price: number;  // USD price
  bonusCredits?: number;
  stripePriceId?: string;
}

// ============================================
// TYPE GUARDS (Helpers)
// ============================================

export function isPlayer(obj: any): obj is Player {
  return obj && typeof obj.firstName === 'string' && typeof obj.lastName === 'string';
}

export function isTeam(obj: any): obj is Team {
  return obj && typeof obj.name === 'string' && typeof obj.division === 'number';
}

export function hasFinances(obj: any): obj is { finances: TeamFinances } {
  return obj && obj.finances && (obj.finances.credits !== undefined);
}

// ============================================
// MATCH STATISTICS TYPES
// ============================================

export interface PlayerMatchStats {
  id: number;
  playerId: number;
  gameId: number;
  playerName?: string; // Added for UI display
  position?: string; // Added for UI display
  minutesPlayed: number;
  performanceRating?: number | null;
  camaraderieContribution?: number;
  
  // Offensive stats
  scores: number;
  assists?: number;
  passAttempts?: number;
  passCompletions?: number;
  passingYards?: number;
  passingPercentage?: number; // Calculated field
  perfectPasses?: number;
  rushingYards?: number;
  breakawayRuns?: number;
  catches?: number;
  receivingYards?: number;
  drops?: number;
  dropsFumbles?: number; // Combined field for UI
  
  // Defensive stats
  tackles?: number;
  tackleAttempts?: number;
  knockdowns?: number;
  knockdownsInflicted?: number; // Alternative name
  blocks?: number;
  injuriesInflicted?: number;
  interceptions?: number;
  ballStrips?: number;
  passDeflections?: number;
  passesDefended?: number; // Alternative name
  
  // General stats
  fumblesLost?: number;
  ballRetention?: number;
  distanceCovered?: number;
  staminaUsed?: number;
  ballPossessionTime?: number;
  pressureApplied?: number;
  injuries?: number;
  
  // Match info
  matchDate?: Date | string;
  matchType?: string;
  
  // Relations
  player?: Player;
  game?: Match;
  
  // Grouped stats for UI
  offensive?: {
    scores: number;
    passingAttempts: number;
    passesCompleted: number;
    passingPercentage: number;
    passingYards: number;
    rushingYards: number;
    catches: number;
    receivingYards: number;
    dropsFumbles: number;
  };
  defensive?: {
    tackles: number;
    knockdownsInflicted: number;
    interceptions: number;
    passesDefended: number;
  };
}

export interface TeamMatchStats {
  id: number;
  teamId: number | string;
  teamName?: string; // Added for UI display
  gameId: number;
  
  // Possession stats
  timeOfPossession: number;
  possessionPercentage?: number;
  averageFieldPosition?: number;
  territoryGained?: number;
  
  // Offensive stats
  totalScore: number;
  totalPassingYards?: number;
  passingYards?: number; // Alternative name
  totalRushingYards?: number;
  rushingYards?: number; // Alternative name
  totalOffensiveYards?: number;
  passingAccuracy?: number;
  ballRetentionRate?: number;
  scoringOpportunities?: number;
  scoringEfficiency?: number;
  
  // Defensive stats
  totalTackles?: number;
  totalKnockdowns?: number;
  totalBlocks?: number;
  totalInjuriesInflicted?: number;
  totalInterceptions?: number;
  totalBallStrips?: number;
  passDeflections?: number;
  defensiveStops?: number;
  
  // Turnover stats
  totalFumbles?: number;
  turnovers?: number; // Alternative name
  turnoverDifferential?: number;
  
  // Advanced stats
  physicalDominance?: number;
  ballSecurityRating?: number;
  homeFieldAdvantage?: number;
  crowdIntensity?: number;
  domeReverberation?: number;
  camaraderieTeamBonus?: number;
  tacticalEffectiveness?: number;
  equipmentAdvantage?: number;
  physicalConditioning?: number;
  
  // Match info
  matchDate?: Date | string;
  matchType?: string;
  gamesPlayed?: number; // For aggregated stats
  
  // Relations
  team?: Team;
  game?: Match;
}

// ============================================
// SERVER-SIDE TYPES
// ============================================

export interface DatabaseConfig {
  url: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
}

export interface ServerResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: number;
}

export interface RequestContext {
  userId?: string;
  teamId?: number;
  userProfile?: any;
  permissions?: string[];
}

// ============================================
// TOURNAMENT TYPES
// ============================================

export interface Tournament {
  id: number | string;
  name: string;
  type: 'DAILY' | 'WEEKLY' | 'SEASON_END' | 'SPECIAL' | string;
  status: 'REGISTRATION' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | string;
  startDate: Date | string;
  endDate?: Date | string;
  maxTeams: number;
  entryFee: number;
  prizePool: number;
  currentRound?: number;
  totalRounds?: number;
  teams?: Team[];
  matches?: Match[];
  winner?: Team;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface TournamentBracket {
  tournamentId: number;
  round: number;
  position: number;
  team1Id?: number;
  team2Id?: number;
  winnerId?: number;
  match?: Match;
  team1?: Team;
  team2?: Team;
  winner?: Team;
}

// ============================================
// EQUIPMENT TYPES
// ============================================

export interface Equipment {
  id: number | string;
  name: string;
  type: 'TRAINING' | 'PERFORMANCE' | 'RECOVERY' | 'TACTICAL' | string;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | string;
  effects: EquipmentEffect[];
  cost: number;
  gemCost?: number;
  description?: string;
  isActive?: boolean;
}

export interface EquipmentEffect {
  attribute: string;
  modifier: number;
  duration?: number;
  conditions?: string[];
}

export interface TeamEquipment {
  id: number;
  teamId: number;
  equipmentId: number;
  quantity: number;
  purchasedAt: Date | string;
  equipment?: Equipment;
}

// ============================================
// EXPORT ALL FOR CONVENIENCE
// ============================================

// Type combinations commonly used
export interface TeamWithFinances extends Team {
  finances: TeamFinances;
}

export interface PlayerWithContract extends Player {
  contract: Contract;
  isOnMarket?: boolean;
  isRetired?: boolean;
  rosterPosition?: string;  // Changed from number to string to match usage
  contractSalary?: number;
  playerName?: string;
  salary?: number;
  yearsRemaining?: number;
  status?: string;
  // Missing properties from analysis
  marketValue?: number;
  potentialStars?: number;
  loyaltyRating?: number;
  morale?: number;
  formRating?: number;
  consistencyRating?: number;
  // Enhanced contract info
  contractValue?: number;
  bonusEligible?: boolean;
  transferListed?: boolean;
  // Position and tactical
  assignedPosition?: string;
  tacticalRole?: string;
  preferredFormation?: string;
}

export interface MatchWithTeams extends Match {
  homeTeam: Team;
  awayTeam: Team;
}

export interface SeasonInfo {
  season: string;
  currentDay: number;
  phase: string;
  description: string;
  daysUntilPlayoffs?: number;
  daysUntilNewSeason?: number;
  startDate?: Date | string;  // Optional to prevent breaking changes
  seasonNumber?: number;      // Optional to prevent breaking changes
  endDate?: Date | string;   // Added for completeness
}

// ============================================
// INJURY MANAGEMENT TYPES
// ============================================

export interface PlayerInjuryStatus {
  playerId: number;
  injuryType: string;
  severity: 'MINOR' | 'MODERATE' | 'SEVERE' | string;
  estimatedRecoveryDays: number;
  currentRecoveryPoints: number;
  requiredRecoveryPoints: number;
  injuredAt: Date | string;
  expectedRecoveryDate?: Date | string;
  treatmentCost?: number;
  isActive: boolean;
}

export interface InjuryTreatment {
  id: number;
  name: string;
  recoveryPointsProvided: number;
  cost: number;
  successRate: number;
  description?: string;
}

// ============================================
// FINANCIAL TYPES
// ============================================

export interface TeamBudget {
  totalBudget: number;
  salaryBudget: number;
  facilitiesBudget: number;
  transferBudget: number;
  marketingBudget: number;
  remaining: number;
}

export interface FinancialTransaction {
  id: number;
  teamId: number;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | string;
  category: string;
  description: string;
  date: Date | string;
  relatedEntityId?: number;
}

// ============================================
// SCOUTING TYPES
// ============================================

export interface ScoutingReport {
  id: number;
  playerId: number;
  scoutId: number;
  accuracy: number;
  confidence: number;
  potentialRating: number;
  recommendedValue: number;
  notes?: string;
  createdAt: Date | string;
}

export interface PlayerScoutInfo {
  player: Player;
  scoutingReports: ScoutingReport[];
  averageRating: number;
  marketValue: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

// ============================================
// PAYMENT TYPES
// ============================================

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  amount: number;
  currency: string;
  paymentIntentId: string;
}

export interface PaymentTransaction {
  id: number | string;
  userId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  paymentMethod: string;
  stripePaymentIntentId?: string;
  createdAt: Date | string;
  completedAt?: Date | string;
  metadata?: Record<string, any>;
}

export interface UserCreditsData {
  credits: number;
  gems: number;
  lastUpdated?: Date | string;
}

// ============================================
// USER PROFILE TYPES  
// ============================================

export interface UserProfile {
  id: number;
  userId: string; // Firebase UID
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatarUrl?: string;
  isVerified?: boolean;
  preferences?: Record<string, any>;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// ============================================
// GAME/MATCH ALIAS (for compatibility)
// ============================================

// Game is an alias for Match in the Prisma schema
export interface Game extends Match {
  // All Match properties are inherited
  // This provides compatibility for code that uses "Game" terminology
}