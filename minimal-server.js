#!/usr/bin/env node

/**
 * NUCLEAR OPTION: MINIMAL CLOUD RUN SERVER
 * This is the most basic possible server that should work on Cloud Run
 * If this fails, the problem is infrastructure, not our code
 */

import http from 'http';

const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

console.log('🚀 MINIMAL SERVER: Starting immediately...');
console.log(`Environment: NODE_ENV=${process.env.NODE_ENV || 'unknown'}`);
console.log(`Target: ${HOST}:${PORT}`);

// Create the most basic possible server
const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  if (req.url === '/health' || req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      message: 'Minimal server is working'
    }));
    return;
  }
  
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head><title>Minimal Cloud Run Test</title></head>
    <body>
      <h1>🎉 SUCCESS!</h1>
      <p>If you see this, Cloud Run deployment is working.</p>
      <p>Time: ${new Date().toISOString()}</p>
      <p>Environment: ${process.env.NODE_ENV || 'unknown'}</p>
      <p>Now we can gradually add complexity back.</p>
    </body>
    </html>
  `);
});

// Bind immediately with error handling
server.listen(PORT, HOST, (err) => {
  if (err) {
    console.error('❌ FATAL: Failed to bind to port:', err);
    process.exit(1);
  }
  
  console.log(`✅ SUCCESS: Minimal server listening on ${HOST}:${PORT}`);
  console.log(`Health check: http://${HOST}:${PORT}/health`);
});

// Handle server errors
server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});

// Handle process signals
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

console.log('🎯 Minimal server setup complete. Waiting for requests...');