import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Express } from 'express';

// This is a placeholder. In a real app, you would fetch the user from your database.
// For now, we'll just store users in memory.
const users: Record<string, any> = {};

export function setupGoogleAuth(app: Express) {
  // Configure the Google strategy for use by Passport.
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: process.env.NODE_ENV === 'production' 
      ? 'https://realmrivalry.com/auth/google/callback'
      : '/auth/google/callback',
    scope: ['profile', 'email']
  },
  (accessToken, refreshToken, profile, done) => {
    // This function is called when a user successfully authenticates.
    // 'profile' contains the user's Google profile information.
    console.log('Google profile:', profile);

    // Here, you would typically find or create a user in your database.
    // For this example, we'll just save the profile to our in-memory store.
    users[profile.id] = profile;

    // The 'done' callback signals to Passport that authentication is complete.
    // The first argument is for an error (null if none), the second is the user object.
    return done(null, profile);
  }));

  // Configure Passport authenticated session persistence.
  // In order to restore authentication state across HTTP requests, Passport needs
  // to serialize users into and deserialize users out of the session.
  passport.serializeUser((user: any, done) => {
    // We serialize the user's Google ID into the session.
    done(null, user.id);
  });

  passport.deserializeUser((id: string, done) => {
    // We deserialize the user by finding them in our user store with the ID.
    // In a real app, you would query your database here.
    const user = users[id];
    done(null, user);
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
