#!/bin/bash
# Test our container locally to debug startup issues
echo '🔧 Testing container startup locally...'
echo 'Environment: NODE_ENV=production PORT=8080'
echo 'Testing start-cloudrun.sh script...'

# Simulate Cloud Run environment
export NODE_ENV=production
export PORT=8080

# Test the start script directly
echo '🚀 Running start-cloudrun.sh with PORT=8080...'
bash start-cloudrun.sh &
SERVER_PID=$!

# Wait a moment for server to start
sleep 5

# Test if port 8080 is actually listening
echo '🔍 Checking if port 8080 is listening...'
curl -f http://localhost:8080/health 2>/dev/null && echo '✅ Server responding on port 8080' || echo '❌ Server NOT responding on port 8080'

# Kill the server
kill $SERVER_PID 2>/dev/null
