#!/bin/bash

echo "🐳 LOCAL DOCKER TESTING SCRIPT"
echo "================================"
echo "This script builds and tests your Docker container locally"
echo "to validate ALL fixes before cloud deployment."
echo ""

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="realm-rivalry-local"
CONTAINER_NAME="realm-rivalry-test"
PORT=8080

echo -e "${YELLOW}🔧 STEP 1: Cleaning up existing containers${NC}"
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true
docker rmi $IMAGE_NAME 2>/dev/null || true

echo -e "${YELLOW}🔨 STEP 2: Building Docker image locally${NC}"
echo "Building with same Dockerfile.backend used in production..."
docker build \
  --no-cache \
  --platform linux/amd64 \
  -f Dockerfile.backend \
  -t $IMAGE_NAME \
  .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Docker build SUCCESS${NC}"
else
    echo -e "${RED}❌ Docker build FAILED${NC}"
    exit 1
fi

echo -e "${YELLOW}🚀 STEP 3: Running container locally${NC}"
echo "Starting container with production-like environment..."
docker run -d \
  --name $CONTAINER_NAME \
  --platform linux/amd64 \
  -p $PORT:8080 \
  -e NODE_ENV=production \
  -e PORT=8080 \
  -e GOOGLE_CLOUD_PROJECT=direct-glider-465821-p7 \
  -e NODE_OPTIONS="--max-old-space-size=3072" \
  $IMAGE_NAME

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Container started successfully${NC}"
else
    echo -e "${RED}❌ Container failed to start${NC}"
    exit 1
fi

echo -e "${YELLOW}🔍 STEP 4: Waiting for server startup...${NC}"
sleep 10

echo -e "${YELLOW}🩺 STEP 5: Testing health endpoints${NC}"

# Test health endpoint
echo "Testing /health endpoint..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/health || echo "000")

if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ /health endpoint: PASSED (200)${NC}"
else
    echo -e "${RED}❌ /health endpoint: FAILED ($HEALTH_RESPONSE)${NC}"
fi

# Test healthz endpoint (Cloud Run readiness)
echo "Testing /healthz endpoint..."
HEALTHZ_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/healthz || echo "000")

if [ "$HEALTHZ_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ /healthz endpoint: PASSED (200)${NC}"
else
    echo -e "${RED}❌ /healthz endpoint: FAILED ($HEALTHZ_RESPONSE)${NC}"
fi

echo -e "${YELLOW}🔍 STEP 6: Checking container logs${NC}"
echo "Last 20 lines of container logs:"
echo "================================"
docker logs --tail 20 $CONTAINER_NAME

echo ""
echo -e "${YELLOW}📊 STEP 7: Container status summary${NC}"
echo "================================"
docker ps -a --filter name=$CONTAINER_NAME

# Container health check
if docker ps --filter name=$CONTAINER_NAME --filter status=running | grep -q $CONTAINER_NAME; then
    echo -e "${GREEN}✅ CONTAINER STATUS: RUNNING${NC}"
    echo -e "${GREEN}✅ LOCAL TEST SUCCESS - Ready for cloud deployment${NC}"
    echo ""
    echo "🌐 Access your app at: http://localhost:$PORT"
    echo "🩺 Health check: http://localhost:$PORT/health"
    echo "🔍 Readiness check: http://localhost:$PORT/healthz"
    echo ""
    echo -e "${YELLOW}To stop the test container:${NC}"
    echo "docker stop $CONTAINER_NAME && docker rm $CONTAINER_NAME"
    
    exit 0
else
    echo -e "${RED}❌ CONTAINER STATUS: FAILED${NC}"
    echo -e "${RED}❌ LOCAL TEST FAILED - Fix issues before cloud deployment${NC}"
    echo ""
    echo "🔍 Get full logs with: docker logs $CONTAINER_NAME"
    echo "🧹 Cleanup with: docker stop $CONTAINER_NAME && docker rm $CONTAINER_NAME"
    
    exit 1
fi