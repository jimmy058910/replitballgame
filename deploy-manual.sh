#!/bin/bash

# Manual deployment script for Realm Rivalry
# Use this if GitHub Actions fails

set -e

PROJECT_ID="direct-glider-465821-p7"
SERVICE="realm-rivalry"
REGION="us-east5"

echo "🚀 Starting manual deployment to Google Cloud Run..."

# Build the Docker image
echo "📦 Building Docker image..."
docker build -f Dockerfile.production -t us-east5-docker.pkg.dev/$PROJECT_ID/$SERVICE/$SERVICE:manual .

# Configure Docker for Artifact Registry
echo "🔐 Configuring Docker authentication..."
gcloud auth configure-docker us-east5-docker.pkg.dev

# Push the image
echo "📤 Pushing Docker image..."
docker push us-east5-docker.pkg.dev/$PROJECT_ID/$SERVICE/$SERVICE:manual

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE \
  --image us-east5-docker.pkg.dev/$PROJECT_ID/$SERVICE/$SERVICE:manual \
  --platform managed \
  --region $REGION \
  --port 8080 \
  --memory 2Gi \
  --cpu 1 \
  --timeout 900 \
  --max-instances 10 \
  --allow-unauthenticated \
  --service-account realm-rivalry-github-runner@$PROJECT_ID.iam.gserviceaccount.com \
  --update-secrets DATABASE_URL=database-url:latest \
  --update-secrets SESSION_SECRET=session-secret:latest \
  --update-secrets GOOGLE_CLIENT_SECRET=google-client-secret:latest \
  --set-env-vars "NODE_ENV=production,GOOGLE_CLIENT_ID=108005641993-e642ered12jj7ka6unpqhgjdls92c0u8.apps.googleusercontent.com"

echo "✅ Deployment complete! Check https://realmrivalry.com"