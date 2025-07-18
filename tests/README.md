# Realm Rivalry Test Suite

## Overview
Comprehensive test suite covering all automated and manual game functions in the Realm Rivalry fantasy sports management system.

## Test Organization

### Core Systems Tests
- **Automated Systems**: Daily progression, tournaments, match simulation
- **Manual Functions**: Formation management, player trades, exhibition matches
- **API Routes**: All endpoint validation and response testing
- **Services**: Business logic and data processing tests
- **Database**: Storage layer and data integrity tests
- **Integration**: End-to-end system workflows

## Test Categories

### 1. Automated Systems (`/automated/`)
- `daily-progression.test.js` - Daily player progression, aging, retirement
- `tournament-automation.test.js` - Tournament creation, brackets, auto-start
- `match-simulation.test.js` - Live match simulation, MVP data, events
- `season-timing.test.js` - Season advancement, day transitions, scheduling

### 2. Manual Functions (`/manual/`)
- `formation-management.test.js` - Tactical formations, player positioning
- `exhibition-matches.test.js` - Exhibition match creation, instant matches
- `marketplace-trading.test.js` - Player auctions, bidding, transfers
- `team-management.test.js` - Roster management, player contracts
- `store-purchases.test.js` - Equipment, consumables, gem transactions

### 3. API Routes (`/api/`)
- `auth-routes.test.js` - Authentication, user management
- `team-routes.test.js` - Team CRUD operations, finances
- `player-routes.test.js` - Player data, statistics, progression
- `match-routes.test.js` - Match creation, live data, post-game
- `tournament-routes.test.js` - Tournament management, entries, brackets
- `league-routes.test.js` - League standings, schedules, divisions

### 4. Services (`/services/`)
- `tournament-service.test.js` - Tournament logic, bracket generation
- `match-simulation.test.js` - Game simulation, commentary, stats
- `player-progression.test.js` - Aging, skills, retirement mechanics
- `economy-service.test.js` - Credits, gems, marketplace transactions
- `notification-service.test.js` - Real-time notifications, WebSocket

### 5. Database (`/database/`)
- `storage-operations.test.js` - CRUD operations, data integrity
- `schema-validation.test.js` - Database schema compliance
- `performance-tests.test.js` - Query optimization, indexing
- `migration-tests.test.js` - Database schema changes

### 6. Integration (`/integration/`)
- `full-season-cycle.test.js` - Complete 17-day season simulation
- `tournament-workflow.test.js` - Registration to completion workflow
- `match-to-standings.test.js` - Match results affecting league standings
- `player-lifecycle.test.js` - Player creation to retirement

## Running Tests

### Individual Test Categories
```bash
# Run all tests
npm test

# Run specific category
npm test -- --testPathPattern=automated
npm test -- --testPathPattern=manual
npm test -- --testPathPattern=api
npm test -- --testPathPattern=services
npm test -- --testPathPattern=database
npm test -- --testPathPattern=integration
```

### Test Coverage
- Target: 90% branch coverage
- Critical paths: 100% coverage
- Integration tests: End-to-end workflows

## Test Data Management
- Use test database for all tests
- Reset database state between test suites
- Mock external services (auth, payments)
- Use deterministic random data for consistency

## Continuous Integration
- All tests run on every commit
- Performance benchmarks tracked
- Coverage reports generated
- Quality gates for deployment

## Last Updated: July 18, 2025