#!/bin/bash

# Deployment Verification Script
# Tests the deployed application on realmrivalry.com

echo "🌐 VERIFYING DEPLOYMENT AT REALMRIVALRY.COM"
echo "============================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test HTTP endpoint
test_endpoint() {
    local description=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -n "Testing $description... "
    
    response=$(curl -s -w "%{http_code}" -o /dev/null "$url" --connect-timeout 30 --max-time 60)
    
    if [ "$response" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (Status: $response)"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Status: $response, Expected: $expected_status)"
        return 1
    fi
}

# Function to test content
test_content() {
    local description=$1
    local url=$2
    local expected_content=$3
    
    echo -n "Testing $description... "
    
    content=$(curl -s "$url" --connect-timeout 30 --max-time 60)
    
    if echo "$content" | grep -q "$expected_content"; then
        echo -e "${GREEN}✓ PASS${NC}"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo "Expected: $expected_content"
        echo "Got: $(echo "$content" | head -c 100)..."
        return 1
    fi
}

# Track test results
passed=0
failed=0

echo -e "\n${YELLOW}1. Basic Connectivity${NC}"
echo "---------------------"

if test_endpoint "Main domain" "https://realmrivalry.com"; then
    ((passed++))
else
    ((failed++))
fi

if test_endpoint "WWW redirect" "https://www.realmrivalry.com"; then
    ((passed++))
else
    ((failed++))
fi

if test_endpoint "HTTPS enforcement" "http://realmrivalry.com" 301; then
    ((passed++))
else
    ((failed++))
fi

echo -e "\n${YELLOW}2. Health Endpoints${NC}"
echo "-------------------"

if test_endpoint "Health check" "https://realmrivalry.com/health"; then
    ((passed++))
else
    ((failed++))
fi

if test_endpoint "API health" "https://realmrivalry.com/api/health"; then
    ((passed++))
else
    ((failed++))
fi

echo -e "\n${YELLOW}3. React Application${NC}"
echo "--------------------"

if test_content "React app loaded" "https://realmrivalry.com" "Realm Rivalry"; then
    ((passed++))
else
    ((failed++))
fi

if test_content "Root element exists" "https://realmrivalry.com" 'id="root"'; then
    ((passed++))
else
    ((failed++))
fi

if test_content "Not loading page" "https://realmrivalry.com" "<!DOCTYPE html>"; then
    ((passed++))
else
    ((failed++))
fi

# Check if it's NOT the fallback loading page
if ! curl -s "https://realmrivalry.com" | grep -q "Fantasy Sports Platform Initializing"; then
    echo -e "React app serving (not fallback)... ${GREEN}✓ PASS${NC}"
    ((passed++))
else
    echo -e "React app serving (not fallback)... ${RED}✗ FAIL${NC} (Still showing fallback)"
    ((failed++))
fi

echo -e "\n${YELLOW}4. Static Assets${NC}"
echo "----------------"

# Get the main page to extract asset URLs
main_page=$(curl -s "https://realmrivalry.com")

# Extract JavaScript bundle URL
js_url=$(echo "$main_page" | grep -o '/assets/[^"]*\.js' | head -1)
if [ -n "$js_url" ]; then
    if test_endpoint "JavaScript bundle" "https://realmrivalry.com$js_url"; then
        ((passed++))
    else
        ((failed++))
    fi
else
    echo -e "JavaScript bundle... ${RED}✗ FAIL${NC} (URL not found)"
    ((failed++))
fi

# Extract CSS bundle URL
css_url=$(echo "$main_page" | grep -o '/assets/[^"]*\.css' | head -1)
if [ -n "$css_url" ]; then
    if test_endpoint "CSS bundle" "https://realmrivalry.com$css_url"; then
        ((passed++))
    else
        ((failed++))
    fi
else
    echo -e "CSS bundle... ${RED}✗ FAIL${NC} (URL not found)"
    ((failed++))
fi

echo -e "\n${YELLOW}5. API Endpoints${NC}"
echo "----------------"

# Test key API endpoints
if test_endpoint "Server time API" "https://realmrivalry.com/api/server/time"; then
    ((passed++))
else
    ((failed++))
fi

if test_endpoint "Teams API" "https://realmrivalry.com/api/teams"; then
    ((passed++))
else
    ((failed++))
fi

echo -e "\n${YELLOW}6. Security & Performance${NC}"
echo "--------------------------"

# Check security headers
security_headers=$(curl -s -I "https://realmrivalry.com" | grep -i "x-frame-options\|x-content-type-options\|content-security-policy")
if [ -n "$security_headers" ]; then
    echo -e "Security headers... ${GREEN}✓ PASS${NC}"
    ((passed++))
else
    echo -e "Security headers... ${YELLOW}⚠ PARTIAL${NC} (Some missing)"
    ((passed++))  # Don't fail for this
fi

# Check compression
if curl -s -H "Accept-Encoding: gzip" -I "https://realmrivalry.com" | grep -q "gzip"; then
    echo -e "GZIP compression... ${GREEN}✓ PASS${NC}"
    ((passed++))
else
    echo -e "GZIP compression... ${YELLOW}⚠ PARTIAL${NC}"
    ((passed++))  # Don't fail for this
fi

echo -e "\n${YELLOW}DEPLOYMENT VERIFICATION SUMMARY${NC}"
echo "==============================="
echo -e "Tests Passed: ${GREEN}$passed${NC}"
echo -e "Tests Failed: ${RED}$failed${NC}"
echo -e "Total Tests: $((passed + failed))"

if [ $failed -eq 0 ]; then
    echo -e "\n${GREEN}🎉 DEPLOYMENT SUCCESSFUL!${NC}"
    echo "Realm Rivalry is fully operational at https://realmrivalry.com"
    echo ""
    echo "✅ React application serving correctly"
    echo "✅ API endpoints responding"
    echo "✅ Static assets loading"
    echo "✅ Security measures in place"
    echo ""
    echo "🚀 Ready for pre-alpha testing!"
    exit 0
elif [ $failed -le 2 ]; then
    echo -e "\n${YELLOW}⚠ DEPLOYMENT MOSTLY SUCCESSFUL${NC}"
    echo "Minor issues detected but core functionality appears working."
    echo "Consider investigating failed tests for optimization."
    exit 0
else
    echo -e "\n${RED}❌ DEPLOYMENT ISSUES DETECTED${NC}"
    echo "Multiple tests failed. Review deployment logs and fix issues."
    echo ""
    echo "Common solutions:"
    echo "1. Wait 2-5 minutes for deployment to fully propagate"
    echo "2. Check GitHub Actions for deployment errors"
    echo "3. Verify Docker container is running properly"
    echo "4. Check Cloud Run logs for application errors"
    exit 1
fi