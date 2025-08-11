#!/usr/bin/env node

/**
 * GRADUAL BUILD-UP: STEP 2 - EXPRESS + DATABASE
 * Add PostgreSQL database connectivity to working Express server
 */

import express from 'express';
import { Pool } from '@neondatabase/serverless';

const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

console.log('🚀 EXPRESS + DATABASE: Starting with database connectivity...');
console.log(`Environment: NODE_ENV=${process.env.NODE_ENV || 'unknown'}`);
console.log(`Target: ${HOST}:${PORT}`);

// Create Express app
const app = express();

// Basic middleware
app.use(express.json({ limit: '10mb' }));

// Database connection
let db = null;
let dbStatus = 'not-connected';

async function initDatabase() {
  try {
    console.log('🔍 DATABASE: Checking connection string...');
    
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable not set');
    }
    
    console.log(`🔍 DATABASE_URL preview: ${process.env.DATABASE_URL.substring(0, 30)}...`);
    
    // Create connection pool
    db = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    console.log('🔍 DATABASE: Testing connection...');
    
    // Test database connection
    const testResult = await db.query('SELECT NOW() as current_time, version() as postgres_version');
    
    console.log('✅ DATABASE: Connection successful!');
    console.log(`🕒 Database time: ${testResult.rows[0].current_time}`);
    console.log(`🐘 PostgreSQL version: ${testResult.rows[0].postgres_version.split(' ')[0]}`);
    
    dbStatus = 'connected';
    return true;
  } catch (error) {
    console.error('❌ DATABASE: Connection failed:', error.message);
    dbStatus = `error: ${error.message}`;
    return false;
  }
}

// Health check routes
app.get('/health', async (req, res) => {
  console.log(`${new Date().toISOString()} - Health check`);
  
  // Test database connection as part of health check
  let dbHealth = 'unknown';
  try {
    if (db) {
      const result = await db.query('SELECT 1 as test');
      dbHealth = result.rows[0].test === 1 ? 'healthy' : 'unhealthy';
    }
  } catch (error) {
    dbHealth = `error: ${error.message}`;
  }
  
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    message: 'Express + Database server is working',
    server: 'express-database',
    database: {
      status: dbStatus,
      health: dbHealth,
      url_configured: !!process.env.DATABASE_URL
    }
  });
});

app.get('/healthz', (req, res) => {
  res.json({ status: 'ok' });
});

// Database test endpoint
app.get('/db-test', async (req, res) => {
  console.log(`${new Date().toISOString()} - Database test`);
  
  try {
    if (!db) {
      return res.status(500).json({
        error: 'Database not initialized',
        status: dbStatus
      });
    }
    
    // Run a simple test query
    const result = await db.query(`
      SELECT 
        NOW() as current_time,
        current_database() as database_name,
        current_user as user_name,
        version() as postgres_version
    `);
    
    res.json({
      success: true,
      message: 'Database connection working',
      data: result.rows[0],
      connection_status: dbStatus
    });
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    res.status(500).json({
      error: 'Database test failed',
      message: error.message,
      status: dbStatus
    });
  }
});

// Basic route
app.get('/', (req, res) => {
  console.log(`${new Date().toISOString()} - GET /`);
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Express + Database Test</title></head>
    <body>
      <h1>🎉 EXPRESS + DATABASE SUCCESS!</h1>
      <p>Express framework with PostgreSQL database is working on Cloud Run.</p>
      <p>Time: ${new Date().toISOString()}</p>
      <p>Environment: ${process.env.NODE_ENV || 'unknown'}</p>
      <p>Database Status: ${dbStatus}</p>
      <p><a href="/db-test">Test Database Connection</a></p>
      <p>Next: Add authentication...</p>
    </body>
    </html>
  `);
});

// Start server
const server = app.listen(PORT, HOST, async (err) => {
  if (err) {
    console.error('❌ FATAL: Failed to bind to port:', err);
    process.exit(1);
  }
  
  console.log(`✅ SUCCESS: Express server listening on ${HOST}:${PORT}`);
  console.log(`Health check: http://${HOST}:${PORT}/health`);
  console.log(`Database test: http://${HOST}:${PORT}/db-test`);
  
  // Initialize database connection after server starts
  console.log('🔧 Initializing database connection...');
  await initDatabase();
});

// Handle server errors
server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📛 SIGTERM received, shutting down gracefully...');
  
  if (db) {
    console.log('🔧 Closing database connections...');
    await db.end();
  }
  
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('📛 SIGINT received, shutting down gracefully...');
  
  if (db) {
    console.log('🔧 Closing database connections...');
    await db.end();
  }
  
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

console.log('🎯 Express + Database server ready. Testing database integration...');