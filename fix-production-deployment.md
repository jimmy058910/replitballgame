# CRITICAL PRODUCTION DEPLOYMENT FIX

## Issues Found:
1. **Server Not Responding**: Production deployment failed completely
2. **SSL Certificate Error**: Certificate doesn't match realmrivalry.com domain

## Immediate Action Required:

### Step 1: Check Current Deployment Status
```bash
# Check if the Cloud Run service is running
gcloud run services describe realm-rivalry --region=us-east5 --platform=managed

# Check recent deployments
gcloud run revisions list --service=realm-rivalry --region=us-east5 --limit=5
```

### Step 2: Redeploy with Fixed Server
```bash
# Build and push the image (use our fixed production-simple.ts)
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
  --memory 2Gi --cpu 2 --concurrency 100 --max-instances 10 --port 8080 --timeout 300s
```

### Step 3: Fix SSL Certificate Issue
```bash
# Check current domain mapping
gcloud run domain-mappings list --platform=managed --region=us-east5

# If domain mapping exists but has SSL issues, delete and recreate:
gcloud run domain-mappings delete realmrivalry.com --platform=managed --region=us-east5

# Create new domain mapping (this will generate a new SSL certificate)
gcloud run domain-mappings create --service=realm-rivalry --domain=realmrivalry.com --platform=managed --region=us-east5
```

### Step 4: Verify DNS Configuration
The domain mapping will provide DNS records that need to be configured:
```bash
# Get the required DNS records
gcloud run domain-mappings describe realmrivalry.com --platform=managed --region=us-east5
```

Make sure the DNS A and AAAA records point to the Google Cloud Run IP addresses provided.

### Step 5: Test After Deployment
```bash
# Test HTTP endpoint
curl -I http://realm-rivalry-[hash].a.run.app/health

# Test custom domain (may take time for SSL cert to provision)
curl -I https://realmrivalry.com/health

# Test authentication endpoints
curl -I https://realmrivalry.com/api/login
```

## Root Cause:
- The production server failed to start properly during deployment
- SSL certificate was either not generated or doesn't match the domain
- The server/production-simple.ts fix should resolve the startup issues

## Expected Results After Fix:
- `/health` endpoint should return 200 OK
- `/api/login` should redirect to Google OAuth (302)
- HTTPS should work without certificate errors
- All authentication flows operational