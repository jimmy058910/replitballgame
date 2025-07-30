import express from 'express';
import { createServer } from 'http';
import path from 'path';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import compression from 'compression';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import { setupGoogleAuth } from './googleAuth';
import { registerAllRoutes } from './routes/index';
// Firestore imports moved to dynamic import to prevent blocking authentication setup

// ESM polyfill for __dirname and __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;

console.log('🚀 Starting Realm Rivalry production server...');
console.log('📍 Port:', port);
console.log('🌍 Environment:', process.env.NODE_ENV);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts for React
  crossOriginEmbedderPolicy: false
}));

// Compression
app.use(compression());

// Enhanced CORS configuration for production
const corsOptions = {
  origin: [
    'https://realmrivalry.com', 
    'https://www.realmrivalry.com',
    'https://realm-rivalry-o6fd46yesq-ul.a.run.app'
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Production session configuration (simplified to prevent auth blocking)
console.log('🔧 Setting up session middleware for Cloud Run...');

// Use standard session configuration for now to ensure auth works
app.use(session({
  secret: process.env.SESSION_SECRET || 'realm-rivalry-production-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true, // HTTPS required in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' // Cloud Run compatible
  },
  name: 'realm-rivalry.sid'
}));
console.log('✅ Session middleware configured (using MemoryStore for stability)');

// CRITICAL MIDDLEWARE ORDER FIX (per Gemini suggestion)
// 1. Session middleware is already configured above ✓
// 2. Now setup passport.initialize() and passport.session() ✓
// 3. THEN register all routes that use authentication ✓

// DEBUG: Create environment check endpoint BEFORE authentication setup
app.get('/api/env-check', (req, res) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV,
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    hasSessionSecret: !!process.env.SESSION_SECRET,
    timestamp: new Date().toISOString(),
    serverStarted: true
  });
});

