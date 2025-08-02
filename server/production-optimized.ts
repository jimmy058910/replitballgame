import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";

const app = express();
const port = process.env.PORT || 8080;

console.log('🚀 Starting production-optimized server...');

// Configure CORS with production settings
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://realmrivalry.com', 'https://www.realmrivalry.com']
    : ['http://localhost:5000', /\.replit\.dev$/],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}

// Apply middleware in production-optimized order
app.use(helmet({
  contentSecurityPolicy: false, // Disable for now to avoid blocking issues
  crossOriginEmbedderPolicy: false
}));

app.use(cors(corsOptions));
app.use(compression({ level: 6, threshold: 1024 }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Rate limiting for production
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP'
  });
  app.use(limiter);
}

// Health check endpoint - responds immediately
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: 'production-optimized',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    api: 'healthy',
    services: {
      database: process.env.DATABASE_URL ? 'configured' : 'not-configured',
      auth: process.env.GOOGLE_CLIENT_ID ? 'configured' : 'not-configured'
    }
  });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const { join } = await import('path');
  const staticPath = join(process.cwd(), 'dist');
  
  console.log('📁 Serving static files from:', staticPath);
  
  // Check if dist folder exists
  const { existsSync } = await import('fs');
  if (existsSync(staticPath)) {
    app.use(express.static(staticPath, {
      maxAge: '1d',
      etag: true,
      lastModified: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      }
    }));

    // SPA fallback for non-API routes
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
      }
      return res.sendFile(join(staticPath, 'index.html'));
    });
  } else {
    console.log('⚠️ Static files not found, serving API only');
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
      }
      return res.status(200).json({ message: 'Realm Rivalry API Server', version: 'production-optimized' });
    });
  }
}

// Global error handler
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Global error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
  });
});

// Create HTTP server
const httpServer = createServer(app);

// Start server immediately
httpServer.listen(Number(port), '0.0.0.0', () => {
  console.log(`✅ Production server listening on port ${port}`);
  console.log(`✅ Health check available at /health`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Initialize services asynchronously (non-blocking)
  setImmediate(() => {
    initializeServices().catch(error => {
      console.error('⚠️ Service initialization failed, but server remains operational:', error);
    });
  });
});

// Service initialization function
async function initializeServices() {
  console.log('🔄 Starting service initialization...');
  
  // Initialize database connection
  if (process.env.DATABASE_URL) {
    try {
      const { PrismaClient } = await import('../generated/prisma/index.js');
      const prisma = new PrismaClient({
        datasources: { db: { url: process.env.DATABASE_URL } },
        log: ['error'], // Only log errors to reduce noise
        errorFormat: 'minimal'
      });
      
      await Promise.race([
        prisma.$connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Database connection timeout')), 10000))
      ]);
      
      console.log('✅ Database connected');
      
      // Add database routes
      app.get('/api/db-status', async (req, res) => {
        try {
          await prisma.$queryRaw`SELECT 1 as test`;
          res.json({ status: 'connected', timestamp: new Date().toISOString() });
        } catch (error) {
          res.status(500).json({ status: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
        }
      });

      // Add essential API routes with graceful error handling
      app.get('/api/teams/my', async (req, res) => {
        try {
          // Look for actual team data
          const teams = await prisma.team.findMany({ take: 1 });
          if (teams.length === 0) {
            res.json({ needsTeamCreation: true });
          } else {
            res.json(teams[0]);
          }
        } catch (error) {
          console.error('Error fetching team:', error);
          res.json({ needsTeamCreation: true }); // Fallback to team creation
        }
      });

      app.get('/api/season/current-cycle', async (req, res) => {
        try {
          // Get actual season data
          const season = await prisma.season.findFirst({
            orderBy: { startDate: 'desc' }
          });
          
          if (season) {
            res.json({ 
              currentDay: season.currentDay, 
              seasonNumber: season.seasonNumber, 
              phase: season.phase,
              status: 'active' 
            });
          } else {
            res.json({ 
              currentDay: 1, 
              seasonNumber: 1, 
              phase: 'REGULAR_SEASON',
              status: 'initializing' 
            });
          }
        } catch (error) {
          console.error('Error fetching season:', error);
          res.json({ 
            currentDay: 1, 
            seasonNumber: 1, 
            phase: 'REGULAR_SEASON',
            status: 'error' 
          });
        }
      });

      app.get('/api/matches/live', async (req, res) => {
        try {
          const liveMatches = await prisma.game.findMany({
            where: { status: 'IN_PROGRESS' },
            take: 5
          });
          res.json(liveMatches);
        } catch (error) {
          console.error('Error fetching live matches:', error);
          res.json([]); // Return empty array on error
        }
      });

      app.get('/api/camaraderie/summary', async (req, res) => {
        try {
          // Return basic camaraderie data
          res.json({ teamCamaraderie: 50, status: 'stable' });
        } catch (error) {
          console.error('Error fetching camaraderie:', error);
          res.json({ teamCamaraderie: 0, status: 'unknown' });
        }
      });

      app.get('/api/teams/my/next-opponent', async (req, res) => {
        try {
          // Look for upcoming matches
          const upcomingMatch = await prisma.game.findFirst({
            where: { 
              status: 'SCHEDULED',
              gameDate: { gte: new Date() }
            },
            orderBy: { gameDate: 'asc' }
          });
          
          if (upcomingMatch) {
            res.json({ 
              nextOpponent: 'TBD',
              gameDate: upcomingMatch.gameDate,
              matchType: upcomingMatch.matchType 
            });
          } else {
            res.json({ error: 'No next opponent' });
          }
        } catch (error) {
          console.error('Error fetching next opponent:', error);
          res.json({ error: 'No next opponent' });
        }
      });

      app.get('/api/exhibitions/stats', async (req, res) => {
        try {
          const exhibitionCount = await prisma.game.count({
            where: { matchType: 'EXHIBITION' }
          });
          
          res.json({ 
            totalExhibitions: exhibitionCount,
            wins: 0,
            losses: 0,
            gamesPlayedToday: 0
          });
        } catch (error) {
          console.error('Error fetching exhibition stats:', error);
          res.json({ totalExhibitions: 0, wins: 0, losses: 0, gamesPlayedToday: 0 });
        }
      });

      console.log('✅ Essential API routes initialized');
      
    } catch (error) {
      console.error('⚠️ Database initialization failed:', error);
    }
  } else {
    console.log('📝 Database URL not configured, skipping database initialization');
  }
  
  console.log('✅ Service initialization completed');
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 Graceful shutdown initiated...');
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🔄 Graceful shutdown initiated...');
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

export default app;