#!/bin/bash

# Ultra-simple deployment with minimal server
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
IMAGE_NAME="us-east5-docker.pkg.dev/direct-glider-465821-p7/realm-rivalry/simple:$TIMESTAMP"

echo "🎯 MINIMAL DEPLOYMENT APPROACH"
echo "=============================="
echo "✅ Using simple CommonJS server"
echo "✅ Minimal dependencies"
echo "✅ Basic health checks"
echo ""

# Build and deploy
docker build -f Dockerfile.simple -t "$IMAGE_NAME" .
docker push "$IMAGE_NAME"

gcloud run deploy realm-rivalry \
  --image "$IMAGE_NAME" \
  --platform managed \
  --region us-east5 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --concurrency 50 \
  --max-instances 5 \
  --port 8080 \
  --timeout 120s

echo ""
echo "🚀 If this works, we know the basic container setup is fine"
echo "🔧 Then we can add back complexity piece by piece"