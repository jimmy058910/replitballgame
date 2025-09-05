/**
 * UNIFIED PRISMA UTILITY MODULE
 * 
 * This module provides standardized patterns for all Prisma operations
 * across the entire application, ensuring consistent error handling,
 * connection management, and type safety.
 * 
 * ALL services should use these utilities instead of direct Prisma imports.
 */

import { 
  PrismaClient,
  Prisma,
  // Re-export all enums as VALUES (not types) for proper usage
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
} from '../../prisma/generated/client';

import { 
  getPrismaClient as getBasePrismaClient,
  getPrismaClientSync,
  testDatabaseConnection,
  ensureDatabaseConnection,
  databaseStatus,
  databaseInfo
} from '../database';

// Re-export database utilities
export {
  testDatabaseConnection,
  ensureDatabaseConnection,
  databaseStatus,
  databaseInfo,
  getPrismaClientSync
};

// Re-export all enums as VALUES for proper usage
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
};

// Re-export Prisma namespace for types and utilities
export { Prisma };

// Type-safe error handler
export class PrismaError extends Error {
  code?: string;
  meta?: Record<string, any>;
  
  constructor(message: string, originalError?: any) {
    super(message);
    this.name = 'PrismaError';
    
    if (originalError instanceof Prisma.PrismaClientKnownRequestError) {
      this.code = originalError.code;
      this.meta = originalError.meta as Record<string, any>;
    } else if (originalError) {
      this.code = originalError.code || 'UNKNOWN';
    }
  }
}

/**
 * Get Prisma client with proper error handling
 * This is the PRIMARY method all services should use
 */
export async function getPrismaClient(): Promise<PrismaClient> {
  try {
    const client = await getBasePrismaClient();
    return client;
  } catch (error) {
    console.error('Failed to get Prisma client:', error);
    throw new PrismaError('Database connection failed', error);
  }
}

/**
 * Execute a Prisma operation with standardized error handling
 * Use this for all database operations to ensure consistent error handling
 */
export async function executePrismaOperation<T>(
  operation: (prisma: PrismaClient) => Promise<T>,
  errorContext?: string
): Promise<T> {
  try {
    const prisma = await getPrismaClient();
    return await operation(prisma);
  } catch (error) {
    const context = errorContext ? ` [${errorContext}]` : '';
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle known Prisma errors
      switch (error.code) {
        case 'P2002':
          throw new PrismaError(`Unique constraint violation${context}`, error);
        case 'P2025':
          throw new PrismaError(`Record not found${context}`, error);
        case 'P2003':
          throw new PrismaError(`Foreign key constraint violation${context}`, error);
        case 'P2014':
          throw new PrismaError(`Invalid ID provided${context}`, error);
        default:
          throw new PrismaError(`Database operation failed${context}`, error);
      }
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      throw new PrismaError(`Validation error${context}: ${error.message}`, error);
    } else if (error instanceof Prisma.PrismaClientInitializationError) {
      throw new PrismaError(`Database initialization failed${context}`, error);
    } else if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      throw new PrismaError(`Unknown database error${context}`, error);
    }
    
    // Re-throw if already a PrismaError
    if (error instanceof PrismaError) {
      throw error;
    }
    
    // Wrap unknown errors
    throw new PrismaError(`Unexpected error${context}: ${error}`, error);
  }
}

/**
 * Execute a Prisma transaction with proper error handling
 */
export async function executePrismaTransaction<T>(
  transaction: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: {
    maxWait?: number;
    timeout?: number;
    isolationLevel?: Prisma.TransactionIsolationLevel;
  }
): Promise<T> {
  const prisma = await getPrismaClient();
  
  try {
    return await prisma.$transaction(transaction, options);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new PrismaError(`Transaction failed: ${error.message}`, error);
    }
    throw new PrismaError('Transaction failed', error);
  }
}

/**
 * Safely find a single record with error handling
 */
export async function findUnique<T extends keyof PrismaClient>(
  model: T,
  where: any,
  include?: any
): Promise<any> {
  return executePrismaOperation(async (prisma) => {
    const modelInstance = (prisma as any)[model];
    return await modelInstance.findUnique({ where, include });
  }, `findUnique:${String(model)}`);
}

/**
 * Safely find many records with error handling
 */
export async function findMany<T extends keyof PrismaClient>(
  model: T,
  options?: {
    where?: any;
    include?: any;
    orderBy?: any;
    take?: number;
    skip?: number;
  }
): Promise<any[]> {
  return executePrismaOperation(async (prisma) => {
    const modelInstance = (prisma as any)[model];
    return await modelInstance.findMany(options || {});
  }, `findMany:${String(model)}`);
}

/**
 * Safely create a record with error handling
 */
export async function create<T extends keyof PrismaClient>(
  model: T,
  data: any,
  include?: any
): Promise<any> {
  return executePrismaOperation(async (prisma) => {
    const modelInstance = (prisma as any)[model];
    return await modelInstance.create({ data, include });
  }, `create:${String(model)}`);
}

/**
 * Safely update a record with error handling
 */
