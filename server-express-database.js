#!/usr/bin/env node

/**
 * GRADUAL BUILD-UP: STEP 2 - EXPRESS + DATABASE
 * Add Cloud SQL PostgreSQL database connectivity to working Express server
 * FIXED: External database removal + Prisma schema copying for successful build
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';

const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

console.log('🚀 EXPRESS + DATABASE: Starting with database connectivity...');
console.log(`Environment: NODE_ENV=${process.env.NODE_ENV || 'unknown'}`);
console.log(`Target: ${HOST}:${PORT}`);

// Create Express app
const app = express();

// Basic middleware
app.use(express.json({ limit: '10mb' }));

// Cloud SQL database connection using Prisma (matches your production setup)
let prisma = null;
let dbStatus = 'not-connected';

function getDatabaseUrl() {
  const nodeEnv = process.env.NODE_ENV || 'production';
  const rawUrl = process.env.DATABASE_URL;
  
  if (!rawUrl) {
    throw new Error('DATABASE_URL not configured');
  }

  console.log(`🔍 Using ${nodeEnv} database configuration`);
  
  if (nodeEnv === 'production') {
    // Production: Use Cloud SQL socket connection
    console.log('✅ Production: Using Cloud SQL socket connection for Cloud Run');
    return rawUrl;
  } else {
    // Development: Convert socket to TCP if needed
    if (rawUrl.includes('/cloudsql/')) {
      console.log('🔄 Development: Converting Cloud SQL socket to TCP connection...');
      const match = rawUrl.match(/postgresql:\/\/([^:]+):([^@]+)@localhost\/([^?]+)\?host=\/cloudsql\/([^:]+):([^:]+):([^&]+)/);
      if (match) {
        const [, username, password, database, project, region, instance] = match;
        const publicIP = instance === 'realm-rivalry-prod' ? '34.171.83.78' : '35.225.150.44';
        const devTcpUrl = `postgresql://${username}:${password}@${publicIP}:5432/${database}?sslmode=require`;
        console.log(`✅ Development: Using TCP connection to ${publicIP}`);
        return devTcpUrl;
      }
    }
    return rawUrl;
  }
}

async function initDatabase() {
  try {
    console.log('🔍 DATABASE: Initializing Cloud SQL connection...');
    
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable not set');
    }
    
    const databaseUrl = getDatabaseUrl();
    console.log(`🔍 DATABASE_URL preview: ${databaseUrl.substring(0, 30)}...`);
    
    // Create Prisma client with Cloud SQL optimized configuration
    const prismaConfig = {
      datasources: {
        db: {
          url: databaseUrl
        }
      },
      log: ['error']
    };

    // Add production optimizations
    if (process.env.NODE_ENV === 'production') {
      console.log('🔧 Applying Cloud SQL production optimizations...');
      const optimizedUrl = databaseUrl + (databaseUrl.includes('?') ? '&' : '?') + 
        'connection_limit=1&pool_timeout=20&connect_timeout=60';
      prismaConfig.datasources.db.url = optimizedUrl;
    }
    
    prisma = new PrismaClient(prismaConfig);
    console.log('✅ Prisma client created successfully');
    
    console.log('🔍 DATABASE: Testing Cloud SQL connection...');
    
    // Test database connection
    const testResult = await prisma.$queryRaw`SELECT NOW() as current_time, version() as postgres_version`;
    
    console.log('✅ DATABASE: Cloud SQL connection successful!');
    console.log(`🕒 Database time: ${testResult[0].current_time}`);
    console.log(`🐘 PostgreSQL version: ${testResult[0].postgres_version.split(' ')[0]}`);
    
    dbStatus = 'connected';
    return true;
  } catch (error) {
    console.error('❌ DATABASE: Cloud SQL connection failed:', error.message);
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
    if (prisma) {
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      dbHealth = result[0].test === 1 ? 'healthy' : 'unhealthy';
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
    if (!prisma) {
      return res.status(500).json({
        error: 'Prisma client not initialized',
        status: dbStatus
      });
    }
    
    // Run a simple test query using Prisma
    const result = await prisma.$queryRaw`
      SELECT 
        NOW() as current_time,
        current_database() as database_name,
        current_user as user_name,
        version() as postgres_version
    `;
    
    res.json({
      success: true,
      message: 'Cloud SQL connection working via Prisma',
      data: result[0],
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
  
  if (prisma) {
    console.log('🔧 Closing Prisma connections...');
    await prisma.$disconnect();
  }
  
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('📛 SIGINT received, shutting down gracefully...');
  
  if (prisma) {
    console.log('🔧 Closing Prisma connections...');
    await prisma.$disconnect();
  }
  
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

console.log('🎯 Express + Cloud SQL server ready. Testing Prisma integration...');