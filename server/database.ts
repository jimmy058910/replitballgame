import { PrismaClient } from '@prisma/client';

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
    DATABASE_URL_PRODUCTION_EXISTS: !!process.env.DATABASE_URL_PRODUCTION,
    DATABASE_URL_EXISTS: !!process.env.DATABASE_URL,
    DATABASE_URL_DEVELOPMENT_EXISTS: !!process.env.DATABASE_URL_DEVELOPMENT,
    DATABASE_URL_PRODUCTION_LENGTH: process.env.DATABASE_URL_PRODUCTION?.length || 0,
    DATABASE_URL_LENGTH: process.env.DATABASE_URL?.length || 0,
    ALL_ENV_VARS_COUNT: Object.keys(process.env).length,
    DATABASE_RELATED_VARS: Object.keys(process.env).filter(key => key.includes('DATABASE'))
  });
  
  if (nodeEnv === 'production') {
    // Production database (live website)
    const prodUrl = process.env.DATABASE_URL_PRODUCTION || process.env.DATABASE_URL;
    if (!prodUrl) {
      console.error('❌ PRODUCTION DATABASE ERROR:', {
        message: 'Production database URL not configured',
        expectedVars: ['DATABASE_URL_PRODUCTION', 'DATABASE_URL'],
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
    const devUrl = process.env.DATABASE_URL_DEVELOPMENT || process.env.DATABASE_URL;
    if (!devUrl) {
      console.error('❌ DEVELOPMENT DATABASE ERROR:', {
        message: 'Development database URL not configured',
        expectedVars: ['DATABASE_URL_DEVELOPMENT', 'DATABASE_URL'],
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

try {
  databaseUrl = getDatabaseUrl();
  dbHost = databaseUrl.split('@')[1]?.split('/')[0] || 'unknown';

  console.log(`🔗 [${nodeEnv.toUpperCase()}] Connecting to database: ${dbHost}`);

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
    prismaConfig.datasources.db.url = databaseUrl + (databaseUrl.includes('?') ? '&' : '?') + 
      'connection_limit=1&pool_timeout=20&connect_timeout=60';
      
    console.log('✅ Cloud Run optimizations applied');
  }

  prismaClient = new PrismaClient(prismaConfig);

  console.log('✅ Prisma client created successfully');
} catch (error) {
  console.error('❌ CRITICAL DATABASE INITIALIZATION ERROR:', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : 'No stack trace',
    timestamp: new Date().toISOString(),
    nodeEnv: nodeEnv,
    troubleshooting: {
      checkSecrets: 'Verify DATABASE_URL_PRODUCTION exists in Google Cloud Secret Manager',
      checkPermissions: 'Verify Cloud Run service account has Secret Manager access',
      checkNetwork: 'Verify Cloud Run can reach Neon database',
      logs: 'Check Cloud Run logs for more details'
    }
  });
  
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