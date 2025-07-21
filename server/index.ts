import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import session from 'express-session';
import passport from 'passport';
import { setupGoogleAuth } from "./googleAuth"; // Import our new Google Auth setup
import { registerAllRoutes } from "./routes/index";
import { setupVite, serveStatic, log } from "./vite";
import { requestIdMiddleware } from "./middleware/requestId";
import { errorHandler, logInfo } from "./services/errorService";
import { setupWebSocketServer, webSocketService } from "./services/webSocketService";
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
  // CRITICAL: Setup session middleware BEFORE Passport
  app.use(session({
    secret: process.env.SESSION_SECRET!, // The secret you stored in GCP
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Setup Google Auth using Passport
  setupGoogleAuth(app);

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

  // Connect WebSocket service to match state manager
  matchStateManager.setWebSocketService(webSocketService);

  // Global error handler using centralized error service
  app.use(errorHandler);

  // Vite setup with optimized static file serving
  if (app.get("env") === "development") {
    await setupVite(app, httpServer);
  } else {
    // Production static file serving with caching
    app.use(express.static('dist', {
      maxAge: '1y', // Cache static assets for 1 year
      etag: true,
      lastModified: true,
      setHeaders: (res, path) => {
        // Cache HTML files for shorter duration
        if (path.endsWith('.html')) {
          res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour
        }
      }
    }));
    serveStatic(app);
  }

  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  httpServer.listen({
    port,
    host: "0.0.0.0", // Important for Cloud Run
    reusePort: true,
  }, () => {
    log(`Server listening on port ${port}`);
    log(`WebSocket server listening on /ws`);
    
    // Do heavy initialization AFTER server is listening
    initializeBackgroundServices();
  });

  // Background initialization function
  async function initializeBackgroundServices() {
    try {
      log(`🔄 Starting background initialization...`);
      
      // Initialize match state recovery system
      log(`🔄 Initializing match state recovery system...`);
      await matchStateManager.recoverLiveMatches();

      // Initialize season timing automation system
      log(`🔄 Initializing season timing automation system...`);
      const seasonTimingService = SeasonTimingAutomationService.getInstance();
      await seasonTimingService.start();
      
      log(`✅ Background initialization completed`);
    } catch (error) {
      console.error('❌ Background initialization failed:', error);
    }
  }
})();
