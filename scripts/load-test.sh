#!/bin/bash

# Load Testing Script for Realm Rivalry
# Tests production deployment under load

PRODUCTION_URL="https://realmrivalry.com"

echo "🚀 REALM RIVALRY LOAD TESTING"
echo "============================="
echo "Target: $PRODUCTION_URL"
echo ""

# Check if Apache Bench is available
if ! command -v ab &> /dev/null; then
    echo "📦 Installing Apache Bench..."
    sudo apt-get update -qq
    sudo apt-get install -y apache2-utils
fi

echo "🔍 Running Load Tests..."
echo ""

# Test 1: Health endpoint stress test
echo "Test 1: Health Endpoint Load Test"
echo "- 1000 requests, 10 concurrent users"
ab -n 1000 -c 10 $PRODUCTION_URL/health
echo ""

# Test 2: Main page load test
echo "Test 2: Main Application Load Test"
echo "- 500 requests, 5 concurrent users"
ab -n 500 -c 5 $PRODUCTION_URL/
echo ""

# Test 3: API endpoint test
echo "Test 3: API Endpoint Load Test"
echo "- 200 requests, 3 concurrent users"
ab -n 200 -c 3 $PRODUCTION_URL/api/seasons/current
echo ""

echo "✅ Load Testing Complete!"
echo "Review results above for performance metrics"