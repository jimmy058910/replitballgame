// CRITICAL FIX: CONSOLIDATED DATABASE MANAGEMENT
// This file now redirects to the unified database.ts to eliminate dual database system conflicts
// All database access should go through server/database.ts for consistency

export { prisma, databaseStatus, testDatabaseConnection, ensureDatabaseConnection } from './database.js';

// DEPRECATED: All database URL logic consolidated in server/database.ts
// This eliminates the dual database system conflict that was causing startup blocking