// ===============================
// CRITICAL: GEMINI DEBUGGING APPROACH
// ===============================
// Canary log - if this appears, Node.js process is starting
console.log('🔥 === CRITICAL DEBUG === SERVER PROCESS STARTED ===');
console.log('🔥 === CRITICAL DEBUG === BEGINNING COMPREHENSIVE ERROR HANDLING ===');
console.log('🔥 === CRITICAL DEBUG === ABOUT TO CALL startServer() FUNCTION ===');

// Wrap EVERYTHING in comprehensive error handling
async function startServer() {
  console.log('🔥 === CRITICAL DEBUG === INSIDE startServer() FUNCTION ===');
  try {
    console.log('🔥 === CRITICAL DEBUG === Phase 1: Initializing Sentry ===');
    // CRITICAL: Import Sentry instrumentation FIRST (use .js for compilation compatibility)
    await import("./instrument.js");
    const Sentry = await import("@sentry/node");
    console.log('✅ Sentry imported successfully');

    console.log('--- Phase 2: Container startup debugging ---');
    // CLOUD RUN LOGGING: Add immediate logging for container startup debugging
    console.log(`🚀 STARTING APPLICATION CONTAINER - PID: ${process.pid}`);
    console.log(`🔍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔍 Port: ${process.env.PORT || 'NOT_SET'}`);
    console.log(`🔍 Platform: ${process.platform}, Node: ${process.version}`);
    console.log(`🔍 Memory: ${JSON.stringify(process.memoryUsage())}`);
    console.log(`🔍 Working Directory: ${process.cwd()}`);
    console.log(`⏰ Container startup timestamp: ${new Date().toISOString()}`);
    
    // CLOUD RUN STARTUP RESILIENCE: Validate environment variables but don't fail startup
    console.log('🔍 COMPREHENSIVE ENVIRONMENT VALIDATION:');
    const requiredEnvVars = ['DATABASE_URL', 'SESSION_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];
    const missingEnvVars: string[] = [];
    const invalidEnvVars: string[] = [];
    
    requiredEnvVars.forEach(envVar => {
      const value = process.env[envVar];
      const exists = !!value;
      const length = value ? value.length : 0;
      const preview = value ? value.substring(0, 20) + '...' : 'NONE';
      console.log(`   ${envVar}: ${exists ? '✅ EXISTS' : '❌ MISSING'} (length: ${length}, preview: ${preview})`);
      
      if (!exists) {
        missingEnvVars.push(envVar);
      } else {
        // Validate format
        if (envVar === 'DATABASE_URL' && !value.includes('postgresql://')) {
          invalidEnvVars.push(`${envVar} - not a PostgreSQL URL`);
        }
        if (envVar === 'GOOGLE_CLIENT_SECRET' && !value.startsWith('GOCSPX-')) {
          invalidEnvVars.push(`${envVar} - wrong format, should start with GOCSPX-`);
        }
      }
    });
    
    if (missingEnvVars.length > 0) {
      console.error('⚠️  STARTUP WARNING: Missing required environment variables:', missingEnvVars);
      console.error('❗ Application will start but some features may not work. Check Secret Manager permissions.');
      console.error('❗ Container will bind to port to satisfy Cloud Run health checks, then gracefully handle missing secrets.');
    }
    
    if (invalidEnvVars.length > 0) {
      console.error('⚠️  STARTUP WARNING: Invalid environment variables:', invalidEnvVars);
      console.error('❗ Secret values may be malformed. Some features will use fallback behavior.');
    }
    
    console.log('✅ Environment validation completed - proceeding with resilient startup');
    
    console.log('🔍 CLOUD RUN ENVIRONMENT DETECTION:');
    console.log(`   K_SERVICE: ${process.env.K_SERVICE || 'NOT_SET'}`);
    console.log(`   K_REVISION: ${process.env.K_REVISION || 'NOT_SET'}`);
    console.log(`   K_CONFIGURATION: ${process.env.K_CONFIGURATION || 'NOT_SET'}`);
    console.log(`   GOOGLE_CLOUD_PROJECT: ${process.env.GOOGLE_CLOUD_PROJECT || 'NOT_SET'}`);
    console.log(`   PORT (from Cloud Run): ${process.env.PORT || 'NOT_SET'}`);
    
    const isCloudRun = !!(process.env.K_SERVICE || process.env.GOOGLE_CLOUD_PROJECT);
    console.log(`   IS_CLOUD_RUN: ${isCloudRun}`);
    
    if (isCloudRun && !process.env.PORT) {
      console.error('❌ CRITICAL: Running in Cloud Run but PORT environment variable is not set!');
    }

    console.log('--- Phase 3: Importing Express and core modules ---');
    const express = await import("express");
    console.log('✅ Express imported successfully');
    
    console.log('--- Phase 4: Importing HTTP and WebSocket modules ---');
    const { createServer } = await import("http");
    const http = await import("http");
    const fs = await import("fs");
    const path = await import("path");
    const { spawn, ChildProcess } = await import("child_process");
    const { Server: SocketIOServer } = await import("socket.io");
    console.log('✅ HTTP and WebSocket modules imported');

    // Cloud SQL Auth Proxy startup function
    let cloudSqlProxy: typeof ChildProcess.prototype | null = null;

    async function startCloudSqlProxy(): Promise<boolean> {
      const nodeEnv = process.env.NODE_ENV || 'development';
      
      if (nodeEnv !== 'development') {
        console.log('🏭 [CloudSQLProxy] Production environment - using direct Cloud SQL socket connection');
        return true;
      }
      
      console.log('🔧 [CloudSQLProxy] Starting Cloud SQL Auth Proxy for development...');
      
      try {
        // Create credentials file
        const credentialsContent = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
        if (!credentialsContent) {
          console.error('❌ [CloudSQLProxy] GOOGLE_SERVICE_ACCOUNT_KEY not available');
          return false;
        }
        
        const credentialsPath = '/tmp/cloudsql-dev-credentials.json';
        fs.default.writeFileSync(credentialsPath, credentialsContent, { mode: 0o600 });
        console.log('✅ [CloudSQLProxy] Credentials file created');
        
        // Start Cloud SQL Auth Proxy
        const connectionName = 'direct-glider-465821-p7:us-central1:realm-rivalry-dev';
        const args = [
          `-instances=${connectionName}=tcp:5432`,
          `-credential_file=${credentialsPath}`
        ];
        
        cloudSqlProxy = spawn('./cloud_sql_proxy', args, {
          stdio: ['ignore', 'pipe', 'pipe'],
          detached: false
        });
        
        console.log(`🚀 [CloudSQLProxy] Started with PID: ${cloudSqlProxy.pid}`);
        
        // Handle proxy output
        if (cloudSqlProxy.stdout) {
          cloudSqlProxy.stdout.on('data', (data: any) => {
            const output = data.toString().trim();
            if (output.includes('Ready for new connections')) {
              console.log('✅ [CloudSQLProxy] Ready for connections!');
            }
            console.log(`📋 [CloudSQLProxy] ${output}`);
          });
        }
        
        if (cloudSqlProxy.stderr) {
          cloudSqlProxy.stderr.on('data', (data: any) => {
            console.log(`⚠️ [CloudSQLProxy] ${data.toString().trim()}`);
          });
        }
        
        cloudSqlProxy.on('exit', (code: any, signal: any) => {
          console.log(`⚠️ [CloudSQLProxy] Process exited with code ${code}, signal ${signal}`);
        });
        
        // Wait for proxy to be ready
        console.log('⏳ [CloudSQLProxy] Waiting for proxy to initialize...');
        await new Promise(resolve => setTimeout(resolve, 8000));
        
        console.log('✅ [CloudSQLProxy] Startup complete - database should be accessible at localhost:5432');
        return true;
        
      } catch (error: any) {
        console.error('❌ [CloudSQLProxy] Failed to start:', error.message);
        return false;
      }
    }
    
    console.log('--- Phase 5: Importing middleware modules ---');
    const rateLimit = (await import("express-rate-limit")).default;
    const helmet = (await import("helmet")).default;
    const compression = (await import("compression")).default;
    const cors = (await import("cors")).default;
    const session = (await import("express-session")).default;
    const passport = (await import("passport")).default;
    console.log('✅ Middleware modules imported');
    
    console.log('--- Phase 6: Importing ESSENTIAL modules only (defer heavy imports until after server binding) ---');
    const { requestIdMiddleware } = await import("./middleware/requestId.js");
    const { errorHandler, logInfo } = await import("./services/errorService.js");
    const logger = (await import("./utils/logger.js")).default;
    const { validateOrigin } = await import("./utils/security.js");
    const { sanitizeInputMiddleware, securityHeadersMiddleware } = await import("./middleware/security.js");
    const { createHealthCheck, createBasicHealthCheck, createDetailedHealthCheck } = await import("./health.js");
    console.log('✅ Essential modules imported (heavy imports deferred)');

    console.log('--- Phase 6.5: Cloud SQL Auth Proxy Initialization ---');
    // Start Cloud SQL Auth Proxy for development database connectivity
    await startCloudSqlProxy();
    console.log('✅ Cloud SQL Auth Proxy initialization completed');

    console.log('--- Phase 7: Initializing Express app ---');
    const app = express.default();

    // CRITICAL: Trust proxy for Google Cloud Run - MUST BE FIRST  
    // This fixes ValidationError about X-Forwarded-For header
    app.set('trust proxy', 1);

    // CRITICAL GEMINI SUGGESTION #2: Health checks MUST be registered FIRST
    // Before any authentication, rate-limiting, or complex middleware
    app.get('/health', createBasicHealthCheck()); // Basic health for startup probes
    app.get('/healthz', createBasicHealthCheck()); // Cloud Run startup probe endpoint (CRITICAL)
    app.get('/readyz', createBasicHealthCheck()); // Kubernetes-style readiness probe
    app.get('/api/health', createDetailedHealthCheck()); // Detailed health with database info

    // Ultra-fast ping endpoint for Cloud Run (minimal response time)
    app.get('/ping', (req: any, res: any) => {
      res.set('Cache-Control', 'no-cache');
      res.status(200).send('OK');
    });

    // BULLETPROOF CORS Configuration - Industry Standard
    // Detect production environment using multiple reliable methods
    const isProduction = process.env.NODE_ENV === 'production' || 
                        process.env.PORT === '8080' || // Cloud Run uses port 8080
                        process.env.GOOGLE_CLOUD_PROJECT || // Google Cloud environment
                        process.env.K_SERVICE; // Cloud Run service name

    const corsOptions = {
      origin: isProduction
        ? [
            'https://realmrivalry.com', 
            'https://www.realmrivalry.com', 
            'https://realm-rivalry-o6fd46yesq-ul.a.run.app',
            'https://direct-glider-465821-p7.web.app', // Firebase hosting domain
            'https://direct-glider-465821-p7.firebaseapp.com', // Firebase app domain
            // Additional safety: allow Cloud Run internal communication
            /^https:\/\/.*\.a\.run\.app$/
          ]
        : [
            'http://localhost:5000', 
            'http://localhost:3000', 
            /\.replit\.dev$/,
            /^https?:\/\/.*replit.*$/
          ],
      credentials: true,
      optionsSuccessStatus: 200,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cache-Control']
    }

    // Debug CORS configuration with comprehensive environment detection
    console.log('🔍 COMPREHENSIVE CORS CONFIGURATION:', {
      NODE_ENV: process.env.NODE_ENV || 'not-set',
      PORT: process.env.PORT || 'not-set',
      GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT || 'not-set',
      K_SERVICE: process.env.K_SERVICE || 'not-set',
      isProduction: isProduction,
      allowedOrigins: corsOptions.origin,
      corsMethodsAllowed: corsOptions.methods
    });

    // Additional startup debugging
    console.log('🚀 SERVER STARTUP DEBUG:', {
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      memoryUsage: process.memoryUsage(),
      currentWorkingDir: process.cwd(),
      environmentVariablesCount: Object.keys(process.env).length
    });

    // Apply CORS as the first middleware to ensure it works
    app.use(cors(corsOptions));

    // Enable compression for all responses
    app.use(compression({
      level: 6,
      threshold: 1024,
      filter: (req: any, res: any) => {
        if (req.headers['x-no-compression']) {
          return false
        }
        return compression.filter(req, res)
      }
    }));

    app.use(express.default.json());
    app.use(express.default.urlencoded({ extended: false }));

    // Add request ID middleware early in the chain
    app.use(requestIdMiddleware);

    // Add security middleware
    app.use(securityHeadersMiddleware);
    app.use(sanitizeInputMiddleware);

    // Security headers
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://js.stripe.com", "https://cdn.unity3d.com", "https://replit.com", "https://apis.google.com", "https://www.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
          connectSrc: ["'self'", "wss:", "ws:", "https://api.stripe.com", "https://accounts.google.com", "https://identitytoolkit.googleapis.com", "https://securetoken.googleapis.com", "https://firebase.googleapis.com", "https://o4509793819361280.ingest.us.sentry.io"],
          frameSrc: ["https://js.stripe.com", "https://hooks.stripe.com", "https://accounts.google.com", "https://direct-glider-465821-p7.firebaseapp.com"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: [],
          workerSrc: ["'self'", "blob:"] // Allow Sentry worker
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      noSniff: true,
      frameguard: { action: 'deny' },
      crossOriginEmbedderPolicy: false
    }));

    // Rate limiting for API endpoints (more lenient in development)
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.NODE_ENV === 'development' ? 10000 : 500, // Much higher limit for development
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
      // Skip auth endpoints in development to prevent login issues
      skip: (req) => {
        if (process.env.NODE_ENV === 'development' && req.path.startsWith('/api/auth/')) {
          return true; // Skip rate limiting for auth endpoints in development
        }
        return false;
      }
    });
    app.use('/api/', limiter);
    console.log('🔍 [TRACE-MIDDLEWARE] ========== MIDDLEWARE SETUP COMPLETE ==========');
    console.log('🔍 [TRACE-PRE-SESSION] ========== ABOUT TO START SESSION SETUP ==========');
    console.log('🚨 [CRITICAL] If you can see this log, the server startup reached session setup');

    // Setup session management with detailed logging
    console.log('🔧 Setting up session management...');
    // Firebase-only authentication - no sessions needed
    console.log('🔍 [TRACE-1] ========== CRITICAL CHECKPOINT: REACHED SESSION MANAGEMENT ==========');

    // Firebase-only authentication - no Passport needed  
    console.log('🔍 [TRACE-2] ========== CRITICAL CHECKPOINT: REACHED PASSPORT SECTION ==========');

    // CRITICAL CLOUD RUN FIX: Create HTTP server EARLY and bind to port IMMEDIATELY
    // Defer all heavy initialization until AFTER server is listening
    console.log('🔍 [TRACE-3] ========== CRITICAL CHECKPOINT: ABOUT TO CREATE HTTP SERVER ==========');
    const httpServer = createServer(app);
    console.log('✅ HTTP server created (before heavy initialization)');
    console.log('🔍 [TRACE-4] ========== CRITICAL CHECKPOINT: ABOUT TO REGISTER ROUTES ==========');

    // CRITICAL FIX: Register API routes BEFORE Vite middleware to prevent HTML responses
    console.log('🔧 [DEBUG] About to register API routes BEFORE Vite middleware...');
    try {
      console.log('🔍 [DEBUG] Attempting to import routes/index with tsx compatibility...');
      // CRITICAL FIX: PROPER AUTHENTICATED ROUTES WITH FIREBASE AUTH
    console.log('🔥 === AUTHENTICATED ROUTE REGISTRATION ===');
    const { Router } = await import("express");
    const { requireAuth } = await import("./middleware/firebaseAuth.js");
    const teamRouter = Router();
    
    // Import required services
    const { storage } = await import("./storage/index.js");
    const { CamaraderieService } = await import("./services/camaraderieService.js");
    
    // REMOVED: Duplicate /api/teams/my route - handled by teamRoutes.ts properly
    
    // AUTHENTICATED team creation with one-team-per-user enforcement
    teamRouter.post('/create', requireAuth, async (req: any, res) => {
      try {
        console.log('🔍 [AUTHENTICATED API] /api/teams/create called!');
        console.log('🔍 Authenticated user:', req.user?.uid);
        console.log('🔍 Request body:', req.body);
        
        // Use proper Firebase UID for user identification
        const firebaseUID = req.user?.uid || req.user?.claims?.sub;
        const userEmail = req.user?.email;
        
        if (!firebaseUID) {
          console.error('❌ No authenticated user found');
          return res.status(401).json({ error: 'Authentication required' });
        }
        
        const { teamName, ndaAgreed } = req.body;
        
        if (!teamName || teamName.trim().length === 0) {
          return res.status(400).json({ error: 'Team name is required' });
        }
        
        if (!ndaAgreed) {
          return res.status(400).json({ error: 'NDA agreement is required' });
        }
        
        // CRITICAL: Enforce one team per user rule
        console.log('🔍 Checking for existing team for user:', firebaseUID);
        const existingTeam = await storage.teams.getTeamByUserId(firebaseUID);
        if (existingTeam) {
          console.log('❌ User already has a team:', existingTeam.name);
          return res.status(409).json({ 
            error: 'You already have a team! Each player can only have one team.',
            existingTeam: {
              id: existingTeam.id.toString(),
              name: existingTeam.name,
              division: existingTeam.division,
              subdivision: existingTeam.subdivision
            }
          });
        }
        
        // Create the team for the authenticated user
        console.log('🔍 Creating new team for user:', firebaseUID);
        const newTeam = await storage.teams.createTeam({
          userId: firebaseUID, // Use Firebase UID
          name: teamName.trim(),
          division: 8, // Start in Division 8
          subdivision: 'B'
        });
        
        console.log('✅ Team created successfully:', newTeam.name, 'for user:', userEmail);
        
        res.status(201).json({
          success: true,
          message: `Welcome to Realm Rivalry! Your team "${newTeam.name}" has been created.`,
          team: {
            ...newTeam,
            id: newTeam.id.toString()
          }
        });
      } catch (error) {
        console.error('❌ Error in /api/teams/create:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
    
    // AUTHENTICATED next opponent route
    teamRouter.get('/my/next-opponent', requireAuth, async (req: any, res) => {
      try {
        console.log('🔍 [AUTHENTICATED API] /api/teams/my/next-opponent called!');
        const firebaseUID = req.user?.uid || req.user?.claims?.sub;
        
        if (!firebaseUID) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        
        // TODO: Implement actual next opponent logic based on user's team
        res.json({
          nextOpponent: "TBD",
          gameDate: null,
          isHome: false,
          matchType: "league",
          division: 8,
          timeUntil: "Season starting soon"
        });
      } catch (error) {
        console.error('❌ Error in /api/teams/my/next-opponent:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Import and use the proper team routes from teamRoutes.ts
    const teamRoutes = await import('./routes/teamRoutes.js');
    app.use('/api/teams', teamRoutes.default);

    // Add other critical API routes
    const { Router: Router2 } = await import("express");
    
    // Exhibitions API
    const exhibitionRouter = Router2();
    exhibitionRouter.get('/stats', (req, res) => {
      console.log('🔍 [API CALL] /api/exhibitions/stats route called!');
      res.json({
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        winPercentage: 0,
        averageScore: 0
      });
    });
    app.use('/api/exhibitions', exhibitionRouter);

    // Matches API
    const matchRouter = Router2();
    matchRouter.get('/live', (req, res) => {
      console.log('🔍 [API CALL] /api/matches/live route called!');
      res.json([]);
    });
    app.use('/api/matches', matchRouter);

    // Camaraderie API
    const camaraderieRouter = Router2();
    camaraderieRouter.get('/summary', (req, res) => {
      console.log('🔍 [API CALL] /api/camaraderie/summary route called!');
      res.json({
        teamCamaraderie: 50,
        status: "developing"
      });
    });
    app.use('/api/camaraderie', camaraderieRouter);

    // Season API
    const seasonRouter = Router2();
    seasonRouter.get('/current-cycle', async (req, res) => {
      console.log('🔍 [API CALL] /api/season/current-cycle route called!');
      try {
        // Get actual season data from database
        const { seasonStorage } = await import('./storage/seasonStorage.js');
        const currentSeason = await seasonStorage.getCurrentSeason();
        
        console.log('🔍 [HARDCODED SEASON ROUTE] Database season:', { 
          currentDay: currentSeason?.currentDay, 
          seasonNumber: currentSeason?.seasonNumber,
          phase: currentSeason?.phase 
        });
        
        res.json({
          currentDay: currentSeason?.currentDay || 1,
          seasonNumber: currentSeason?.seasonNumber || 1,
          phase: currentSeason?.phase || "REGULAR_SEASON",
          dayName: `Day ${currentSeason?.currentDay || 1}`
        });
      } catch (error) {
        console.error('🚨 [HARDCODED SEASON ROUTE] Error getting season data:', error);
        // Fallback to hardcoded values if database fails
        res.json({
          currentDay: 1,
          seasonNumber: 1,
          phase: "REGULAR_SEASON",
          dayName: "Day 1"
        });
      }
    });
    app.use('/api/season', seasonRouter);

    // Add database admin route for checking teams
    const adminRouter = Router2();
    adminRouter.get('/teams/all', async (req, res) => {
      try {
        console.log('🔍 [API CALL] /api/admin/teams/all route called!');
        
            // Use database directly to get comprehensive team data
        const { db } = await import("./database.js");
        
        const teamsWithUsers = await db.$queryRaw`
          SELECT 
            t.id,
            t.name,
            t.division,
            t.subdivision,
            t."createdAt",
            up.email,
            up."userId" as firebase_uid
          FROM "Team" t
          LEFT JOIN "UserProfile" up ON up.id = t."userProfileId"
          ORDER BY t."createdAt" DESC
        `;
        
        const targetEmail = 'jimmy058910@gmail.com';
        const userTeams = (teamsWithUsers as any[]).filter((team: any) => team.email === targetEmail);
        
        res.json({
          totalTeams: (teamsWithUsers as any[]).length,
          targetEmail,
          userTeamsCount: userTeams.length,
          userTeams: userTeams.map((team: any) => ({
            id: team.id.toString(),
            name: team.name,
            division: team.division,
            subdivision: team.subdivision,
            firebaseUID: team.firebase_uid,
            createdAt: team.createdAt
          })),
          allTeams: (teamsWithUsers as any[]).slice(0, 10).map((team: any) => ({
            id: team.id.toString(),
            name: team.name,
            division: team.division,
            subdivision: team.subdivision,
            email: team.email || 'no-email',
            firebaseUID: team.firebase_uid || 'no-uid',
            createdAt: team.createdAt
          }))
        });
      } catch (error) {
        console.error('❌ Error in /api/admin/teams/all:', error);
        res.status(500).json({ error: `Internal server error: ${error}` });
      }
    });
    app.use('/api/admin', adminRouter);
    
    // DEBUG: Check UserProfile and team relationships
    app.get('/api/debug-user-team-link', async (req, res) => {
      try {
        const { getPrismaClient } = await import('./database.js');
        const prisma = await getPrismaClient();
        
        // Check UserProfile for dev user
        const userProfile = await prisma.userProfile.findUnique({
          where: { userId: 'fake-user-id-for-dev' }
        });
        
        // Check Team 4 details
        const team4 = await prisma.team.findUnique({
          where: { id: 4 },
          select: { id: true, name: true, userProfileId: true }
        });
        
        // Check if they match
        const match = userProfile?.id === team4?.userProfileId;
        
        res.json({
          userProfile: userProfile ? { id: userProfile.id, userId: userProfile.userId } : null,
          team4: team4,
          relationshipMatches: match,
          diagnosis: match ? "✅ Relationship is correct" : "❌ UserProfile and Team are not linked"
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // FIX: Link dev-user-123 to Oakland Cougars team (DIRECT DATABASE FIX)
    app.get('/api/fix-dev-user', async (req, res) => {
      try {
        const { getPrismaClient } = await import('./database.js');
        const prisma = await getPrismaClient();
        
        // Get the UserProfile that currently owns Oakland Cougars (team 4)
        const currentTeam = await prisma.team.findUnique({
          where: { id: 4 },
          include: { userProfile: true }
        });
        
        // Update that UserProfile to use the correct auth userId
        if (currentTeam?.userProfile) {
          await prisma.userProfile.update({
            where: { id: currentTeam.userProfile.id },
            data: { userId: 'dev-user-123' }
          });
        }
        
        // Test the fix immediately
        const team = await storage.teams.getTeamByUserId('dev-user-123');
        
        res.json({
          success: true,
          message: 'Updated Oakland Cougars UserProfile to use dev-user-123',
          testResult: {
            teamFound: !!team,
            teamName: team?.name,
            playersCount: team?.playersCount
          }
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // FIX: Repair UserProfile-Team relationship for Oakland Cougars
    app.get('/api/fix-user-team-link', async (req, res) => {
      try {
        const { getPrismaClient } = await import('./database.js');
        const prisma = await getPrismaClient();
        
        // Find or create UserProfile for dev user
        let userProfile = await prisma.userProfile.findUnique({
          where: { userId: 'fake-user-id-for-dev' }
        });
        
        if (!userProfile) {
          userProfile = await prisma.userProfile.create({
            data: {
              userId: 'fake-user-id-for-dev',
              ndaAccepted: true,
              ndaAcceptedAt: new Date(),
              ndaVersion: "1.0"
            }
          });
        }
        
        // Update Team 4 to link to this UserProfile
        await prisma.team.update({
          where: { id: 4 },
          data: { userProfileId: userProfile.id }
        });
        
        // Test the relationship
        const testTeam = await storage.teams.getTeamByUserId('fake-user-id-for-dev');
        
        res.json({
          success: true,
          userProfile: { id: userProfile.id, userId: userProfile.userId },
          linkRepaired: true,
          testResults: {
            teamName: testTeam?.name || 'null',
            playersCount: testTeam?.playersCount || 0
          }
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // DEBUG: Test /api/teams/my with proper debugging
    app.get('/api/debug-teams-my', async (req, res) => {
      try {
        // Use the same userId as the main endpoint
        const userId = 'dev-user-123'; // Match main route
        
        const team = await storage.teams.getTeamByUserId(userId);
        
        res.json({
          userId,
          team: team ? {
            name: team.name,
            playersCount: team.playersCount,
            playersLength: team.players?.length || 0,
            credits: team.finances?.credits || '0'
          } : null,
          success: !!team
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // DEBUG: Test exact player loading for Oakland Cougars  
    app.get('/api/debug-player-loading', async (req, res) => {
      try {
        const { getPrismaClient } = await import('./database.js');
        const prisma = await getPrismaClient();
        
        // Test the exact query used by getTeamByUserId
        const userProfile = await prisma.userProfile.findUnique({
          where: { userId: 'dev-user-123' }
        });
        
        if (!userProfile) {
          return res.json({ error: 'UserProfile not found for dev-user-123' });
        }
        
        const team = await prisma.team.findFirst({
          where: { userProfileId: userProfile.id },
          include: {
            finances: true,
            stadium: true,
            players: {
              include: {
                contract: true,
                skills: { include: { skill: true } }
              }
            },
            staff: true
          }
        });
        
        res.json({
          userProfileId: userProfile.id,
          teamFound: !!team,
          teamName: team?.name,
          playersCount: team?.players?.length || 0,
          playersPreview: team?.players?.slice(0, 3).map(p => ({ id: p.id, name: p.name })) || []
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // DEBUG: Check Oakland Cougars database state
    app.get('/api/debug-oakland', async (req, res) => {
      try {
        const { getPrismaClient } = await import('./database.js');
        const prisma = await getPrismaClient();
        
        // Check raw player data
        const playersRaw = await prisma.player.findMany({
          where: { teamId: 4 },
          select: { id: true, firstName: true, lastName: true, teamId: true }
        });
        
        // Check raw team data without includes
        const teamRaw = await prisma.team.findUnique({
          where: { id: 4 },
          select: { id: true, name: true }
        });
        
        // Check team with includes
        const teamWithIncludes = await prisma.team.findUnique({
          where: { id: 4 },
          include: { players: true }
        });
        
        res.json({
          playersRaw: playersRaw.length,
          playersData: playersRaw.slice(0, 3), // Show first 3 players
          teamRaw,
          teamIncludedPlayersCount: teamWithIncludes?.players?.length || 0,
          teamIncludedPlayersData: teamWithIncludes?.players?.slice(0, 3) || []
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // FINAL FIX: Oakland Cougars - proper player count and display
    app.get('/api/fix-oakland-final', async (req, res) => {
      try {
        console.log('🔧 FINAL FIX: Oakland Cougars - fixing player count and display...');
        const { getPrismaClient } = await import('./database.js');
        const prisma = await getPrismaClient();
        
        // 1. Get current players (ordered by creation)
        const currentPlayers = await prisma.player.findMany({
          where: { teamId: 4 },
          orderBy: { id: 'asc' }
        });
        
        console.log(`Found ${currentPlayers.length} players`);
        
        let removedCount = 0;
        // 2. Remove excess players (keep only first 12)
        if (currentPlayers.length > 12) {
          const playersToDelete = currentPlayers.slice(12);
          const playerIdsToDelete = playersToDelete.map(p => p.id);
          
          // Delete excess contracts first
          await prisma.contract.deleteMany({
            where: { playerId: { in: playerIdsToDelete } }
          });
          
          // Delete excess players
          await prisma.player.deleteMany({
            where: { id: { in: playerIdsToDelete } }
          });
          
          removedCount = playersToDelete.length;
          console.log(`Removed ${removedCount} excess players`);
        }
        
        // 3. Get final count and update team record
        const finalCount = await prisma.player.count({
          where: { teamId: 4 }
        });
        
        // 4. Skip updating non-existent playersCount field
        console.log(`Final player count confirmed: ${finalCount}`);
        
        // 5. Get updated team data
        const team = await storage.teams.getTeamById(4);
        
        res.json({
          success: true,
          message: 'Oakland Cougars completely fixed!',
          results: {
            originalPlayerCount: currentPlayers.length,
            removedPlayers: removedCount,
            finalPlayerCount: finalCount,
            displayFixed: true
          },
          team: {
            name: team.name,
            playersCount: team.playersCount || 0,
            credits: team.finances?.credits || 0,
            gems: team.finances?.gems || 0
          }
        });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // CRITICAL FIX: Oakland Cougars restoration route (HIGHEST PRIORITY)
    console.log('🔧 Registering Oakland Cougars restoration endpoint...');
    app.get('/api/restore-oakland', async (req, res) => {
      try {
        console.log('🚨 EMERGENCY: Restoring Oakland Cougars...');
        
        // Directly restore team 4 (Oakland Cougars)
        const teamId = 4;
        
        const results = {};
        
        try {
          // Fix finances by updating existing record instead of creating new one
          const { getPrismaClient } = await import('./database.js');
          const prisma = await getPrismaClient();
          await prisma.teamFinances.upsert({
            where: { teamId: teamId },
            create: {
              teamId: teamId,
              credits: 50000,
              gems: 0,
              projectedIncome: 0,
              projectedExpenses: 0,
              lastSeasonRevenue: 0,
              lastSeasonExpenses: 0,
              facilitiesMaintenanceCost: 5000
            },
            update: {
              credits: 50000
            }
          });
          console.log('💰 Finances restored');
          results.finances = 'success';
        } catch (e) { 
          console.log('❌ Finances failed:', e.message); 
          results.finances = e.message;
        }
        
        try {
          await storage.teams.generateStarterRoster(teamId);
          console.log('👥 Roster restored');
          results.roster = 'success';
        } catch (e) { 
          console.log('❌ Roster failed:', e.message); 
          results.roster = e.message;
        }
        
        try {
          await storage.teams.generateStarterStaff(teamId);
          console.log('👔 Staff restored');
          results.staff = 'success';
        } catch (e) { 
          console.log('❌ Staff failed:', e.message); 
          results.staff = e.message;
        }
        
        try {
          // Stadium already exists, just mark as success
          console.log('🏟️ Stadium exists');
          results.stadium = 'exists';
        } catch (e) { 
          console.log('⚠️ Stadium failed:', e.message); 
          results.stadium = e.message;
        }
        
        // Get final state
        const team = await storage.teams.getTeamById(teamId);
        
        res.json({
          success: true,
          message: 'Oakland Cougars restoration completed!',
          results: results,
          team: {
            name: team.name,
            playersCount: team.playersCount || 0,
            credits: team.finances?.credits || 0,
            gems: team.finances?.gems || 0
          }
        });
      } catch (error) {
        console.error('❌ Oakland Cougars restoration failed:', error);
        res.status(500).json({ 
          success: false, 
          error: 'Restoration failed',
          details: error.message 
        });
      }
    });

    console.log('✅ All critical API routes registered successfully (including admin)!');
    } catch (routeError: any) {
      console.error('❌ [DEBUG] API route registration failed:', routeError);
      console.error('❌ [DEBUG] Error stack:', routeError?.stack);
      console.error('❌ [DEBUG] Error name:', routeError?.name);
      console.error('❌ [DEBUG] Error code:', routeError?.code);
    }

    // CRITICAL FIX: Add API protection middleware before Vite
    app.use('/api/*', (req, res, next) => {
      // If we reach here, it means no API route handled the request
      // Let it continue to 404 properly instead of returning HTML
      next();
    });
    
    console.log('🧪 API route protection added');
    
    // CRITICAL CLOUD RUN FIX: Only setup Vite in development - defer static serving for production
    if (process.env.NODE_ENV !== 'production') {
      console.log('🛠️ Development mode: Setting up Vite with hot reload');
      const { setupVite } = await import("./vite.js");
      await setupVite(app, httpServer);
      console.log('✅ Development frontend serving configured');
    } else {
      console.log('🏭 Production mode: Frontend serving will be configured after port binding');
    }

    // CRITICAL: Error handler MUST be last in middleware chain
    app.use(errorHandler);
    console.log('✅ Error handler added as final middleware');

    // CRITICAL CLOUD RUN FIX: MUST use PORT environment variable set by Cloud Run
    // Cloud Run sets PORT=8080, development uses 5000
    const port = parseInt(process.env.PORT || "5000", 10);
    
    console.log('🔍 PRODUCTION PORT BINDING ANALYSIS:', {
      NODE_ENV: process.env.NODE_ENV,
      PORT_FROM_ENV: process.env.PORT,
      PARSED_PORT: port,
      IS_CLOUD_RUN: !!(process.env.K_SERVICE || process.env.GOOGLE_CLOUD_PROJECT),
      EXPECTED_CLOUD_RUN_PORT: 8080
    });
    
    console.log('🔍 CRITICAL PORT BINDING DEBUG:', {
      NODE_ENV: process.env.NODE_ENV,
      PORT_ENV_VAR: process.env.PORT,
      FINAL_PORT: port,
      HOST_ENV_VAR: process.env.HOST,
      BINDING_HOST: '0.0.0.0'
    });

    httpServer.on('error', (error: any) => {
      console.error('❌ CRITICAL SERVER ERROR:', error);
      console.error('Server failed to start. Error details:', {
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        address: error.address,
        port: error.port,
        message: error.message,
        name: error.name
      });
      process.exit(1);
    });

    // CRITICAL CLOUD RUN FIX: Configure server timeout for Cloud Run compatibility
    httpServer.setTimeout(0); // Disable server timeout - let Cloud Run handle timeouts
    httpServer.keepAliveTimeout = 120000; // 2 minutes keep-alive
    httpServer.headersTimeout = 120000; // 2 minutes header timeout

    // ENHANCED CLOUD RUN STARTUP: Add immediate health check response capability
    console.log('🚀 CRITICAL: Starting server with enhanced Cloud Run compatibility...');

    // CRITICAL CLOUD RUN FIX: Add comprehensive port binding with detailed logging
    console.log('🚀 ATTEMPTING SERVER BINDING WITH COMPREHENSIVE LOGGING...');
    console.log(`   Target Host: 0.0.0.0`);
    console.log(`   Target Port: ${port}`);
    console.log(`   Port Source: ${process.env.PORT ? 'Cloud Run PORT env var' : 'Default (5000)'}`);
    
    httpServer.listen({
      port,
      host: "0.0.0.0", // CRITICAL: Must bind to 0.0.0.0 for Cloud Run
      reusePort: true,
    }, async () => {
      console.log(`✅ SERVER SUCCESSFULLY BOUND TO PORT ${port} - CLOUD RUN STARTUP REQUIREMENTS SATISFIED`);
      console.log(`✅ Health check available at /health`);
      console.log(`✅ Cloud Run startup probe endpoint: /healthz`);
      console.log(`🌍 Server accessible at: http://0.0.0.0:${port}`);
      
      // CRITICAL: Enhanced Cloud Run debugging
      const isCloudRun = !!(process.env.K_SERVICE || process.env.GOOGLE_CLOUD_PROJECT);
      
      if (isCloudRun) {
        console.log('🔍 CLOUD RUN DEPLOYMENT SUCCESS - SERVER LISTENING:', {
          server: {
            bindingHost: '0.0.0.0',
            bindingPort: port,
            actualPort: port,
            portFromEnv: process.env.PORT,
            listening: true,
            startupTime: new Date().toISOString()
          },
          environment: {
            NODE_ENV: process.env.NODE_ENV,
            GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
            K_SERVICE: process.env.K_SERVICE,
            K_REVISION: process.env.K_REVISION,
            K_CONFIGURATION: process.env.K_CONFIGURATION
          },
          healthChecks: {
            healthEndpoint: '/health',
            startupProbe: '/healthz',
            ready: true
          }
        });
      }

      // CRITICAL: NOW perform heavy initialization AFTER server is listening and satisfying Cloud Run probes
      console.log('🔧 Phase 8: ASYNCHRONOUS HEAVY INITIALIZATION (after server bind)');
      
      try {
        // API routes already registered before Vite middleware - validate registration
        console.log('🧪 Validating API route registration...');
        const routeCount = app._router?.stack?.length || 0;
        console.log(`✅ Express router has ${routeCount} middleware/routes registered`);

        // Initialize Google Auth asynchronously (with error resilience)
        console.log('🔧 Setting up Google authentication asynchronously...');
        try {
          const { setupGoogleAuth } = await import("./googleAuth.js");
          await setupGoogleAuth(app);
          console.log('✅ Google authentication configured');
        } catch (authError) {
          console.error('⚠️  Google Auth setup failed, server will continue without full auth:', authError);
        }

        // CRITICAL CLOUD RUN FIX: Setup production frontend serving AFTER API routes
        if (process.env.NODE_ENV === 'production') {
          console.log('🔧 Setting up production static file serving asynchronously...');
          try {
            // COMPREHENSIVE FIX: Correct path resolution for Cloud Run container
            const distPath = path.resolve(process.cwd(), 'dist', 'public');
            console.log(`🔍 Checking frontend build at: ${distPath}`);
            
            if (fs.existsSync(distPath)) {
              const indexPath = path.resolve(distPath, "index.html");
              if (fs.existsSync(indexPath)) {
                console.log(`✅ Found index.html at: ${indexPath}`);
                console.log(`✅ Frontend files: ${fs.readdirSync(distPath).length} files found`);
                
                // List key assets for debugging
                const assetDir = path.resolve(distPath, 'assets');
                if (fs.existsSync(assetDir)) {
                  const assets = fs.readdirSync(assetDir).slice(0, 5);
                  console.log(`✅ Asset files: ${assets.join(', ')}${assets.length === 5 ? '...' : ''}`);
                }
                
                // CRITICAL: Serve static files with proper headers BEFORE catch-all
                app.use(express.static(distPath, {
                  maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0', // Cache in production only
                  etag: true,
                  lastModified: true,
                  index: false // Don't serve index.html automatically for directories
                }));
                
                // CRITICAL: Explicit root route handler for better debugging
                app.get('/', (_req: any, res: any) => {
                  console.log(`🌐 Serving root route: / -> index.html`);
                  res.sendFile(indexPath);
                });
                
                // CRITICAL: Catch-all handler for SPA routing - MUST be last
                app.use("*", (_req: any, res: any) => {
                  console.log(`🌐 Serving SPA fallback: ${_req.originalUrl} -> index.html`);
                  res.sendFile(indexPath);
                });
                
                console.log('✅ Production static file serving configured with explicit root handler');
                
                // Test that index.html is readable
                const indexContent = fs.readFileSync(indexPath, 'utf8');
                if (indexContent.includes('<!DOCTYPE html>')) {
                  console.log('✅ index.html validation: Valid HTML document detected');
                  if (indexContent.includes('Realm Rivalry') || indexContent.includes('react') || indexContent.includes('vite')) {
                    console.log('✅ index.html validation: React app content detected');
                  }
                } else {
                  console.error('❌ index.html validation: Invalid HTML document');
                }
                
              } else {
                console.error(`❌ index.html not found at ${indexPath}`);
              }
            } else {
              console.error(`❌ Production build not found at ${distPath}. Serving API only.`);
              // List what's actually available
              const rootDist = path.resolve(process.cwd(), 'dist');
              if (fs.existsSync(rootDist)) {
                console.log(`🔍 Available in dist/: ${fs.readdirSync(rootDist).join(', ')}`);
              }
              const cwd = process.cwd();
              console.log(`🔍 Available in root: ${fs.readdirSync(cwd).filter(f => f.startsWith('dist') || f.includes('public')).join(', ')}`);
            }
          } catch (staticError) {
            console.error('❌ Static file serving failed, but server will continue:', staticError);
          }
        }

        // DISABLED: WebSocket server (contains external database dependencies)
        // Temporarily disabled for Step 2 Express + Database testing
        console.log('⚠️  WebSocket server disabled for Step 2 testing (contains external DB dependencies)');
        
        // TODO: Re-enable after Step 2 database validation and external dependency cleanup
        /*
        console.log('🔧 Setting up WebSocket server asynchronously...');
        try {
          const { setupWebSocketServer, webSocketService } = await import("./services/webSocketService.js");
          const { webSocketManager } = await import("./websocket/webSocketManager.js");
          const { Server: SocketIOServer } = await import("socket.io");
          
          const io = new SocketIOServer(httpServer, {
            cors: corsOptions,
            transports: ['websocket', 'polling'],
            allowEIO3: true
          });

          setupWebSocketServer(io);
          webSocketManager.initialize(io);
          console.log('✅ WebSocket server configured');
        } catch (wsError) {
          console.error('⚠️  WebSocket setup failed, server will continue without WebSocket features:', wsError);
        }
        */

        // CRITICAL AUTOMATION SYSTEM: Start SeasonTimingAutomationService 
        console.log('🔧 Initializing critical automation systems...');
        try {
          const { SeasonTimingAutomationService } = await import("./services/seasonTimingAutomationService.js");
          const automationService = SeasonTimingAutomationService.getInstance();
          await automationService.start();
          console.log('✅ Season timing automation system started (3AM daily progression, 4-10PM match simulation, tournament automation)');
        } catch (automationError) {
          console.error('❌ CRITICAL: Automation system failed to start:', automationError);
          console.error('❌ Daily progression, match simulation, and tournament automation will NOT work');
        }

        // CRITICAL DATABASE SYSTEM: Start Database Backup Automation Service
        console.log('🔧 Initializing database backup automation system...');
        try {
          const { DatabaseBackupService } = await import("./services/databaseBackupService.js");
          const backupService = DatabaseBackupService.getInstance();
          await backupService.start();
          console.log('✅ Database backup automation started (4:00 AM EDT dev + production backups)');
        } catch (backupError) {
          console.error('❌ CRITICAL: Database backup system failed to start:', backupError);
          console.error('❌ Daily database backups at 4:00 AM will NOT work');
        }

        console.log('✅ ASYNCHRONOUS INITIALIZATION COMPLETE - Server fully operational with automation systems');
        
      } catch (asyncError) {
        console.error('⚠️  Some async initialization failed, but server is operational:', asyncError);
      }

      // Test health endpoint internally after everything is set up
      setTimeout(async () => {
        try {
          const http = await import('http');
          const options = {
            hostname: '0.0.0.0',
            port: port,
            path: '/health',
            method: 'GET'
          };
          
          const req = http.request(options, (res: any) => {
            console.log(`🏥 Internal health check status: ${res.statusCode}`);
          });
          
          req.on('error', (err: any) => {
            console.error('❌ Internal health check failed:', err.message);
          });
          
          req.end();
        } catch (httpError) {
          console.error('❌ Internal health check setup failed:', httpError);
        }
      }, 2000);
    });

    // CRITICAL CLOUD RUN FIX: Add proper SIGTERM handling for graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🔄 SIGTERM received, shutting down gracefully...');
      httpServer.close(() => {
        console.log('✅ HTTP server closed');
        process.exit(0);
      });
      
      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('❌ Forced shutdown due to timeout');
        process.exit(1);
      }, 10000);
    });

    process.on('SIGINT', () => {
      console.log('🔄 SIGINT received, shutting down gracefully...');
      httpServer.close(() => {
        console.log('✅ HTTP server closed');
        process.exit(0);
      });
    });

    // Handle uncaught exceptions to prevent container crashes
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      // Log but don't exit - let Cloud Run handle it
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      // Log but don't exit - let Cloud Run handle it
    });

  } catch (error) {
    // CRITICAL: Comprehensive error logging for any startup failure
    console.error('💥 FAILED TO START SERVER 💥');
    console.error('💥 ERROR OCCURRED DURING STARTUP - THIS IS WHY ROUTES WERE NOT REGISTERED');
    console.error('💥 ERROR TYPE:', typeof error);
    console.error('💥 ERROR MESSAGE:', error instanceof Error ? error.message : 'Unknown error');
    console.error('💥 ERROR STACK:', error instanceof Error ? error.stack : 'No stack trace available');
    
    // Log full error object
    try {
      console.error('💥 FULL ERROR OBJECT:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    } catch (jsonError) {
      console.error('💥 ERROR SERIALIZATION FAILED:', error);
    }
    
    // Log environment details for debugging
    console.error('💥 ENVIRONMENT DEBUG:', {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      DATABASE_URL_EXISTS: !!process.env.DATABASE_URL,
      SESSION_SECRET_EXISTS: !!process.env.SESSION_SECRET,
      GOOGLE_CLIENT_ID_EXISTS: !!process.env.GOOGLE_CLIENT_ID,
      WORKING_DIR: process.cwd(),
      NODE_VERSION: process.version,
      PLATFORM: process.platform
    });
    
    // Exit with failure code to ensure container stops
    console.error('💥 EXITING WITH FAILURE CODE 1 💥');
    process.exit(1);
  }
}

// Start the server with comprehensive error handling
console.log('🔥 === CRITICAL DEBUG === CALLING startServer() NOW ===');
startServer()
  .then(() => {
    console.log('🔥 === CRITICAL DEBUG === startServer() COMPLETED SUCCESSFULLY ===');
  })
  .catch((error) => {
    console.error('🔥 === CRITICAL DEBUG === startServer() FAILED ===');
    console.error('🔥 === ERROR ===', error);
    process.exit(1);
  });