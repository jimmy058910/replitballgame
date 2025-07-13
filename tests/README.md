# Test Suite

This directory contains the current test suite for the Realm Rivalry fantasy sports management application.

## Current Tests

### comprehensive-system-integration-test.js
- **Purpose**: Tests all 13 core system endpoints for 100% functionality
- **Usage**: `node tests/comprehensive-system-integration-test.js`
- **Status**: ✅ Active - Used for validating complete system functionality

### comprehensive-daily-progression-test.js
- **Purpose**: Tests enhanced daily progression system with Jules branch integration
- **Usage**: `node tests/comprehensive-daily-progression-test.js`
- **Status**: ✅ Active - Used for validating Jules branch integration features

## Test Framework

- Tests use Node.js with direct API calls
- Authentication handled with test session cookies
- All tests validate 200 success responses
- Comprehensive error handling and reporting

## Running Tests

```bash
# Run system integration test
node tests/comprehensive-system-integration-test.js

# Run daily progression test
node tests/comprehensive-daily-progression-test.js
```

## Test Results

Both tests validate:
- API endpoint functionality
- Database operations
- Authentication systems
- Core game mechanics
- Enhanced daily progression features

Expected outcome: 100% endpoint success rate across all systems.