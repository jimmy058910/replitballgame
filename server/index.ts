// Load environment variables first
import { config } from 'dotenv';
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local file first for local development, fallback to .env
config({ path: path.join(__dirname, '..', '.env.local') });
config({ path: path.join(__dirname, '..', '.env') });

import express from "express";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import session from "express-session";
import http from "http";
import fs from "fs";
import logger, { PerformanceMonitor } from './utils/enhancedLogger.js';

// Main startup function
async function startServer() {
  try {
    logger.info('🚀 Starting Realm Rivalry Server...', {
      category: 'server_startup',
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || (process.env.NODE_ENV === 'production' ? '8080' : '5000')
    });
    
    const app = express();
    const httpServer = http.createServer(app);

    // Trust proxy for Google Cloud Run (must be first!)
    app.set('trust proxy', 1);

    // Basic middleware with Firebase-compatible CSP
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'", 
            "'unsafe-inline'", 
            "'unsafe-eval'",
            "https://cdn.unity3d.com",
            "https://replit.com",
            "blob:"
          ],
          styleSrc: [
            "'self'", 
            "'unsafe-inline'", 
            "https://fonts.googleapis.com",
            "https://cdnjs.cloudflare.com"
          ],
          fontSrc: [
            "'self'", 
            "https://fonts.gstatic.com",
            "https://cdnjs.cloudflare.com"
          ],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: [
            "'self'", 
            "ws:", 
            "wss:",
            "https://securetoken.googleapis.com",
            "https://identitytoolkit.googleapis.com",
            "https://www.googleapis.com",
            "https://firebase.googleapis.com"
          ],
          workerSrc: ["'self'", "blob:"]
        }
      }
    }));
    
    app.use(compression());
    app.use(cors({ origin: true, credentials: true }));
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 1000,
      standardHeaders: true,
      legacyHeaders: false,
    });
    app.use(limiter);

    // CRITICAL: Health check endpoints for Cloud Run startup probes
    app.get('/health', (req, res) => {
      res.status(200).json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        port: process.env.PORT || (process.env.NODE_ENV === 'production' ? '8080' : '5000')
      });
    });

    app.get('/healthz', (req, res) => {
      res.status(200).json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString()
      });
    });

    // Session management
    app.use(session({
      secret: process.env.SESSION_SECRET || 'dev-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      }
    }));

    // Initialize Cloud SQL proxy for development - ESSENTIAL FOR OAKLAND COUGARS ACCESS
    const nodeEnv = process.env.NODE_ENV || 'development';
    if (nodeEnv === 'development') {
      logger.info('🔧 Starting Cloud SQL Auth Proxy for development...', {
        category: 'proxy_initialization',
        environment: 'development'
      });
      
      // Direct proxy startup - bypass module import issues
      const { spawn } = await import('child_process');
      const fs = await import('fs');
      
      try {
        // Ensure credentials file exists
        const credentialsContent = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
        const credentialsPath = '/tmp/cloudsql-credentials.json';
        
        if (credentialsContent) {
          fs.writeFileSync(credentialsPath, credentialsContent, { mode: 0o600 });
          logger.info('✅ Credentials file created for Cloud SQL proxy', {
            category: 'proxy_initialization',
            credentialsPath
          });
          
          // Start proxy process
          const proxyArgs = [
            `--instances=direct-glider-465821-p7:us-central1:realm-rivalry-dev=tcp:5432`,
            `--credential_file=${credentialsPath}`
          ];
          
          const proxyProcess = spawn('./cloud_sql_proxy', proxyArgs, {
            stdio: ['ignore', 'pipe', 'pipe'],
            detached: false
          });
          
          proxyProcess.stdout?.on('data', (data) => {
            logger.debug('Cloud SQL Proxy stdout', {
              category: 'proxy_output',
              output: data.toString().trim()
            });
          });
          
          proxyProcess.stderr?.on('data', (data) => {
            logger.warn('Cloud SQL Proxy stderr', {
              category: 'proxy_output',
              output: data.toString().trim()
            });
          });
          
          // Wait for proxy to be ready
          await new Promise(resolve => setTimeout(resolve, 3000));
          logger.info('✅ Cloud SQL Auth Proxy started successfully', {
            category: 'proxy_initialization',
            status: 'ready',
            target: 'Oakland Cougars database access'
          });
          
        } else {
          logger.warn('⚠️ No service account key found for Cloud SQL proxy', {
            category: 'proxy_initialization',
            issue: 'missing_credentials'
          });
        }
      } catch (error) {
        logger.error('⚠️ Failed to start Cloud SQL proxy', error as Error, {
          category: 'proxy_initialization',
          phase: 'startup'
        });
      }
    }

    // Database initialization (lazy - will initialize when first needed)
    logger.info('🔄 Database will initialize lazily when first accessed', {
      category: 'database_initialization',
      strategy: 'lazy_loading'
    });
    const { getPrismaClient } = await import('./database.js');
    
    // CRITICAL: Make database connection truly non-blocking for Cloud Run startup
    // Test connection asynchronously without blocking server startup
    getPrismaClient().then(() => {
      logger.info('✅ Database connection verified', {
        category: 'database_initialization',
        status: 'connected'
      });
    }).catch((error: Error) => {
      logger.warn('⚠️ Database will retry connection when needed', {
        category: 'database_initialization',
        status: 'retry_pending',
        error: error.message
      });
    });

    // CRITICAL FIX: Ensure API routes have absolute precedence over Vite
    app.use('/api', (req, res, next) => {
      // Mark this as an API request to prevent Vite interference
      res.locals.isApiRequest = true;
      res.setHeader('Content-Type', 'application/json');
      
      // Override any subsequent middleware that tries to change the response
      const originalSend = res.send;
      const originalJson = res.json;
      const originalEnd = res.end;
      
      res.send = function(body) {
        if (!this.headersSent) {
          this.setHeader('Content-Type', 'application/json');
        }
        return originalSend.call(this, body);
      };
      
      res.json = function(obj) {
        if (!this.headersSent) {
          this.setHeader('Content-Type', 'application/json');
        }
        return originalJson.call(this, obj);
      };
      
      // TODO: Fix res.end override - causing TypeScript compilation issues
      // res.end = function(chunk?: any, encoding?: BufferEncoding, cb?: () => void) {
      //   if (!this.headersSent && chunk && typeof chunk === 'object') {
      //     this.setHeader('Content-Type', 'application/json');
      //   }
      //   return originalEnd.call(this, chunk, encoding, cb);
      // };
      
      next();
    });
    
    // Register all API routes BEFORE Vite middleware
    logger.info('🔧 Registering API routes...', {
      category: 'api_routes',
      phase: 'registration'
    });
    const { registerAllRoutes } = await import('./routes/index.js');
    await registerAllRoutes(app);
    logger.info('✅ API routes registered successfully', {
      category: 'api_routes',
      phase: 'completed'
    });

    // Add final API protection middleware before Vite
    app.use('/api/*', (req, res, next) => {
      // If we get here, the API route wasn't found - return 404 JSON instead of letting Vite handle it
      if (!res.headersSent) {
        return res.status(404).json({ error: 'API endpoint not found', path: req.originalUrl });
      }
      next();
    });

    // Setup WebSocket servers with proper path separation
    logger.info('🔌 Initializing WebSocket servers...', {
      category: 'websocket_initialization',
      phase: 'starting'
    });
    
    // Initialize Socket.IO server for live matches and real-time features
    const { Server: SocketIOServer } = await import('socket.io');
    const io = new SocketIOServer(httpServer, {
      path: '/socket.io/',  // Explicit path to avoid conflicts
      cors: {
        origin: process.env.NODE_ENV === 'production' ? false : true,
        credentials: true
      },
      transports: ['websocket', 'polling']
    });
    
    // Setup Socket.IO WebSocket service
    const { setupWebSocketServer } = await import('./services/webSocketService.js');
    await setupWebSocketServer(io);
    logger.info('✅ Socket.IO server initialized successfully', {
      category: 'websocket_initialization',
      service: 'socket.io',
      path: '/socket.io/',
      transports: ['websocket', 'polling']
    });

    // Setup native WebSocket server for development only (to avoid conflicts)
    if (process.env.NODE_ENV !== 'production') {
      logger.info('🔧 Setting up development WebSocket manager...', {
        category: 'websocket_initialization',
        service: 'native_websocket',
        environment: 'development'
      });
      const { webSocketManager } = await import('./websocket/webSocketManager.js');
      webSocketManager.initialize(httpServer);
      logger.info('✅ Development WebSocket manager initialized', {
        category: 'websocket_initialization',
        service: 'native_websocket',
        path: '/ws',
        environment: 'development'
      });
    }

    // Setup Vite in development
    if (process.env.NODE_ENV !== 'production') {
      logger.info('🛠️ Setting up Vite development server...', {
        category: 'vite_setup',
        environment: 'development'
      });
      const { setupVite } = await import("./vite.js");
      await setupVite(app, httpServer);
      logger.info('✅ Vite development server configured', {
        category: 'vite_setup',
        status: 'ready'
      });
    }

    // Error handler (must be last)
    app.use((error: any, req: any, res: any, next: any) => {
      logger.error('❌ Server error occurred', error, {
        category: 'server_error',
        requestPath: req.path,
        method: req.method
      });
      res.status(500).json({ error: 'Internal server error' });
    });

    // Start server - Use different default ports for dev vs production
    const defaultPort = process.env.NODE_ENV === 'production' ? "8080" : "5000";
    const port = parseInt(process.env.PORT || defaultPort, 10);
    
    const host = process.env.HOST || "localhost";
    httpServer.listen(port, host, async () => {
      logger.info(`✅ Server running successfully`, {
        category: 'server_startup',
        host,
        port,
        environment: process.env.NODE_ENV || 'development',
        status: 'operational'
      });
      logger.info('🎯 All systems operational', {
        category: 'server_startup',
        phase: 'complete'
      });
      
      // Initialize automation services for game simulation
      try {
        logger.info('🚀 Starting season timing automation for game simulation...', {
          category: 'automation_startup',
          service: 'season_timing',
          gameType: 'dome_ball'
        });
        const { SeasonTimingAutomationService } = await import('./services/seasonTimingAutomationService.js');
        const automationService = SeasonTimingAutomationService.getInstance();
        await automationService.start();
        logger.info('✅ Season timing automation initialized successfully', {
          category: 'automation_startup',
          service: 'season_timing',
          schedule: '4-10 PM EDT',
          gameType: 'dome_ball',
          status: 'active'
        });
      } catch (error) {
        logger.error('⚠️ Season timing automation failed to start', error, {
          category: 'automation_startup',
          service: 'season_timing'
        });
      }

      // Initialize tournament automation 
      try {
        logger.info('🚀 Starting tournament automation for fully automated tournaments...', {
          category: 'automation_startup',
          service: 'tournament_automation',
          gameType: 'dome_ball'
        });
        const { UnifiedTournamentAutomation } = await import('./services/unifiedTournamentAutomation.js');
        UnifiedTournamentAutomation.initializeAutomation();
        logger.info('✅ Tournament automation initialized successfully', {
          category: 'automation_startup',
          service: 'tournament_automation',
          features: ['auto_start', 'auto_progress', 'auto_complete'],
          gameType: 'dome_ball',
          status: 'active'
        });
      } catch (error) {
        logger.error('⚠️ Tournament automation failed to start', error, {
          category: 'automation_startup',
          service: 'tournament_automation'
        });
      }
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('🔄 Shutting down gracefully...', {
        category: 'server_shutdown',
        signal: 'SIGTERM'
      });
      httpServer.close(() => {
        logger.info('✅ Server closed successfully', {
          category: 'server_shutdown',
          status: 'complete'
        });
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('🔄 Shutting down gracefully...', {
        category: 'server_shutdown',
        signal: 'SIGINT'
      });
      httpServer.close(() => {
        logger.info('✅ Server closed successfully', {
          category: 'server_shutdown',
          status: 'complete'
        });
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('💥 Server startup failed', error, {
      category: 'server_startup',
      phase: 'startup_failure'
    });
    process.exit(1);
  }
}

// Start the server
startServer();