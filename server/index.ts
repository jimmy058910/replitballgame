import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
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

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

// Add cache-busting and secure CORS headers for Replit preview
app.use((req, res, next) => {
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');

  const origin = req.headers.origin;
  if (validateOrigin(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
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

  // Initialize match state recovery system
  log(`🔄 Initializing match state recovery system...`);
  await matchStateManager.recoverLiveMatches();

  // Initialize season timing automation system
  log(`🔄 Initializing season timing automation system...`);
  const seasonTimingService = SeasonTimingAutomationService.getInstance();
  await seasonTimingService.start();

  // Global error handler using centralized error service
  app.use(errorHandler);

  // Vite setup (remains similar, but uses httpServer)
  if (app.get("env") === "development") {
    await setupVite(app, httpServer);
  } else {
    serveStatic(app);
  }

  const port = 5000;
  httpServer.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`Server listening on port ${port}`);
    log(`WebSocket server listening on /ws`);
  });
})();
