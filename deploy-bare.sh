#!/bin/bash
set -e
echo "🔍 BARE-BONES DEPLOYMENT - NO SECRETS"
echo "===================================="
# Build Docker image with timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
IMAGE_NAME="us-east5-docker.pkg.dev/direct-glider-465821-p7/realm-rivalry/realm-rivalry:$TIMESTAMP"
echo "🏗️ Building Docker image: $IMAGE_NAME"
docker build -f Dockerfile.minimal -t "$IMAGE_NAME" .
echo "📤 Pushing to Artifact Registry..."
docker push "$IMAGE_NAME"
echo "🔧 Clearing ALL environment variables and secrets..."
gcloud run services update realm-rivalry \
  --region us-east5 \
  --clear-env-vars \
  --clear-secrets
echo "🚀 Deploying to Cloud Run (bare-bones version)..."
gcloud run deploy realm-rivalry \
  --image "$IMAGE_NAME" \
  --platform managed \
  --region us-east5 \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 3 \
  --allow-unauthenticated \
  --no-cpu-throttling
echo "✅ BARE-BONES DEPLOYMENT COMPLETE!"
echo "🌐 Testing: curl -v https://realmrivalry.com/health"
echo "📋 Check logs: gcloud logging read 'resource.type=cloud_run_revision AND resource.labels.service_name=realm-rivalry' --limit=10 --format='table(timestamp,severity,textPayload)'"
