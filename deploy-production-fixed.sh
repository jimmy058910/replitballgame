#!/bin/bash
set -e
echo "🚀 PRODUCTION DEPLOYMENT - ROOT CAUSES FIXED"
echo "============================================="
echo "✅ ES Module syntax corrected"
echo "✅ REPLIT_DOMAINS dependency removed"
echo "✅ Routes updated to use googleAuth.ts"
# Build production image
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
IMAGE_NAME="us-east5-docker.pkg.dev/direct-glider-465821-p7/realm-rivalry/production:$TIMESTAMP"
echo "🏗️ Building production image: $IMAGE_NAME"
docker build -f Dockerfile.production -t "$IMAGE_NAME" .
echo "📤 Pushing to Artifact Registry..."
docker push "$IMAGE_NAME"
echo "🚀 Deploying to Google Cloud Run..."
gcloud run deploy realm-rivalry \
  --image "$IMAGE_NAME" \
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
echo "✅ PRODUCTION DEPLOYMENT COMPLETE!"
echo "🌐 Production URL: https://realmrivalry.com"
echo "🏥 Health check: curl https://realmrivalry.com/health"
