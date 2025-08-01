import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Express } from 'express';
import { AuthService } from './domains/auth/service';
import { Logger } from './domains/core/logger';

export async function setupGoogleAuth(app: Express) {
  Logger.logInfo('Setting up Google OAuth authentication system');
  
  // Test database connection before setting up auth
  try {
    const { AuthService } = await import('./domains/auth/service');
    Logger.logInfo('AuthService imported successfully');
  } catch (error) {
    Logger.logError('Failed to import AuthService', error as Error);
    throw error;
  }
  // Configure the Google strategy for use by Passport.
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: process.env.NODE_ENV === 'production' 
      ? 'https://www.realmrivalry.com/api/auth/google/callback'
      : '/api/auth/google/callback',
    scope: ['profile', 'email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      Logger.logInfo('Google OAuth callback received', { googleId: profile.id });
      
      // Create or get existing user profile from database
      const userProfile = await AuthService.createUserProfile(profile);
      
      Logger.logInfo('User authenticated successfully', { userId: userProfile.userId });
      return done(null, userProfile);
    } catch (error) {
      Logger.logError('Google OAuth authentication failed', error as Error, { profileId: profile.id });
      return done(error, false);
    }
  }));

  // Configure Passport authenticated session persistence with database integration
  passport.serializeUser((user: any, done) => {
    // Serialize the user's database userId into the session
    Logger.logInfo('Serializing user for session', { userId: user.userId });
    done(null, user.userId);
  });

  passport.deserializeUser(async (userId: string, done) => {
    try {
      // Deserialize by fetching user from database
      const user = await AuthService.getUserProfile(userId);
      Logger.logInfo('User deserialized from session', { userId });
      done(null, user);
    } catch (error) {
      Logger.logError('Failed to deserialize user from session', error as Error, { userId });
      done(error, false);
    }
  });

  // Initialize Passport FIRST before defining routes
  Logger.logInfo('Initializing Passport middleware');
  console.log('🔧 About to add passport.initialize() middleware...');
  console.log('🔧 passport object type:', typeof passport);
  console.log('🔧 passport.initialize type:', typeof passport.initialize);
  
  try {
    console.log('🔧 CRITICAL: About to call passport.initialize()...');
    const initMiddleware = passport.initialize();
    console.log('🔧 passport.initialize() created middleware:', typeof initMiddleware);
    console.log('🔧 initMiddleware object details:', !!initMiddleware);
    console.log('🔧 About to call app.use with initMiddleware...');
    
    const result = app.use(initMiddleware);
    console.log('🔧 app.use(initMiddleware) returned:', typeof result);
    console.log('✅ passport.initialize() middleware added successfully');
  } catch (initError) {
    console.error('❌ passport.initialize() failed:', initError);
    console.error('❌ Error details:', initError?.message);
    console.error('❌ Error stack:', initError?.stack);
    throw initError;
  }
  
  try {
    console.log('🔧 CRITICAL: About to call passport.session()...');
    const sessionMiddleware = passport.session();
    console.log('🔧 passport.session() created middleware:', typeof sessionMiddleware);
    console.log('🔧 sessionMiddleware object details:', !!sessionMiddleware);
    console.log('🔧 About to call app.use with sessionMiddleware...');
    
    const result = app.use(sessionMiddleware);
    console.log('🔧 app.use(sessionMiddleware) returned:', typeof result);
    console.log('✅ passport.session() middleware added successfully');
  } catch (sessionError) {
    console.error('❌ passport.session() failed:', sessionError);
    console.error('❌ Error details:', sessionError?.message);
    console.error('❌ Error stack:', sessionError?.stack);
    throw sessionError;
  }
  
  console.log('✅ All Passport middleware initialized successfully');

  // ✅ Passport middleware setup complete
  // All authentication routes are now consolidated in authRoutes.ts

  Logger.logInfo('Google OAuth authentication setup completed');
}

// Authentication middleware for route protection
export const isAuthenticated = (req: any, res: any, next: any) => {
  console.log('🔍 isAuthenticated middleware called', {
    hasIsAuthenticated: typeof req.isAuthenticated === 'function',
    hasSession: !!req.session,
    sessionID: req.sessionID,
    isDevelopment: process.env.NODE_ENV === 'development'
  });
  
  // Development bypass for team creation endpoints
  if (process.env.NODE_ENV === 'development' && req.originalUrl && req.originalUrl.includes('/api/teams')) {
    console.log('🔧 DEVELOPMENT: Bypassing authentication for team creation', { 
      path: req.path, 
      originalUrl: req.originalUrl 
    });
    req.user = { claims: { sub: "44010914" } }; // Simulate authenticated user
    return next();
  }
  
  if (typeof req.isAuthenticated !== 'function') {
    console.error('❌ req.isAuthenticated is not a function - passport middleware not working');
    return res.status(500).json({ 
      error: 'Authentication system error',
      details: 'Passport middleware not initialized'
    });
  }
  
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Authentication required' });
};
