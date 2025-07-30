#!/bin/bash

# Full Production Deployment Script for Google Cloud Run
# This deploys the complete Realm Rivalry application with React frontend + backend APIs

echo "🚀 Starting full production deployment to Google Cloud Run..."
echo "=================================================="

# Generate timestamp for unique image tagging
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
IMAGE_NAME="us-east5-docker.pkg.dev/direct-glider-465821-p7/realm-rivalry/production:$TIMESTAMP"

echo "📦 Image name: $IMAGE_NAME"
echo ""

# Build the production Docker image
echo "🏗️ Building full production image..."
echo "Building with Dockerfile.production..."
docker build -f Dockerfile.production -t "$IMAGE_NAME" .

if [ $? -ne 0 ]; then
    echo "❌ Docker build failed!"
    exit 1
fi

echo "✅ Docker build completed successfully"
echo ""

# Push to Artifact Registry
echo "📤 Pushing image to Artifact Registry..."
docker push "$IMAGE_NAME"

if [ $? -ne 0 ]; then
    echo "❌ Docker push failed!"
    exit 1
fi

echo "✅ Image pushed successfully"
echo ""

# Deploy to Cloud Run with full production configuration
echo "🚀 Deploying full application to Cloud Run..."
echo "Using production secrets and environment variables..."

gcloud run deploy realm-rivalry \
  --image "$IMAGE_NAME" \
  --platform managed \
  --region us-east5 \
  --allow-unauthenticated \
  --service-account realm-rivalry-runner@direct-glider-465821-p7.iam.gserviceaccount.com \
  --set-env-vars NODE_ENV=production,GOOGLE_CLIENT_ID=108005641993-e642ered12jj7ka6unpqhgjdls92c0u8.apps.googleusercontent.com \
  --set-secrets DATABASE_URL=database-url:latest,SESSION_SECRET=session-secret:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest,STRIPE_SECRET_KEY=stripe-secret-key:latest \
  --memory 2Gi \
  --cpu 1 \
  --concurrency 80 \
  --max-instances 10 \
  --port 8080 \
  --timeout 300s

if [ $? -ne 0 ]; then
    echo "❌ Cloud Run deployment failed!"
    exit 1
fi

echo ""
echo "🎉 DEPLOYMENT SUCCESSFUL!"
echo "========================="
echo "Your full Realm Rivalry application is now live!"
echo ""
echo "Service URL: https://realm-rivalry-108005641993.us-east5.run.app"
echo "Custom Domain: https://realmrivalry.com"
echo ""
echo "🔍 Test your deployment:"
echo "Health Check: curl https://realm-rivalry-108005641993.us-east5.run.app/health"
echo "API Test: curl https://realm-rivalry-108005641993.us-east5.run.app/api/test"
echo ""
echo "✅ Full production deployment complete!"