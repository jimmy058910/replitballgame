#!/bin/bash

# Deploy from Google Cloud Shell with authentication fix
# Run this in Cloud Shell after cloning the repository

set -e

PROJECT_ID="direct-glider-465821-p7"
SERVICE_NAME="realm-rivalry"
REGION="us-east5"
IMAGE_NAME="us-east5-docker.pkg.dev/${PROJECT_ID}/${SERVICE_NAME}/production:$(date +%Y%m%d-%H%M%S)"

echo "🚀 Deploying Realm Rivalry with authentication fix..."
echo "================================="
echo "Project: $PROJECT_ID"
echo "Service: $SERVICE_NAME"
echo "Region: $REGION"
echo "Image: $IMAGE_NAME"
echo ""

# Ensure we're in the project directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from project root directory"
    exit 1
fi

# Set project and authenticate
gcloud config set project $PROJECT_ID
gcloud auth configure-docker us-east5-docker.pkg.dev

# Build the Docker image
echo "🏗️ Building production image..."
docker build -f Dockerfile.production -t $IMAGE_NAME .

if [ $? -ne 0 ]; then
    echo "❌ Docker build failed!"
    exit 1
fi

echo "✅ Docker build completed"

# Push to Artifact Registry
echo "📤 Pushing to Artifact Registry..."
docker push $IMAGE_NAME

if [ $? -ne 0 ]; then
    echo "❌ Docker push failed!"
    exit 1
fi

echo "✅ Image pushed successfully"

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --service-account realm-rivalry-runner@${PROJECT_ID}.iam.gserviceaccount.com \
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
echo "Testing authentication endpoints..."

# Test the deployment
echo "🧪 Testing /api/login endpoint..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://realm-rivalry-108005641993.us-east5.run.app/api/login)
if [ "$RESPONSE" = "302" ]; then
    echo "✅ /api/login working (redirects to Google OAuth)"
else
    echo "❌ /api/login failed (HTTP $RESPONSE)"
fi

echo "🧪 Testing debug endpoint..."
curl -s https://realm-rivalry-108005641993.us-east5.run.app/debug-auth | jq .

echo ""
echo "🌐 Service URL: https://realm-rivalry-108005641993.us-east5.run.app"
echo "🌐 Custom Domain: https://realmrivalry.com"
echo ""
echo "✅ Deployment complete with authentication fix!"