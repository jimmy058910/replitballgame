import express from 'express';
import { createServer } from 'http';
import path from 'path';

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;

console.log('🚀 Starting MINIMAL Realm Rivalry server...');
console.log('📍 Port:', port);
console.log('🌍 Environment:', process.env.NODE_ENV);
console.log('🔐 Database URL exists:', !!process.env.DATABASE_URL);
console.log('🔑 Session secret exists:', !!process.env.SESSION_SECRET);
console.log('🔑 Google client secret exists:', !!process.env.GOOGLE_CLIENT_SECRET);

// Basic middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('🏥 Health check requested');
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'realm-rivalry-debug',
    port: port,
    env: process.env.NODE_ENV
  });
});

// Serve static files from dist directory
const staticPath = path.join(process.cwd(), 'dist');
console.log('📁 Static files will be served from:', staticPath);

app.use(express.static(staticPath));

// Basic test route
app.get('/api/test', (req, res) => {
  console.log('🧪 Test API endpoint called');
  res.json({ 
    message: 'Debug API is working',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// SPA fallback route
app.get('*', (req, res) => {
  console.log(`📄 Serving React app for route: ${req.path}`);
  const indexPath = path.join(staticPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('❌ Error serving index.html:', err);
      res.status(500).send('Error loading application');
    }
  });
});

// Start server
const httpServer = createServer(app);

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`✅ DEBUG Server listening on port ${port}`);
  console.log(`🏥 Health check: http://0.0.0.0:${port}/health`);
  console.log(`🌐 Production URL: https://realmrivalry.com`);
  console.log('🎉 Minimal Realm Rivalry server ready!');
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Received SIGTERM, shutting down gracefully');
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});