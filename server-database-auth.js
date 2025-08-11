// STEP 3: EXPRESS + DATABASE + AUTHENTICATION SERVER
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import pkg from 'pg';
const { Pool } = pkg;

const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

console.log('🚀 STEP 3 SERVER: Starting Express + Database + Authentication...');
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
    
    // Create users table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        google_id VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        picture TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✅ Users table ready');
    client.release();
  } catch (error) {
    console.error('❌ User table initialization failed:', error);
  }
}

// Session Configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'realm-rivalry-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
};

app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log(`🔍 STEP 3: Google auth callback for user: ${profile.emails[0].value}`);
    
    if (!dbPool) {
      return done(new Error('Database not connected'));
    }
    
    const client = await dbPool.connect();
    
    // Check if user exists
    const existingUser = await client.query(
      'SELECT * FROM users WHERE google_id = $1',
      [profile.id]
    );
    
    let user;
    
    if (existingUser.rows.length > 0) {
      // Update existing user
      user = await client.query(
        'UPDATE users SET email = $1, name = $2, picture = $3, updated_at = CURRENT_TIMESTAMP WHERE google_id = $4 RETURNING *',
        [
          profile.emails[0].value,
          profile.displayName,
          profile.photos[0]?.value,
          profile.id
        ]
      );
      console.log(`✅ Updated existing user: ${profile.emails[0].value}`);
    } else {
      // Create new user
      user = await client.query(
        'INSERT INTO users (google_id, email, name, picture) VALUES ($1, $2, $3, $4) RETURNING *',
        [
          profile.id,
          profile.emails[0].value,
          profile.displayName,
          profile.photos[0]?.value
        ]
      );
      console.log(`✅ Created new user: ${profile.emails[0].value}`);
    }
    
    client.release();
    return done(null, user.rows[0]);
  } catch (error) {
    console.error('❌ Google auth error:', error);
    return done(error);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    if (!dbPool) {
      return done(new Error('Database not connected'));
    }
    
    const client = await dbPool.connect();
    const result = await client.query('SELECT * FROM users WHERE id = $1', [id]);
    client.release();
    
    if (result.rows.length > 0) {
      done(null, result.rows[0]);
    } else {
      done(new Error('User not found'));
    }
  } catch (error) {
    done(error);
  }
});

// Authentication Routes
app.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/auth/failure' }),
  (req, res) => {
    console.log(`✅ STEP 3: User authenticated successfully: ${req.user.email}`);
    res.redirect('/auth/success');
  }
);

app.get('/auth/success', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      status: 'success',
      message: 'Authentication successful',
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        picture: req.user.picture
      }
    });
  } else {
    res.status(401).json({
      status: 'error',
      message: 'Not authenticated'
    });
  }
});

app.get('/auth/failure', (req, res) => {
  res.status(401).json({
    status: 'error',
    message: 'Authentication failed'
  });
});

app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({
        status: 'error',
        message: 'Logout failed'
      });
    }
    res.json({
      status: 'success',
      message: 'Logged out successfully'
    });
  });
});

app.get('/auth/status', (req, res) => {
  res.json({
    status: 'success',
    authenticated: req.isAuthenticated(),
    user: req.isAuthenticated() ? {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      picture: req.user.picture
    } : null
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
      google_oauth_configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      session_configured: true,
      passport_initialized: true
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
app.get('/api/user/profile', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required'
    });
  }
  
  res.json({
    status: 'success',
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      picture: req.user.picture,
      created_at: req.user.created_at
    }
  });
});

// Start server
async function startServer() {
  try {
    console.log('🔍 STEP 3: Starting server initialization...');
    
    // Initialize database first
    const dbConnected = await initDatabase();
    if (!dbConnected) {
      console.log('⚠️ Warning: Database connection failed, but server will start anyway');
    }
    
    // Start HTTP server
    app.listen(PORT, HOST, () => {
      console.log('✅ STEP 3 SERVER READY');
      console.log(`🌍 Server running at: http://${HOST}:${PORT}`);
      console.log(`🔍 Database status: ${dbStatus}`);
      console.log(`🔐 Authentication: Google OAuth configured`);
      console.log(`📊 Health check: /health`);
      console.log(`🔑 Auth endpoints: /auth/google, /auth/status`);
    });
  } catch (error) {
    console.error('❌ STEP 3: Server startup failed:', error);
    process.exit(1);
  }
}

startServer();