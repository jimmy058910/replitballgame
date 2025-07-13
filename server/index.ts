import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http"; // Import createServer
import { Server as SocketIOServer } from "socket.io";
import { setupAuth } from "./replitAuth"; // Import setupAuth
import { registerAllRoutes } from "./routes/index"; // Updated import
import { setupVite, serveStatic, log } from "./vite";
import { requestIdMiddleware } from "./middleware/requestId";
import { errorHandler, logInfo } from "./services/errorService";
import { setupWebSocketServer, webSocketService } from "./services/webSocketService";
import { matchStateManager } from "./services/matchStateManager";
import { SeasonTimingAutomationService } from "./services/seasonTimingAutomationService";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add request ID middleware early in the chain
app.use(requestIdMiddleware);

// Add cache-busting and CORS headers for Replit preview
app.use((req, res, next) => {
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

// Health check endpoint for Replit preview detection
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Enhanced logging middleware with structured logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Create structured log entry
      const logData: any = {
        method: req.method,
        path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        requestId: req.requestId,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        userId: (req as any).user?.claims?.sub || undefined
      };

      // Include response preview for non-sensitive endpoints
      if (capturedJsonResponse && res.statusCode < 400) {
        let responsePreview = JSON.stringify(capturedJsonResponse);
        if (responsePreview.length > 100) {
          responsePreview = responsePreview.slice(0, 97) + "...";
        }
        logData.response = responsePreview;
      }

      // Log using structured logging if we have error service, otherwise fallback
      if (process.env.NODE_ENV === 'production') {
        logInfo(`${req.method} ${path} ${res.statusCode} in ${duration}ms`, logData);
      } else {
        // Development fallback to original format
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }
        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "…";
        }
        log(logLine);
      }
    }
  });

  next();
});

(async () => {
  // Setup Replit Auth first
  await setupAuth(app);

  // Register all modular routes
  registerAllRoutes(app);

  // Add explicit API route handling to prevent Vite interception
  app.use('/api/*', (req, res, next) => {
    // If we reach here, it means no API route matched
    // This should not happen with proper route registration
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
    await setupVite(app, httpServer); // Pass httpServer to setupVite
  } else {
    serveStatic(app);
  }

  const port = 5000;
  httpServer.listen({ // Use httpServer to listen
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`Server listening on port ${port}`);
    log(`WebSocket server listening on /ws`);
  });
})();
