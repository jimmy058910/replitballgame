import { PrismaClient } from '@prisma/client';

/**
 * CLOUD RUN COMPATIBLE DATABASE MANAGER
 * 
 * CRITICAL: This implements lazy database initialization to prevent
 * container startup failures when database is unreachable.
 * 
 * Cloud Run best practice: Allow container to start and bind to PORT
 * even if external dependencies (like database) are temporarily unavailable.
 */

// Unified database connection management
function getDatabaseUrl(): string {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const rawUrl = process.env.DATABASE_URL;
  
  console.log('🔍 DATABASE CONNECTION DEBUG:', {
    NODE_ENV: nodeEnv,
    DATABASE_URL_EXISTS: !!rawUrl,
    environment: nodeEnv === 'production' ? 'PRODUCTION' : 'DEVELOPMENT'
  });
  
  if (!rawUrl) {
    const availableDbVars = Object.keys(process.env).filter(key => key.includes('DATABASE'));
    throw new Error(`DATABASE_URL not configured. Available DB vars: ${availableDbVars.join(', ')}`);
  }

  if (nodeEnv === 'production') {
    console.log('✅ Production: Using Cloud SQL configuration');
    return rawUrl;
  } else {
    console.log('✅ Development: Using Cloud SQL development instance');
    // DEVELOPMENT: Use proper Cloud SQL dev instance after IP authorization
    // This restores the intended dev/prod separation architecture
    return rawUrl;
  }
}

// CLOUD RUN CRITICAL: Lazy database initialization variables
const nodeEnv = process.env.NODE_ENV || 'development';
let databaseUrl: string | null = null;
let dbHost = 'unknown';
let prismaClient: PrismaClient | null = null;
let initializationPromise: Promise<void> | null = null;

// Database connection status tracking for health checks
export let databaseStatus = {
  connected: false,
  lastTest: null as Date | null,
  error: null as string | null,
  host: 'unknown'
};

/**
 * CLOUD RUN DATABASE URL VALIDATION
 * 
 * CRITICAL: Validate database URL format and handle both TCP and socket connections
 */
function validateDatabaseUrl(url: string): void {
  if (url.includes('/cloudsql/')) {
    console.log('🔍 CLOUD SQL SOCKET DETECTED:', {
      socketPath: url.substring(url.indexOf('/cloudsql/'), url.indexOf('/cloudsql/') + 50) + '...',
      format: 'Google Cloud SQL Unix Socket',
      compatibility: 'Cloud Run Native'
    });
  } else if (url.includes('postgresql://')) {
    const urlObj = new URL(url);
    console.log('🔍 TCP DATABASE CONNECTION DETECTED:', {
      host: urlObj.hostname,
      port: urlObj.port || 5432,
      database: urlObj.pathname.substring(1),
      format: 'TCP Connection',
      compatibility: 'Standard PostgreSQL'
    });
  } else {
    console.error('❌ INVALID DATABASE URL FORMAT:', {
      urlPreview: url.substring(0, 50) + '...',
      expectedFormats: ['postgresql://...', 'postgresql://.../cloudsql/...']
    });
    throw new Error('Invalid DATABASE_URL format');
  }
}

/**
 * LAZY DATABASE INITIALIZATION
 * 
 * CRITICAL: This function is ONLY called when database is actually needed,
 * NOT during module import. This prevents Cloud Run container startup failures.
 */
