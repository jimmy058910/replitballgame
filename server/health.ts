import { prisma } from './db';

// Database connection status for health checks
let lastDatabaseTest: { connected: boolean; error: string | null; timestamp: Date } = {
  connected: false,
  error: null,
  timestamp: new Date()
};

// Test database connection (used by health check)
async function testDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1 as test`;
    lastDatabaseTest = { connected: true, error: null, timestamp: new Date() };
    return true;
  } catch (error) {
    lastDatabaseTest = { 
      connected: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date() 
    };
    return false;
  }
}

// Simple health check endpoint with environment debugging
export function createHealthCheck() {
  return async (req: any, res: any) => {
    try {
      // Debug logging for troubleshooting
      console.log('🔍 HEALTH CHECK DEBUG:', {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
        K_SERVICE: process.env.K_SERVICE,
        allEnvKeys: Object.keys(process.env).filter(k => 
          k.includes('NODE') || k.includes('PORT') || k.includes('GOOGLE') || k.includes('K_')
        )
      });

      const environmentData = {
        NODE_ENV: process.env.NODE_ENV || 'not-set',
        production: process.env.NODE_ENV === 'production',
        port: process.env.PORT || 5000,
        cloudRun: {
          GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT || 'not-set',
          K_SERVICE: process.env.K_SERVICE || 'not-set',
          K_REVISION: process.env.K_REVISION || 'not-set'
        }
      };

      // Test database connection for health check
      const dbConnected = await testDatabaseConnection();
      
      const healthResponse = { 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: dbConnected ? 'connected' : 'disconnected',
        databaseInfo: {
          connected: lastDatabaseTest.connected,
          lastTest: lastDatabaseTest.timestamp,
          error: lastDatabaseTest.error,
          testType: 'live-query'
        },
        version: '6.17.0-DEBUG-PROD-ENV-AUG3',
        environment: environmentData
      };

      console.log('🔍 HEALTH RESPONSE:', JSON.stringify(healthResponse, null, 2));
      res.status(200).json(healthResponse);
    } catch (error) {
      console.error('❌ HEALTH CHECK ERROR:', error);
      res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        environment: 'error-retrieving-environment'
      });
    }
  };
}