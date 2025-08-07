#!/bin/bash
set -e
echo "🧪 PURE NODE.JS TEST DEPLOYMENT"
echo "==============================="
# Build test image
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
IMAGE_NAME="us-east5-docker.pkg.dev/direct-glider-465821-p7/realm-rivalry/test:$TIMESTAMP"
echo "🏗️ Building test image: $IMAGE_NAME"
docker build -f Dockerfile.test -t "$IMAGE_NAME" .
echo "📤 Pushing to Artifact Registry..."
docker push "$IMAGE_NAME"
echo "🚀 Deploying test container..."
gcloud run deploy realm-rivalry \
  --image "$IMAGE_NAME" \
  --platform managed \
  --region us-east5 \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 180 \
  --max-instances 1 \
  --allow-unauthenticated
echo "✅ TEST DEPLOYMENT COMPLETE!"
echo "🌐 Test URL: https://realmrivalry.com"
echo "🏥 Health check: curl https://realmrivalry.com/health"
