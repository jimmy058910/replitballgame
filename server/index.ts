// CRITICAL: Import Sentry instrumentation FIRST
import "./instrument.js";
import * as Sentry from "@sentry/node";

// CLOUD RUN LOGGING: Add immediate logging for container startup debugging
console.log(`🚀 STARTING APPLICATION CONTAINER - PID: ${process.pid}`);
console.log(`🔍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔍 Port: ${process.env.PORT || 'NOT_SET'}`);
console.log(`🔍 Platform: ${process.platform}, Node: ${process.version}`);
console.log(`🔍 Memory: ${JSON.stringify(process.memoryUsage())}`);
console.log(`🔍 Working Directory: ${process.cwd()}`);
console.log(`⏰ Container startup timestamp: ${new Date().toISOString()}`);

import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import session from 'express-session';
import passport from 'passport';
import { setupGoogleAuth } from "./googleAuth.js"; // Import Google Auth setup
import { registerAllRoutes } from "./routes/index.js";
// PRODUCTION FIX: Use dynamic imports to avoid loading Vite in production
// import { setupVite, serveStatic, log } from "./vite.js"; // Moved to dynamic import below
import { requestIdMiddleware } from "./middleware/requestId.js";
import { errorHandler, logInfo } from "./services/errorService.js";
import { setupWebSocketServer, webSocketService } from "./services/webSocketService.js";
import { webSocketManager } from "./websocket/webSocketManager.js";
// CRITICAL FIX: Remove database service imports - they cause startup crashes
// import { matchStateManager } from "./services/matchStateManager.js"; 
// import { SeasonTimingAutomationService } from "./services/seasonTimingAutomationService.js";
import logger from "./utils/logger.js";
import { validateOrigin } from "./utils/security.js";
import { sanitizeInputMiddleware, securityHeadersMiddleware } from "./middleware/security.js";
import { createHealthCheck, createBasicHealthCheck, createDetailedHealthCheck } from "./health.js";

const app = express();

// BULLETPROOF CORS Configuration - Industry Standard
// Detect production environment using multiple reliable methods
const isProduction = process.env.NODE_ENV === 'production' || 
                    process.env.PORT === '8080' || // Cloud Run uses port 8080
                    process.env.GOOGLE_CLOUD_PROJECT || // Google Cloud environment
                    process.env.K_SERVICE; // Cloud Run service name

