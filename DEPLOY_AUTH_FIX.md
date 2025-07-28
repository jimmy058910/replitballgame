# 🚀 DEPLOY AUTHENTICATION FIX TO PRODUCTION

## Current Status
✅ **Authentication Fixed Locally**: Google OAuth working with proper secrets
✅ **React Build Complete**: `dist/index.html` exists and ready
✅ **Production Server Ready**: `server/production-simple.ts` properly configured
❌ **Production Deployment**: Still running old code without fixes

## Deploy to Google Cloud Run

### Option 1: Modern Artifact Registry (Recommended)
```bash
# Authenticate with Google Cloud
gcloud auth login
gcloud config set project direct-glider-465821-p7
gcloud auth configure-docker us-east5-docker.pkg.dev

# Build and push using production Dockerfile
docker build -f Dockerfile.production -t us-east5-docker.pkg.dev/direct-glider-465821-p7/realm-rivalry/app:latest .
docker push us-east5-docker.pkg.dev/direct-glider-465821-p7/realm-rivalry/app:latest

# Deploy to Cloud Run
gcloud run deploy realm-rivalry \
  --image us-east5-docker.pkg.dev/direct-glider-465821-p7/realm-rivalry/app:latest \
  --platform managed \
  --region us-east5 \
  --allow-unauthenticated \
  --service-account realm-rivalry-runner@direct-glider-465821-p7.iam.gserviceaccount.com \
  --set-env-vars NODE_ENV=production,GOOGLE_CLIENT_ID=108005641993-e642ered12jj7ka6unpqhgjdls92c0u8.apps.googleusercontent.com \
  --set-secrets DATABASE_URL=database-url:latest,SESSION_SECRET=session-secret:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest \
  --memory 2Gi \
  --cpu 2 \
  --concurrency 100 \
  --max-instances 10 \
  --port 8080 \
  --timeout 300s
```

### Option 2: Legacy GCR (Fallback)
```bash
# Authenticate and configure
gcloud auth login
gcloud config set project direct-glider-465821-p7
gcloud auth configure-docker gcr.io

# Build and push
docker build -f Dockerfile.production -t gcr.io/direct-glider-465821-p7/realm-rivalry:latest .
docker push gcr.io/direct-glider-465821-p7/realm-rivalry:latest

# Deploy (same gcloud run deploy command as above, just different image)
gcloud run deploy realm-rivalry \
  --image gcr.io/direct-glider-465821-p7/realm-rivalry:latest \
  [rest of flags same as above]
```

## 🧪 After Deployment Test These URLs

1. **Homepage**: https://realmrivalry.com
   - Should show React app (not "Cannot GET /")

2. **Health Check**: https://realmrivalry.com/health
   - Should return JSON status

3. **Authentication**: https://realmrivalry.com/api/login
   - Should redirect to Google OAuth (not 404)

## 🎯 What This Deployment Includes

✅ **Fixed Google OAuth** - Reads GOOGLE_CLIENT_ID/SECRET from GCP secrets
✅ **Fixed Production Server** - Proper authentication + static serving order  
✅ **Fixed React Build** - Complete dist/ folder with index.html
✅ **Enhanced Error Handling** - Graceful fallbacks if components fail

---

**Expected Result**: https://realmrivalry.com should show your React app with working authentication