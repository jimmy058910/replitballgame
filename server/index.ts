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

// Configure CORS with production-ready settings
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://realmrivalry.com', 'https://www.realmrivalry.com', 'https://realm-rivalry-o6fd46yesq-ul.a.run.app']
    : ['http://localhost:5000', 'http://localhost:3000', /\.replit\.dev$/],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}

app.use(cors(corsOptions));

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

// Add health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

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

  // Setup Google Auth to match production configuration (this includes passport setup)
  await setupGoogleAuth(app);

  // Register all modular routes
  registerAllRoutes(app);

  // Add explicit API route handling to prevent Vite interception
  app.use('/api/*', (req, res, next) => {
    console.warn(`Unmatched API route: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ 
      error: 'API endpoint not found',
      path: req.originalUrl,
      method: req.method
    });
  });

  // Create HTTP server instance from the Express app
  const httpServer = createServer(app);

  // Create Socket.IO server instance
  const io = new SocketIOServer(httpServer, {
    path: '/ws',
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Setup WebSocket server with Socket.IO
  await setupWebSocketServer(io);

  // Initialize the new WebSocket manager for live matches
  webSocketManager.initialize(httpServer);

  // Connect WebSocket service to match state manager
  matchStateManager.setWebSocketService(webSocketService);

  // Health check endpoint for Cloud Run
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV
    });
  });

  // Global error handler using centralized error service
  app.use(errorHandler);

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
    
    // SPA fallback for production
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ 
          error: 'API endpoint not found',
          path: req.path,
          method: req.method
        });
      }
      return res.sendFile(staticPath + '/index.html');
    });
  }

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
    
    // Initialize background services asynchronously (non-blocking)
    setImmediate(() => {
      initializeBackgroundServices().catch(error => {
        console.error('⚠️ Background initialization failed, but server remains operational:', error);
      });
    });
  });

  // Background initialization function - runs asynchronously after server starts
  async function initializeBackgroundServices() {
    console.log(`🔄 Starting background initialization...`);
    
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

    // Initialize match state recovery system with timeout
    await initWithTimeout('Match state recovery', async () => {
      await matchStateManager.recoverLiveMatches();
    });

    // Initialize season timing automation system with timeout
    await initWithTimeout('Season timing automation', async () => {
      const seasonTimingService = SeasonTimingAutomationService.getInstance();
      await seasonTimingService.start();
    });
      
    console.log(`✅ Background initialization completed`);
  }
})();
