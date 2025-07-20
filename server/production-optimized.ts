import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import compression from 'compression';

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;

console.log('🚀 Starting optimized production server...');
console.log('📍 Port:', port);
console.log('🌍 Environment:', process.env.NODE_ENV);

// IMMEDIATE setup - no async operations
app.use(cors({
  origin: ['https://realmrivalry.com', 'https://www.realmrivalry.com', 'https://realm-rivalry-o6fd46yesq-ul.a.run.app'],
  credentials: true
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

// CRITICAL: Health check responds immediately
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// Serve static files immediately
app.use(express.static('dist', {
  maxAge: '1y',
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  }
}));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile('index.html', { root: 'dist' });
});

const httpServer = createServer(app);

// START SERVER IMMEDIATELY - Cloud Run timeout fix
httpServer.listen(port, '0.0.0.0', () => {
  console.log(`✅ Server listening on port ${port}`);
  console.log(`🏥 Health: http://0.0.0.0:${port}/health`);
  console.log('🎯 STARTUP COMPLETE - Cloud Run ready');
  
  // Initialize everything else AFTER server is responding
  setImmediate(async () => {
    try {
      console.log('🔄 Background initialization starting...');
      
      // Dynamic imports to prevent startup blocking
      const [
        { setupGoogleAuth },
        { registerAllRoutes },
        { Server: SocketIOServer },
        session,
        passport,
        { setupWebSocketServer, webSocketService },
        { matchStateManager },
        { SeasonTimingAutomationService }
      ] = await Promise.all([
        import('./googleAuth'),
        import('./routes/index'),
        import('socket.io'),
        import('express-session'),
        import('passport'),
        import('./services/webSocketService'),
        import('./services/matchStateManager'),
        import('./services/seasonTimingAutomationService')
      ]);

      // Session middleware
      app.use(session.default({
        secret: process.env.SESSION_SECRET || 'fallback-secret',
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

      // Initialize authentication
      await setupGoogleAuth();
      console.log('✅ Authentication ready');

      // Register API routes
      registerAllRoutes(app);
      console.log('✅ API routes ready');

      // Setup WebSocket
      const io = new SocketIOServer(httpServer, {
        path: '/ws',
        cors: { origin: "*", methods: ["GET", "POST"] }
      });
      
      await setupWebSocketServer(io);
      matchStateManager.setWebSocketService(webSocketService);
      console.log('✅ WebSocket ready');

      // Initialize match recovery (non-blocking)
      matchStateManager.recoverLiveMatches().catch(console.error);
      console.log('🔄 Match recovery started');

      // Initialize season automation with optimized intervals
      const seasonService = SeasonTimingAutomationService.getInstance();
      await seasonService.start();
      console.log('✅ Season automation ready');

      console.log('🎉 FULL SYSTEM READY');
      
    } catch (error) {
      console.error('❌ Background initialization error:', error);
      // Don't crash the server - it's already serving health checks
    }
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT received, shutting down gracefully');
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});