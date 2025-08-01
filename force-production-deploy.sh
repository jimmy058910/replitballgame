#!/bin/bash

echo "=== FORCING PRODUCTION DEPLOYMENT ==="
echo "This will deploy the FULL backend service, not the minimal one"

# Set environment variables
PROJECT_ID="direct-glider-465821-p7"
REGION="us-east5"
BACKEND_SERVICE="realm-rivalry-backend"
BACKEND_IMAGE="us-east5-docker.pkg.dev/direct-glider-465821-p7/realm-rivalry/backend"

echo "1. Building production frontend with correct API URL..."
export VITE_API_BASE_URL="https://realm-rivalry-backend-108005641993.us-east5.run.app"
npm run build

echo "2. Building backend Docker image..."
docker build -f Dockerfile.backend -t $BACKEND_IMAGE:latest .

echo "3. Configuring Docker authentication..."
gcloud auth configure-docker us-east5-docker.pkg.dev

echo "4. Pushing backend image..."
docker push $BACKEND_IMAGE:latest

echo "5. Deploying FULL backend to Cloud Run (NOT minimal)..."
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

echo "6. Getting backend URL..."
BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE --region=$REGION --format="value(status.url)")
echo "Backend URL: $BACKEND_URL"

echo "7. Testing backend health..."
curl -f "$BACKEND_URL/health" && echo "✅ Backend healthy" || echo "❌ Backend health check failed"

echo "8. Testing team endpoint..."
curl -s "$BACKEND_URL/api/teams" | head -5

echo "9. Testing market endpoint..."
curl -s "$BACKEND_URL/api/market/store" | head -5

echo "10. Deploying frontend to Firebase..."
firebase deploy --project $PROJECT_ID

echo "🎉 DEPLOYMENT COMPLETE!"
echo "Frontend: https://realmrivalry.com"
echo "Backend: $BACKEND_URL"