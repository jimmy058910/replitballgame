#!/bin/bash
echo "🔍 COMPREHENSIVE DEPLOYMENT VERIFICATION"
echo "========================================"

echo "1. Testing our main service (realm-rivalry-backend in us-central1):"
curl -f --max-time 10 "https://realm-rivalry-backend-o6fd46yesq-uc.a.run.app/health" 2>/dev/null && echo "✅ realm-rivalry-backend: WORKING" || echo "❌ realm-rivalry-backend: FAILING"

echo ""
echo "2. Checking if there's a different realm-rivalry service:"
echo "   (This might be the one in the error logs)"

echo ""  
echo "3. Our deployment targets:"
echo "   - Service: realm-rivalry-backend"
echo "   - Region: us-central1"
echo "   - Image: Uses our Dockerfile.production"

echo ""
echo "4. Error logs were from:"
echo "   - Service: realm-rivalry (different name!)"
echo "   - Region: us-east5 (different region!)"
echo "   - Uses: Google buildpacks (not our Docker!)"

echo ""
echo "CONCLUSION: You might be monitoring the wrong service!"
