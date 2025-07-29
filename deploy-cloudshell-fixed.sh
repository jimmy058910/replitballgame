#!/bin/bash
set -e

echo "🚀 DEPLOYING FROM GOOGLE CLOUD SHELL - FIXED VERSION"
echo "===================================================="

# Build Docker image with timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
IMAGE_NAME="us-east5-docker.pkg.dev/direct-glider-465821-p7/realm-rivalry/realm-rivalry:$TIMESTAMP"

echo "🏗️ Building Docker image: $IMAGE_NAME"
docker build -f Dockerfile.production -t "$IMAGE_NAME" .

echo "📤 Pushing to Artifact Registry..."
docker push "$IMAGE_NAME"

echo "🔧 Clearing existing environment variables..."
gcloud run services update realm-rivalry \
  --region us-east5 \
  --clear-env-vars

echo "🚀 Deploying to Cloud Run with fresh configuration..."
gcloud run deploy realm-rivalry \
  --image "$IMAGE_NAME" \
  --platform managed \
  --region us-east5 \
  --port 8080 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 900 \
  --max-instances 10 \
  --allow-unauthenticated \
  --update-secrets DATABASE_URL=database-url:latest \
  --update-secrets SESSION_SECRET=session-secret:latest \
  --update-secrets GOOGLE_CLIENT_SECRET=google-client-secret:latest \
  --update-env-vars "NODE_ENV=production,GOOGLE_CLIENT_ID=108005641993-e642ered12jj7ka6unpqhgjdls92c0u8.apps.googleusercontent.com"

echo "✅ DEPLOYMENT COMPLETE!"
echo "🌐 Your app is live at: https://realmrivalry.com"
echo "🔍 Check deployment: gcloud run services describe realm-rivalry --region=us-east5"