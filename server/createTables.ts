import { getPrismaClient } from './database.js';

/**
 * Create UserProfile table for authentication
 * Simple Prisma-only approach
 */
async function createUserProfileTable() {
  try {
    console.log('Creating UserProfile table with Prisma...');
    
    const prisma = await getPrismaClient();
    
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
    
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "UserProfile_userId_idx" ON "UserProfile"("userId")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "UserProfile_email_idx" ON "UserProfile"("email")`;
    
    console.log('✅ UserProfile table created successfully');
    
  } catch (error) {
    console.error('❌ Failed to create UserProfile table:', error);
  }
}

createUserProfileTable();