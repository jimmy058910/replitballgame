#!/bin/bash
# Start the production server with comprehensive fallback options
# CRITICAL: Ensure PORT environment variable is passed through to Node.js process
echo "🚀 Starting Cloud Run server with TypeScript transpilation support..."
echo "🔍 Environment check: NODE_ENV=${NODE_ENV}, PORT=${PORT}"

if [ -f "dist/server/index.js" ]; then
    echo "Starting compiled server..."
    exec env NODE_ENV=production PORT="${PORT:-8080}" node dist/server/index.js
elif [ -f "dist/server/index.ts" ]; then
    echo "Starting TypeScript server with tsx..."
    exec env NODE_ENV=production PORT="${PORT:-8080}" npx tsx dist/server/index.ts
else
    echo "No server found, trying original location..."
    exec env NODE_ENV=production PORT="${PORT:-8080}" npx tsx server/index.ts
fi