const corsOptions = {
  origin: isProduction
    ? [
        'https://realmrivalry.com', 
        'https://www.realmrivalry.com', 
        'https://realm-rivalry-o6fd46yesq-ul.a.run.app',
        'https://direct-glider-465821-p7.web.app', // Firebase hosting domain
        'https://direct-glider-465821-p7.firebaseapp.com', // Firebase app domain
        // Additional safety: allow Cloud Run internal communication
        /^https:\/\/.*\.a\.run\.app$/
      ]
    : [
        'http://localhost:5000', 
        'http://localhost:3000', 
        /\.replit\.dev$/,
        /^https?:\/\/.*replit.*$/
      ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cache-Control']
}

// Debug CORS configuration with comprehensive environment detection
console.log('🔍 COMPREHENSIVE CORS CONFIGURATION:', {
  NODE_ENV: process.env.NODE_ENV || 'not-set',
  PORT: process.env.PORT || 'not-set',
  GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT || 'not-set',
  K_SERVICE: process.env.K_SERVICE || 'not-set',
  isProduction: isProduction,
  allowedOrigins: corsOptions.origin,
  corsMethodsAllowed: corsOptions.methods
});

// Additional startup debugging
console.log('🚀 SERVER STARTUP DEBUG:', {
  nodeVersion: process.version,
  platform: process.platform,
  architecture: process.arch,
  memoryUsage: process.memoryUsage(),
  currentWorkingDir: process.cwd(),
  environmentVariablesCount: Object.keys(process.env).length
});

// Apply CORS as the first middleware to ensure it works
app.use(cors(corsOptions));

// FIREBASE ADMIN SDK DEBUG ENDPOINT - Test authentication system
app.get('/api/firebase-debug', async (req: Request, res: Response) => {
  try {
    // Import from the same middleware where Firebase is already initialized
    const firebaseAuth = await import('./middleware/firebaseAuth');
    const status = { firebaseAdminStatus: 'initialized' }; // Simplified status check
    
    res.json({
      ...status,
      timestamp: new Date().toISOString(),
      version: '6.22.0-CORS-FIREBASE-DOMAINS-AUG4',
      message: 'Firebase Admin SDK diagnostic endpoint for authentication debugging'
    });
  } catch (error) {
    res.status(500).json({
      firebaseAdminStatus: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      version: '6.22.0-CORS-FIREBASE-DOMAINS-AUG4'
    });
  }
});

// NUCLEAR DEPLOYMENT TEST - Unique timestamped endpoint to prove deployment
app.get('/NUCLEAR_TEST_050630', (req: Request, res: Response) => {
  res.json({
    NUCLEAR_SUCCESS: 'UNIQUE_TIMESTAMPED_CODE_DEPLOYED',
    createdAt: '2025-08-03T05:06:30Z',
    timestamp: new Date().toISOString(),
    version: '4.0.0-DEPLOYMENT-CONFIRMED',
    uniqueId: 'NUCLEAR-050630-AUG3-2025',
    message: 'This unique endpoint was created at 05:06:30 UTC and proves new code is deployed'
  });
});

// CRITICAL DEBUG ENDPOINT - Verify code deployment
app.get('/api/deployment-verification', (req: Request, res: Response) => {
  res.json({
    deploymentStatus: 'ENHANCED_DEBUGGING_ACTIVE',
    timestamp: new Date().toISOString(),
    buildVersion: '4.0.0-DEPLOYMENT-CONFIRMED',
    environmentDetection: {
      NODE_ENV: process.env.NODE_ENV || 'missing',
      PORT: process.env.PORT || 'missing',
      GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT || 'missing',
      K_SERVICE: process.env.K_SERVICE || 'missing'
    },
    corsConfiguration: {
      isProduction: isProduction,
      allowedOrigins: corsOptions.origin,
      methods: corsOptions.methods
    }
  });
});

// Add CORS debug middleware with comprehensive tracking
app.use((req: Request, res: Response, next: NextFunction) => {
  const afterHeaders = () => {
    console.log('🔍 CORS REQUEST DEBUG:', {
      origin: req.headers.origin || 'no-origin',
      method: req.method,
      path: req.path,
      corsOriginHeader: res.getHeaders()['access-control-allow-origin'] || 'MISSING',
      corsCredentialsHeader: res.getHeaders()['access-control-allow-credentials'] || 'MISSING',
      corsMethodsHeader: res.getHeaders()['access-control-allow-methods'] || 'MISSING',
      allCorsHeaders: Object.keys(res.getHeaders()).filter(h => h.startsWith('access-control'))
    });
  };
  
  // Log after response is sent
  res.on('finish', afterHeaders);
  next();
});

// Additional CORS preflight handler for complex requests
app.options('*', cors(corsOptions));

// Enable compression for all responses
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req: Request, res: Response) => {
    if (req.headers['x-no-compression']) {
      return false
    }
    return compression.filter(req, res)
  }
}));

// Sentry middleware setup - use manual instrumentation for Express
// Sentry.init() was already called in instrument.ts

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Global BigInt serialization handling for all JSON responses
app.use((req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json;
  
  res.json = function(obj: any) {
    // Comprehensive BigInt serialization
    function serializeBigIntValues(value: any): any {
      if (value === null || value === undefined) return value;
      
      if (typeof value === 'bigint') {
        return value.toString();
      }
      
      if (Array.isArray(value)) {
        return value.map(serializeBigIntValues);
      }
      
      if (typeof value === 'object') {
        const serialized: any = {};
        for (const [key, val] of Object.entries(value)) {
          serialized[key] = serializeBigIntValues(val);
        }
        return serialized;
      }
      
      return value;
    }
    
    const serializedObj = serializeBigIntValues(obj);
    return originalJson.call(this, serializedObj);
  };
  
  next();
});

// CRITICAL CLOUD RUN HEALTH ENDPOINTS - Must be first for startup probe success
app.get('/health', createBasicHealthCheck()); // Basic health for startup probes
app.get('/healthz', createBasicHealthCheck()); // Cloud Run startup probe endpoint (CRITICAL)
app.get('/readyz', createBasicHealthCheck()); // Kubernetes-style readiness probe
app.get('/api/health', createDetailedHealthCheck()); // Detailed health with database info

