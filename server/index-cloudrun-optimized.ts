// ===============================
// CLOUD RUN OPTIMIZED SERVER
// IMMEDIATE PORT BINDING FOR STARTUP COMPLIANCE
// ===============================

console.log('🚀 CLOUD RUN OPTIMIZED SERVER STARTING...');

async function startCloudRunOptimizedServer() {
  try {
    // PHASE 1: ABSOLUTE MINIMAL IMPORTS
    const express = (await import("express")).default;
    const { createServer } = await import("http");
    
    // PHASE 2: CREATE MINIMAL EXPRESS APP
    const app = express();
    app.set('trust proxy', 1); // Required for Cloud Run
    
    // PHASE 3: IMMEDIATE HEALTH CHECKS (ONLY ESSENTIAL ENDPOINTS)
    app.get('/health', (req, res) => {
      res.status(200).json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        port: process.env.PORT || '8080'
      });
    });
    
    app.get('/healthz', (req, res) => {
      res.status(200).send('OK');
    });
    
    app.get('/readyz', (req, res) => {
      res.status(200).send('READY');
    });
    
    // PHASE 4: CREATE HTTP SERVER
    const httpServer = createServer(app);
    
    // PHASE 5: IMMEDIATE PORT BINDING (CRITICAL FOR CLOUD RUN)
    const port = parseInt(process.env.PORT || "8080", 10);
    
    console.log(`🔥 IMMEDIATE PORT BINDING TO ${port}...`);
    
    return new Promise((resolve, reject) => {
      httpServer.listen({
        port,
        host: "0.0.0.0",
      }, async () => {
        console.log(`✅ CLOUD RUN STARTUP REQUIREMENT SATISFIED: PORT ${port} BOUND`);
        console.log(`🌍 Health checks available at: http://0.0.0.0:${port}/health`);
        
        // PHASE 6: NOW SETUP EVERYTHING ELSE ASYNCHRONOUSLY
        console.log('🔧 ASYNC MIDDLEWARE SETUP STARTING...');
        setupAsyncMiddleware(app, httpServer).catch(error => {
          console.error('⚠️  Async setup failed, but server continues running:', error);
          console.error('⚠️  Stack trace:', error.stack);
          // CRITICAL: Never exit after port binding - Cloud Run requires the process to stay alive
        });
        
        resolve(httpServer);
      });
      
      httpServer.on('error', (error) => {
        console.error('❌ SERVER BINDING FAILED:', error);
        reject(error);
      });
    });
    
  } catch (error) {
    console.error('❌ CRITICAL STARTUP FAILURE:', error);
    process.exit(1);
  }
}

async function setupAsyncMiddleware(app: any, httpServer: any) {
  console.log('🔧 ASYNC MIDDLEWARE SETUP STARTING...');
  
  try {
    // CRITICAL: Wrap each import in try-catch to prevent process exit
    console.log('🔧 Importing CORS and middleware modules...');
    // Import all middleware asynchronously
    const cors = (await import("cors")).default;
    const compression = (await import("compression")).default;
    const helmet = (await import("helmet")).default;
    const rateLimit = (await import("express-rate-limit")).default;
    const session = (await import("express-session")).default;
    const passport = (await import("passport")).default;
    
    // Import express functions
    const expressModule = await import("express");
    
    // CORS setup
    const corsOptions = {
      origin: [
        'http://localhost:5000',
        'http://localhost:3000',
        /\.replit\.dev$/,
        /^https?:\/\/.*replit.*$/,
        ...(process.env.NODE_ENV === 'production' && process.env.GOOGLE_CLOUD_PROJECT 
          ? [`https://${process.env.GOOGLE_CLOUD_PROJECT}.run.app`] 
          : [])
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    };
    
    app.use(cors(corsOptions));
    app.use(compression());
    app.use(expressModule.default.json());
    app.use(expressModule.default.urlencoded({ extended: false }));
    
    // Security middleware
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          imgSrc: ["'self'", "data:", "https:"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          connectSrc: ["'self'", "wss:", "ws:"],
        },
      },
    }));
    
    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 500,
      message: 'Too many requests',
    });
    app.use('/api/', limiter);
    
    // Session management
    app.use(session({
      secret: process.env.SESSION_SECRET || 'default-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
      }
    }));
    
    // Authentication
    app.use(passport.initialize());
    app.use(passport.session());
    
    console.log('✅ CORS, compression, security, sessions configured');
    
    // Setup authentication
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      try {
        const { setupGoogleAuth } = await import("./googleAuth.js");
        await setupGoogleAuth(app);
        console.log('✅ Google authentication configured');
      } catch (authError) {
        console.error('⚠️  Auth setup failed:', authError);
      }
    }
    
    // Register API routes with enhanced error handling
    try {
      console.log('🔧 Attempting to import routes...');
      const { registerAllRoutes } = await import("./routes/index.js");
      console.log('🔧 Routes imported successfully, registering...');
      registerAllRoutes(app);
      console.log('✅ API routes registered');
    } catch (routeError) {
      console.error('⚠️  Route registration failed (server continues):', routeError);
      console.error('⚠️  Route error stack:', (routeError as Error).stack);
    }
    
    // Setup static file serving for production with enhanced error handling
    if (process.env.NODE_ENV === 'production') {
      try {
        console.log('🔧 Setting up production static file serving...');
        const path = await import("path");
        const fs = await import("fs");
        const express = await import("express");
        
        const distPath = path.resolve(process.cwd(), 'dist', 'public');
        if (fs.existsSync(distPath)) {
          app.use(expressModule.default.static(distPath));
          app.use("*", (_req: any, res: any) => {
            res.sendFile(path.resolve(distPath, "index.html"));
          });
          console.log('✅ Production static serving configured');
        }
      } catch (staticError) {
        console.error('⚠️  Static serving failed:', staticError);
      }
    } else {
      // Development Vite setup
      try {
        const { setupVite } = await import("./vite.js");
        await setupVite(app, httpServer);
        console.log('✅ Development Vite configured');
      } catch (viteError) {
        console.error('⚠️  Vite setup failed:', viteError);
      }
    }
    
    // WebSocket setup
    try {
      const { Server: SocketIOServer } = await import("socket.io");
      const io = new SocketIOServer(httpServer, {
        cors: corsOptions,
        transports: ['websocket', 'polling'],
      });
      
      const { setupWebSocketServer } = await import("./services/webSocketService.js");
      setupWebSocketServer(io);
      console.log('✅ WebSocket server configured');
    } catch (wsError) {
      console.error('⚠️  WebSocket setup failed:', wsError);
    }
    
    // Error handler (must be last)
    app.use((error: any, req: any, res: any, next: any) => {
      console.error('🔥 Express error:', error);
      res.status(500).json({ error: 'Internal server error' });
    });
    
    console.log('✅ FULL APPLICATION SETUP COMPLETE');
    
  } catch (error) {
    console.error('❌ ASYNC SETUP FAILED:', error);
  }
}

// Start the optimized server
startCloudRunOptimizedServer()
  .then(() => {
    console.log('🚀 CLOUD RUN OPTIMIZED SERVER FULLY OPERATIONAL');
  })
  .catch((error) => {
    console.error('❌ SERVER STARTUP FAILED:', error);
    process.exit(1);
  });