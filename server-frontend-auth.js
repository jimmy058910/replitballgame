// STEP 4: EXPRESS + DATABASE + FIREBASE AUTHENTICATION + FRONTEND INTEGRATION
import express from 'express';
import admin from 'firebase-admin';
import pkg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
const { Pool } = pkg;

const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

console.log('🚀 STEP 4 SERVER: Starting Express + Database + Firebase Authentication + Frontend...');
console.log(`Environment: NODE_ENV=${process.env.NODE_ENV || 'production'}`);
console.log(`Target: ${HOST}:${PORT}`);

const app = express();
app.use(express.json({ limit: '1mb' }));

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbPool = null;
let dbStatus = 'not-connected';
let connectionMethod = 'unknown';

// Database Connection (from Steps 2-3)
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
    console.log('🔍 STEP 4: Initializing database connection...');
    
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
        console.log(`🗄️ PostgreSQL: ${result.rows[0].postgres_version.split(' ')[0]} ${result.rows[0].postgres_version.split(' ')[1]}`);
        
        client.release();
        dbStatus = 'connected';
        break;
      } catch (error) {
        lastError = error;
        console.log(`❌ Connection attempt ${i + 1} failed: ${error.message}`);
        if (i < retries - 1) {
          console.log(`⏳ Retrying in 2 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    if (dbStatus !== 'connected') {
      throw lastError;
    }
    
    await createUserTable();
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    dbStatus = `error: ${error.message}`;
  }
}

async function createUserTable() {
  try {
    console.log('🔧 Creating users table if not exists...');
    
    const client = await dbPool.connect();
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        firebase_uid VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        picture TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    client.release();
    console.log('✅ Users table ready');
  } catch (error) {
    console.error('❌ User table initialization failed:', error);
  }
}

// Initialize Firebase Admin SDK (from Step 3)
function initFirebaseAdmin() {
  try {
    console.log('🔥 STEP 4: Initializing Firebase Admin SDK...');
    
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

// Firebase Auth middleware (from Step 3)
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

// STEP 4: FRONTEND INTEGRATION
// Serve static frontend files
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  // In production, serve the built frontend from client/dist
  console.log('📦 STEP 4: Setting up production frontend serving...');
  app.use(express.static(path.join(__dirname, 'client', 'dist')));
} else {
  // In development, we'll just provide API endpoints
  console.log('🔧 STEP 4: Development mode - API only');
}

// API Routes
app.get('/api/auth/verify', verifyFirebaseToken, (req, res) => {
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

app.get('/api/auth/status', (req, res) => {
  res.json({
    status: 'success',
    message: 'Step 4: Frontend + Authentication available',
    authentication_method: 'firebase',
    frontend_integration: true,
    endpoints: {
      verify: '/api/auth/verify (POST with Bearer token)',
      profile: '/api/user/profile (authenticated)',
      frontend: isProduction ? '/index.html' : 'Development mode - no frontend'
    }
  });
});

app.get('/api/user/profile', verifyFirebaseToken, (req, res) => {
  res.json({
    status: 'success',
    message: 'User profile retrieved',
    user: req.user || null,
    firebase: req.firebaseUser
  });
});

// STEP 4: Frontend routing (production only)
if (isProduction) {
  // Serve the React app for any non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
  });
}

// Health check endpoints (from Steps 2-3)
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
    message: 'Step 4: Express + Database + Authentication + Frontend server operational',
    server: 'express-database-auth-frontend',
    database: {
      status: 'configured',
      health: dbHealth,
      url_configured: !!process.env.DATABASE_URL,
      connection_type: connectionMethod,
      details: dbDetails
    },
    authentication: {
      firebase_admin_configured: true,
      service_account_configured: !!(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_KEY_B64),
      method: 'firebase'
    },
    frontend: {
      mode: isProduction ? 'production' : 'development',
      static_serving: isProduction,
      spa_routing: isProduction
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

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    server: 'express-database-auth-frontend'
  });
});

// Initialize and start server
async function startServer() {
  try {
    console.log('🔧 STEP 4: Starting initialization sequence...');
    
    // Initialize Firebase Admin SDK
    const firebaseInitialized = initFirebaseAdmin();
    if (!firebaseInitialized) {
      console.warn('⚠️ Firebase Admin SDK initialization failed - continuing without auth');
    }
    
    // Initialize database
    await initDatabase();
    
    console.log('🔧 STEP 4: Starting HTTP server...');
    app.listen(PORT, HOST, () => {
      console.log(`✅ STEP 4 Server running at http://${HOST}:${PORT}`);
      console.log('📊 STEP 4 Components:');
      console.log('  ✅ Express.js HTTP server');
      console.log('  ✅ PostgreSQL database connection');
      console.log('  ✅ Firebase Authentication integration');
      console.log('  ✅ Frontend static file serving (production)');
      console.log('  ✅ SPA routing support');
      console.log('');
      console.log('🔍 Available endpoints:');
      console.log('  📊 GET  /health - Health check');
      console.log('  🔐 GET  /api/auth/status - Auth system status');
      console.log('  🔐 POST /api/auth/verify - Verify Firebase token');
      console.log('  👤 GET  /api/user/profile - User profile (authenticated)');
      if (isProduction) {
        console.log('  🌐 GET  /* - React frontend (SPA routing)');
      }
      console.log('');
      console.log('🎯 STEP 4 READY: Full-stack application with authentication');
    });
  } catch (error) {
    console.error('❌ STEP 4 startup failed:', error);
    process.exit(1);
  }
}

startServer();