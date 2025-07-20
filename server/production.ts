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
      
      // Serve static files
      serveStatic(app);
      console.log('✅ Static files initialized');
      
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