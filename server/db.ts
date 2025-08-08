import { PrismaClient, ItemType, Race, PlayerRole, TournamentStatus, TournamentType, MatchType, GameStatus } from '../generated/prisma.js';
import ConnectionPoolOptimizer from './utils/connectionPoolOptimizer.js';

// Export Prisma types for use in route files
export { ItemType, Race, PlayerRole, TournamentStatus, TournamentType, MatchType, GameStatus };

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

// CRITICAL FIX: Make database connection completely lazy to prevent startup crashes
let _databaseUrl: string | null = null;
let _prismaClient: PrismaClient | null = null;

function getDatabaseUrlLazy(): string {
  if (_databaseUrl) return _databaseUrl;
  
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  if (nodeEnv === 'production') {
    // Production database (live website)
    const prodUrl = process.env.DATABASE_URL_PRODUCTION || process.env.DATABASE_URL;
    if (!prodUrl) {
      console.error('❌ CRITICAL: Production database URL not configured (DATABASE_URL_PRODUCTION or DATABASE_URL)');
      throw new Error('Production database URL not configured (DATABASE_URL_PRODUCTION or DATABASE_URL)');
    }
    _databaseUrl = prodUrl;
    return prodUrl;
  } else {
    // Development database (testing in Replit)
    const devUrl = process.env.DATABASE_URL_DEVELOPMENT || process.env.DATABASE_URL;
    if (!devUrl) {
      console.error('❌ CRITICAL: Development database URL not configured (DATABASE_URL_DEVELOPMENT or DATABASE_URL)');
      throw new Error('Development database URL not configured (DATABASE_URL_DEVELOPMENT or DATABASE_URL)');
    }
    _databaseUrl = devUrl;
    return devUrl;
  }
}

function createPrismaClientLazy(): PrismaClient {
  if (_prismaClient) return _prismaClient;
  
  try {
    const databaseUrl = getDatabaseUrlLazy();
    const nodeEnv = process.env.NODE_ENV || 'development';
    const dbHost = databaseUrl.split('@')[1]?.split('/')[0] || 'unknown';
    
    // Log database connection info ONLY when actually connecting
    console.log(`🔗 [${nodeEnv.toUpperCase()}] Connecting to database: ${dbHost}`);
    if (nodeEnv === 'production') {
      console.log('🔍 PRODUCTION DB DEBUG:');
      console.log('  - NODE_ENV:', process.env.NODE_ENV);
      console.log('  - DATABASE_URL_PRODUCTION exists:', !!process.env.DATABASE_URL_PRODUCTION);
      console.log('  - DATABASE_URL exists:', !!process.env.DATABASE_URL);
      console.log('  - Using URL pattern:', databaseUrl.substring(0, 50) + '...');
      console.log('  - Database user:', databaseUrl.split('://')[1]?.split(':')[0] || 'unknown');
    }

    _prismaClient = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      log: nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
    
    // Initialize aggressive connection optimization
    const optimizer = ConnectionPoolOptimizer.getInstance(_prismaClient);
    
    return _prismaClient;
  } catch (error) {
    console.error('❌ CRITICAL: Failed to create Prisma client:', error);
    throw error;
  }
}

// CRITICAL FIX: Export a getter function instead of direct client
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop, receiver) {
    const client = globalForPrisma.prisma ?? createPrismaClientLazy();
    if (globalForPrisma.prisma !== client) {
      globalForPrisma.prisma = client;
    }
    return Reflect.get(client, prop, receiver);
  }
});

// Connection optimization is now handled in createPrismaClientLazy()

// Cleanup handlers remain the same
const cleanup = async () => {
  console.log('🔧 Cleaning up database connections...');
  if (_prismaClient) {
    await _prismaClient.$disconnect();
    _prismaClient = null;
  }
};

// Multiple cleanup triggers to minimize idle connections
process.on('beforeExit', cleanup);
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// AGGRESSIVE COMPUTE OPTIMIZATION WITH STARTUP GRACE PERIOD
// Implement ultra-aggressive connection management to stay within free tier limits
// BUT allow proper startup time for containers
const IDLE_TIMEOUT = 90 * 1000; // 90 seconds (was 3 minutes)
const CHECK_INTERVAL = 30 * 1000; // Check every 30 seconds (was 1 minute)
const STARTUP_GRACE_PERIOD = 10 * 60 * 1000; // 10 minutes - extended for Cloud Run startup for container startup
const startupTime = Date.now();
let lastActivity = Date.now();
let autoDisconnectTimer: NodeJS.Timeout | null = null;
let optimizationEnabled = false;

// Track database activity for idle management (with startup grace period)
const trackActivity = () => {
  lastActivity = Date.now();
  
  // Only enable optimization after startup grace period
  const timeSinceStartup = Date.now() - startupTime;
  if (timeSinceStartup < STARTUP_GRACE_PERIOD) {
    if (!optimizationEnabled) {
      console.log(`🔧 [COMPUTE-SAVER] Startup grace period active (${Math.round((STARTUP_GRACE_PERIOD - timeSinceStartup) / 1000)}s remaining)`);
    }
    return; // Skip optimization during startup
  }
  
  if (!optimizationEnabled) {
    optimizationEnabled = true;
    console.log('🔧 [COMPUTE-SAVER] Startup grace period ended - enabling aggressive optimization');
  }
  
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

// Aggressive connection monitoring with startup grace period - now lazy loaded
console.log(`🔗 [COMPUTE-SAVER] Database connection monitoring initialized with 10-min startup grace period`);

// Monitor activity every 30 seconds and auto-disconnect (after grace period)
const activityMonitor = setInterval(() => {
  const timeSinceStartup = Date.now() - startupTime;
  
  // Skip optimization during startup grace period
  if (timeSinceStartup < STARTUP_GRACE_PERIOD) {
    return;
  }
  
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

// Export database connection info for debugging (lazy loaded)
export const databaseInfo = {
  get environment() { return process.env.NODE_ENV || 'development'; },
  get host() { 
    try {
      const url = _databaseUrl || getDatabaseUrlLazy();
      return url.split('@')[1]?.split('/')[0] || 'unknown';
    } catch {
      return 'not-connected';
    }
  },
  get isDevelopment() { return (process.env.NODE_ENV || 'development') !== 'production'; },
  get isProduction() { return (process.env.NODE_ENV || 'development') === 'production'; }
};

// Legacy export for backward compatibility during transition
export const db = prisma;