// Ultra-fast ping endpoint for Cloud Run (minimal response time)
app.get('/ping', (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.status(200).send('OK');
});

// REMOVED DUPLICATE ENDPOINT - was conflicting with nuclear test above

// Deployment verification API endpoint
app.get('/api/deployment-verification', (req, res) => {
  res.status(200).json({
    deploymentStatus: 'ENHANCED_CODE_CONFIRMED',
    corsConfigured: true,
    environmentDebugging: true,
    version: '4.0.0-DEPLOYMENT-CONFIRMED',
    timestamp: new Date().toISOString()
  });
});

// Remove root route that was blocking Vite frontend serving

// Add request ID middleware early in the chain
app.use(requestIdMiddleware);

// Add logging middleware to track all requests
app.use((req, res, next) => {
  console.log(`📍 ${req.method} ${req.path} - Body:`, req.body);
  next();
});

// Add security middleware
app.use(securityHeadersMiddleware);
app.use(sanitizeInputMiddleware);

// Add logging middleware after sanitization
app.use((req, res, next) => {
  if (req.path.includes('/formation')) {
    console.log(`🔍 After sanitization - ${req.method} ${req.path} - Body:`, req.body);
  }
  next();
});

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://js.stripe.com"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "wss:", "ws:", "https://api.stripe.com", "https://accounts.google.com"],
      frameSrc: ["https://js.stripe.com", "https://hooks.stripe.com", "https://accounts.google.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: []
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  crossOriginEmbedderPolicy: false
}));

