#!/bin/bash

# Cloud SQL Auth Proxy startup script for development
# This connects to the Cloud SQL instance specified in DATABASE_URL

echo "🔧 Starting Cloud SQL Auth Proxy for development environment..."

# Extract Cloud SQL connection name from DATABASE_URL
CONNECTION_NAME="direct-glider-465821-p7:us-central1:realm-rivalry-dev"

echo "📋 Cloud SQL Connection Details:"
echo "   Connection Name: $CONNECTION_NAME"
echo "   Proxy Port: 5432"
echo "   Socket Directory: /tmp/cloudsql"

# Create socket directory
mkdir -p /tmp/cloudsql

# Kill any existing proxy processes
pkill -f cloud_sql_proxy || true

echo "🚀 Starting Cloud SQL Auth Proxy..."

# Start Cloud SQL Auth Proxy in background
./cloud_sql_proxy \
  --address=0.0.0.0 \
  --port=5432 \
  --instances=${CONNECTION_NAME}=tcp:5432 \
  --credentials-file=<(echo "$GOOGLE_SERVICE_ACCOUNT_KEY") \
  > /tmp/cloud_sql_proxy.log 2>&1 &

PROXY_PID=$!
echo "✅ Cloud SQL Auth Proxy started with PID: $PROXY_PID"
echo "📋 Proxy logs: /tmp/cloud_sql_proxy.log"

# Wait a moment for proxy to start
sleep 3

# Test connection
if nc -z localhost 5432; then
  echo "✅ Cloud SQL Auth Proxy is running and accepting connections on port 5432"
  echo "🔗 Database connection ready for development"
else
  echo "⚠️  Cloud SQL Auth Proxy may still be starting... check logs: tail -f /tmp/cloud_sql_proxy.log"
fi

echo "🎯 Development database is now accessible at localhost:5432"