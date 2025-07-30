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

// Session configuration for production (Cloud Run compatible)
console.log('🔧 Setting up session middleware for Cloud Run...');
app.use(session({
  secret: process.env.SESSION_SECRET || 'realm-rivalry-production-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true, // HTTPS required in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' // Changed from 'none' - more compatible with Cloud Run
  },
  name: 'realm-rivalry.sid' // Explicit session name
}));
console.log('✅ Session middleware configured');

// Setup Google Authentication BEFORE other routes (Passport initialized inside setupGoogleAuth)
console.log('🔐 Setting up Google authentication...');
setupGoogleAuth(app);
console.log('✅ Authentication configured');

// Debug: List registered routes
console.log('🔍 Checking if /api/login route was registered...');
const router = app._router;
if (router && router.stack) {
  const apiRoutes = router.stack
    .filter((layer: any) => layer.route)
    .map((layer: any) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`)
    .filter((route: string) => route.includes('/api/login') || route.includes('/auth/google'));
  console.log('🛣️ Auth routes found:', apiRoutes);
} else {
  console.log('❌ No router found');
}

// Setup all API routes BEFORE static file serving and SPA fallback
console.log('🛣️ Registering API routes...');
registerAllRoutes(app);
console.log('✅ All API routes registered');

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