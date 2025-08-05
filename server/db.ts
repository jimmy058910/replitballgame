import { PrismaClient } from '../generated/prisma';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Environment-based database URL selection
 * Automatically chooses development or production database
 */
function getDatabaseUrl(): string {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  if (nodeEnv === 'production') {
    // Production database (live website)
    const prodUrl = process.env.DATABASE_URL_PRODUCTION || process.env.DATABASE_URL;
    if (!prodUrl) {
      throw new Error('Production database URL not configured (DATABASE_URL_PRODUCTION or DATABASE_URL)');
    }
    return prodUrl;
  } else {
    // Development database (testing in Replit)
    const devUrl = process.env.DATABASE_URL_DEVELOPMENT || process.env.DATABASE_URL;
    if (!devUrl) {
      throw new Error('Development database URL not configured (DATABASE_URL_DEVELOPMENT or DATABASE_URL)');
    }
    return devUrl;
  }
}

// Get environment-specific database URL
const databaseUrl = getDatabaseUrl();
const nodeEnv = process.env.NODE_ENV || 'development';
const dbHost = databaseUrl.split('@')[1]?.split('/')[0] || 'unknown';

// TEMPORARY DEBUG: Log exact database URL being used
console.log(`🔗 [${nodeEnv.toUpperCase()}] Connecting to database: ${dbHost}`);
if (nodeEnv === 'production') {
  console.log('🔍 PRODUCTION DB DEBUG:');
  console.log('  - NODE_ENV:', process.env.NODE_ENV);
  console.log('  - DATABASE_URL_PRODUCTION exists:', !!process.env.DATABASE_URL_PRODUCTION);
  console.log('  - DATABASE_URL exists:', !!process.env.DATABASE_URL);
  console.log('  - Using URL pattern:', databaseUrl.substring(0, 50) + '...');
  console.log('  - Database user:', databaseUrl.split('://')[1]?.split(':')[0] || 'unknown');
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
  log: nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (nodeEnv !== 'production') {
  globalForPrisma.prisma = prisma
}

// Enhanced connection pool configuration for all environments
// Aggressive connection cleanup to minimize compute hours
const cleanup = async () => {
  console.log('🔧 Cleaning up database connections...');
  await prisma.$disconnect();
};

// Multiple cleanup triggers to minimize idle connections
process.on('beforeExit', cleanup);
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Auto-disconnect after periods of inactivity (development only)
if (nodeEnv === 'development') {
  let lastActivity = Date.now();
  const IDLE_TIMEOUT = 3 * 60 * 1000; // 3 minutes
  
  setInterval(async () => {
    if (Date.now() - lastActivity > IDLE_TIMEOUT) {
      console.log('🔧 Auto-disconnecting idle database connection');
      await prisma.$disconnect();
      lastActivity = Date.now();
    }
  }, 60 * 1000); // Check every minute
  
  // Track database activity for idle management
  const trackActivity = () => {
    lastActivity = Date.now();
  };
  
  // Log connections to track activity
  console.log(`🔗 Database connecting to: ${dbHost} with idle timeout management`);
  
  // Simple activity tracking hook (called before any query)
  setInterval(trackActivity, 30 * 1000); // Update activity every 30 seconds during active use
}

// Export database connection info for debugging
export const databaseInfo = {
  environment: nodeEnv,
  host: dbHost,
  isDevelopment: nodeEnv !== 'production',
  isProduction: nodeEnv === 'production'
};

// Legacy export for backward compatibility during transition
export const db = prisma;