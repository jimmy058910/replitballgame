# 🚀 UPDATED DEPLOYMENT COMMANDS - REPLIT AUTH SYSTEM

## Authentication System Changed
✅ **Updated**: Switched from Google Auth to Replit Auth
✅ **Fixed**: Frontend endpoints now call correct /api/login instead of /api/auth/login  
✅ **Ready**: Production deployment with working authentication

## Required Environment Variables for Replit Auth
- `REPLIT_DOMAINS=realmrivalry.com`
- `DATABASE_URL` (existing)
- `SESSION_SECRET` (existing)
- `REPL_ID` (your Replit app ID - get from Replit dashboard)

## Step 1: Update GCP Secrets (Run on your local machine)
```bash
# Set your project ID
export PROJECT_ID="direct-glider-465821-p7"

# Authenticate with GCP (if not already done)
gcloud auth login
gcloud config set project $PROJECT_ID

# Update or create Replit Auth secrets
echo -n "realmrivalry.com" | gcloud secrets create replit-domains --data-file=-

# Get your REPL_ID from Replit dashboard and replace XXXXX
echo -n "YOUR_REPL_ID_HERE" | gcloud secrets create repl-id --data-file=-

# Verify existing secrets
gcloud secrets list
```

## Step 2: Build and Deploy with Replit Auth
```bash
# Configure Docker authentication for GCP
gcloud auth configure-docker

# Build Docker image with authentication fixes
docker build -t gcr.io/direct-glider-465821-p7/realm-rivalry:latest .

# Push to Google Container Registry
docker push gcr.io/direct-glider-465821-p7/realm-rivalry:latest

# Deploy to Cloud Run with Replit Auth configuration
gcloud run deploy realm-rivalry \
  --image gcr.io/direct-glider-465821-p7/realm-rivalry:latest \
  --platform managed \
  --region us-east5 \
  --allow-unauthenticated \
  --service-account realm-rivalry-runner@direct-glider-465821-p7.iam.gserviceaccount.com \
  --set-env-vars NODE_ENV=production \
  --set-secrets DATABASE_URL=database-url:latest,SESSION_SECRET=session-secret:latest,REPLIT_DOMAINS=replit-domains:latest,REPL_ID=repl-id:latest \
  --memory 2Gi \
  --cpu 2 \
  --concurrency 100 \
  --max-instances 10 \
  --port 8080 \
  --timeout 300s
```

## Step 3: Get Your Deployed URL
```bash
# Get the service URL (should be realmrivalry.com)
gcloud run services describe realm-rivalry \
  --region us-east5 \
  --format 'value(status.url)'
```

## 🎯 What This Fixes
✅ **Authentication Error**: Resolves "Cannot GET /api/login" error on realmrivalry.com
✅ **Login Functionality**: Working login/logout system with Replit Auth
✅ **Development/Production**: Both localhost and production environments working
✅ **Docker Build**: Fixed missing image import that was breaking builds

## 📋 Next Steps
1. **Run commands on your local machine** (where you have Docker + gcloud)
2. **Get your REPL_ID** from Replit dashboard
3. **Replace YOUR_REPL_ID_HERE** in the commands above
4. **Execute the deployment commands**
5. **Test login at https://realmrivalry.com**

## 🔧 Alternative: Quick Manual Fix
If you want to avoid redeployment, you could temporarily update just the environment variables:

```bash
gcloud run services update realm-rivalry \
  --region us-east5 \
  --set-env-vars NODE_ENV=production \
  --set-secrets REPLIT_DOMAINS=replit-domains:latest,REPL_ID=repl-id:latest
```