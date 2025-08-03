// Simple health check endpoint with environment debugging
export function createHealthCheck() {
  return (req: any, res: any) => {
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

      const healthResponse = { 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'disconnected', // This will be updated when database is connected
        version: '3.0.0-debug-enhanced',
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