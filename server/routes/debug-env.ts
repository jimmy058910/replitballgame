import { Router } from 'express';

const router = Router();

// Debug endpoint to check environment variables in production
router.get('/debug-env', async (req, res) => {
  try {
    const nodeEnv = process.env.NODE_ENV || 'development';
    
    // Only show debug info in production for troubleshooting
    if (nodeEnv !== 'production') {
      res.json({
        environment: nodeEnv,
        message: 'Debug endpoint only available in production'
      });
      return;
    }

    // Get database URL info without exposing full credentials
    const prodUrl = process.env.DATABASE_URL;
    const fallbackUrl = process.env.DATABASE_URL;
    
    const getUrlInfo = (url: string | undefined) => {
      if (!url) return null;
      const parts = url.split('@');
      const host = parts[1]?.split('/')[0] || 'unknown';
      const user = url.split('://')[1]?.split(':')[0] || 'unknown';
      return { host, user, exists: !!url };
    };

    res.json({
      environment: nodeEnv,
      timestamp: new Date().toISOString(),
      databaseConfig: {
        DATABASE_URL: getUrlInfo(prodUrl),
        DATABASE_URL_fallback: getUrlInfo(fallbackUrl),
        usingPrimary: !!prodUrl,
        usingFallback: !prodUrl && !!fallbackUrl
      },
      troubleshooting: {
        message: 'Check if DATABASE_URL points to ep-wandering-firefly-a5tkbktt-pooler.us-east-2.aws.neon.tech',
        expectedHost: 'ep-wandering-firefly-a5tkbktt-pooler.us-east-2.aws.neon.tech',
        expectedUser: 'neondb_owner'
      }
    });
    
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;