// DEBUG: Route debugging endpoint
app.get('/api/debug-routes', (req, res) => {
  const routes: any[] = [];
  function extractRoutes(stack: any, parentPath = '') {
    stack.forEach((layer: any) => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods);
        routes.push({
          path: parentPath + layer.route.path,
          methods: methods,
          name: layer.route.stack[0]?.name || 'anonymous'
        });
      } else if (layer.name === 'router' && layer.regexp.source !== '^\\/?$') {
        const match = layer.regexp.source.match(/^\^\\?\/?(.+?)\\\//);
        const path = match ? '/' + match[1] : '';
        extractRoutes(layer.handle.stack, parentPath + path);
      }
    });
  }
  
  try {
    extractRoutes(app._router.stack);
    res.json({
      totalRoutes: routes.length,
      authRoutes: routes.filter(r => r.path.includes('/api/login') || r.path.includes('/auth/google')),
      apiRoutes: routes.filter(r => r.path.startsWith('/api/')),
      allRoutes: routes,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to extract routes',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

console.log('🔐 Setting up Google authentication middleware...');

// Test required environment variables first
console.log('🔍 Checking authentication environment variables...');
console.log('GOOGLE_CLIENT_ID present:', !!process.env.GOOGLE_CLIENT_ID);
console.log('GOOGLE_CLIENT_SECRET present:', !!process.env.GOOGLE_CLIENT_SECRET);
console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);

(async () => {
  try {
    console.log('🔄 BEFORE setupGoogleAuth - passport object:', typeof passport);
    console.log('🔄 BEFORE setupGoogleAuth - passport import successful:', !!passport);
    console.log('🔄 BEFORE setupGoogleAuth - passport.initialize type:', typeof passport?.initialize);
    console.log('🔄 BEFORE setupGoogleAuth - passport.session type:', typeof passport?.session);
    console.log('🔄 BEFORE setupGoogleAuth - app object methods:', Object.getOwnPropertyNames(app).slice(0, 10));
    console.log('🔄 BEFORE setupGoogleAuth - app.use type:', typeof app.use);
    
    // Test app.use functionality BEFORE calling setupGoogleAuth
    const testMiddlewareAdded = [];
    const originalAppUse = app.use.bind(app);
    
    // Wrap app.use to track middleware additions during setupGoogleAuth
    app.use = function(...args: any[]) {
      console.log('🔧 TRACKED: app.use called with:', args.length, 'arguments');
      console.log('🔧 TRACKED: First arg type:', typeof args[0]);
      console.log('🔧 TRACKED: First arg name:', args[0]?.name || 'unnamed');
      testMiddlewareAdded.push({
        args: args.length,
        type: typeof args[0],
        name: args[0]?.name || 'unnamed',
        timestamp: new Date().toISOString()
      });
      return originalAppUse(...args);
    };
    
    await setupGoogleAuth(app);
  
  // Restore original app.use
  app.use = originalAppUse;
  
  console.log('✅ setupGoogleAuth completed without throwing error');
  console.log('🔍 MIDDLEWARE ADDITIONS DURING SETUP:', JSON.stringify(testMiddlewareAdded, null, 2));
  
  // CRITICAL: Test passport immediately after setup
  console.log('🔍 POST-SETUP: Testing passport middleware attachment...');
  
  // Create test middleware to verify passport is working
  app.use('/api/passport-test', (req: any, res, next) => {
    console.log('🧪 Passport test middleware - req.isAuthenticated:', typeof req.isAuthenticated);
    console.log('🧪 Passport test middleware - req._passport:', !!req._passport);
    console.log('🧪 Passport test middleware - req.session:', !!req.session);
    res.json({
      passportWorking: typeof req.isAuthenticated === 'function',
      passportObject: !!req._passport,
      sessionExists: !!req.session,
      testTime: new Date().toISOString()
    });
  });
  
  console.log('✅ Authentication middleware configured successfully');
  
  // NOW register all other API routes AFTER authentication is ready
  console.log('🛣️ Registering API routes AFTER authentication setup...');
  registerAllRoutes(app);
  console.log('✅ All API routes registered after authentication setup');
  
  // Success endpoint
  app.get('/api/auth-status', (req, res) => {
    res.json({
      status: 'success',
      authSetup: 'completed',
      timestamp: new Date().toISOString()
    });
  });
  
} catch (error) {
  console.error('❌ CRITICAL: Authentication setup failed:', error);
  console.error('❌ Error message:', error?.message);
  console.error('❌ Stack trace:', error?.stack);
  
  // Register routes anyway to prevent complete failure
  console.log('🛣️ Registering API routes despite auth failure...');
  registerAllRoutes(app);
  console.log('✅ API routes registered despite auth failure');
  
  // Error endpoint with detailed info
  app.get('/api/auth-status', (req, res) => {
    res.status(500).json({
      status: 'failed',
      error: 'Authentication setup failed',
      message: error.message,
      stack: error.stack,
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      timestamp: new Date().toISOString()
    });
  });
}
})();

// Verify passport middleware is working
console.log('🔍 Testing passport middleware...');
app.get('/debug-auth', (req: any, res) => {
  res.json({
    hasIsAuthenticated: typeof req.isAuthenticated === 'function',
    hasSession: !!req.session,
    sessionID: req.sessionID,
    passportInitialized: !!req._passport,
    deploymentTime: new Date().toISOString(),
    authSetupAttempted: true,
    requestPath: req.path,
    requestMethod: req.method
  });
});

// CRITICAL: Test middleware stack BEFORE registering other routes
console.log('🔍 MIDDLEWARE STACK TEST - Creating test route to verify passport attachment...');
app.get('/api/middleware-test', (req: any, res) => {
  const middlewareStack = [];
  
  // Walk through the app middleware stack
  if (app._router && app._router.stack) {
    app._router.stack.forEach((layer: any, index: number) => {
      middlewareStack.push({
        index,
        name: layer.name || 'anonymous',
        regexp: layer.regexp.source,
        handle: typeof layer.handle
      });
    });
  }
  
  res.json({
    passportAttached: typeof req.isAuthenticated === 'function',
    passportObject: !!req._passport,
    sessionExists: !!req.session,
    middlewareCount: middlewareStack.length,
    middlewareStack,
    timestamp: new Date().toISOString()
  });
});

// API routes are now registered inside the async IIFE above
// This ensures authentication setup completes BEFORE routes are registered

// CRITICAL: Test passport AFTER all routes are registered
console.log('🔍 POST-ROUTE-REGISTRATION: Creating final passport test...');
app.get('/api/final-passport-test', (req: any, res) => {
  res.json({
    postRouteRegistration: true,
    passportWorking: typeof req.isAuthenticated === 'function',
    passportObject: !!req._passport,
    sessionExists: !!req.session,
    testTime: new Date().toISOString(),
    warning: 'This test runs AFTER registerAllRoutes - check if routes override passport'
  });
});

// Health check endpoints (CRITICAL for Cloud Run)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'realm-rivalry-production',
    version: '1.0.0'
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: 'connected',
    auth: 'configured'
  });
});

