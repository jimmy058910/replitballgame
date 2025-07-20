import express from 'express';
import { createServer } from 'http';
import { setupGoogleAuth } from './googleAuth';
import { registerAllRoutes } from './routes/index';
import { serveStatic } from './vite';
import session from 'express-session';
import passport from 'passport';
import { createHealthCheck } from './health';

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;

console.log('🚀 Starting Realm Rivalry production server...');
console.log('📍 Port:', port);
console.log('🌍 Environment:', process.env.NODE_ENV);

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Health check - must be first
app.get('/health', createHealthCheck());
app.get('/api/health', createHealthCheck());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret-key',
  resave: false,
  saveUninitialized: false,
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

const httpServer = createServer(app);

// Start server immediately
httpServer.listen(port, '0.0.0.0', async () => {
  console.log(`✅ Server listening on port ${port}`);
  console.log(`🏥 Health check: http://0.0.0.0:${port}/health`);
  
  try {
    // Initialize auth system
    console.log('🔐 Setting up authentication...');
    await setupGoogleAuth();
    console.log('✅ Authentication ready');
    
    // Register routes
    console.log('🛣️ Setting up routes...');
    registerAllRoutes(app);
    console.log('✅ Routes ready');
    
    // Serve static files
    console.log('📁 Setting up static files...');
    serveStatic(app);
    console.log('✅ Static files ready');
    
    console.log('🎉 Production server fully initialized');
    
  } catch (error) {
    console.error('❌ Initialization error:', error);
    // Don't crash - server is already listening
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Received SIGTERM, shutting down gracefully');
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});