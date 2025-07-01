import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http"; // Import createServer
import { setupAuth } from "./replitAuth"; // Import setupAuth
import { registerAllRoutes } from "./routes/index"; // Updated import
import { setupVite, serveStatic, log } from "./vite";
import { requestIdMiddleware } from "./middleware/requestId";
import { errorHandler, logInfo } from "./services/errorService";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add request ID middleware early in the chain
app.use(requestIdMiddleware);

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

  // Create HTTP server instance from the Express app
  const httpServer = createServer(app);

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
  });
})();
