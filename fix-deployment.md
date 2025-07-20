# ✅ COMPLETE GCP DEPLOYMENT COMMANDS - READY TO EXECUTE

## ✅ Step 1: Environment Updated
✅ Google Client Secret added to .env
✅ OAuth URIs configured (realmrivalry.com, localhost:5000, realmrivalry.com.run.app)

## Step 2: Create GCP Secrets (Run these commands on your local machine)
```bash
# Set your project ID
export PROJECT_ID="direct-glider-465821-p7"

# Authenticate with GCP (if not already done)
gcloud auth login
gcloud config set project $PROJECT_ID

# Create secrets in GCP Secret Manager
echo -n "postgresql://neondb_owner:npg_FYwi4k2MuTUp@ep-polished-morning-a5k0aj2x-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require" | gcloud secrets create database-url --data-file=-

echo -n "R4P8O/AH99ulWIx93T+i1nBAg2QgjtBmBYdid5SEq9OiPZvDyAojxj7hog9KLVsU2hRnnavgA6+ku/20mJdSSQ==" | gcloud secrets create session-secret --data-file=-

echo -n "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" | gcloud secrets create google-client-secret --data-file=-

# Verify secrets created
gcloud secrets list
```

## Step 3: Build and Deploy
```bash
# Configure Docker authentication for GCP
gcloud auth configure-docker

# Build Docker image
docker build -t gcr.io/direct-glider-465821-p7/realm-rivalry:latest .

# Push to Google Container Registry
docker push gcr.io/direct-glider-465821-p7/realm-rivalry:latest

# Deploy to Cloud Run with corrected parameters
gcloud run deploy realm-rivalry \
  --image gcr.io/direct-glider-465821-p7/realm-rivalry:latest \
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

## Step 4: Get Your Deployed URL
```bash
# Get the service URL
gcloud run services describe realm-rivalry \
  --region us-east5 \
  --format 'value(status.url)'
```

## Files Created:
✅ Dockerfile - Multi-stage production build
✅ .dockerignore - Optimized for deployment
✅ .env - Local environment with Google OAuth
✅ Authentication system ready

## What You Need to Do:
1. **Get your Google Client Secret** from Google Cloud Console
2. **Update the `.env` file** with the real client secret
3. **Run the GCP secrets creation commands** above
4. **Execute the build and deploy commands**