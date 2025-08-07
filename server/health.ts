// CRITICAL FIX: Remove database import from health check file
// This was causing startup probe failures by triggering database connections
// import { prisma } from './db';

// Database connection status for health checks
let lastDatabaseTest: { connected: boolean; error: string | null; timestamp: Date } = {
  connected: false,
  error: null,
  timestamp: new Date()
};

// Test database connection (used by health check) - DYNAMIC IMPORT ONLY
async function testDatabaseConnection() {
  try {
    // CRITICAL FIX: Dynamic import to prevent startup database connections
    const { prisma } = await import('./db');
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

// Ultra-fast health check for Cloud Run startup probes (optimized for speed)
export function createBasicHealthCheck() {
  return (req: any, res: any) => {
    try {
      // CLOUD RUN DEBUGGING: Enhanced health check with environment investigation
      const healthData = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '6.29.0-STARTUP-PROBE-FIX-AUG7',
        environment: {
          NODE_ENV: process.env.NODE_ENV || 'not-set',
          PORT: process.env.PORT || 'not-set',
          production: process.env.NODE_ENV === 'production',
          cloudRun: {
            GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT || 'not-set',
            K_SERVICE: process.env.K_SERVICE || 'not-set',
            K_REVISION: process.env.K_REVISION || 'not-set',
            // Check critical secrets without exposing values
            secrets: {
              DATABASE_URL_PRODUCTION: !!process.env.DATABASE_URL_PRODUCTION,
              VITE_FIREBASE_API_KEY: !!process.env.VITE_FIREBASE_API_KEY,
              VITE_FIREBASE_PROJECT_ID: !!process.env.VITE_FIREBASE_PROJECT_ID,
              GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
              GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET
            }
          }
        },
        server: {
          process: {
            pid: process.pid,
            platform: process.platform,
            nodeVersion: process.version,
            memoryUsage: process.memoryUsage()
          }
        }
      };

      // Set headers immediately for maximum startup probe speed
      res.set({
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      });
      
      // Send minimal response for startup probes (research-optimized)
      res.status(200).json({
        status: 'healthy',
        timestamp: healthData.timestamp,
        version: healthData.version,
        port: process.env.PORT || '8080'
      });
      
      // Log after response (non-blocking for startup probes)
      if (process.env.NODE_ENV === 'production') {
        setImmediate(() => {
          console.log('🔍 STARTUP PROBE SUCCESS:', {
            timestamp: healthData.timestamp,
            uptime: process.uptime(),
            pid: process.pid
          });
        });
      }
    } catch (error) {
      console.error('❌ HEALTH CHECK ERROR:', error);
      res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        version: '6.29.0-STARTUP-PROBE-FIX-AUG7'
      });
    }
  };
}

// Comprehensive health check with database testing (for detailed monitoring)
export function createDetailedHealthCheck() {
  return async (req: any, res: any) => {
    try {
      // Debug logging for troubleshooting
      console.log('🔍 DETAILED HEALTH CHECK DEBUG:', {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
        K_SERVICE: process.env.K_SERVICE,
        DATABASE_URL_PRODUCTION_EXISTS: !!process.env.DATABASE_URL_PRODUCTION,
        DATABASE_URL_EXISTS: !!process.env.DATABASE_URL
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

      // Test database connection for detailed health check
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
        version: '6.27.0-TRUE-DB-INDEPENDENT-HEALTH-AUG6',
        environment: environmentData
      };

      console.log('🔍 DETAILED HEALTH RESPONSE:', JSON.stringify(healthResponse, null, 2));
      res.status(200).json(healthResponse);
    } catch (error) {
      console.error('❌ DETAILED HEALTH CHECK ERROR:', error);
      res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        environment: 'error-retrieving-environment'
      });
    }
  };
}

// Legacy health check function (kept for backward compatibility)
export function createHealthCheck() {
  return createBasicHealthCheck();
}