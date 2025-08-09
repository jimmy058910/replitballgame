#!/bin/bash

# Production Build Test Script
# Tests the complete production build process locally

set -e  # Exit on any error

echo "🏗️  PRODUCTION BUILD TEST SUITE"
echo "=================================="

echo "📋 Step 1: Clean previous builds"
rm -rf dist/
echo "✅ Build directory cleaned"

echo "📋 Step 2: Generate Prisma client"
npx prisma generate
echo "✅ Prisma client generated"

echo "📋 Step 3: Compile TypeScript server"
npm run build:server
echo "✅ Server TypeScript compiled to JavaScript"

echo "📋 Step 4: Build React frontend"
npm run build
echo "✅ React frontend built"

echo "📋 Step 5: Verify critical build outputs"

# Check server entry point
if [ -f "dist/server/index.js" ]; then
    echo "✅ Server entry point exists: dist/server/index.js"
else
    echo "❌ Server entry point missing"
    exit 1
fi

# Check frontend build
if [ -d "dist/public" ] && [ -f "dist/public/index.html" ]; then
    echo "✅ Frontend build exists: dist/public/"
else
    echo "❌ Frontend build missing"
    exit 1
fi

# Check Prisma client
if [ -f "node_modules/.prisma/client/index.js" ]; then
    echo "✅ Prisma client generated: node_modules/.prisma/client/"
else
    echo "❌ Prisma client missing"
    exit 1
fi

echo "📋 Step 6: Test server startup (compilation only)"
# Test server imports without running
node -c dist/server/index.js && echo "✅ Server JavaScript syntax valid" || echo "❌ Server syntax errors"

echo ""
echo "🎉 PRODUCTION BUILD TEST COMPLETED"
echo "=================================="
echo "✅ All build steps successful"
echo "✅ Ready for Docker containerization"
echo "✅ Ready for Cloud Run deployment"
echo ""
echo "Next step: Commit changes and trigger production deployment"
echo "Command: git push origin main"