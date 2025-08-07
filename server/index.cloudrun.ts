import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import session from 'express-session';
import passport from 'passport';
import { setupGoogleAuth } from "./googleAuth";
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
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add health check endpoint immediately - critical for Cloud Run startup
app.get('/health', createHealthCheck());
app.get('/', (req, res) => {
  res.status(200).json({ status: 'Realm Rivalry Server Starting', port: process.env.PORT || 5000 });
});

// Basic middleware
app.use(requestIdMiddleware);
app.use(securityHeadersMiddleware);
app.use(sanitizeInputMiddleware);

// Simplified helmet for Cloud Run
app.use(helmet({
  contentSecurityPolicy: false, // Disable for faster startup
  hsts: false // Disable for faster startup
}));

// Basic rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Start server IMMEDIATELY to pass Cloud Run health check
const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// Start listening immediately
httpServer.listen({
  port,
  host: "0.0.0.0",
}, () => {
  console.log(`✅ Server listening on port ${port} (Cloud Run ready)`);
  
  // Do heavy initialization AFTER server starts listening
  initializeApplication();
});

async function initializeApplication() {
  try {
    console.log('🔄 Starting background initialization...');
    
    // Session setup
    app.use(session({
      secret: process.env.SESSION_SECRET || 'fallback-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
      }
    }));
    
    app.use(passport.initialize());
    app.use(passport.session());
    
    // Setup Google Auth
    await setupGoogleAuth(app);
    
    // Register API routes
    registerAllRoutes(app);
    
    // Setup WebSocket
    await setupWebSocketServer(io);
    matchStateManager.setWebSocketService(webSocketService);
    
    // Initialize match recovery (in background)
    setTimeout(async () => {
      try {
        console.log('🔄 Starting match recovery...');
        await matchStateManager.recoverLiveMatches();
        console.log('✅ Match recovery completed');
      } catch (error) {
        console.error('❌ Match recovery failed:', error);
      }
    }, 5000);
    
    // Initialize season timing (in background) 
    setTimeout(async () => {
      try {
        console.log('🔄 Starting season timing...');
        const seasonTimingService = SeasonTimingAutomationService.getInstance();
        await seasonTimingService.start();
        console.log('✅ Season timing completed');
      } catch (error) {
        console.error('❌ Season timing failed:', error);
      }
    }, 10000);
    
    // Error handler
    app.use(errorHandler);
    
    // Static files
    if (app.get("env") !== "development") {
      serveStatic(app);
    }
    
    console.log('✅ Background initialization completed');
    
  } catch (error) {
    console.error('❌ Application initialization failed:', error);
  }
}