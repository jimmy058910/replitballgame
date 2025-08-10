#!/bin/bash
# Cloud Run Optimized Startup Script
echo "🚀 Starting Cloud Run optimized server..."
NODE_ENV=production node dist/server/index-cloudrun-optimized.js