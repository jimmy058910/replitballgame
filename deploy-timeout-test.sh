#!/bin/bash
set -e
echo "🕰️ EXTENDED TIMEOUT TEST DEPLOYMENT"
echo "==================================="
# Use the existing test image
IMAGE_NAME="us-east5-docker.pkg.dev/direct-glider-465821-p7/realm-rivalry/test:20250729-175245"
echo "🚀 Deploying with extended startup timeout..."
gcloud run deploy realm-rivalry \
  --image "$IMAGE_NAME" \
  --platform managed \
  --region us-east5 \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 600 \
  --max-instances 1 \
  --allow-unauthenticated
echo "✅ TIMEOUT TEST DEPLOYMENT COMPLETE!"
