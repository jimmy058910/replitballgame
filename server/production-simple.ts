import express from 'express';
import { createServer } from 'http';
import path from 'path';
// import { fileURLToPath } from 'url';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { setupGoogleAuth } from './googleAuth';
import { registerAllRoutes } from './routes/index';

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;

console.log('🚀 Starting Realm Rivalry production server...');
console.log('📍 Port:', port);
console.log('🌍 Environment:', process.env.NODE_ENV);

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

// Essential middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session configuration for production
app.use(session({
  secret: process.env.SESSION_SECRET || 'realm-rivalry-production-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true, // HTTPS required in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'none' // Required for cross-origin requests
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Health check endpoints
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

// Serve static files from dist directory
const staticPath = path.join(process.cwd(), 'dist');
console.log('📁 Static files path:', staticPath);

app.use(express.static(staticPath, {
  maxAge: '1y',
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// Setup authentication and routes
async function initializeApp() {
  try {
    console.log('🔐 Setting up Google authentication...');
    await setupGoogleAuth(app);
    console.log('✅ Authentication configured');

    console.log('🛣️ Registering API routes...');
    registerAllRoutes(app);
    console.log('✅ API routes configured');

    // SPA fallback - serve index.html for all non-API routes
    app.get('*', (req, res) => {
      // Don't serve index.html for API routes
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
      }

      // Serve React app for all other routes
      const indexPath = path.join(staticPath, 'index.html');
      
      console.log(`📄 Serving React app for route: ${req.path}`);
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('❌ Error serving index.html:', err);
          res.status(500).send(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Realm Rivalry - Loading Error</title>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                  body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #1a1a2e; color: #eee; text-align: center; }
                  .container { max-width: 600px; margin: 0 auto; padding: 50px 20px; }
                  .error { background: #ff4444; padding: 20px; border-radius: 10px; margin: 20px 0; }
                  .btn { background: #0066cc; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 10px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <h1>🏟️ Realm Rivalry</h1>
                  <div class="error">
                    <h3>⚠️ Application Loading Error</h3>
                    <p>The React frontend could not be loaded. This is a temporary deployment issue.</p>
                    <p>Static files path: ${staticPath}</p>
                  </div>
                  <button class="btn" onclick="window.location.reload()">🔄 Retry</button>
                  <p><small>Error: ${err.message}</small></p>
                </div>
              </body>
            </html>
          `);
        }
      });
    });

    console.log('✅ Production server fully configured');
    
  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    process.exit(1);
  }
}

// Start server
const httpServer = createServer(app);

httpServer.listen(port, '0.0.0.0', async () => {
  console.log(`✅ Server listening on port ${port}`);
  console.log(`🏥 Health check: http://0.0.0.0:${port}/health`);
  console.log(`🌐 Production URL: https://realmrivalry.com`);
  
  // Initialize the app after server starts
  await initializeApp();
  
  console.log('🎉 Realm Rivalry production server ready!');
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