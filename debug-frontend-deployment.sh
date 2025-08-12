#!/bin/bash
# COMPREHENSIVE FRONTEND DEPLOYMENT DEBUG SCRIPT
# Tests all aspects of Cloud Run deployment

echo "🔍 COMPREHENSIVE FRONTEND DEPLOYMENT DEBUGGING"
echo "==============================================="

# Get service URL
SERVICE_NAME="realm-rivalry-fullstack"
REGION="us-central1"

echo "Getting service URL..."
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)' 2>/dev/null)

if [ -z "$SERVICE_URL" ]; then
    echo "❌ Service not found or not deployed"
    exit 1
fi

echo "✅ Service URL: $SERVICE_URL"
echo ""

# Test 1: Health Check
echo "🏥 TESTING HEALTH ENDPOINT"
echo "========================="
curl -s "$SERVICE_URL/health" | jq . 2>/dev/null || curl -s "$SERVICE_URL/health"
echo ""

# Test 2: Frontend Root
echo "🌐 TESTING FRONTEND ROOT"
echo "======================="
FRONTEND_RESPONSE=$(curl -s "$SERVICE_URL/")
echo "Response length: $(echo "$FRONTEND_RESPONSE" | wc -c) characters"
echo "HTML detected: $(echo "$FRONTEND_RESPONSE" | grep -q "<!DOCTYPE html" && echo "YES" || echo "NO")"
echo "React content: $(echo "$FRONTEND_RESPONSE" | grep -q "react\|React\|vite\|Vite\|Realm Rivalry" && echo "YES" || echo "NO")"
echo ""
echo "First 500 characters:"
echo "$FRONTEND_RESPONSE" | head -c 500
echo ""
echo ""

# Test 3: Static Assets
echo "🎨 TESTING STATIC ASSETS"
echo "======================="
# Test favicon
curl -I "$SERVICE_URL/favicon.svg" 2>/dev/null | head -5
echo ""

# Test CSS/JS assets (if we can find them in the HTML)
ASSET_URLS=$(echo "$FRONTEND_RESPONSE" | grep -o '/assets/[^"]*\.\(js\|css\)' | head -2)
for asset in $ASSET_URLS; do
    echo "Testing asset: $asset"
    curl -I "$SERVICE_URL$asset" 2>/dev/null | head -3
    echo ""
done

# Test 4: API Endpoints
echo "🔧 TESTING API ENDPOINTS"
echo "======================="
curl -s "$SERVICE_URL/api/health" | head -200 2>/dev/null || echo "API health endpoint not available"
echo ""

# Test 5: Route Handling
echo "🛤️  TESTING ROUTE HANDLING"
echo "========================"
echo "Testing SPA route (should return HTML):"
curl -s "$SERVICE_URL/dashboard" | head -200 | grep -q "<!DOCTYPE html" && echo "✅ SPA routing works" || echo "❌ SPA routing failed"
echo ""

echo "🎯 DEBUGGING COMPLETE"
echo "===================="
echo "Service URL: $SERVICE_URL"
echo "To deploy: git push origin main"
echo "To view logs: gcloud logs tail --service=$SERVICE_NAME"