// Rate limiting for API endpoints
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased from 100 to 500 for development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Production-optimized caching and CORS headers
app.use((req, res, next) => {
  // Only cache-bust in development
  if (process.env.NODE_ENV === 'development') {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '0');
  }

  const origin = req.headers.origin;
  if (validateOrigin(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  next();
});

// API response caching middleware
app.use('/api', (req, res, next) => {
  if (req.method === 'GET' && process.env.NODE_ENV === 'production') {
    // Cache GET requests for 5 minutes in production
    res.set({
      'Cache-Control': 'private, max-age=300',
      'ETag': `"${req.url}-${Date.now()}"`,
      'Last-Modified': new Date().toUTCString()
    });
  }
  next();
});

// Health endpoint already registered above with enhanced debugging

(async () => {
  // Setup session management with detailed logging
  console.log('🔧 Setting up session management...');
  app.use(session({
    secret: process.env.SESSION_SECRET || 'default-secret-key',
    resave: false,
    saveUninitialized: false,
    name: 'realm-rivalry.sid', // Custom session name
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
  }));
  
  // Add session debugging middleware
  app.use((req, res, next) => {
    if (req.path.includes('/auth') || req.path.includes('/api/me')) {
      console.log(`🔍 Session info for ${req.path}:`, {
        sessionID: req.sessionID,
        isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
        user: req.user ? { userId: (req.user as any).userId } : null
      });
    }
    next();
  });

  // Create HTTP server instance from the Express app
  const httpServer = createServer(app);

  // Remove duplicate health endpoint - already defined above

  // CRITICAL: Initialize authentication BEFORE registering API routes (with error handling)
  console.log('🔐 Setting up Google OAuth authentication system before API routes...');
  try {
    await setupGoogleAuth(app);
    console.log('✅ Authentication system initialized before API routes');
  } catch (error) {
    console.error('⚠️ Authentication setup failed, continuing with basic setup:', error);
    // Continue startup even if auth setup fails to prevent container startup blocking
  }

  // CRITICAL FIX: Pre-register API routes after auth setup but before Vite
  console.log('🔧 Pre-registering API routes before Vite setup...');
  registerAllRoutes(app);
  console.log('✅ API routes pre-registered before Vite');

  // Add Sentry test endpoint
  app.get("/api/debug-sentry", (req, res) => {
    throw new Error("Test Sentry error monitoring!");
  });

  // PRODUCTION FIX: Dynamic imports and correct file paths
  const isProduction = process.env.NODE_ENV === 'production';
  console.log(`🔍 Environment mode: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  
  if (!isProduction) {
    console.log('🔧 Loading Vite dev server...');
    const { setupVite } = await import("./vite");
    await setupVite(app, httpServer);
    console.log('✅ Vite dev server started');
  } else {
    // PRODUCTION: Serve pre-built static files
    const staticPath = '/app/dist/public'; // Correct Docker container path
    console.log('📁 PRODUCTION: Serving static files from:', staticPath);
    
    app.use(express.static(staticPath, {
      maxAge: '1d', // Cache static assets for 1 day  
      etag: true,
      lastModified: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else if (filePath.match(/\.(js|css|png|jpg|svg|ico)$/)) {
          res.setHeader('Cache-Control', 'public, max-age=86400');
        }
      }
    }));
    
    // PRODUCTION: SPA fallback - serve index.html for client-side routing
    app.get('*', (req, res) => {
      console.log(`🔍 PRODUCTION fallback route: ${req.method} ${req.path}`);
      
      // CRITICAL: Exclude ALL API routes, health checks, and deployment tests
      if (req.path.startsWith('/api/') || 
          req.path.startsWith('/health') || 
          req.path.startsWith('/NUCLEAR_TEST_') ||
          req.path.startsWith('/DEPLOYMENT_TEST_') ||
          req.path.startsWith('/ws')) {
        console.log(`❌ API endpoint not found: ${req.path}`);
        return res.status(404).json({ 
          error: 'API endpoint not found',
          path: req.path,
          method: req.method,
          note: 'This endpoint should have been handled by API routes registered earlier'
        });
      }
      
      // Serve index.html for client-side routing
      const indexPath = '/app/dist/public/index.html';
      console.log(`📄 PRODUCTION: Serving index.html from: ${indexPath} for route: ${req.path}`);
      res.sendFile(indexPath);
    });
  }

  // Sentry error handler is automatically set up by expressIntegration
  
  // CRITICAL: Error handler MUST be last in middleware chain
  app.use(errorHandler);
  console.log('✅ Error handler added as final middleware');

  // CRITICAL CLOUD RUN FIX: MUST use PORT environment variable set by Cloud Run
  const port = parseInt(process.env.PORT || "5000", 10);
  
  console.log('🔍 CRITICAL PORT BINDING DEBUG:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT_ENV_VAR: process.env.PORT,
    FINAL_PORT: port,
    HOST_ENV_VAR: process.env.HOST,
    BINDING_HOST: '0.0.0.0'
  });
  
  // COMPREHENSIVE CLOUD RUN DEBUGGING: Enhanced error handling and logging
  console.log('🔍 ATTEMPTING TO BIND SERVER:', {
    host: '0.0.0.0',
    port: port,
    environment: process.env.NODE_ENV,
    processId: process.pid,
    platform: process.platform,
    nodeVersion: process.version
  });

  httpServer.on('error', (error: any) => {
    console.error('❌ CRITICAL SERVER ERROR:', error);
    console.error('Server failed to start. Error details:', {
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      address: error.address,
      port: error.port,
      message: error.message,
      name: error.name
    });
    process.exit(1);
  });

  // CRITICAL CLOUD RUN FIX: Configure server timeout for Cloud Run compatibility
  httpServer.setTimeout(0); // Disable server timeout - let Cloud Run handle timeouts
  httpServer.keepAliveTimeout = 120000; // 2 minutes keep-alive
  httpServer.headersTimeout = 120000; // 2 minutes header timeout

  // ENHANCED CLOUD RUN STARTUP: Add immediate health check response capability
  console.log('🚀 CRITICAL: Starting server with enhanced Cloud Run compatibility...');

  httpServer.listen({
    port,
    host: "0.0.0.0", // CRITICAL: Must bind to 0.0.0.0 for Cloud Run
    reusePort: true,
  }, () => {
    console.log(`✅ SERVER SUCCESSFULLY BOUND TO PORT ${port}`);
    console.log(`✅ Health check available at /health`);
    console.log(`✅ Cloud Run startup probe endpoint: /healthz`);
    
    // CRITICAL: Enhanced Cloud Run debugging
    if (process.env.NODE_ENV === 'production') {
      console.log('🔍 COMPREHENSIVE CLOUD RUN DEBUG:', {
        server: {
          bindingHost: '0.0.0.0',
          bindingPort: port,
          actualPort: port,
          portFromEnv: process.env.PORT,
          listening: true
        },
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          PORT: process.env.PORT,
          GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
          K_SERVICE: process.env.K_SERVICE,
          K_REVISION: process.env.K_REVISION
        },
        secrets: {
          DATABASE_URL_PRODUCTION: !!process.env.DATABASE_URL_PRODUCTION,
          VITE_FIREBASE_API_KEY: !!process.env.VITE_FIREBASE_API_KEY,
          VITE_FIREBASE_PROJECT_ID: !!process.env.VITE_FIREBASE_PROJECT_ID,
          GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
          GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET
        },
        process: {
          pid: process.pid,
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage()
        }
      });
    }
    
    // Test health endpoint immediately after binding
    console.log('🔍 TESTING HEALTH ENDPOINT IMMEDIATELY...');
    setTimeout(() => {
      const testReq = http.get(`http://localhost:${port}/healthz`, (res: any) => {
        console.log(`✅ HEALTH ENDPOINT TEST: Status ${res.statusCode}`);
      }).on('error', (err: any) => {
        console.error('❌ HEALTH ENDPOINT TEST FAILED:', err.message);
      });
    }, 1000);
    
    // Initialize services in background (delayed to ensure startup probes pass first)
    console.log('🚀 Starting background service initialization');
    setTimeout(() => {
      initializeRemainingServices().catch(error => {
        console.error('⚠️ Service initialization failed, but server remains operational:', error);
      });
    }, 3000); // Delay background services to let startup probes succeed first
  });

  // Initialize remaining services asynchronously after server starts
  async function initializeRemainingServices() {
    console.log(`🔄 Starting service initialization...`);
    
    // Initialize services with timeout and error isolation
    const initWithTimeout = async (name: string, initFn: () => Promise<void>, timeoutMs = 30000) => {
      try {
        await Promise.race([
          initFn(),
          new Promise((_, reject) => setTimeout(() => reject(new Error(`${name} timeout`)), timeoutMs))
        ]);
        console.log(`✅ ${name} initialized successfully`);
      } catch (error) {
        console.error(`⚠️ ${name} initialization failed:`, error);
        // Continue with other services even if one fails
      }
    };

    // Authentication already initialized before API routes - no need to reinitialize

    // Routes already pre-registered before Vite - no need to register again

    // Setup WebSocket services
    await initWithTimeout('WebSocket services', async () => {
      const io = new SocketIOServer(httpServer, {
        path: '/ws',
        cors: {
          origin: "*",
          methods: ["GET", "POST"]
        }
      });
      
      await setupWebSocketServer(io);
      webSocketManager.initialize(httpServer);
      
      // CRITICAL FIX: Dynamic import for database services
      const { matchStateManager } = await import('./services/matchStateManager');
      matchStateManager.setWebSocketService(webSocketService);
    }, 10000);

    // Initialize match state recovery system with timeout (DYNAMIC IMPORT)
    await initWithTimeout('Match state recovery', async () => {
      const { matchStateManager } = await import('./services/matchStateManager');
      await matchStateManager.recoverLiveMatches();
    }, 15000);

    // Initialize season timing automation system with timeout (DYNAMIC IMPORT)
    await initWithTimeout('Season timing automation', async () => {
      const { SeasonTimingAutomationService } = await import('./services/seasonTimingAutomationService');
      const seasonTimingService = SeasonTimingAutomationService.getInstance();
      await seasonTimingService.start();
    }, 15000);
      
    console.log(`✅ All services initialized`);
  }

  // CRITICAL CLOUD RUN FIX: Add proper SIGTERM handling for graceful shutdown
  process.on('SIGTERM', () => {
    console.log('🔄 SIGTERM received, shutting down gracefully...');
    httpServer.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error('❌ Forced shutdown due to timeout');
      process.exit(1);
    }, 10000);
  });

  process.on('SIGINT', () => {
    console.log('🔄 SIGINT received, shutting down gracefully...');
    httpServer.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });
  });

  // Handle uncaught exceptions to prevent container crashes
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    // Log but don't exit - let Cloud Run handle it
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    // Log but don't exit - let Cloud Run handle it
  });
})();
