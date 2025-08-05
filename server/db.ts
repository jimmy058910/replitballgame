import { PrismaClient } from '../generated/prisma';
import ConnectionPoolOptimizer from './utils/connectionPoolOptimizer';

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
});

// Initialize aggressive connection optimization
const optimizer = ConnectionPoolOptimizer.getInstance(prisma);

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

// AGGRESSIVE COMPUTE OPTIMIZATION FOR ALL ENVIRONMENTS
// Implement ultra-aggressive connection management to stay within free tier limits
const IDLE_TIMEOUT = 90 * 1000; // 90 seconds (was 3 minutes)
const CHECK_INTERVAL = 30 * 1000; // Check every 30 seconds (was 1 minute)
let lastActivity = Date.now();
let autoDisconnectTimer: NodeJS.Timeout | null = null;

// Track database activity for idle management
const trackActivity = () => {
  lastActivity = Date.now();
  
  // Clear existing auto-disconnect timer
  if (autoDisconnectTimer) {
    clearTimeout(autoDisconnectTimer);
  }
  
  // Set new auto-disconnect timer
  autoDisconnectTimer = setTimeout(async () => {
    console.log('🔧 [COMPUTE-SAVER] Auto-disconnecting idle database connection after 90s');
    try {
      await prisma.$disconnect();
      console.log('✅ [COMPUTE-SAVER] Database disconnected successfully');
    } catch (error) {
      console.log('⚠️ [COMPUTE-SAVER] Disconnect error (connection may already be closed)');
    }
  }, IDLE_TIMEOUT);
};

// Aggressive connection monitoring for BOTH development AND production
console.log(`🔗 [COMPUTE-SAVER] Database connecting to: ${dbHost} with aggressive 90s timeout`);

// Monitor activity every 30 seconds and auto-disconnect
const activityMonitor = setInterval(() => {
  const idleTime = Date.now() - lastActivity;
  if (idleTime > IDLE_TIMEOUT) {
    console.log(`🔧 [COMPUTE-SAVER] Connection idle for ${Math.round(idleTime/1000)}s - forcing disconnect`);
    prisma.$disconnect().catch(() => {
      console.log('⚠️ [COMPUTE-SAVER] Force disconnect completed');
    });
    lastActivity = Date.now();
  }
}, CHECK_INTERVAL);

// Immediate connection cleanup on any process exit
const immediateCleanup = async () => {
  console.log('🚨 [COMPUTE-SAVER] Emergency connection cleanup triggered');
  if (autoDisconnectTimer) clearTimeout(autoDisconnectTimer);
  if (activityMonitor) clearInterval(activityMonitor);
  await prisma.$disconnect().catch(() => {});
};

// Multiple emergency cleanup hooks
process.on('beforeExit', immediateCleanup);
process.on('exit', immediateCleanup);
process.on('SIGINT', immediateCleanup);
process.on('SIGTERM', immediateCleanup);
process.on('uncaughtException', immediateCleanup);
process.on('unhandledRejection', immediateCleanup);

// Wrap Prisma operations to track activity
const originalQuery = prisma.$queryRaw.bind(prisma);
const originalExecuteRaw = prisma.$executeRaw.bind(prisma);

// Track all database operations
(prisma as any).$queryRaw = function(query: any, ...values: any[]) {
  trackActivity();
  return originalQuery(query, ...values);
};

(prisma as any).$executeRaw = function(query: any, ...values: any[]) {
  trackActivity();
  return originalExecuteRaw(query, ...values);
};

// Export database connection info for debugging
export const databaseInfo = {
  environment: nodeEnv,
  host: dbHost,
  isDevelopment: nodeEnv !== 'production',
  isProduction: nodeEnv === 'production'
};

// Legacy export for backward compatibility during transition
export const db = prisma;