// DUAL-MODE DATABASE SERVER: Works with both unix socket and public IP
import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;

const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

console.log('🚀 DUAL-MODE SERVER: Starting with universal database connectivity...');
console.log(`Environment: NODE_ENV=${process.env.NODE_ENV || 'production'}`);
console.log(`Target: ${HOST}:${PORT}`);

const app = express();
app.use(express.json({ limit: '1mb' }));

let dbPool = null;
let dbStatus = 'not-connected';
let connectionMethod = 'unknown';

async function createDualModeConnection() {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL not found');
  }

  console.log(`🔍 Database URL type: ${dbUrl.substring(0, 30)}...`);
  
  // Detect connection type
  const isUnixSocket = dbUrl.includes('/cloudsql/');
  const isCloudRun = !!(process.env.K_SERVICE || process.env.GOOGLE_CLOUD_PROJECT);
  
  console.log(`🔍 Connection analysis: isUnixSocket=${isUnixSocket}, isCloudRun=${isCloudRun}`);
  
  // Create connection configuration
  let connectionConfig = {
    connectionString: dbUrl,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
  };

  // Configure SSL based on connection type
  if (isUnixSocket) {
    console.log('🔌 Using unix socket connection (Cloud Run native)');
    connectionMethod = 'unix-socket';
    connectionConfig.ssl = false; // Unix sockets don't use SSL
  } else {
    console.log('🌐 Using public IP connection (universal)');
    connectionMethod = 'public-ip';
    connectionConfig.ssl = { 
      rejectUnauthorized: false // Allow self-signed certificates for Cloud SQL
    };
  }

  return new Pool(connectionConfig);
}

async function initDatabase() {
  try {
    console.log('🔍 DUAL-MODE: Initializing universal database connection...');
    
    dbPool = await createDualModeConnection();
    
    // Test connection with retry logic
    let retries = 3;
    let lastError = null;
    
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`🔍 Connection attempt ${i + 1}/${retries}...`);
        
        const client = await dbPool.connect();
        const result = await client.query('SELECT NOW() as current_time, version() as postgres_version');
        
        console.log(`✅ Database connected successfully via ${connectionMethod}!`);
        console.log(`🕒 Time: ${result.rows[0].current_time}`);
        console.log(`🐘 PostgreSQL: ${result.rows[0].postgres_version.split(' ')[0]}`);
        
        client.release();
        dbStatus = 'connected';
        return true;
      } catch (error) {
        lastError = error;
        console.log(`❌ Attempt ${i + 1} failed: ${error.message}`);
        
        if (i < retries - 1) {
          const waitTime = (i + 1) * 2000; // Progressive backoff
          console.log(`⏳ Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    throw lastError;
  } catch (error) {
    console.error('❌ All database connection attempts failed:', error.message);
    dbStatus = `error: ${error.message}`;
    return false;
  }
}

// Health endpoint with comprehensive database testing
app.get('/health', async (req, res) => {
  console.log(`${new Date().toISOString()} - Health check`);
  
  let databaseHealth = dbStatus;
  let connectionDetails = {
    method: connectionMethod,
    pool_status: dbPool ? 'initialized' : 'not-initialized',
    connection_attempts: 0
  };
  
  if (dbPool && dbStatus === 'connected') {
    try {
      const client = await dbPool.connect();
      const result = await client.query('SELECT 1 as health, NOW() as time');
      databaseHealth = result.rows[0].health === 1 ? 'healthy' : 'error';
      connectionDetails.last_ping = result.rows[0].time;
      client.release();
    } catch (error) {
      databaseHealth = `error: ${error.message}`;
      connectionDetails.error = error.message;
    }
  }

  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'Dual-mode database server operational',
    server: 'express-database-dual',
    database: {
      status: databaseHealth,
      health: databaseHealth,
      url_configured: !!process.env.DATABASE_URL,
      connection_type: connectionMethod,
      details: connectionDetails
    },
    environment: {
      node_env: process.env.NODE_ENV,
      is_cloud_run: !!(process.env.K_SERVICE),
      k_service: process.env.K_SERVICE || 'not-set'
    }
  });
});

app.get('/', (req, res) => {
  res.status(200).send(`
    <h1>DUAL-MODE DATABASE SUCCESS</h1>
    <p>Server: ${new Date().toISOString()}</p>
    <p>Database: ${dbStatus}</p>
    <p>Connection: ${connectionMethod}</p>
    <p>Environment: ${process.env.NODE_ENV || 'production'}</p>
  `);
});

app.get('/db-test', async (req, res) => {
  console.log(`${new Date().toISOString()} - Database test`);
  
  if (!dbPool) {
    return res.status(500).json({
      error: 'Database pool not initialized',
      status: 'failed',
      connection_type: connectionMethod
    });
  }

  try {
    const client = await dbPool.connect();
    const result = await client.query(`
      SELECT 
        NOW() as current_time, 
        version() as postgres_version,
        current_database() as database_name,
        current_user as database_user
    `);
    
    client.release();
    
    res.status(200).json({
      status: 'success',
      message: 'Database connection working',
      connection_type: connectionMethod,
      data: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database test failed:', error.message);
    res.status(500).json({
      error: error.message,
      status: 'failed',
      connection_type: connectionMethod,
      timestamp: new Date().toISOString()
    });
  }
});

// Connection info endpoint
app.get('/connection-info', (req, res) => {
  const dbUrl = process.env.DATABASE_URL || 'not-set';
  
  res.status(200).json({
    connection_method: connectionMethod,
    database_status: dbStatus,
    environment: {
      node_env: process.env.NODE_ENV,
      is_cloud_run: !!(process.env.K_SERVICE),
      k_service: process.env.K_SERVICE || 'not-set',
      google_cloud_project: process.env.GOOGLE_CLOUD_PROJECT || 'not-set'
    },
    database_config: {
      url_configured: !!process.env.DATABASE_URL,
      url_type: dbUrl.includes('/cloudsql/') ? 'unix-socket' : 'public-ip',
      url_preview: dbUrl.substring(0, 30) + '...'
    },
    pool_info: dbPool ? {
      total_count: dbPool.totalCount,
      idle_count: dbPool.idleCount,
      waiting_count: dbPool.waitingCount
    } : null
  });
});

console.log('🚀 STARTING DUAL-MODE SERVER...');
const server = app.listen(PORT, HOST, () => {
  console.log(`✅ Server bound to ${HOST}:${PORT}`);
  console.log('✅ Health check: /health');
  console.log('✅ Database test: /db-test');
  console.log('✅ Connection info: /connection-info');
  
  // Initialize database asynchronously
  setTimeout(async () => {
    console.log('🔧 Initializing dual-mode database connection...');
    const dbSuccess = await initDatabase();
    if (dbSuccess) {
      console.log('✅ COMPLETE: Dual-mode server fully operational');
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

console.log('✅ DUAL-MODE INITIALIZATION COMPLETE');