import express from "express";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import session from "express-session";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Main startup function
async function startServer() {
  try {
    console.log('🚀 Starting Realm Rivalry Server...');
    
    const app = express();
    const httpServer = http.createServer(app);

    // Basic middleware
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "ws:", "wss:"]
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

    // Database initialization (lazy - will initialize when first needed)
    console.log('🔄 Database will initialize lazily when first accessed');
    const { getPrismaClient } = await import('./database.js');
    // Test database connection
    try {
      await getPrismaClient();
      console.log('✅ Database connection verified');
    } catch (error) {
      console.log('⚠️ Database will retry connection when needed:', error.message);
    }

    // Register all API routes BEFORE Vite middleware
    console.log('🔧 Registering API routes...');
    const { registerAllRoutes } = await import('./routes/index.js');
    await registerAllRoutes(app);
    console.log('✅ API routes registered');

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

    // Start server
    const port = parseInt(process.env.PORT || "5000", 10);
    
    httpServer.listen(port, "0.0.0.0", async () => {
      console.log(`✅ Server running on 0.0.0.0:${port}`);
      console.log('🎯 All systems operational');
      
      // Initialize background services
      try {
        const { initializeBackgroundServices } = await import('./services/backgroundServices.js');
        await initializeBackgroundServices();
        console.log('✅ Background services initialized');
      } catch (error) {
        console.error('⚠️ Background services failed:', error);
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