// ===============================
// CRITICAL: GEMINI DEBUGGING APPROACH
// ===============================
// Canary log - if this appears, Node.js process is starting
console.log('--- SERVER PROCESS STARTED ---');
console.log('--- BEGINNING COMPREHENSIVE ERROR HANDLING ---');

// Wrap EVERYTHING in comprehensive error handling
async function startServer() {
  try {
    console.log('--- Phase 1: Initializing Sentry ---');
    // CRITICAL: Import Sentry instrumentation FIRST (tsx resolves .ts automatically)
    await import("./instrument.ts");
    const Sentry = await import("@sentry/node");
    console.log('✅ Sentry imported successfully');

    console.log('--- Phase 2: Container startup debugging ---');
    // CLOUD RUN LOGGING: Add immediate logging for container startup debugging
    console.log(`🚀 STARTING APPLICATION CONTAINER - PID: ${process.pid}`);
    console.log(`🔍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔍 Port: ${process.env.PORT || 'NOT_SET'}`);
    console.log(`🔍 Platform: ${process.platform}, Node: ${process.version}`);
    console.log(`🔍 Memory: ${JSON.stringify(process.memoryUsage())}`);
    console.log(`🔍 Working Directory: ${process.cwd()}`);
    console.log(`⏰ Container startup timestamp: ${new Date().toISOString()}`);
    
    // CRITICAL CLOUD RUN DEBUGGING: Validate all required environment variables
    console.log('🔍 COMPREHENSIVE ENVIRONMENT VALIDATION:');
    const requiredEnvVars = ['DATABASE_URL', 'SESSION_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];
    const missingEnvVars: string[] = [];
    const invalidEnvVars: string[] = [];
    
    requiredEnvVars.forEach(envVar => {
      const value = process.env[envVar];
      const exists = !!value;
      const length = value ? value.length : 0;
      const preview = value ? value.substring(0, 20) + '...' : 'NONE';
      console.log(`   ${envVar}: ${exists ? '✅ EXISTS' : '❌ MISSING'} (length: ${length}, preview: ${preview})`);
      
      if (!exists) {
        missingEnvVars.push(envVar);
      } else {
        // Validate format
        if (envVar === 'DATABASE_URL' && !value.includes('postgresql://')) {
          invalidEnvVars.push(`${envVar} - not a PostgreSQL URL`);
        }
        if (envVar === 'GOOGLE_CLIENT_SECRET' && !value.startsWith('GOCSPX-')) {
          invalidEnvVars.push(`${envVar} - wrong format, should start with GOCSPX-`);
        }
      }
    });
    
    if (missingEnvVars.length > 0) {
      console.error('❌ CRITICAL STARTUP FAILURE: Missing required environment variables:', missingEnvVars);
      console.error('This WILL cause the application to crash. Check Secret Manager permissions.');
      throw new Error(`Missing environment variables: ${missingEnvVars.join(', ')}`);
    }
    
    if (invalidEnvVars.length > 0) {
      console.error('❌ CRITICAL STARTUP FAILURE: Invalid environment variables:', invalidEnvVars);
      console.error('Secret values are malformed or corrupted.');
      throw new Error(`Invalid environment variables: ${invalidEnvVars.join(', ')}`);
    }
    
    console.log('✅ All required environment variables are present and valid');
    
    console.log('🔍 CLOUD RUN ENVIRONMENT DETECTION:');
    console.log(`   K_SERVICE: ${process.env.K_SERVICE || 'NOT_SET'}`);
    console.log(`   K_REVISION: ${process.env.K_REVISION || 'NOT_SET'}`);
    console.log(`   K_CONFIGURATION: ${process.env.K_CONFIGURATION || 'NOT_SET'}`);
    console.log(`   GOOGLE_CLOUD_PROJECT: ${process.env.GOOGLE_CLOUD_PROJECT || 'NOT_SET'}`);
    console.log(`   PORT (from Cloud Run): ${process.env.PORT || 'NOT_SET'}`);
    
    const isCloudRun = !!(process.env.K_SERVICE || process.env.GOOGLE_CLOUD_PROJECT);
    console.log(`   IS_CLOUD_RUN: ${isCloudRun}`);
    
    if (isCloudRun && !process.env.PORT) {
      console.error('❌ CRITICAL: Running in Cloud Run but PORT environment variable is not set!');
    }

    console.log('--- Phase 3: Importing Express and core modules ---');
    const express = await import("express");
    console.log('✅ Express imported successfully');
    
    console.log('--- Phase 4: Importing HTTP and WebSocket modules ---');
    const { createServer } = await import("http");
    const http = await import("http");
    const { Server: SocketIOServer } = await import("socket.io");
    console.log('✅ HTTP and WebSocket modules imported');
    
    console.log('--- Phase 5: Importing middleware modules ---');
    const rateLimit = (await import("express-rate-limit")).default;
    const helmet = (await import("helmet")).default;
    const compression = (await import("compression")).default;
    const cors = (await import("cors")).default;
    const session = (await import("express-session")).default;
    const passport = (await import("passport")).default;
    console.log('✅ Middleware modules imported');
    
    console.log('--- Phase 6: Importing application modules ---');
    const { setupGoogleAuth } = await import("./googleAuth.js");
    const { registerAllRoutes } = await import("./routes/index.js");
    const { requestIdMiddleware } = await import("./middleware/requestId.js");
    const { errorHandler, logInfo } = await import("./services/errorService.js");
    const { setupWebSocketServer, webSocketService } = await import("./services/webSocketService.js");
    const { webSocketManager } = await import("./websocket/webSocketManager.js");
    const { setupVite, serveStatic } = await import("./vite.js");
    const logger = (await import("./utils/logger.js")).default;
    const { validateOrigin } = await import("./utils/security.js");
    const { sanitizeInputMiddleware, securityHeadersMiddleware } = await import("./middleware/security.js");
    const { createHealthCheck, createBasicHealthCheck, createDetailedHealthCheck } = await import("./health.js");
    console.log('✅ Application modules imported');

    console.log('--- Phase 7: Initializing Express app ---');
    const app = express.default();

    // CRITICAL: Trust proxy for Google Cloud Run - MUST BE FIRST  
    // This fixes ValidationError about X-Forwarded-For header
    app.set('trust proxy', 1);

    // CRITICAL GEMINI SUGGESTION #2: Health checks MUST be registered FIRST
    // Before any authentication, rate-limiting, or complex middleware
    app.get('/health', createBasicHealthCheck()); // Basic health for startup probes
    app.get('/healthz', createBasicHealthCheck()); // Cloud Run startup probe endpoint (CRITICAL)
    app.get('/readyz', createBasicHealthCheck()); // Kubernetes-style readiness probe
    app.get('/api/health', createDetailedHealthCheck()); // Detailed health with database info

    // Ultra-fast ping endpoint for Cloud Run (minimal response time)
    app.get('/ping', (req: any, res: any) => {
      res.set('Cache-Control', 'no-cache');
      res.status(200).send('OK');
    });

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
            'https://direct-glider-465821-p7.web.app', // Firebase hosting domain
            'https://direct-glider-465821-p7.firebaseapp.com', // Firebase app domain
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

    // Enable compression for all responses
    app.use(compression({
      level: 6,
      threshold: 1024,
      filter: (req: any, res: any) => {
        if (req.headers['x-no-compression']) {
          return false
        }
        return compression.filter(req, res)
      }
    }));

    app.use(express.default.json());
    app.use(express.default.urlencoded({ extended: false }));

    // Add request ID middleware early in the chain
    app.use(requestIdMiddleware);

    // Add security middleware
    app.use(securityHeadersMiddleware);
    app.use(sanitizeInputMiddleware);

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

    // Passport initialization
    app.use(passport.initialize());
    app.use(passport.session());

    // Setup Google authentication
    await setupGoogleAuth(app);
    console.log('✅ Google authentication configured');

    // Register API routes
    console.log('🔧 Registering API routes...');
    registerAllRoutes(app);
    console.log('✅ API routes registered');

    // Create HTTP server and setup WebSockets
    const httpServer = createServer(app);

    // Setup WebSocket server
    console.log('🔧 Setting up WebSocket server...');
    const io = new SocketIOServer(httpServer, {
      cors: corsOptions,
      transports: ['websocket', 'polling'],
      allowEIO3: true
    });

    setupWebSocketServer(io);
    webSocketManager.initialize(io);
    console.log('✅ WebSocket server configured');

    // Setup frontend serving (Vite in development, static in production)
    console.log('🔧 Setting up frontend serving...');
    if (process.env.NODE_ENV === 'production') {
      console.log('🏭 Production mode: Serving static frontend files');
      serveStatic(app);
    } else {
      console.log('🛠️ Development mode: Setting up Vite with hot reload');
      await setupVite(app, httpServer);
    }
    console.log('✅ Frontend serving configured');

    // CRITICAL: Error handler MUST be last in middleware chain
    app.use(errorHandler);
    console.log('✅ Error handler added as final middleware');

    // CRITICAL CLOUD RUN FIX: MUST use PORT environment variable set by Cloud Run
    // Cloud Run sets PORT=8080, development uses 5000
    const port = parseInt(process.env.PORT || "5000", 10);
    
    console.log('🔍 PRODUCTION PORT BINDING ANALYSIS:', {
      NODE_ENV: process.env.NODE_ENV,
      PORT_FROM_ENV: process.env.PORT,
      PARSED_PORT: port,
      IS_CLOUD_RUN: !!(process.env.K_SERVICE || process.env.GOOGLE_CLOUD_PROJECT),
      EXPECTED_CLOUD_RUN_PORT: 8080
    });
    
    console.log('🔍 CRITICAL PORT BINDING DEBUG:', {
      NODE_ENV: process.env.NODE_ENV,
      PORT_ENV_VAR: process.env.PORT,
      FINAL_PORT: port,
      HOST_ENV_VAR: process.env.HOST,
      BINDING_HOST: '0.0.0.0'
    });

    httpServer.on('error', (error: any) => {
      console.error('❌ CRITICAL SERVER ERROR:', error);
      console.error('Server failed to start. Error details:', {
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        address: error.address,
        port: error.port,
        message: error.message,
        name: error.name
      });
      process.exit(1);
    });

    // CRITICAL CLOUD RUN FIX: Configure server timeout for Cloud Run compatibility
    httpServer.setTimeout(0); // Disable server timeout - let Cloud Run handle timeouts
    httpServer.keepAliveTimeout = 120000; // 2 minutes keep-alive
    httpServer.headersTimeout = 120000; // 2 minutes header timeout

    // ENHANCED CLOUD RUN STARTUP: Add immediate health check response capability
    console.log('🚀 CRITICAL: Starting server with enhanced Cloud Run compatibility...');

    // CRITICAL CLOUD RUN FIX: Add comprehensive port binding with detailed logging
    console.log('🚀 ATTEMPTING SERVER BINDING WITH COMPREHENSIVE LOGGING...');
    console.log(`   Target Host: 0.0.0.0`);
    console.log(`   Target Port: ${port}`);
    console.log(`   Port Source: ${process.env.PORT ? 'Cloud Run PORT env var' : 'Default (5000)'}`);
    
    httpServer.listen({
      port,
      host: "0.0.0.0", // CRITICAL: Must bind to 0.0.0.0 for Cloud Run
      reusePort: true,
    }, () => {
      console.log(`✅ SERVER SUCCESSFULLY BOUND TO PORT ${port}`);
      console.log(`✅ Health check available at /health`);
      console.log(`✅ Cloud Run startup probe endpoint: /healthz`);
      console.log(`🌍 Server accessible at: http://0.0.0.0:${port}`);
      
      // CRITICAL: Enhanced Cloud Run debugging
      const isCloudRun = !!(process.env.K_SERVICE || process.env.GOOGLE_CLOUD_PROJECT);
      
      if (isCloudRun) {
        console.log('🔍 CLOUD RUN DEPLOYMENT SUCCESS:', {
          server: {
            bindingHost: '0.0.0.0',
            bindingPort: port,
            actualPort: port,
            portFromEnv: process.env.PORT,
            listening: true,
            startupTime: new Date().toISOString()
          },
          environment: {
            NODE_ENV: process.env.NODE_ENV,
            GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
            K_SERVICE: process.env.K_SERVICE,
            K_REVISION: process.env.K_REVISION,
            K_CONFIGURATION: process.env.K_CONFIGURATION
          },
          healthChecks: {
            healthEndpoint: '/health',
            startupProbe: '/healthz',
            ready: true
          }
        });
        
        // Test health endpoint internally to ensure it's working
        setTimeout(() => {
          const http = require('http');
          const options = {
            hostname: '0.0.0.0',
            port: port,
            path: '/health',
            method: 'GET'
          };
          
          const req = http.request(options, (res: any) => {
            console.log(`🏥 Internal health check status: ${res.statusCode}`);
          });
          
          req.on('error', (err: any) => {
            console.error('❌ Internal health check failed:', err.message);
          });
          
          req.end();
        }, 1000);
      }
    });

    // CRITICAL CLOUD RUN FIX: Add proper SIGTERM handling for graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🔄 SIGTERM received, shutting down gracefully...');
      httpServer.close(() => {
        console.log('✅ HTTP server closed');
        process.exit(0);
      });
      
      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('❌ Forced shutdown due to timeout');
        process.exit(1);
      }, 10000);
    });

    process.on('SIGINT', () => {
      console.log('🔄 SIGINT received, shutting down gracefully...');
      httpServer.close(() => {
        console.log('✅ HTTP server closed');
        process.exit(0);
      });
    });

    // Handle uncaught exceptions to prevent container crashes
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      // Log but don't exit - let Cloud Run handle it
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      // Log but don't exit - let Cloud Run handle it
    });

  } catch (error) {
    // CRITICAL: Comprehensive error logging for any startup failure
    console.error('💥 FAILED TO START SERVER 💥');
    console.error('💥 ERROR TYPE:', typeof error);
    console.error('💥 ERROR MESSAGE:', error instanceof Error ? error.message : 'Unknown error');
    console.error('💥 ERROR STACK:', error instanceof Error ? error.stack : 'No stack trace available');
    
    // Log full error object
    try {
      console.error('💥 FULL ERROR OBJECT:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    } catch (jsonError) {
      console.error('💥 ERROR SERIALIZATION FAILED:', error);
    }
    
    // Log environment details for debugging
    console.error('💥 ENVIRONMENT DEBUG:', {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      DATABASE_URL_EXISTS: !!process.env.DATABASE_URL,
      SESSION_SECRET_EXISTS: !!process.env.SESSION_SECRET,
      GOOGLE_CLIENT_ID_EXISTS: !!process.env.GOOGLE_CLIENT_ID,
      WORKING_DIR: process.cwd(),
      NODE_VERSION: process.version,
      PLATFORM: process.platform
    });
    
    // Exit with failure code to ensure container stops
    console.error('💥 EXITING WITH FAILURE CODE 1 💥');
    process.exit(1);
  }
}

// Start the server with comprehensive error handling
startServer();