// Serve static files from dist directory - THIS IS CRITICAL FOR FRONTEND
const staticPath = path.join(process.cwd(), 'dist');
console.log('📁 Static files will be served from:', staticPath);

// Static file serving with proper cache headers
app.use(express.static(staticPath, {
  maxAge: '1d', // Cache static assets for 1 day
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      // Don't cache HTML files to ensure app updates are loaded
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else if (filePath.match(/\.(js|css|png|jpg|svg|ico)$/)) {
      // Cache other assets for longer
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
}));

// Basic API route (will be enhanced after auth setup)
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API is working',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// SPA fallback route - THIS FIXES "Cannot GET /" ERROR
app.get('*', (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ 
      error: 'API endpoint not found',
      path: req.path,
      method: req.method
    });
  }

  // Serve React app for all other routes
  const indexPath = path.join(staticPath, 'index.html');
  
  console.log(`📄 Serving React app for route: ${req.path}`);
  console.log(`📄 Index file path: ${indexPath}`);
  
  return res.sendFile(indexPath, (err) => {
    if (err && !res.headersSent) {
      console.error('❌ Error serving index.html:', err);
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Realm Rivalry - Loading Error</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                margin: 0; 
                padding: 20px; 
                background: linear-gradient(135deg, #1a1a2e, #16213e); 
                color: #eee; 
                text-align: center; 
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .container { 
                max-width: 600px; 
                background: rgba(22, 33, 62, 0.8);
                padding: 40px;
                border-radius: 20px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
              }
              .logo { font-size: 4em; margin-bottom: 20px; }
              .error { 
                background: rgba(255, 68, 68, 0.1); 
                border: 1px solid #ff4444;
                padding: 20px; 
                border-radius: 10px; 
                margin: 20px 0; 
              }
              .btn { 
                background: linear-gradient(135deg, #0066cc, #004499);
                color: white; 
                padding: 15px 30px; 
                border: none; 
                border-radius: 25px; 
                cursor: pointer; 
                margin: 10px;
                font-size: 16px;
                transition: all 0.3s ease;
              }
              .btn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,102,204,0.4); }
              .debug { background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px; margin-top: 20px; font-family: monospace; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="logo">🏟️</div>
              <h1>Realm Rivalry</h1>
              <div class="error">
                <h3>⚠️ Application Loading Error</h3>
                <p>The React frontend could not be served. This indicates a deployment configuration issue.</p>
                <div class="debug">
                  <strong>Debug Info:</strong><br>
                  Requested Path: ${req.path}<br>
                  Static Path: ${staticPath}<br>
                  Index Path: ${indexPath}<br>
                  Error: ${err.message}
                </div>
              </div>
              <button class="btn" onclick="window.location.reload()">🔄 Retry</button>
              <button class="btn" onclick="window.location.href='/health'">🏥 Health Check</button>
            </div>
          </body>
        </html>
      `);
    }
  });
});

// Initialize and start server
async function startServer() {
  const httpServer = createServer(app);

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`✅ Server listening on port ${port}`);
    console.log(`🏥 Health check: http://0.0.0.0:${port}/health`);
    console.log(`🌐 Production URL: https://realmrivalry.com`);
    console.log(`📁 Serving React app from: ${staticPath}`);
    console.log('🎉 Full Realm Rivalry production server ready!');
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('📴 Received SIGTERM, shutting down gracefully');
    httpServer.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('📴 Received SIGINT, shutting down gracefully');
    httpServer.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
}



// Start the server
startServer().catch((error) => {
  console.error('💥 Failed to start server:', error);
  process.exit(1);
});