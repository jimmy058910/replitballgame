# Production Credentials Setup Guide

## Google OAuth Setup

### 1. Google Cloud Console Setup
1. Navigate to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: `direct-glider-465821-p7`
3. Go to APIs & Services > Credentials
4. Find your OAuth 2.0 client ID for web application

### 2. Required Environment Variables
Add these to your Cloud Run service environment variables:

```bash
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

### 3. Authorized Domains
Ensure these domains are authorized in your Google OAuth client:
- `https://www.realmrivalry.com`
- `https://realmrivalry.com`
- `https://realm-rivalry-backend-108005641993.us-east5.run.app`

### 4. Cloud Run Environment Variables Setup
1. Go to Google Cloud Run console
2. Select service: `realm-rivalry-backend`
3. Click "Edit & Deploy New Revision"
4. Go to "Variables & Secrets" tab
5. Add environment variables:
   - `GOOGLE_CLIENT_ID`: [Your OAuth Client ID]
   - `GOOGLE_CLIENT_SECRET`: [Your OAuth Client Secret]

### 5. Verification
After setup, verify at: `https://realm-rivalry-backend-108005641993.us-east5.run.app/api/env-check`
Should show: `"hasGoogleClientId": true`

## Database Connection
✅ Already properly configured with Neon PostgreSQL
✅ Schema is synchronized between development and production

## Session Management  
✅ Properly configured with secure session handling

## Next Steps
1. Add Google OAuth credentials to Cloud Run
2. Deploy updated backend without bypasses
3. Test authentication flow end-to-end
4. Verify NDA acceptance workflow