// RADICAL SIMPLIFICATION: Working Express + Database server
// Based on successful minimal server + simple database connectivity
import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;

const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

console.log('🚀 SIMPLE SERVER: Starting Express + Database with direct PostgreSQL...');
console.log(`Environment: NODE_ENV=${process.env.NODE_ENV || 'production'}`);
console.log(`Target: ${HOST}:${PORT}`);

// STEP 1: Create Express app (proven to work)
const app = express();
app.use(express.json({ limit: '1mb' }));

// STEP 2: Simple database connection (no Prisma complexity)
let dbPool = null;
let dbStatus = 'not-connected';

async function initDatabase() {
  try {
    console.log('🔍 SIMPLE DATABASE: Initializing direct PostgreSQL connection...');
    
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL not found');
    }

    // Parse the DATABASE_URL to handle both unix socket and IP formats
    const dbUrl = process.env.DATABASE_URL;
    console.log(`🔍 Database URL type: ${dbUrl.substring(0, 20)}...`);
    
    // Create connection pool with retry logic
    dbPool = new Pool({
      connectionString: dbUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      // Handle both unix socket and IP connections
      ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    // Test connection
    console.log('🔍 Testing database connection...');
    const client = await dbPool.connect();
    
    // Simple test query
    const result = await client.query('SELECT NOW() as current_time, version() as postgres_version');
    console.log(`✅ Database connected successfully!`);
    console.log(`🕒 Time: ${result.rows[0].current_time}`);
    console.log(`🐘 PostgreSQL: ${result.rows[0].postgres_version.split(' ')[0]}`);
    
    client.release();
    dbStatus = 'connected';
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    dbStatus = `error: ${error.message}`;
    return false;
  }
}

// STEP 3: Health endpoints (proven to work)
app.get('/health', async (req, res) => {
  console.log(`${new Date().toISOString()} - Health check`);
  
  let databaseHealth = dbStatus;
  
  if (dbPool && dbStatus === 'connected') {
    try {
      const client = await dbPool.connect();
      const result = await client.query('SELECT 1 as health');
      databaseHealth = result.rows[0].health === 1 ? 'healthy' : 'error';
      client.release();
    } catch (error) {
      databaseHealth = `error: ${error.message}`;
    }
  }

  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'Simple Express + Database server operational',
    server: 'express-database-simple',
    database: {
      status: databaseHealth,
      health: databaseHealth,
      url_configured: !!process.env.DATABASE_URL,
      connection_type: 'direct-postgresql'
    }
  });
});

app.get('/', (req, res) => {
  res.status(200).send(`
    <h1>EXPRESS + DATABASE SIMPLE SUCCESS</h1>
    <p>Server is running at ${new Date().toISOString()}</p>
    <p>Database status: ${dbStatus}</p>
    <p>Environment: ${process.env.NODE_ENV || 'production'}</p>
  `);
});

app.get('/db-test', async (req, res) => {
  console.log(`${new Date().toISOString()} - Database test`);
  
  if (!dbPool) {
    return res.status(500).json({
      error: 'Database pool not initialized',
      status: 'failed'
    });
  }

  try {
    const client = await dbPool.connect();
    const result = await client.query(`
      SELECT 
        NOW() as current_time, 
        version() as postgres_version,
        current_database() as database_name
    `);
    
    client.release();
    
    res.status(200).json({
      status: 'success',
      message: 'Database connection working',
      connection_type: 'direct-postgresql',
      data: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database test failed:', error.message);
    res.status(500).json({
      error: error.message,
      status: 'failed',
      connection_type: 'direct-postgresql',
      timestamp: new Date().toISOString()
    });
  }
});

// STEP 4: Start server immediately (Cloud Run requirement)
console.log('🚀 STARTING SERVER: Binding to port immediately...');
const server = app.listen(PORT, HOST, () => {
  console.log('✅ SERVER BOUND TO PORT - Cloud Run startup satisfied');
  console.log(`🌍 Server URL: http://${HOST}:${PORT}`);
  console.log('✅ Health check: /health');
  console.log('✅ Database test: /db-test');
  
  // Initialize database asynchronously after server starts
  setTimeout(async () => {
    console.log('🔧 ASYNC: Initializing database connection...');
    const dbSuccess = await initDatabase();
    if (dbSuccess) {
      console.log('✅ COMPLETE: Server and database fully operational');
    } else {
      console.log('⚠️ PARTIAL: Server operational, database connection failed');
    }
  }, 1000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    if (dbPool) {
      dbPool.end();
    }
    console.log('Process terminated');
  });
});

console.log('✅ SIMPLE INITIALIZATION COMPLETE');