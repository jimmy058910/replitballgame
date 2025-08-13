import { prisma } from './db.js';

/**
 * Initialize database tables if they don't exist
 * This creates the essential tables needed for authentication
 */
export async function initializeDatabase(): Promise<void> {
  try {
    console.log('🔍 Checking if UserProfile table exists...');
    
    // Try to query the UserProfile table to see if it exists
    try {
      await prisma.$queryRaw`SELECT 1 FROM "UserProfile" LIMIT 1`;
      console.log('✅ UserProfile table already exists');
      return;
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        console.log('📦 UserProfile table does not exist, creating...');
        
        // Create UserProfile table with the schema from Prisma
        await prisma.$executeRaw`
          CREATE TABLE "UserProfile" (
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
        
        // Create indexes for performance
        await prisma.$executeRaw`CREATE INDEX "UserProfile_userId_idx" ON "UserProfile"("userId")`;
        await prisma.$executeRaw`CREATE INDEX "UserProfile_email_idx" ON "UserProfile"("email")`;
        await prisma.$executeRaw`CREATE INDEX "UserProfile_createdAt_idx" ON "UserProfile"("createdAt")`;
        
        console.log('✅ UserProfile table created successfully');
      } else {
        throw error;
      }
    }
    
    // Create Session table if it doesn't exist
    try {
      await prisma.$queryRaw`SELECT 1 FROM "Session" LIMIT 1`;
      console.log('✅ Session table already exists');
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        console.log('📦 Session table does not exist, creating...');
        
        await prisma.$executeRaw`
          CREATE TABLE "Session" (
            "sid" TEXT PRIMARY KEY,
            "sess" JSONB NOT NULL,
            "expire" TIMESTAMP(3) NOT NULL
          )
        `;
        
        await prisma.$executeRaw`CREATE INDEX "Session_expire_idx" ON "Session"("expire")`;
        
        console.log('✅ Session table created successfully');
      } else {
        throw error;
      }
    }
    
    console.log('✅ Database initialization completed');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}