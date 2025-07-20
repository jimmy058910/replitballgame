# Authentication Migration Guide for GCP Deployment

## Current Situation
Your app currently uses Replit's automatic authentication system, which only works within Replit's environment. For Google Cloud Platform deployment, you need to implement a different authentication strategy.

## Recommended Solution: Google OAuth

### Step 1: Set Up Google OAuth
1. **Go to Google Cloud Console**:
   - Visit: https://console.cloud.google.com/
   - Select your project: `realm-rivalry-prod`

2. **Enable Google+ API**:
   ```bash
   gcloud services enable plus.googleapis.com
   gcloud services enable oauth2.googleapis.com
   ```

3. **Create OAuth 2.0 Credentials**:
   - Navigate to: **APIs & Services > Credentials**
   - Click **"+ CREATE CREDENTIALS"** > **"OAuth client ID"**
   - Application type: **"Web application"**
   - Name: **"Realm Rivalry Production"**
   - Authorized redirect URIs:
     - `https://your-domain.com/auth/google/callback`
     - `https://your-cloud-run-url/auth/google/callback`

4. **Download Credentials**:
   - Download the JSON file
   - You'll get: `CLIENT_ID` and `CLIENT_SECRET`

### Step 2: Update Authentication Code

Replace Replit auth with Google OAuth in `server/auth.ts`:

```typescript
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: "/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Find or create user in your database
    let user = await prisma.userProfile.findUnique({
      where: { email: profile.emails?.[0]?.value }
    });
    
    if (!user) {
      user = await prisma.userProfile.create({
        data: {
          email: profile.emails?.[0]?.value!,
          userId: profile.id,
          // other fields...
        }
      });
    }
    
    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

// Routes
app.get('/auth/google', 
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/');
  }
);
```

### Step 3: Update Environment Variables
```env
# Replace Replit auth variables with:
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Step 4: Update Frontend Login
Update your login button to use Google OAuth:
```tsx
// Replace Replit login with:
<a href="/auth/google" className="btn">
  Login with Google
</a>
```

## Alternative Solution: Keep Replit Auth (Advanced)

If you want to keep Replit authentication, you would need to:

1. **Register your external app with Replit**:
   - Contact Replit support for external OAuth app registration
   - This is typically only available for enterprise customers

2. **Use Replit's OAuth endpoints manually**:
   - This requires custom implementation and may not be officially supported

## Migration Steps

1. **Test Google OAuth locally first**
2. **Update all authentication references in your code**
3. **Migrate existing user data** (match by email address)
4. **Deploy to GCP with new auth system**
5. **Update any hardcoded user references** in your app

## User Data Migration

Since your current users are tied to Replit IDs, you'll need to:
1. Export current user data
2. Match users by email address when they log in with Google
3. Preserve their teams, players, and game progress

Would you like me to implement the Google OAuth solution for your app?