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

console.log(`🔗 [${nodeEnv.toUpperCase()}] Connecting to database: ${dbHost}`);

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

// Connection pool configuration for production
if (nodeEnv === 'production') {
  // Configure connection pool cleanup
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
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