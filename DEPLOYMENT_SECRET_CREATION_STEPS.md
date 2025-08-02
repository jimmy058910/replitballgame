# GitHub Secrets Setup for Realm Rivalry Deployment

## Required GitHub Repository Secrets

Your deployment workflow expects these secrets to be added to your GitHub repository:

### 1. GOOGLE_SERVICE_ACCOUNT_KEY
**Purpose**: Allows GitHub Actions to authenticate with Google Cloud
**Value**: Your Google Cloud service account JSON key

**How to Get It:**
1. Go to Google Cloud Console → IAM & Admin → Service Accounts
2. Find your service account (likely `realm-rivalry-deployment@direct-glider-465821-p7.iam.gserviceaccount.com`)
3. Click "Actions" → "Manage Keys" → "Add Key" → "Create New Key"
4. Choose JSON format, download the file
5. Copy the entire JSON content (including the curly braces)

### 2. DATABASE_URL ✅ (Already Added)
**Purpose**: PostgreSQL connection string for Neon database
**Value**: `postgresql://username:password@host:port/database?sslmode=require`

### 3. Firebase Secrets ✅ (Already Added)
**Purpose**: Firebase configuration for authentication
**Values**: VITE_FIREBASE_API_KEY, VITE_FIREBASE_APP_ID, VITE_FIREBASE_PROJECT_ID

## How to Add Secrets to GitHub

1. **Go to GitHub Repository Settings**
   - Navigate to: https://github.com/jimmy058910/replitballgame/settings/secrets/actions

2. **Add New Repository Secret**
   - Click "New repository secret"
   - Name: `GOOGLE_SERVICE_ACCOUNT_KEY`
   - Value: Paste the entire JSON service account key

3. **Verify Secret Names Match Workflow**
   - The workflow uses `${{ secrets.GOOGLE_SERVICE_ACCOUNT_KEY }}`
   - Secret name must match exactly (case-sensitive)

## Current Secret Status

✅ DATABASE_URL - Available in Replit
✅ VITE_FIREBASE_API_KEY - Available in Replit  
✅ VITE_FIREBASE_APP_ID - Available in Replit
✅ VITE_FIREBASE_PROJECT_ID - Available in Replit
❌ GOOGLE_SERVICE_ACCOUNT_KEY - **MISSING FROM GITHUB**

## Google Cloud Secret Manager

Your workflow also uses Google Cloud Secret Manager for production:
- `database-url:latest`
- `firebase-api-key:latest`
- `firebase-project-id:latest`
- `firebase-app-id:latest`

These need to be created in Google Cloud Console → Secret Manager.

## Next Steps

1. **Add GOOGLE_SERVICE_ACCOUNT_KEY to GitHub** (most critical)
2. **Create secrets in Google Cloud Secret Manager** (for production environment variables)
3. **Test deployment** with proper authentication

Once you add the missing `GOOGLE_SERVICE_ACCOUNT_KEY` secret to GitHub, the deployment will have full database connectivity and authentication capabilities.