async function initializeDatabase(): Promise<void> {
  // Prevent multiple simultaneous initializations
  if (initializationPromise) return initializationPromise;
  if (databaseUrl && prismaClient) return; // Already initialized

  initializationPromise = (async () => {
    try {
      console.log('🚀 [LAZY INIT] Starting database initialization...');
      
      const originalUrl = process.env.DATABASE_URL;
      console.log('🔍 ORIGINAL DATABASE_URL (first 80 chars):', originalUrl?.substring(0, 80) + '...');
      
      databaseUrl = getDatabaseUrl();
      console.log('🔍 CONVERTED DATABASE_URL (first 80 chars):', databaseUrl?.substring(0, 80) + '...');
      
      validateDatabaseUrl(databaseUrl);
      
      // Extract host for monitoring (handle both TCP and socket formats)
      if (databaseUrl.includes('/cloudsql/')) {
        dbHost = 'cloudsql-socket';
      } else {
        dbHost = databaseUrl.split('@')[1]?.split('/')[0] || 'unknown';
      }

      console.log(`🔗 [${nodeEnv.toUpperCase()}] Connecting to database: ${dbHost}`);
      
      // Production debug logging
      if (nodeEnv === 'production') {
        console.log('🔍 PRODUCTION DATABASE DEBUG:', {
          NODE_ENV: process.env.NODE_ENV,
          DATABASE_URL_EXISTS: !!process.env.DATABASE_URL,
          SELECTED_DATABASE_URL: databaseUrl ? databaseUrl.substring(0, 50) + '...' : 'NONE',
          DATABASE_HOST: dbHost,
          ALL_ENV_KEYS: Object.keys(process.env).filter(k => k.includes('DATABASE') || k.includes('VITE_FIREBASE')).sort()
        });
      }

      // Create Prisma client with Cloud Run + Cloud SQL optimized configuration
      const prismaConfig: any = {
        datasources: {
          db: {
            url: databaseUrl
          }
        },
        log: nodeEnv === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
      };

      // Add Cloud Run specific configuration for production
      if (nodeEnv === 'production') {
        console.log('🔧 Applying Cloud Run + Cloud SQL optimizations...');
        
        // Connection pool settings for serverless (removed invalid engineType property)
        const optimizedUrl = databaseUrl + (databaseUrl.includes('?') ? '&' : '?') + 
          'connection_limit=1&pool_timeout=20&connect_timeout=60';
        
        prismaConfig.datasources.db.url = optimizedUrl;
        
        console.log('🔍 OPTIMIZED URL (first 80 chars):', optimizedUrl.substring(0, 80) + '...');
        console.log('✅ Cloud Run optimizations applied');
      }

      console.log('🚀 Creating Prisma client...');
      prismaClient = new PrismaClient(prismaConfig);
      console.log('✅ Prisma client created successfully');

      // Test database connection asynchronously (non-blocking for startup)
      databaseStatus.host = dbHost;
      
      console.log('🔍 Testing database connection...');
      if (nodeEnv === 'production') {
        console.log('🔍 PRODUCTION CONNECTION ATTEMPT:', {
          timestamp: new Date().toISOString(),
          attempting_connection: true,
          timeout_settings: 'connect_timeout=60&pool_timeout=20&connection_limit=1'
        });
      }
      
      // Async connection test - won't block server startup
      prismaClient.$queryRaw`SELECT 1 as test`.then((result: any) => {
        console.log('✅ Database connection test successful:', result);
        databaseStatus.connected = true;
        databaseStatus.lastTest = new Date();
        databaseStatus.error = null;
        if (nodeEnv === 'production') {
          console.log('🎉 PRODUCTION DATABASE CONNECTION SUCCESS!');
        }
      }).catch((testError: any) => {
        console.error('❌ DATABASE CONNECTION TEST FAILED:', {
          error: testError instanceof Error ? testError.message : 'Unknown error',
          errorName: testError instanceof Error ? testError.name : 'unknown',
          errorCode: testError?.code || 'no-code',
          timestamp: new Date().toISOString()
        });
        databaseStatus.connected = false;
        databaseStatus.lastTest = new Date();
        databaseStatus.error = testError instanceof Error ? testError.message : 'Unknown error';
        if (nodeEnv === 'production') {
          console.error('💥 PRODUCTION CONNECTION TEST FAILED - Database operations will fail but container will continue');
        }
      });

    } catch (error) {
      console.error('❌ CRITICAL DATABASE INITIALIZATION ERROR:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorName: error instanceof Error ? error.name : 'unknown',
        errorCode: (error as any)?.code || 'no-code',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        timestamp: new Date().toISOString(),
        nodeEnv: nodeEnv,
        troubleshooting: {
          checkSecrets: 'Verify DATABASE_URL exists in Google Cloud Secret Manager',
          checkPermissions: 'Verify Cloud Run service account has Secret Manager access',
          checkNetwork: 'Verify Cloud Run can reach Cloud SQL database',
          logs: 'Check Cloud Run logs for more details'
        }
      });
      
      // CRITICAL: Don't throw error - allow server to start anyway
      databaseStatus.connected = false;
      databaseStatus.lastTest = new Date();
      databaseStatus.error = error instanceof Error ? error.message : 'Unknown error';
      databaseStatus.host = dbHost;
    }
  })();

  return initializationPromise;
}

/**
 * Get database client with lazy initialization
 * CRITICAL: This ensures database is initialized only when needed
 */
export async function getPrismaClient(): Promise<PrismaClient> {
  await initializeDatabase();
  
  if (!prismaClient) {
    throw new Error('Database client not available - initialization failed');
  }
  
  return prismaClient;
}

/**
 * Get database client synchronously (for backwards compatibility)
 * WARNING: May return null if database not yet initialized
 */
export function getPrismaClientSync(): PrismaClient | null {
  return prismaClient;
}

/**
 * CLOUD RUN HEALTH CHECK COMPATIBLE DATABASE TEST
 * Returns quickly without throwing errors to prevent container termination
 */
export async function testDatabaseConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    if (!prismaClient) {
      await initializeDatabase();
    }
    
    if (!prismaClient) {
      return { connected: false, error: 'Database client not initialized' };
    }

    await prismaClient.$queryRaw`SELECT 1 as test`;
    
    databaseStatus.connected = true;
    databaseStatus.lastTest = new Date();
    databaseStatus.error = null;
    
    return { connected: true };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    databaseStatus.connected = false;
    databaseStatus.lastTest = new Date();
    databaseStatus.error = errorMessage;
    
    return { connected: false, error: errorMessage };
  }
}

/**
 * LAZY PRISMA CLIENT PROXY
 * This ensures the client is only created when actually used
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop, receiver) {
    if (!prismaClient) {
      // Synchronously throw if database not initialized yet
      // This forces proper async initialization via getPrismaClient()
      throw new Error('Database not initialized - use getPrismaClient() for proper async initialization');
    }
    return Reflect.get(prismaClient, prop, receiver);
  }
});

/**
 * CLOUD RUN COMPATIBLE: Ensure database connection exists
 * Returns quickly without blocking startup if database unavailable
 */
export async function ensureDatabaseConnection(): Promise<boolean> {
  try {
    await initializeDatabase();
    return !!prismaClient;
  } catch (error) {
    console.error('⚠️  Database connection unavailable:', error);
    return false;
  }
}

// Export database connection info for debugging
export const databaseInfo = {
  environment: nodeEnv,
  host: dbHost,
  isDevelopment: nodeEnv !== 'production',
  isProduction: nodeEnv === 'production'
};