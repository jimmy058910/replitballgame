import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http"; // Import createServer
import { setupAuth } from "./replitAuth"; // Import setupAuth
import { registerAllRoutes } from "./routes/index"; // Updated import
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging middleware (remains the same)
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
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
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

  // Global error handler (remains the same)
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Global error handler caught:", err); // Added more logging
    res.status(status).json({ message, error: err.stack }); // Include stack in dev
    // throw err; // Re-throwing might terminate the process if unhandled by server framework
  });

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
