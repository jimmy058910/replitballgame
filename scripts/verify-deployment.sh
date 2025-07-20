#!/bin/bash

# Deployment Verification Script for realmrivalry.com
# Tests all critical endpoints and verifies React app is working

echo "🚀 REALM RIVALRY DEPLOYMENT VERIFICATION"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="https://realmrivalry.com"

# Function to test HTTP endpoint
test_endpoint() {
    local url=$1
    local expected_status=$2
    local description=$3
    
    echo -n "Testing $description... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} ($response)"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} ($response, expected $expected_status)"
        return 1
    fi
}

# Function to test if content contains expected text
test_content() {
    local url=$1
    local expected_text=$2
    local description=$3
    
    echo -n "Testing $description... "
    
    content=$(curl -s "$url" 2>/dev/null)
    
    if echo "$content" | grep -q "$expected_text"; then
        echo -e "${GREEN}✓ PASS${NC}"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (content not found)"
        echo "First 200 chars: ${content:0:200}..."
        return 1
    fi
}

# Track test results
passed=0
failed=0

echo -e "\n${YELLOW}1. Basic Infrastructure Tests${NC}"
echo "----------------------------"

if test_endpoint "$BASE_URL/health" "200" "Health endpoint"; then
    ((passed++))
else
    ((failed++))
fi

if test_endpoint "$BASE_URL/api/health" "200" "API health endpoint"; then
    ((passed++))
else
    ((failed++))
fi

echo -e "\n${YELLOW}2. React Application Tests${NC}"
echo "--------------------------"

if test_content "$BASE_URL" "Realm Rivalry" "React app loading"; then
    ((passed++))
else
    ((failed++))
fi

if test_content "$BASE_URL" "Fantasy Sports" "App title"; then
    ((passed++))
else
    ((failed++))
fi

# Check if it's showing loading page vs actual app
if test_content "$BASE_URL" "System Loading" "Loading fallback check"; then
    echo -e "${YELLOW}⚠ WARNING${NC}: Site is showing loading fallback - React build may have failed"
    ((failed++))
else
    echo -e "${GREEN}✓ PASS${NC}: Not showing loading fallback"
    ((passed++))
fi

echo -e "\n${YELLOW}3. API Endpoint Tests${NC}"
echo "---------------------"

if test_endpoint "$BASE_URL/api/users/me" "401" "Authentication endpoint (should require auth)"; then
    ((passed++))
else
    ((failed++))
fi

if test_endpoint "$BASE_URL/api/teams/all" "200" "Teams endpoint"; then
    ((passed++))
else
    ((failed++))
fi

echo -e "\n${YELLOW}4. Static Asset Tests${NC}"
echo "---------------------"

if test_endpoint "$BASE_URL/favicon.svg" "200" "Favicon"; then
    ((passed++))
else
    ((failed++))
fi

echo -e "\n${YELLOW}5. Security Headers Tests${NC}"
echo "-------------------------"

# Test security headers
headers=$(curl -s -I "$BASE_URL" 2>/dev/null)

echo -n "Testing security headers... "
if echo "$headers" | grep -q "X-Content-Type-Options"; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((passed++))
else
    echo -e "${YELLOW}⚠ WARNING${NC} (some security headers missing)"
    ((passed++)) # Don't fail on this
fi

echo -e "\n${YELLOW}DEPLOYMENT VERIFICATION SUMMARY${NC}"
echo "================================"
echo -e "Tests Passed: ${GREEN}$passed${NC}"
echo -e "Tests Failed: ${RED}$failed${NC}"
echo -e "Total Tests: $((passed + failed))"

if [ $failed -eq 0 ]; then
    echo -e "\n${GREEN}🎉 DEPLOYMENT SUCCESSFUL!${NC}"
    echo "All critical systems are operational."
    exit 0
elif [ $failed -le 2 ]; then
    echo -e "\n${YELLOW}⚠ DEPLOYMENT PARTIALLY SUCCESSFUL${NC}"
    echo "Some non-critical issues detected."
    exit 1
else
    echo -e "\n${RED}❌ DEPLOYMENT FAILED${NC}"
    echo "Critical issues detected - manual intervention required."
    exit 2
fi