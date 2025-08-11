#!/bin/bash
# CLOUD RUN PRODUCTION STARTUP SCRIPT - COMPREHENSIVE COMPATIBILITY
set -e

echo "🚀 Starting Cloud Run production server..."
echo "🔍 Environment: NODE_ENV=${NODE_ENV}, PORT=${PORT}"
echo "🔍 Working directory: $(pwd)"
echo "🔍 Available files:"
ls -la dist/server/ 2>/dev/null || echo "No dist/server directory"

# CRITICAL: Cloud Run requires binding to 0.0.0.0 and correct PORT
export NODE_ENV=production
export PORT=${PORT:-8080}
export HOST=0.0.0.0

# Try multiple startup approaches for maximum compatibility
if [ -f "dist/server/index.ts" ]; then
    echo "✅ Method 1: tsx runtime transpilation from dist/server/index.ts"
    exec npx tsx dist/server/index.ts
elif [ -f "dist/server/index.js" ]; then
    echo "✅ Method 2: Running compiled JavaScript from dist/server/index.js"
    exec node dist/server/index.js
elif [ -f "server/index.ts" ]; then
    echo "✅ Method 3: tsx runtime from original server/index.ts"
    exec npx tsx server/index.ts
else
    echo "❌ CRITICAL: No server entry point found"
    echo "Available files:"
    find . -name "index.*" -type f 2>/dev/null || echo "No index files found"
    exit 1
fi