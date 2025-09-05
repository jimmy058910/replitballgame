/**
 * DATABASE EXPORTS - UNIFIED DATABASE ACCESS
 * 
 * This file re-exports database functionality from database.ts
 * and provides all Prisma model types for TypeScript compilation.
 */

// Re-export database functions from database.ts
export {
  getPrismaClient,
  getPrismaClientSync,
  testDatabaseConnection,
  ensureDatabaseConnection,
  databaseStatus,
  databaseInfo,
  prisma
} from './database';

// Export all Prisma types and models from generated client  
export {
  PrismaClient,
  $Enums
} from '../prisma/generated/client';

export type {
  
  // Main Models
  UserProfile,
  Session,
  Team,
  Player,
  Contract,
  Skill,
  PlayerSkillLink,
  Staff,
  TeamFinances,
  Stadium,
  Item,
  InventoryItem,
  ActiveBoost,
  MarketplaceListing,
  Bid,
  ListingHistory,
  PlayerMarketValue,
  Strategy,
  League,
  LeagueStanding,
  Game,
  Season,
  Notification,
  TryoutPack,
  TryoutHistory,
  GemPack,
  CreditExchangeRate,
  Referral,
  RedeemCode,
  RedeemCodeRecord,
  AdRewardMilestone,
  PremiumBoxReward,
  EquipmentReward,
  Tournament,
  TournamentEntry,
  PaymentTransaction,
  PlayerDevelopmentHistory,
  PlayerMatchStats,
  TeamMatchStats,
  PlayerCareerMilestone,
  PlayerEquipment,

  // Enums
  FieldSize,
  TacticalFocus,
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
  ListingActionType,
  GameStatus,
  SeasonPhase,
  NotificationType,
  RewardType,
  TournamentType,
  TournamentStatus,

  // Prisma Utility Types
  Prisma
} from '../prisma/generated/client';