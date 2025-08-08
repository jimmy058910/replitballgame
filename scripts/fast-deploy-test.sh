#!/bin/bash

echo "⚡ FAST DEPLOYMENT TEST SCRIPT"
echo "=============================="
echo "This script optimizes Cloud Run deployment with aggressive timeouts"
echo "and better failure detection to avoid 20+ minute hangs."
echo ""

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="direct-glider-465821-p7"
REGION="us-east5"
SERVICE_NAME="realm-rivalry-backend"
IMAGE_NAME="us-east5-docker.pkg.dev/${PROJECT_ID}/realm-rivalry/backend"

echo -e "${BLUE}🔐 STEP 1: Authenticating to Google Cloud${NC}"
echo "Assuming gcloud is already configured..."

echo -e "${BLUE}🐳 STEP 2: Building with optimized settings${NC}"
COMMIT_SHA=$(git rev-parse HEAD)
SHORT_SHA="${COMMIT_SHA:0:8}"
echo "Using tag: $SHORT_SHA"

# Quick build check
echo -e "${YELLOW}Building locally first to catch issues early...${NC}"
docker build \
  --no-cache \
  --platform linux/amd64 \
  -f Dockerfile.backend \
  -t temp-test-build \
  . || { echo -e "${RED}❌ Local build failed - fix before deploying${NC}"; exit 1; }

echo -e "${GREEN}✅ Local build successful, pushing to registry...${NC}"
docker tag temp-test-build $IMAGE_NAME:$SHORT_SHA
docker push $IMAGE_NAME:$SHORT_SHA

echo -e "${BLUE}🚀 STEP 3: Optimized Cloud Run deployment${NC}"
echo "Deploying with aggressive timeouts and better health checks..."

# Deploy with optimized timeouts
timeout 10m gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME:$SHORT_SHA \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --no-traffic \
  --tag green-$SHORT_SHA \
  --set-env-vars NODE_ENV=production,DEPLOY_TIMESTAMP=$(date +%s),GOOGLE_CLOUD_PROJECT=$PROJECT_ID,NODE_OPTIONS="--max-old-space-size=3072" \
  --set-secrets DATABASE_URL_PRODUCTION=DATABASE_URL:latest,SESSION_SECRET=SESSION_SECRET:latest,VITE_FIREBASE_API_KEY=firebase-api-key:latest,VITE_FIREBASE_PROJECT_ID=firebase-project-id:latest,VITE_FIREBASE_APP_ID=firebase-app-id:latest,GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest,GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest \
  --memory 4Gi \
  --cpu 2 \
  --concurrency 50 \
  --max-instances 5 \
  --min-instances 0 \
  --timeout 120s \
  --startup-probe httpGet.path=/healthz,initialDelaySeconds=30,timeoutSeconds=5,failureThreshold=6,periodSeconds=10 \
  --format="export" \
  --quiet || {
    echo -e "${RED}❌ DEPLOYMENT TIMED OUT OR FAILED${NC}"
    echo "Common causes:"
    echo "- Cloud Run quota exceeded"
    echo "- IAM permissions missing"
    echo "- Container startup failure"
    echo "- Secret Manager access issues"
    exit 1
  }

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ FAST DEPLOYMENT SUCCESS${NC}"
    echo "Green revision deployed with optimized settings"
    
    # Get the service URL
    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")
    GREEN_URL="https://green-$SHORT_SHA---$SERVICE_NAME-$(echo $SERVICE_URL | cut -d'/' -f3)"
    
    echo -e "${YELLOW}🌐 Testing green revision...${NC}"
    echo "Green URL: $GREEN_URL"
    
    # Quick health check
    HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "${GREEN_URL}/health" || echo "000")
    if [ "$HEALTH_CHECK" = "200" ]; then
        echo -e "${GREEN}✅ Green revision health check: PASSED${NC}"
        echo "Ready for traffic migration!"
    else
        echo -e "${RED}❌ Green revision health check: FAILED ($HEALTH_CHECK)${NC}"
    fi
else
    echo -e "${RED}❌ FAST DEPLOYMENT FAILED${NC}"
fi

# Cleanup temp image
docker rmi temp-test-build 2>/dev/null || true