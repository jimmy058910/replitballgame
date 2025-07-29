#!/bin/bash

# BULLETPROOF DEPLOYMENT SCRIPT
# Bypasses GitHub Actions completely

set -e

echo "🚀 BULLETPROOF DEPLOYMENT - NO GITHUB ACTIONS"
echo "================================================"

# Build the production bundle
echo "📦 Building React production bundle..."
npm run build

# Login to Google Cloud (if not already logged in)
echo "🔐 Logging into Google Cloud..."
gcloud auth login --brief

# Set the project
echo "🎯 Setting Google Cloud project..."
gcloud config set project direct-glider-465821-p7

# Configure Docker
echo "🐋 Configuring Docker..."
gcloud auth configure-docker us-east5-docker.pkg.dev

# Build Docker image with timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
IMAGE_NAME="us-east5-docker.pkg.dev/direct-glider-465821-p7/realm-rivalry/realm-rivalry:$TIMESTAMP"

echo "🏗️ Building Docker image: $IMAGE_NAME"
docker build -f Dockerfile.production -t "$IMAGE_NAME" .

# Push to registry
echo "📤 Pushing to Artifact Registry..."
docker push "$IMAGE_NAME"

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
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
  --set-env-vars "NODE_ENV=production,GOOGLE_CLIENT_ID=108005641993-e642ered12jj7ka6unpqhgjdls92c0u8.apps.googleusercontent.com"

echo "✅ DEPLOYMENT COMPLETE!"
echo "🌐 Your app is live at: https://realmrivalry.com"
echo "🔍 Check deployment: gcloud run services describe realm-rivalry --region=us-east5"