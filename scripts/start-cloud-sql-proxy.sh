#!/bin/bash

# Cloud SQL Auth Proxy Startup Script
# This eliminates the need for IP whitelisting by using IAM authentication

set -e

echo "🔗 Starting Cloud SQL Auth Proxy..."

# Set up authentication
export GOOGLE_APPLICATION_CREDENTIALS="/tmp/cloud-sql-proxy/service-account-key.json"

# Extract project ID from service account (proper JSON parsing)
PROJECT_ID=$(cat "$GOOGLE_APPLICATION_CREDENTIALS" | python3 -c "import sys, json; print(json.load(sys.stdin)['project_id'])")
echo "📋 Project ID: $PROJECT_ID"

# Cloud SQL instance details
REGION="us-central1"
INSTANCE_NAME="realm-rivalry-dev"
CONNECTION_NAME="$PROJECT_ID:$REGION:$INSTANCE_NAME"

echo "🌐 Connection Name: $CONNECTION_NAME"
echo "🔌 Proxy will listen on localhost:5433 (avoiding conflict with direct connection)"

# Start the proxy in the background
/tmp/cloud-sql-proxy/cloud-sql-proxy \
  --address 0.0.0.0 \
  --port 5433 \
  "$CONNECTION_NAME" &

PROXY_PID=$!
echo "✅ Cloud SQL Auth Proxy started with PID: $PROXY_PID"
echo "🔗 Database available at: localhost:5433"

# Wait for proxy to be ready
echo "⏳ Waiting for proxy to be ready..."
sleep 3

# Test connection
echo "🧪 Testing proxy connection..."
if nc -z localhost 5433; then
  echo "✅ Proxy is ready and accepting connections"
else
  echo "❌ Proxy not ready yet"
fi

echo "Proxy PID: $PROXY_PID" > /tmp/cloud-sql-proxy/proxy.pid