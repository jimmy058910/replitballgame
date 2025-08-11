// STEP 3: EXPRESS + DATABASE + FIREBASE AUTHENTICATION SERVER
import express from 'express';
import admin from 'firebase-admin';
import pkg from 'pg';
const { Pool } = pkg;

const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

console.log('🚀 STEP 3 SERVER: Starting Express + Database + Firebase Authentication...');
console.log(`Environment: NODE_ENV=${process.env.NODE_ENV || 'production'}`);
console.log(`Target: ${HOST}:${PORT}`);

const app = express();
app.use(express.json({ limit: '1mb' }));

let dbPool = null;
let dbStatus = 'not-connected';
let connectionMethod = 'unknown';

// Database Connection (from Step 2)
async function createDualModeConnection() {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL not found');
  }

  console.log(`🔍 Database URL type: ${dbUrl.substring(0, 30)}...`);
  
  const isUnixSocket = dbUrl.includes('/cloudsql/');
  const isCloudRun = !!(process.env.K_SERVICE || process.env.GOOGLE_CLOUD_PROJECT);
  
  console.log(`🔍 Connection analysis: isUnixSocket=${isUnixSocket}, isCloudRun=${isCloudRun}`);
  
  let connectionConfig = {
    connectionString: dbUrl,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
  };

  if (isUnixSocket) {
    console.log('🔌 Using unix socket connection (Cloud Run native)');
    connectionMethod = 'unix-socket';
    connectionConfig.ssl = false;
  } else {
    console.log('🌐 Using public IP connection (universal)');
    connectionMethod = 'public-ip';
    connectionConfig.ssl = { 
      rejectUnauthorized: false
    };
  }

  return new Pool(connectionConfig);
}

async function initDatabase() {
  try {
    console.log('🔍 STEP 3: Initializing database connection...');
    
    dbPool = await createDualModeConnection();
    
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
        
        // Initialize user table if needed
        await initUserTable();
        
        return true;
      } catch (error) {
        lastError = error;
        console.log(`❌ Attempt ${i + 1} failed: ${error.message}`);
        
        if (i < retries - 1) {
          console.log('⏳ Retrying in 2 seconds...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    throw lastError;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    dbStatus = `error: ${error.message}`;
    return false;
  }
}

async function initUserTable() {
  try {
    console.log('🔍 STEP 3: Checking/creating users table...');
    
    const client = await dbPool.connect();
    
    // Create users table for Firebase Auth if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        firebase_uid VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        picture TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✅ Users table ready for Firebase Auth');
    client.release();
  } catch (error) {
    console.error('❌ User table initialization failed:', error);
  }
}

// Initialize Firebase Admin SDK
function initFirebaseAdmin() {
  try {
    console.log('🔥 STEP 3: Initializing Firebase Admin SDK...');
    
    let serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    let serviceAccountKeyB64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_B64;
    
    if (!serviceAccountKey && !serviceAccountKeyB64) {
      throw new Error('Either GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_SERVICE_ACCOUNT_KEY_B64 environment variable is required');
    }
    
    let serviceAccount;
    
    if (serviceAccountKeyB64) {
      // Decode Base64 encoded service account key (Cloud Run deployment)
      console.log('🔍 Using Base64 encoded service account key');
      const decodedKey = Buffer.from(serviceAccountKeyB64, 'base64').toString('utf-8');
      serviceAccount = JSON.parse(decodedKey);
    } else {
      // Use direct JSON string (local development)
      console.log('🔍 Using direct JSON service account key');
      serviceAccount = JSON.parse(serviceAccountKey);
    }
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
    
    console.log('✅ Firebase Admin SDK initialized');
    return true;
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error);
    return false;
  }
}

// Firebase Auth middleware
async function verifyFirebaseToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'No Firebase ID token provided'
      });
    }
    
    const idToken = authHeader.split('Bearer ')[1];
    
    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Get or create user in database
    if (dbPool) {
      const client = await dbPool.connect();
      
      // Check if user exists
      const existingUser = await client.query(
        'SELECT * FROM users WHERE firebase_uid = $1',
        [decodedToken.uid]
      );
      
      let user;
      
      if (existingUser.rows.length > 0) {
        // Update existing user
        user = await client.query(
          'UPDATE users SET email = $1, name = $2, picture = $3, updated_at = CURRENT_TIMESTAMP WHERE firebase_uid = $4 RETURNING *',
          [
            decodedToken.email,
            decodedToken.name,
            decodedToken.picture,
            decodedToken.uid
          ]
        );
      } else {
        // Create new user
        user = await client.query(
          'INSERT INTO users (firebase_uid, email, name, picture) VALUES ($1, $2, $3, $4) RETURNING *',
          [
            decodedToken.uid,
            decodedToken.email,
            decodedToken.name,
            decodedToken.picture
          ]
        );
      }
      
      req.user = user.rows[0];
      req.firebaseUser = decodedToken;
      client.release();
    } else {
      req.firebaseUser = decodedToken;
    }
    
    next();
  } catch (error) {
    console.error('❌ Firebase token verification failed:', error);
    res.status(401).json({
      status: 'error',
      message: 'Invalid Firebase ID token'
    });
  }
}

