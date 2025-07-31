#!/bin/bash

# Hybrid Deployment Script - Firebase Hosting + Google Cloud Run Backend
# This script deploys frontend to Firebase and backend to Google Cloud Run

echo "🚀 Starting hybrid deployment..."
echo "🔹 Frontend: Firebase Hosting"  
echo "🔹 Backend: Google Cloud Run"

# Set variables
PROJECT_ID="direct-glider-465821-p7"
REGION="us-east5"
BACKEND_SERVICE="realm-rivalry-backend"
BACKEND_IMAGE="us-east5-docker.pkg.dev/$PROJECT_ID/realm-rivalry/backend"

# Check if gcloud is authenticated
echo "🔍 Checking authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1 > /dev/null; then
  echo "❌ Please run 'gcloud auth login' first"
  exit 1
fi

# Set project
echo "📋 Setting project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Configure Docker authentication
echo "🐳 Configuring Docker authentication..."
gcloud auth configure-docker us-east5-docker.pkg.dev

# Build and push backend to Cloud Run
echo "🏗️ Building backend Docker image..."
docker build -f Dockerfile.backend -t $BACKEND_IMAGE:latest .

echo "📤 Pushing backend image to Artifact Registry..."
docker push $BACKEND_IMAGE:latest

echo "🚀 Deploying backend to Cloud Run..."
gcloud run deploy $BACKEND_SERVICE \
  --image $BACKEND_IMAGE:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --service-account realm-rivalry-runner@$PROJECT_ID.iam.gserviceaccount.com \
  --set-env-vars NODE_ENV=production \
  --set-secrets DATABASE_URL=database-url:latest,SESSION_SECRET=session-secret:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest \
  --memory 2Gi \
  --cpu 1 \
  --concurrency 80 \
  --max-instances 10 \
  --port 8080 \
  --timeout 300s

# Get backend URL
BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE --region=$REGION --format="value(status.url)")
echo "✅ Backend deployed at: $BACKEND_URL"

# Build frontend for Firebase
echo "🏗️ Building frontend for Firebase Hosting..."
VITE_API_BASE_URL=$BACKEND_URL npm run build

# Deploy frontend to Firebase
echo "🚀 Deploying frontend to Firebase Hosting..."
firebase deploy --project $PROJECT_ID

echo "🎉 Hybrid deployment complete!"
echo "🌐 Frontend: https://realmrivalry.com"
echo "🔧 Backend APIs: $BACKEND_URL"
echo "💾 Database: Neon PostgreSQL"

# Test the deployment
echo "🧪 Testing deployment..."
echo "Frontend: $(curl -s -o /dev/null -w "%{http_code}" https://realmrivalry.com)"
echo "Backend Health: $(curl -s -o /dev/null -w "%{http_code}" $BACKEND_URL/health)"