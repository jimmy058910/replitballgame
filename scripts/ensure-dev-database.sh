#!/bin/bash

# Development Database Connection Helper
# This script ensures the development environment can connect to Cloud SQL

echo "🔧 Setting up development database connection..."

# Check if proxy is already running
if ps aux | grep cloud-sql-proxy | grep -v grep > /dev/null; then
    echo "✅ Cloud SQL Auth Proxy already running"
    exit 0
fi

# Set up authentication
export GOOGLE_APPLICATION_CREDENTIALS="/tmp/cloud-sql-proxy/service-account-key.json"

if [ ! -f "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
    echo "❌ Service account key not found at $GOOGLE_APPLICATION_CREDENTIALS"
    echo "🔧 Setting up service account key..."
    
    if [ -z "$GOOGLE_SERVICE_ACCOUNT_KEY" ]; then
        echo "❌ GOOGLE_SERVICE_ACCOUNT_KEY environment variable not set"
        exit 1
    fi
    
    mkdir -p /tmp/cloud-sql-proxy
    echo "$GOOGLE_SERVICE_ACCOUNT_KEY" | base64 -d > "$GOOGLE_APPLICATION_CREDENTIALS"
    chmod 600 "$GOOGLE_APPLICATION_CREDENTIALS"
    echo "✅ Service account key created"
fi

# Start Cloud SQL Auth Proxy
echo "🚀 Starting Cloud SQL Auth Proxy for development..."
nohup /tmp/cloud-sql-proxy/cloud-sql-proxy --address 0.0.0.0 --port 5433 direct-glider-465821-p7:us-central1:realm-rivalry-dev > /tmp/cloud-sql-proxy/proxy.log 2>&1 &

# Wait and verify
sleep 3

if ps aux | grep cloud-sql-proxy | grep -v grep > /dev/null; then
    echo "✅ Cloud SQL Auth Proxy started successfully"
    echo "📍 Proxy running on localhost:5433"
else
    echo "❌ Failed to start Cloud SQL Auth Proxy"
    echo "📋 Proxy log:"
    cat /tmp/cloud-sql-proxy/proxy.log 2>/dev/null || echo "No log file found"
    exit 1
fi