#!/usr/bin/env node

/**
 * GRADUAL BUILD-UP: STEP 2 - EXPRESS + DATABASE
 * Add database connection to working Express server
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';

const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

console.log('🚀 DATABASE MINIMAL: Starting with Express + Database...');
console.log(`Environment: NODE_ENV=${process.env.NODE_ENV || 'unknown'}`);
console.log(`Target: ${HOST}:${PORT}`);

// Create Express app
const app = express();
app.use(express.json({ limit: '10mb' }));

// Database connection (the most likely culprit)
let prisma;
let dbStatus = 'connecting';
let dbError = null;

try {
  console.log('🔍 Attempting database connection...');
  prisma = new PrismaClient({
    log: ['error'],
  });
  
  // Test connection but don't block server startup
  prisma.$connect()
    .then(() => {
      console.log('✅ Database connected successfully');
      dbStatus = 'connected';
    })
    .catch((err) => {
      console.error('❌ Database connection failed:', err.message);
      dbStatus = 'failed';
      dbError = err.message;
    });
    
} catch (err) {
  console.error('❌ Database initialization failed:', err.message);
  dbStatus = 'failed';
  dbError = err.message;
}

// Health check with database status
app.get('/health', async (req, res) => {
  console.log(`${new Date().toISOString()} - Health check with DB status`);
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'Express + Database minimal server',
    server: 'express-database',
    database: {
      status: dbStatus,
      error: dbError
    }
  };
  
  // Try a simple query if database is connected
  if (dbStatus === 'connected' && prisma) {
    try {
      // Simple query to test database
      await prisma.$queryRaw`SELECT 1 as test`;
      health.database.query = 'success';
    } catch (err) {
      health.database.query = 'failed';
      health.database.queryError = err.message;
    }
  }
  
  res.json(health);
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
    <head><title>Express + Database Test</title></head>
    <body>
      <h1>🎉 EXPRESS + DATABASE!</h1>
      <p>Express framework with database connection test.</p>
      <p>Time: ${new Date().toISOString()}</p>
      <p>Environment: ${process.env.NODE_ENV || 'unknown'}</p>
      <p>Database Status: <strong>${dbStatus}</strong></p>
      ${dbError ? `<p>Database Error: <code>${dbError}</code></p>` : ''}
      <p>Next: Add authentication...</p>
    </body>
    </html>
  `);
});

// Start server IMMEDIATELY (don't wait for database)
const server = app.listen(PORT, HOST, (err) => {
  if (err) {
    console.error('❌ FATAL: Failed to bind to port:', err);
    process.exit(1);
  }
  
  console.log(`✅ SUCCESS: Express+DB server listening on ${HOST}:${PORT}`);
  console.log(`Health check: http://${HOST}:${PORT}/health`);
});

// Handle server errors
server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});

// Graceful shutdown
async function gracefulShutdown() {
  console.log('📛 Shutdown signal received, closing gracefully...');
  
  if (prisma) {
    try {
      await prisma.$disconnect();
      console.log('✅ Database disconnected');
    } catch (err) {
      console.error('⚠️ Database disconnect error:', err.message);
    }
  }
  
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

console.log('🎯 Express+Database minimal server ready. Testing database layer...');