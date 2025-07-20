import express from 'express';
import { createServer } from 'http';

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;

console.log('🚀 Starting ultra-minimal production server...');
console.log('📍 Port:', port);

// Minimal health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Basic root route - serve React app immediately
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Realm Rivalry - Loading...</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body>
        <div id="root">
          <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial, sans-serif;">
            <div style="text-align: center;">
              <h1>🏟️ Realm Rivalry</h1>
              <p>Fantasy Sports Platform Loading...</p>
              <p>Please wait while we initialize the full application.</p>
            </div>
          </div>
        </div>
        <script>
          // Reload page after 10 seconds to get full app
          setTimeout(() => window.location.reload(), 10000);
        </script>
      </body>
    </html>
  `);
});

// Basic middleware
app.use(express.json({ limit: '10mb' }));

const httpServer = createServer(app);

// Start server immediately - NO async initialization
httpServer.listen(port, '0.0.0.0', () => {
  console.log(`✅ Server listening on port ${port}`);
  console.log(`🏥 Health check: http://0.0.0.0:${port}/health`);
  console.log('🎉 Minimal server ready');
  
  // Initialize everything else AFTER server is listening and responding
  setTimeout(async () => {
    try {
      console.log('🔄 Starting background initialization...');
      
      // Dynamic imports to avoid blocking startup
      const { setupGoogleAuth } = await import('./googleAuth');
      const { registerAllRoutes } = await import('./routes/index');
      const { serveStatic } = await import('./vite');
      const session = await import('express-session');
      const passport = await import('passport');
      
      // Session configuration
      app.use(session.default({
        secret: process.env.SESSION_SECRET || 'default-secret-key',
        resave: false,
        saveUninitialized: false,
        cookie: {
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true,
          maxAge: 24 * 60 * 60 * 1000,
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
        }
      }));
      
      app.use(passport.default.initialize());
      app.use(passport.default.session());
      
      // Initialize auth
      await setupGoogleAuth();
      console.log('✅ Authentication initialized');
      
      // Register routes
      registerAllRoutes(app);
      console.log('✅ Routes initialized');
      
      // Serve static files only if dist exists
      try {
        serveStatic(app);
        console.log('✅ Static files initialized');
      } catch (error) {
        console.log('⚠️ Static files not available, serving basic routes only');
        // Fallback route
        app.get('*', (req, res) => {
          if (!req.path.startsWith('/api/')) {
            res.send(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Realm Rivalry - System Loading</title>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <style>
                    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #1a1a2e; color: #eee; }
                    .container { max-width: 800px; margin: 0 auto; text-align: center; padding: 50px 20px; }
                    .logo { font-size: 3em; margin-bottom: 20px; }
                    .status { background: #16213e; padding: 20px; border-radius: 10px; margin: 20px 0; }
                    .btn { background: #0066cc; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 10px; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="logo">🏟️ Realm Rivalry</div>
                    <h1>Fantasy Sports Platform</h1>
                    <div class="status">
                      <h3>🔄 System Deployment in Progress</h3>
                      <p>The full React application is being deployed. Please wait while we complete the build process.</p>
                      <p><strong>This temporary page will be replaced automatically.</strong></p>
                    </div>
                    <button class="btn" onclick="window.location.reload()">🔄 Refresh Page</button>
                    <p><small>Visit <a href="https://realmrivalry.com/health" style="color: #66ccff;">/health</a> to check system status</small></p>
                  </div>
                  <script>
                    // Auto-refresh every 30 seconds
                    setTimeout(() => window.location.reload(), 30000);
                  </script>
                </body>
              </html>
            `);
          }
        });
      }
      
      console.log('🎉 Full system ready');
      
    } catch (error) {
      console.error('❌ Background initialization error:', error);
    }
  }, 1000); // 1 second delay to ensure health checks work first
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Received SIGTERM, shutting down gracefully');
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});