import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Express } from 'express';
import { AuthService } from './domains/auth/service';
import { Logger } from './domains/core/logger';

export async function setupGoogleAuth(app: Express) {
  console.log('🔐 Setting up Google OAuth authentication system');
  
  // Ensure required environment variables exist
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error('❌ Missing required Google OAuth environment variables');
    console.log('GOOGLE_CLIENT_ID present:', !!process.env.GOOGLE_CLIENT_ID);
    console.log('GOOGLE_CLIENT_SECRET present:', !!process.env.GOOGLE_CLIENT_SECRET);
    throw new Error('Missing Google OAuth credentials');
  }
  
  // Test database connection before setting up auth (with timeout)
  try {
    console.log('🔍 Testing AuthService connection...');
    const authModule = await Promise.race([
      import('./domains/auth/service'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('AuthService import timeout')), 10000))
    ]) as typeof import('./domains/auth/service');
    console.log('✅ AuthService imported successfully');
  } catch (error) {
    console.error('⚠️ AuthService import failed, continuing with limited auth:', error);
    // Don't throw - allow server to start even if auth has issues
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
      return done(null, { ...userProfile, claims: profile });
    } catch (error) {
      Logger.logError('Google OAuth authentication failed', error as Error, { profileId: profile.id });
      return done(error, false);
    }
  }));

  // Configure Passport authenticated session persistence with database integration
  passport.serializeUser((user: any, done) => {
    // Serialize the user's database userId into the session
    console.log('🔧 Serializing user for session', { 
      userType: typeof user, 
      userId: user.userId, 
      userKeys: Object.keys(user || {}) 
    });
    // CRITICAL: Store only the string userId in session, not the full object
    const userIdToStore = typeof user.userId === 'string' ? user.userId : user.id;
    Logger.logInfo('Serializing user for session', { userIdToStore });
    done(null, userIdToStore);
  });

  passport.deserializeUser(async (userIdFromSession: any, done) => {
    try {
      console.log('🔧 Deserializing user from session', { 
        userIdFromSession, 
        type: typeof userIdFromSession,
        isString: typeof userIdFromSession === 'string'
      });
      
      // CRITICAL: Ensure we have a string userId, not an object
      const userId = typeof userIdFromSession === 'string' 
        ? userIdFromSession 
        : userIdFromSession.userId || userIdFromSession.id || String(userIdFromSession);
      
      if (!userId || typeof userId !== 'string') {
        Logger.logError('Invalid userId from session', new Error('Invalid userId type'), { userIdFromSession });
        return done(null, false);
      }
      
      // Deserialize by fetching user from database
      const user = await AuthService.getUserProfile(userId);
      Logger.logInfo('User deserialized from session', { userId });
      done(null, user ? { ...user, claims: { sub: user.userId } } : null);
    } catch (error) {
      Logger.logError('Failed to deserialize user from session', error as Error, { userIdFromSession });
      done(error, false);
    }
  });

  // Initialize Passport middleware - MUST be in correct order after session middleware
  console.log('🔧 Initializing Passport middleware in correct order');
  
  try {
    // CRITICAL: passport.initialize() MUST come immediately after session middleware
    app.use(passport.initialize());
    console.log('✅ passport.initialize() middleware added');
    
    // CRITICAL: passport.session() MUST come immediately after passport.initialize()  
    app.use(passport.session());
    console.log('✅ passport.session() middleware added');
    
    console.log('✅ Passport middleware initialized in correct order');
  } catch (passportError) {
    console.error('❌ Passport middleware initialization failed:', passportError);
    throw passportError;
  }
  
  console.log('✅ All Passport middleware initialized successfully');

  // ✅ Passport middleware setup complete
  // All authentication routes are now consolidated in authRoutes.ts

  Logger.logInfo('Google OAuth authentication setup completed');
}

// DEPRECATED - Use server/middleware/firebaseAuth.ts instead  
// This middleware is being replaced with proper Firebase token verification
export const isAuthenticated = (req: any, res: any, next: any) => {
  console.log('🔍 isAuthenticated middleware called', {
    hasIsAuthenticated: typeof req.isAuthenticated === 'function',
    hasSession: !!req.session,
    sessionID: req.sessionID,
    isDevelopment: process.env.NODE_ENV === 'development'
  });
  
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
