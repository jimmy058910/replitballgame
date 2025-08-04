import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import session from 'express-session';
import passport from 'passport';
import { setupGoogleAuth } from "./googleAuth"; // Import Google Auth setup
import { registerAllRoutes } from "./routes/index";
import { setupVite, serveStatic, log } from "./vite";
import { requestIdMiddleware } from "./middleware/requestId";
import { errorHandler, logInfo } from "./services/errorService";
import { setupWebSocketServer, webSocketService } from "./services/webSocketService";
import { webSocketManager } from "./websocket/webSocketManager";
import { matchStateManager } from "./services/matchStateManager";
import { SeasonTimingAutomationService } from "./services/seasonTimingAutomationService";
import logger from "./utils/logger";
import { validateOrigin } from "./utils/security";
import { sanitizeInputMiddleware, securityHeadersMiddleware } from "./middleware/security";
import { createHealthCheck } from "./health";

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
app.get('/api/firebase-debug', (req: Request, res: Response) => {
  try {
    const admin = require('firebase-admin');
    const hasApp = admin.apps.length > 0;
    const app = hasApp ? admin.app() : null;
    
    res.json({
      firebaseAdminStatus: hasApp ? 'initialized' : 'not-initialized',
      projectId: app?.options?.projectId || 'not-set',
      timestamp: new Date().toISOString(),
      version: '6.18.0-FIREBASE-DEBUG-AUG4',
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT || 'not-set',
        VITE_FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID || 'not-set'
      },
      message: 'Firebase Admin SDK diagnostic endpoint for authentication debugging'
    });
  } catch (error) {
    res.status(500).json({
      firebaseAdminStatus: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
      version: '6.18.0-FIREBASE-DEBUG-AUG4'
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

// Add health check endpoint early - critical for Cloud Run  
app.get('/health', createHealthCheck());
app.get('/api/health', createHealthCheck());

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

  // CRITICAL: Initialize authentication BEFORE registering API routes
  console.log('🔐 Setting up Google OAuth authentication system before API routes...');
  await setupGoogleAuth(app);
  console.log('✅ Authentication system initialized before API routes');

  // CRITICAL FIX: Pre-register API routes after auth setup but before Vite
  console.log('🔧 Pre-registering API routes before Vite setup...');
  registerAllRoutes(app);
  console.log('✅ API routes pre-registered before Vite');

  // Vite setup with optimized static file serving
  if (app.get("env") === "development") {
    await setupVite(app, httpServer);
  } else {
    // Production static file serving with caching
    const staticPath = process.cwd() + '/dist';
    console.log('📁 Serving static files from:', staticPath);
    
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
    
    // SPA fallback for production - CRITICAL FIX: Exclude all API endpoints
    app.get('*', (req, res) => {
      console.log(`🔍 Production fallback route: ${req.method} ${req.path}`);
      
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
      
      console.log(`✅ Serving frontend HTML for: ${req.path}`);
      return res.sendFile(staticPath + '/index.html');
    });
  }

  // CRITICAL: Error handler MUST be last in middleware chain
  app.use(errorHandler);
  console.log('✅ Error handler added as final middleware');

  const port = process.env.PORT ? parseInt(process.env.PORT) : (process.env.NODE_ENV === 'production' ? 8080 : 5000);
  
  // Start server immediately - don't wait for background services
  httpServer.listen({
    port,
    host: "0.0.0.0", // Important for Cloud Run
    reusePort: true,
  }, () => {
    console.log(`✅ Server listening on port ${port}`);
    console.log(`✅ WebSocket server listening on /ws`);
    console.log(`✅ Health check available at /health`);
    
    // Initialize remaining services asynchronously (non-blocking)
    setImmediate(() => {
      initializeRemainingServices().catch(error => {
        console.error('⚠️ Service initialization failed, but server remains operational:', error);
      });
    });
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
      matchStateManager.setWebSocketService(webSocketService);
    }, 10000);

    // Initialize match state recovery system with timeout
    await initWithTimeout('Match state recovery', async () => {
      await matchStateManager.recoverLiveMatches();
    }, 15000);

    // Initialize season timing automation system with timeout
    await initWithTimeout('Season timing automation', async () => {
      const seasonTimingService = SeasonTimingAutomationService.getInstance();
      await seasonTimingService.start();
    }, 15000);
      
    console.log(`✅ All services initialized`);
  }
})();
