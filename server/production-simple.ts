import express from 'express';
import { createServer } from 'http';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = parseInt(process.env.PORT || '8080', 10);

console.log('🚀 Starting Realm Rivalry Production Server (Simple & Reliable)');
console.log('📍 Port:', PORT);
console.log('📁 Working Directory:', process.cwd());

// Basic middleware
app.use(express.json({ limit: '10mb' }));

// Health check endpoints
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: 'production',
    version: 'simple'
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    api: 'ready'
  });
});

// Initialize authentication and routes synchronously
async function initializeServer() {
  try {
    console.log('🔄 Initializing server...');
    
    // Set up static file serving first
    const distPath = path.resolve('dist');
    if (fs.existsSync(distPath) && fs.existsSync(path.join(distPath, 'index.html'))) {
      console.log('✅ Serving React app from dist/');
      app.use(express.static(distPath));
      
      // SPA fallback for all non-API routes
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/') || req.path.startsWith('/auth/') || req.path === '/health') {
          return next();
        }
        return res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.log('⚠️ React app not found - serving basic loading page');
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/') || req.path.startsWith('/auth/') || req.path === '/health') {
          return next();
        }
        return res.send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Realm Rivalry - Loading</title>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                  display: flex; 
                  align-items: center; 
                  justify-content: center; 
                  min-height: 100vh; 
                  margin: 0; 
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  text-align: center;
                }
                .spinner { 
                  border: 4px solid rgba(255,255,255,0.3);
                  border-radius: 50%;
                  border-top: 4px solid #fff;
                  width: 50px;
                  height: 50px;
                  animation: spin 1s linear infinite;
                  margin: 2rem auto;
                }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
              </style>
            </head>
            <body>
              <div>
                <h1>🏟️ Realm Rivalry</h1>
                <div class="spinner"></div>
                <p>Fantasy Sports Platform Loading...</p>
                <p><small>Server is running. React app deployment in progress.</small></p>
                <script>setTimeout(() => window.location.reload(), 30000);</script>
              </div>
            </body>
          </html>
        `);
      });
    }
    
    // Import and set up authentication
    const session = await import('express-session');
    const passport = await import('passport');
    const { setupGoogleAuth } = await import('./googleAuth');
    const { registerAllRoutes } = await import('./routes/index');
    
    // Session configuration
    app.use(session.default({
      secret: process.env.SESSION_SECRET || 'default-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const
      }
    }));
    
    app.use(passport.default.initialize());
    app.use(passport.default.session());
    
    // Initialize authentication
    await setupGoogleAuth(app);
    console.log('✅ Google OAuth initialized');
    
    // Register all API routes
    registerAllRoutes(app);
    console.log('✅ API routes registered');
    
    console.log('🎉 Server initialization complete');
    return true;
    
  } catch (error) {
    console.error('❌ Server initialization failed:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    
    // Set up basic error fallback
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/auth/') || req.path === '/health') {
        return res.status(500).json({ error: 'Server initialization failed' });
      }
      return res.status(500).send(`
        <html>
          <body style="font-family: Arial; text-align: center; padding: 2rem;">
            <h1>🏟️ Realm Rivalry</h1>
            <h2>Server Error</h2>
            <p>The server encountered an initialization error.</p>
            <p><a href="/health">Check Health</a></p>
            <script>setTimeout(() => window.location.reload(), 60000);</script>
          </body>
        </html>
      `);
    });
    
    return false;
  }
}

// Create HTTP server
const server = createServer(app);

// Start server and initialize
server.listen(PORT, '0.0.0.0', async () => {
  console.log(`✅ Server listening on port ${PORT}`);
  console.log(`🏥 Health check: http://0.0.0.0:${PORT}/health`);
  
  // Initialize everything synchronously
  const initialized = await initializeServer();
  if (initialized) {
    console.log('🚀 Production server fully operational');
  } else {
    console.log('⚠️ Server running with limited functionality');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('📴 Server closed');
    process.exit(0);
  });
});

export default app;