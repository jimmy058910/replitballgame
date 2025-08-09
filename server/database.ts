import { PrismaClient } from '../generated/prisma/index.js';

/**
 * Database Configuration Manager
 * Automatically switches between development and production databases
 * based on NODE_ENV environment variable
 */

// Environment-based database URL selection with comprehensive error handling
function getDatabaseUrl(): string {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  console.log('🔍 DATABASE INITIALIZATION DEBUG:', {
    NODE_ENV: nodeEnv,
    DATABASE_URL_EXISTS: !!process.env.DATABASE_URL,
    DATABASE_URL_LENGTH: process.env.DATABASE_URL?.length || 0,
    ALL_ENV_VARS_COUNT: Object.keys(process.env).length,
    DATABASE_RELATED_VARS: Object.keys(process.env).filter(key => key.includes('DATABASE'))
  });
  
  if (nodeEnv === 'production') {
    // Production database (live website)
    const prodUrl = process.env.DATABASE_URL;
    if (!prodUrl) {
      console.error('❌ PRODUCTION DATABASE ERROR:', {
        message: 'Production database URL not configured',
        expectedVars: ['DATABASE_URL'],
        availableDbVars: Object.keys(process.env).filter(key => key.includes('DATABASE')),
        nodeEnv: nodeEnv,
        troubleshooting: 'Check Google Cloud Secret Manager and IAM permissions'
      });
      throw new Error(`Production database URL not configured. Available DB vars: ${Object.keys(process.env).filter(key => key.includes('DATABASE')).join(', ')}`);
    }
    console.log('✅ Production database URL configured successfully');
    return prodUrl;
  } else {
    // Development database (testing in Replit)
    const devUrl = process.env.DATABASE_URL;
    if (!devUrl) {
      console.error('❌ DEVELOPMENT DATABASE ERROR:', {
        message: 'Development database URL not configured',
        expectedVars: ['DATABASE_URL'],
        availableDbVars: Object.keys(process.env).filter(key => key.includes('DATABASE')),
        nodeEnv: nodeEnv
      });
      throw new Error(`Development database URL not configured. Available DB vars: ${Object.keys(process.env).filter(key => key.includes('DATABASE')).join(', ')}`);
    }
    console.log('✅ Development database URL configured successfully');
    return devUrl;
  }
}

// Log which database we're connecting to with comprehensive error handling
let databaseUrl: string = '';
let prismaClient: PrismaClient;
const nodeEnv = process.env.NODE_ENV || 'development';
let dbHost = 'unknown';

// Database connection status tracking for health checks
export let databaseStatus = {
  connected: false,
  lastTest: null as Date | null,
  error: null as string | null,
  host: 'unknown'
};

try {
  databaseUrl = getDatabaseUrl();
  dbHost = databaseUrl.split('@')[1]?.split('/')[0] || 'unknown';

  console.log(`🔗 [${nodeEnv.toUpperCase()}] Connecting to database: ${dbHost}`);
  
  // PRODUCTION DEBUG: Log detailed environment info
  if (nodeEnv === 'production') {
    console.log('🔍 PRODUCTION DATABASE DEBUG:', {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL_EXISTS: !!process.env.DATABASE_URL,
      SELECTED_DATABASE_URL: databaseUrl ? databaseUrl.substring(0, 50) + '...' : 'NONE',
      DATABASE_HOST: dbHost,
      ALL_ENV_KEYS: Object.keys(process.env).filter(k => k.includes('DATABASE') || k.includes('VITE_FIREBASE')).sort()
    });
  }

  // Create Prisma client with Cloud Run + Neon optimized configuration
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
    console.log('🔧 Applying Cloud Run + Neon optimizations...');
    
    // Serverless environment optimizations
    prismaConfig.engineType = 'library';
    
    // Connection pool settings for serverless
    const optimizedUrl = databaseUrl + (databaseUrl.includes('?') ? '&' : '?') + 
      'connection_limit=1&pool_timeout=20&connect_timeout=60';
    
    prismaConfig.datasources.db.url = optimizedUrl;
    
    console.log('🔍 OPTIMIZED URL (first 80 chars):', optimizedUrl.substring(0, 80) + '...');
    console.log('✅ Cloud Run optimizations applied');
  }

  console.log('🚀 Creating Prisma client...');
  prismaClient = new PrismaClient(prismaConfig);
  console.log('✅ Prisma client created successfully');

  // Test database connection immediately (critical for Cloud Run health checks)
  console.log('🔍 Testing database connection...');
  if (nodeEnv === 'production') {
    console.log('🔍 PRODUCTION CONNECTION ATTEMPT:', {
      timestamp: new Date().toISOString(),
      attempting_connection: true,
      timeout_settings: 'connect_timeout=60&pool_timeout=20&connection_limit=1'
    });
  }
  
  // Perform synchronous connection test
  prismaClient.$queryRaw`SELECT 1 as test`.then((result: any) => {
    console.log('✅ Database connection test successful:', result);
    databaseStatus.connected = true;
    databaseStatus.lastTest = new Date();
    databaseStatus.error = null;
    databaseStatus.host = dbHost;
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
    databaseStatus.host = dbHost;
    if (nodeEnv === 'production') {
      console.error('💥 PRODUCTION CONNECTION TEST FAILED - This will cause container to fail health checks');
    }
  });
} catch (error) {
  console.error('❌ CRITICAL DATABASE ERROR:', {
    error: error instanceof Error ? error.message : 'Unknown error',
    errorName: error instanceof Error ? error.name : 'unknown',
    errorCode: (error as any)?.code || 'no-code',
    stack: error instanceof Error ? error.stack : 'No stack trace',
    timestamp: new Date().toISOString(),
    nodeEnv: nodeEnv,
    databaseUrl: databaseUrl ? databaseUrl.substring(0, 50) + '...' : 'undefined',
    troubleshooting: {
      checkSecrets: 'Verify DATABASE_URL exists in Google Cloud Secret Manager',
      checkPermissions: 'Verify Cloud Run service account has Secret Manager access',
      checkNetwork: 'Verify Cloud Run can reach Neon database',
      logs: 'Check Cloud Run logs for more details'
    }
  });
  
  // Production: Additional error context
  if (nodeEnv === 'production') {
    console.error('🔍 PRODUCTION ERROR CONTEXT:', {
      prisma_client_exists: false, // Variable not yet assigned in catch block
      database_url_length: databaseUrl?.length || 0,
      error_type: typeof error,
      connection_attempt_failed: true,
      all_env_keys: Object.keys(process.env).filter(k => k.includes('DATABASE') || k.includes('FIREBASE')).sort()
    });
  }
  
  // Create a non-functional Prisma client to prevent import errors
  // This allows the server to start and provide debugging endpoints
  prismaClient = {} as PrismaClient;
}

export const prisma = prismaClient;

// Export database connection info for debugging
export const databaseInfo = {
  environment: nodeEnv,
  host: dbHost,
  isDevelopment: nodeEnv !== 'production',
  isProduction: nodeEnv === 'production'
};