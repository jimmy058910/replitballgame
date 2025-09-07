// Load environment variables first
import { config } from 'dotenv';
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file for local development
config({ path: path.join(__dirname, '..', '.env') });

import express from "express";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import session from "express-session";
import http from "http";
import fs from "fs";

// Main startup function
async function startServer() {
  try {
    console.log('🚀 Starting Realm Rivalry Server...');
    
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
      console.log('🔧 [PROXY INIT] Starting Cloud SQL Auth Proxy for development...');
      
      // Direct proxy startup - bypass module import issues
      const { spawn } = await import('child_process');
      const fs = await import('fs');
      
      try {
        // Ensure credentials file exists
        const credentialsContent = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
        const credentialsPath = '/tmp/cloudsql-credentials.json';
        
        if (credentialsContent) {
          fs.writeFileSync(credentialsPath, credentialsContent, { mode: 0o600 });
          console.log('✅ [PROXY INIT] Credentials file created');
          
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
            console.log(`📋 [PROXY] ${data.toString().trim()}`);
          });
          
          proxyProcess.stderr?.on('data', (data) => {
            console.log(`⚠️ [PROXY] ${data.toString().trim()}`);
          });
          
          // Wait for proxy to be ready
          await new Promise(resolve => setTimeout(resolve, 3000));
          console.log('✅ [PROXY INIT] Cloud SQL Auth Proxy started for Oakland Cougars access');
          
        } else {
          console.log('⚠️ [PROXY INIT] No service account key found');
        }
      } catch (error) {
        console.log('⚠️ [PROXY INIT] Failed to start proxy:', (error as Error).message);
      }
    }

    // Database initialization (lazy - will initialize when first needed)
    console.log('🔄 Database will initialize lazily when first accessed');
    const { getPrismaClient } = await import('./database.js');
    
    // CRITICAL: Make database connection truly non-blocking for Cloud Run startup
    // Test connection asynchronously without blocking server startup
    getPrismaClient().then(() => {
      console.log('✅ Database connection verified');
    }).catch((error: Error) => {
      console.log('⚠️ Database will retry connection when needed:', error.message);
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
    console.log('🔧 Registering API routes...');
    const { registerAllRoutes } = await import('./routes/index.js');
    await registerAllRoutes(app);
    console.log('✅ API routes registered');

    // Add final API protection middleware before Vite
    app.use('/api/*', (req, res, next) => {
      // If we get here, the API route wasn't found - return 404 JSON instead of letting Vite handle it
      if (!res.headersSent) {
        return res.status(404).json({ error: 'API endpoint not found', path: req.originalUrl });
      }
      next();
    });

    // Setup WebSocket servers with proper path separation
    console.log('🔌 Initializing WebSocket servers...');
    
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
    console.log('✅ Socket.IO server initialized on path /socket.io/');

    // Setup native WebSocket server for development only (to avoid conflicts)
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔧 Setting up development WebSocket manager...');
      const { webSocketManager } = await import('./websocket/webSocketManager.js');
      webSocketManager.initialize(httpServer);
      console.log('✅ Development WebSocket manager initialized on path /ws');
    }

    // Setup Vite in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('🛠️ Setting up Vite development server...');
      const { setupVite } = await import("./vite.js");
      await setupVite(app, httpServer);
      console.log('✅ Vite development server configured');
    }

    // Error handler (must be last)
    app.use((error: any, req: any, res: any, next: any) => {
      console.error('❌ Server error:', error);
      res.status(500).json({ error: 'Internal server error' });
    });

    // Start server - Use different default ports for dev vs production
    const defaultPort = process.env.NODE_ENV === 'production' ? "8080" : "5000";
    const port = parseInt(process.env.PORT || defaultPort, 10);
    
    const host = process.env.HOST || "localhost";
    httpServer.listen(port, host, async () => {
      console.log(`✅ Server running on ${host}:${port}`);
      console.log('🎯 All systems operational');
      
      // Initialize automation services for game simulation
      try {
        console.log('🚀 Starting season timing automation for game simulation...');
        const { SeasonTimingAutomationService } = await import('./services/seasonTimingAutomationService.js');
        const automationService = SeasonTimingAutomationService.getInstance();
        await automationService.start();
        console.log('✅ Season timing automation initialized - games will simulate 4-10 PM EDT');
      } catch (error) {
        console.error('⚠️ Season timing automation failed:', error);
      }

      // Initialize tournament automation 
      try {
        console.log('🚀 Starting tournament automation for fully automated tournaments...');
        const { UnifiedTournamentAutomation } = await import('./services/unifiedTournamentAutomation.js');
        UnifiedTournamentAutomation.initializeAutomation();
        console.log('✅ Tournament automation initialized - tournaments will start, progress, and complete automatically');
      } catch (error) {
        console.error('⚠️ Tournament automation failed:', error);
      }
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🔄 Shutting down gracefully...');
      httpServer.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('🔄 Shutting down gracefully...');
      httpServer.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('💥 Server startup failed:', error);
    process.exit(1);
  }
}

// Start the server
startServer();