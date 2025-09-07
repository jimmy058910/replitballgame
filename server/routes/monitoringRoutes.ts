/**
 * Phase 7B: Monitoring & Observability Routes
 * Health checks, metrics, and system status endpoints
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../services/loggingService';
import { performance } from 'perf_hooks';
import os from 'os';

const router = Router();
const prisma = new PrismaClient();

/**
 * Basic health check endpoint
 * Used by Cloud Run and load balancers
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Quick database connectivity check
    const startTime = performance.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbTime = performance.now() - startTime;

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbTime < 1000 ? 'healthy' : 'slow',
        dbResponseTime: Math.round(dbTime) + 'ms'
      }
    });
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    });
  }
});

/**
 * Detailed health check with component status
 */
router.get('/health/detailed', async (req: Request, res: Response) => {
  const checks: Record<string, any> = {};
  
  // Database check
  try {
    const startTime = performance.now();
    const result = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Team"`;
    const dbTime = performance.now() - startTime;
    
    checks.database = {
      status: 'healthy',
      responseTime: Math.round(dbTime) + 'ms',
      teamCount: (result as any)[0]?.count || 0
    };
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      error: (error as Error).message
    };
  }

  // Memory check
  const memUsage = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  
  checks.memory = {
    status: memUsage.heapUsed < totalMem * 0.8 ? 'healthy' : 'warning',
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
    systemFree: Math.round(freeMem / 1024 / 1024) + 'MB',
    systemTotal: Math.round(totalMem / 1024 / 1024) + 'MB'
  };

  // CPU check
  const cpus = os.cpus();
  const avgLoad = os.loadavg();
  
  checks.cpu = {
    status: avgLoad[0] < cpus.length * 0.8 ? 'healthy' : 'warning',
    cores: cpus.length,
    loadAverage: avgLoad,
    usage: cpus.map(cpu => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      return Math.round((1 - idle / total) * 100) + '%';
    })
  };

  // Overall status
  const overallHealthy = Object.values(checks).every(
    check => check.status === 'healthy'
  );

  res.status(overallHealthy ? 200 : 503).json({
    status: overallHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks
  });
});

/**
 * Metrics endpoint for monitoring
 */
router.get('/metrics', (req: Request, res: Response) => {
  const metrics = logger.getMetrics();
  const healthStatus = logger.getHealthStatus();

  res.json({
    ...healthStatus,
    metrics: {
      ...metrics,
      ...healthStatus.metrics
    }
  });
});

/**
 * Readiness check for deployment verification
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check if all critical services are ready
    const checks = await Promise.all([
      // Database connection
      prisma.$queryRaw`SELECT 1`,
      // Check if we have teams (data loaded)
      prisma.team.count(),
      // Check if we have players
      prisma.player.count()
    ]);

    const [_, teamCount, playerCount] = checks;

    const isReady = teamCount > 0 && playerCount > 0;

    res.status(isReady ? 200 : 503).json({
      ready: isReady,
      timestamp: new Date().toISOString(),
      checks: {
        database: 'connected',
        teams: teamCount,
        players: playerCount
      }
    });
  } catch (error) {
    logger.error('Readiness check failed', { error });
    res.status(503).json({
      ready: false,
      timestamp: new Date().toISOString(),
      error: (error as Error).message
    });
  }
});

/**
 * Liveness check for container orchestration
 */
router.get('/live', (req: Request, res: Response) => {
  // Simple check that the process is alive
  res.status(200).json({
    alive: true,
    timestamp: new Date().toISOString(),
    pid: process.pid,
    uptime: process.uptime()
  });
});

/**
 * Database connection test
 */
router.get('/db-test', async (req: Request, res: Response) => {
  try {
    const startTime = performance.now();
    
    // Run multiple test queries
    const [teamCount, playerCount, gameCount] = await Promise.all([
      prisma.team.count(),
      prisma.player.count(),
      prisma.game.count()
    ]);
    
    const duration = performance.now() - startTime;
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      database: 'connected',
      queryTime: Math.round(duration) + 'ms',
      counts: {
        teams: teamCount,
        players: playerCount,
        games: gameCount
      }
    });
  } catch (error) {
    logger.error('Database test failed', { error });
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * System information endpoint
 */
router.get('/system', (req: Request, res: Response) => {
  res.json({
    timestamp: new Date().toISOString(),
    process: {
      version: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      uptime: process.uptime(),
      execPath: process.execPath,
      cwd: process.cwd()
    },
    system: {
      hostname: os.hostname(),
      type: os.type(),
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      totalMemory: Math.round(os.totalmem() / 1024 / 1024) + 'MB',
      freeMemory: Math.round(os.freemem() / 1024 / 1024) + 'MB',
      cpus: os.cpus().length,
      loadAverage: os.loadavg()
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
      projectId: process.env.PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID
    }
  });
});

/**
 * Performance profiling endpoint (development only)
 */
router.get('/profile', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Profiling disabled in production' });
  }

  const measurements: Record<string, number> = {};

  // Test database query performance
  const dbStart = performance.now();
  await prisma.team.findMany({ take: 10 });
  measurements.databaseQuery = performance.now() - dbStart;

  // Test complex aggregation
  const aggStart = performance.now();
  await prisma.game.groupBy({
    by: ['homeTeamId'],
    _count: true,
    _avg: {
      homeScore: true
    }
  });
  measurements.aggregation = performance.now() - aggStart;

  // Memory snapshot
  const memBefore = process.memoryUsage().heapUsed;
  const testArray = new Array(1000000).fill('test');
  const memAfter = process.memoryUsage().heapUsed;
  measurements.memoryAllocation = memAfter - memBefore;

  res.json({
    timestamp: new Date().toISOString(),
    measurements: Object.entries(measurements).reduce((acc, [key, value]) => {
      acc[key] = Math.round(value) + 'ms';
      return acc;
    }, {} as Record<string, string>),
    memory: {
      before: Math.round(memBefore / 1024 / 1024) + 'MB',
      after: Math.round(memAfter / 1024 / 1024) + 'MB',
      allocated: Math.round(measurements.memoryAllocation / 1024 / 1024) + 'MB'
    }
  });
});

/**
 * Error tracking endpoint
 */
router.get('/errors', (req: Request, res: Response) => {
  const metrics = logger.getMetrics();
  
  res.json({
    timestamp: new Date().toISOString(),
    totalErrors: metrics.errorCount,
    errorRate: metrics.requestCount > 0 
      ? ((metrics.errorCount / metrics.requestCount) * 100).toFixed(2) + '%'
      : '0%',
    recentErrors: [] // Would be populated from error tracking service
  });
});

export default router;