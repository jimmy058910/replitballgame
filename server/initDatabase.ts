import { prisma } from './db.js';

/**
 * Initialize database using Prisma schema
 * Creates missing tables needed for authentication
 */
export async function initializePrismaDatabase(): Promise<void> {
  try {
    console.log('🔍 Initializing Prisma database schema...');
    
    // Use Prisma's built-in schema sync
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "UserProfile" (
        "id" SERIAL PRIMARY KEY,
        "userId" TEXT UNIQUE NOT NULL,
        "email" TEXT UNIQUE,
        "firstName" TEXT,
        "lastName" TEXT,
        "profileImageUrl" TEXT,
        "bio" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "referralCode" TEXT UNIQUE,
        "referredBy" TEXT,
        "ndaAccepted" BOOLEAN NOT NULL DEFAULT false,
        "ndaAcceptedAt" TIMESTAMP(3),
        "ndaVersion" TEXT DEFAULT '1.0'
      )
    `;
    
    // Create indexes
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "UserProfile_userId_idx" ON "UserProfile"("userId")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "UserProfile_email_idx" ON "UserProfile"("email")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "UserProfile_createdAt_idx" ON "UserProfile"("createdAt")`;
    
    // Create Session table for authentication
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Session" (
        "sid" TEXT PRIMARY KEY,
        "sess" JSONB NOT NULL,
        "expire" TIMESTAMP(3) NOT NULL
      )
    `;
    
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Session_expire_idx" ON "Session"("expire")`;
    
    console.log('✅ Prisma database initialized successfully');
    
  } catch (error) {
    console.error('❌ Prisma database initialization failed:', error);
    throw error;
  }
}