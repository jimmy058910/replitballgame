#!/bin/bash
# CRITICAL FIX: Simplified startup script focused on tsx runtime transpilation
# Ensures PORT environment variable is properly passed to Node.js process
echo "🚀 Starting Cloud Run server with tsx runtime transpilation..."
echo "🔍 Environment check: NODE_ENV=${NODE_ENV}, PORT=${PORT}"

# CRITICAL: Always use tsx for runtime transpilation with proper TypeScript source
if [ -f "dist/server/index.ts" ]; then
    echo "✅ Starting tsx runtime transpilation from dist/server/index.ts"
    exec env NODE_ENV=production PORT="${PORT:-8080}" npx tsx dist/server/index.ts
elif [ -f "server/index.ts" ]; then
    echo "⚠️ Fallback: Starting tsx from server/index.ts"
    exec env NODE_ENV=production PORT="${PORT:-8080}" npx tsx server/index.ts
else
    echo "❌ CRITICAL ERROR: No TypeScript entry point found"
    exit 1
fi