export async function update<T extends keyof PrismaClient>(
  model: T,
  where: any,
  data: any,
  include?: any
): Promise<any> {
  return executePrismaOperation(async (prisma) => {
    const modelInstance = (prisma as any)[model];
    return await modelInstance.update({ where, data, include });
  }, `update:${String(model)}`);
}

/**
 * Safely delete a record with error handling
 */
export async function deleteRecord<T extends keyof PrismaClient>(
  model: T,
  where: any
): Promise<any> {
  return executePrismaOperation(async (prisma) => {
    const modelInstance = (prisma as any)[model];
    return await modelInstance.delete({ where });
  }, `delete:${String(model)}`);
}

/**
 * Safely count records with error handling
 */
export async function count<T extends keyof PrismaClient>(
  model: T,
  where?: any
): Promise<number> {
  return executePrismaOperation(async (prisma) => {
    const modelInstance = (prisma as any)[model];
    return await modelInstance.count({ where });
  }, `count:${String(model)}`);
}

/**
 * Execute raw SQL query with proper typing
 */
export async function queryRaw<T = any>(
  query: TemplateStringsArray,
  ...values: any[]
): Promise<T> {
  return executePrismaOperation(async (prisma) => {
    return await prisma.$queryRaw<T>(query, ...values);
  }, 'queryRaw');
}

/**
 * Execute raw SQL command (for updates/deletes)
 */
export async function executeRaw(
  query: TemplateStringsArray,
  ...values: any[]
): Promise<number> {
  return executePrismaOperation(async (prisma) => {
    return await prisma.$executeRaw(query, ...values);
  }, 'executeRaw');
}

/**
 * Batch create records with error handling
 */
export async function createMany<T extends keyof PrismaClient>(
  model: T,
  data: any[],
  skipDuplicates?: boolean
): Promise<Prisma.BatchPayload> {
  return executePrismaOperation(async (prisma) => {
    const modelInstance = (prisma as any)[model];
    return await modelInstance.createMany({ 
      data, 
      skipDuplicates: skipDuplicates ?? false 
    });
  }, `createMany:${String(model)}`);
}

/**
 * Batch update records with error handling
 */
export async function updateMany<T extends keyof PrismaClient>(
  model: T,
  where: any,
  data: any
): Promise<Prisma.BatchPayload> {
  return executePrismaOperation(async (prisma) => {
    const modelInstance = (prisma as any)[model];
    return await modelInstance.updateMany({ where, data });
  }, `updateMany:${String(model)}`);
}

/**
 * Batch delete records with error handling
 */
export async function deleteMany<T extends keyof PrismaClient>(
  model: T,
  where: any
): Promise<Prisma.BatchPayload> {
  return executePrismaOperation(async (prisma) => {
    const modelInstance = (prisma as any)[model];
    return await modelInstance.deleteMany({ where });
  }, `deleteMany:${String(model)}`);
}

/**
 * Upsert a record (create or update)
 */
export async function upsert<T extends keyof PrismaClient>(
  model: T,
  where: any,
  create: any,
  update: any,
  include?: any
): Promise<any> {
  return executePrismaOperation(async (prisma) => {
    const modelInstance = (prisma as any)[model];
    return await modelInstance.upsert({ where, create, update, include });
  }, `upsert:${String(model)}`);
}

/**
 * Find first record matching criteria
 */
export async function findFirst<T extends keyof PrismaClient>(
  model: T,
  options?: {
    where?: any;
    include?: any;
    orderBy?: any;
  }
): Promise<any> {
  return executePrismaOperation(async (prisma) => {
    const modelInstance = (prisma as any)[model];
    return await modelInstance.findFirst(options || {});
  }, `findFirst:${String(model)}`);
}

/**
 * Aggregate functions with error handling
 */
export async function aggregate<T extends keyof PrismaClient>(
  model: T,
  options: {
    where?: any;
    _count?: any;
    _sum?: any;
    _avg?: any;
    _min?: any;
    _max?: any;
  }
): Promise<any> {
  return executePrismaOperation(async (prisma) => {
    const modelInstance = (prisma as any)[model];
    return await modelInstance.aggregate(options);
  }, `aggregate:${String(model)}`);
}

/**
 * Group by with error handling
 */
export async function groupBy<T extends keyof PrismaClient>(
  model: T,
  options: {
    by: string[];
    where?: any;
    _count?: any;
    _sum?: any;
    _avg?: any;
    _min?: any;
    _max?: any;
    having?: any;
    orderBy?: any;
  }
): Promise<any[]> {
  return executePrismaOperation(async (prisma) => {
    const modelInstance = (prisma as any)[model];
    return await modelInstance.groupBy(options);
  }, `groupBy:${String(model)}`);
}

// Export a default initialized client for backward compatibility
// Note: This should be avoided in new code - use getPrismaClient() instead
export let prisma: PrismaClient | null = null;

// Initialize on first import (non-blocking)
getPrismaClient().then(client => {
  prisma = client;
}).catch(error => {
  console.error('Failed to initialize default Prisma client:', error);
});