#!/usr/bin/env node

/**
 * GRADUAL BUILD-UP: STEP 1 - MINIMAL EXPRESS SERVER
 * Add Express framework to working minimal server
 */

import express from 'express';

const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

console.log('🚀 EXPRESS MINIMAL: Starting with Express framework...');
console.log(`Environment: NODE_ENV=${process.env.NODE_ENV || 'unknown'}`);
console.log(`Target: ${HOST}:${PORT}`);

// Create Express app
const app = express();

// Basic middleware
app.use(express.json({ limit: '10mb' }));

// Health check routes
app.get('/health', (req, res) => {
  console.log(`${new Date().toISOString()} - Health check`);
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    message: 'Express minimal server is working',
    server: 'express'
  });
});

app.get('/healthz', (req, res) => {
  res.json({ status: 'ok' });
});

// Basic route
app.get('/', (req, res) => {
  console.log(`${new Date().toISOString()} - GET /`);
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Express Minimal Test</title></head>
    <body>
      <h1>🎉 EXPRESS SUCCESS!</h1>
      <p>Express framework is working on Cloud Run.</p>
      <p>Time: ${new Date().toISOString()}</p>
      <p>Environment: ${process.env.NODE_ENV || 'unknown'}</p>
      <p>Next: Add database connection...</p>
    </body>
    </html>
  `);
});

// Start server
const server = app.listen(PORT, HOST, (err) => {
  if (err) {
    console.error('❌ FATAL: Failed to bind to port:', err);
    process.exit(1);
  }
  
  console.log(`✅ SUCCESS: Express server listening on ${HOST}:${PORT}`);
  console.log(`Health check: http://${HOST}:${PORT}/health`);
});

// Handle server errors
server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📛 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📛 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

console.log('🎯 Express minimal server ready. Testing Express framework...');