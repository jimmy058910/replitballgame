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

// Export Prisma Client and all utilities
export {
  PrismaClient,
  Prisma,
  $Enums
} from '../prisma/generated/client';

// Re-export standardized utilities from prismaUtils
export {
  PrismaError,
  executePrismaOperation,
  executePrismaTransaction,
  findUnique,
  findMany,
  create,
  update,
  deleteRecord,
  count,
  queryRaw,
  executeRaw,
  createMany,
  updateMany,
  deleteMany,
  upsert,
  findFirst,
  aggregate,
  groupBy
} from './utils/prismaUtils';

// Re-export enums as VALUES (not types) for proper usage
export {
  Race,
  PlayerRole,
  FieldSize,
  TacticalFocus,
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
  TournamentStatus
} from '../prisma/generated/client';

// Export types separately to avoid conflicts with value exports
export type {
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
  PlayerEquipment
} from '../prisma/generated/client';