// Firebase Authentication Routes
app.get('/auth/verify', verifyFirebaseToken, (req, res) => {
  res.json({
    status: 'success',
    message: 'Firebase token verified',
    user: req.user || null,
    firebaseUser: {
      uid: req.firebaseUser.uid,
      email: req.firebaseUser.email,
      name: req.firebaseUser.name,
      picture: req.firebaseUser.picture
    }
  });
});

app.get('/auth/status', (req, res) => {
  res.json({
    status: 'success',
    message: 'Firebase Auth endpoint available',
    authentication_method: 'firebase',
    endpoints: {
      verify: '/auth/verify (POST with Bearer token)',
      profile: '/api/user/profile (authenticated)'
    }
  });
});

// Health check endpoints (from Step 2)
app.get('/health', async (req, res) => {
  let dbHealth = 'unknown';
  let dbDetails = {
    method: connectionMethod,
    pool_status: dbPool ? 'initialized' : 'not-initialized',
    connection_attempts: 0
  };

  if (dbPool && dbStatus === 'connected') {
    try {
      const client = await dbPool.connect();
      await client.query('SELECT 1');
      client.release();
      dbHealth = 'healthy';
      dbDetails.last_ping = new Date().toISOString();
    } catch (error) {
      dbHealth = `error: ${error.message}`;
    }
  } else {
    dbHealth = dbStatus;
  }

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'Step 3: Express + Database + Authentication server operational',
    server: 'express-database-auth',
    database: {
      status: dbHealth,
      health: dbHealth,
      url_configured: !!process.env.DATABASE_URL,
      connection_type: connectionMethod,
      details: dbDetails
    },
    authentication: {
      firebase_admin_configured: !!admin.apps.length,
      service_account_configured: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
      method: 'firebase'
    },
    environment: {
      node_env: process.env.NODE_ENV || 'production',
      is_cloud_run: !!(process.env.K_SERVICE || process.env.GOOGLE_CLOUD_PROJECT),
      k_service: process.env.K_SERVICE || 'not-set'
    }
  });
});

app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

app.get('/db-test', async (req, res) => {
  try {
    if (!dbPool) {
      throw new Error('Database pool not initialized');
    }

    const client = await dbPool.connect();
    const result = await client.query(`
      SELECT 
        NOW() as current_time,
        version() as postgres_version,
        current_database() as database_name,
        current_user as database_user,
        (SELECT COUNT(*) FROM users) as user_count
    `);
    
    client.release();
    
    res.json({
      status: 'success',
      message: 'Database connection working',
      connection_type: connectionMethod,
      data: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      status: 'failed',
      connection_type: connectionMethod,
      timestamp: new Date().toISOString()
    });
  }
});

// Protected route example
app.get('/api/user/profile', verifyFirebaseToken, (req, res) => {
  res.json({
    status: 'success',
    user: req.user ? {
      id: req.user.id,
      firebase_uid: req.user.firebase_uid,
      email: req.user.email,
      name: req.user.name,
      picture: req.user.picture,
      created_at: req.user.created_at
    } : null,
    firebaseUser: {
      uid: req.firebaseUser.uid,
      email: req.firebaseUser.email,
      email_verified: req.firebaseUser.email_verified,
      name: req.firebaseUser.name,
      picture: req.firebaseUser.picture
    }
  });
});

// Start server
async function startServer() {
  try {
    console.log('🔍 STEP 3: Starting server initialization...');
    
    // Initialize Firebase Admin SDK
    const firebaseInitialized = initFirebaseAdmin();
    if (!firebaseInitialized) {
      console.log('⚠️ Warning: Firebase Admin SDK initialization failed');
    }
    
    // Initialize database
    const dbConnected = await initDatabase();
    if (!dbConnected) {
      console.log('⚠️ Warning: Database connection failed, but server will start anyway');
    }
    
    // Start HTTP server
    app.listen(PORT, HOST, () => {
      console.log('✅ STEP 3 SERVER READY');
      console.log(`🌍 Server running at: http://${HOST}:${PORT}`);
      console.log(`🔍 Database status: ${dbStatus}`);
      console.log(`🔐 Authentication: Firebase Admin SDK configured`);
      console.log(`📊 Health check: /health`);
      console.log(`🔑 Auth endpoints: /auth/verify, /auth/status`);
    });
  } catch (error) {
    console.error('❌ STEP 3: Server startup failed:', error);
    process.exit(1);
  }
}

startServer();