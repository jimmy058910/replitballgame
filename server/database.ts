import { PrismaClient } from '@prisma/client';

/**
 * Database Configuration Manager
 * Automatically switches between development and production databases
 * based on NODE_ENV environment variable
 */

// Environment-based database URL selection
function getDatabaseUrl(): string {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  if (nodeEnv === 'production') {
    // Production database (live website)
    const prodUrl = process.env.DATABASE_URL_PRODUCTION || process.env.DATABASE_URL;
    if (!prodUrl) {
      throw new Error('Production database URL not configured');
    }
    return prodUrl;
  } else {
    // Development database (testing in Replit)
    const devUrl = process.env.DATABASE_URL_DEVELOPMENT || process.env.DATABASE_URL;
    if (!devUrl) {
      throw new Error('Development database URL not configured');
    }
    return devUrl;
  }
}

// Log which database we're connecting to
const databaseUrl = getDatabaseUrl();
const nodeEnv = process.env.NODE_ENV || 'development';
const dbHost = databaseUrl.split('@')[1]?.split('/')[0] || 'unknown';

console.log(`🔗 [${nodeEnv.toUpperCase()}] Connecting to database: ${dbHost}`);

// Create Prisma client with environment-specific database
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  },
  log: nodeEnv === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
});

// Export database connection info for debugging
export const databaseInfo = {
  environment: nodeEnv,
  host: dbHost,
  isDevelopment: nodeEnv !== 'production',
  isProduction: nodeEnv === 'production'
};