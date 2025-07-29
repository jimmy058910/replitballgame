import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Express } from 'express';
import { AuthService } from './domains/auth/service';
import { Logger } from './domains/core/logger';

export function setupGoogleAuth(app: Express) {
  // Configure the Google strategy for use by Passport.
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: process.env.NODE_ENV === 'production' 
      ? 'https://www.realmrivalry.com/auth/google/callback'
      : '/auth/google/callback',
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

  // Initialize Passport and restore authentication state, if any, from the session.
  app.use(passport.initialize());
  app.use(passport.session());

  // Define authentication routes.

  // API login route that redirects to Google OAuth
  app.get('/api/login', (req, res) => {
    res.redirect('/auth/google');
  });

  // API logout route
  app.get('/api/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
      }
      res.redirect('/');
    });
  });

  // This route starts the Google authentication process.
  // 'profile' and 'email' are the "scopes" we are requesting from Google.
  app.get('/auth/google', passport.authenticate('google'));

  // This is the callback route that Google redirects to after the user logs in.
  // It will exchange the code for a profile and call our verify function above.
  app.get('/auth/google/callback', 
    passport.authenticate('google', {
      successRedirect: '/', // Redirect to the homepage on success
      failureRedirect: '/login' // Redirect to a login page on failure
    })
  );

  // A simple route to check if the user is logged in.
  app.get('/api/me', (req, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: 'You are not authenticated' });
    }
  });

  // Removed duplicate routes - they are already defined above

  // Legacy route to log out the user.
  app.get('/logout', (req, res, next) => {
    req.logout((err) => {
      if (err) { return next(err); }
      res.redirect('/');
    });
  });
}

// Authentication middleware for route protection
export const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Authentication required' });
};
