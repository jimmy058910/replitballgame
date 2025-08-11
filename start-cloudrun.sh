#!/bin/bash
# Start the production server with comprehensive fallback options
# Try compiled JavaScript first, then transpiled TypeScript with tsx
echo "🚀 Starting Cloud Run server with TypeScript transpilation support..."
if [ -f "dist/server/index.js" ]; then
    echo "Starting compiled server..."
    exec NODE_ENV=production node dist/server/index.js
elif [ -f "dist/server/index.ts" ]; then
    echo "Starting TypeScript server with tsx..."
    exec NODE_ENV=production npx tsx dist/server/index.ts
else
    echo "No server found, trying original location..."
    exec NODE_ENV=production npx tsx server/index.ts
fi