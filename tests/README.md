# Realm Rivalry Test Suite

Comprehensive test coverage for all automated and manual game functions.

## Test Categories

### 🤖 Automated Systems (`tests/automated/`)
Tests for automated game systems that run without user interaction:
- **Daily Progression**: Player aging, stat progression, retirement mechanics
- **Tournament Automation**: Bracket generation, auto-start, match progression
- **Match Simulation**: Live events, MVP calculation, commentary generation
- **Season Timing**: Day advancement, phase transitions, automation scheduling

### 🎮 Manual Functions (`tests/manual/`)
Tests for user-initiated game actions:
- **Formation Management**: Tactical setup, player positioning, field size changes
- **Exhibition Matches**: Instant match creation, opponent selection, reward calculation
- **Marketplace Trading**: Player listings, bidding system, transaction processing
- **Team Management**: Roster changes, contract negotiations, facility upgrades

### 🌐 API Routes (`tests/api/`)
Tests for all API endpoints:
- **Match Routes**: Live match data, enhanced statistics, force start functionality
- **Team Routes**: Team management, player operations, financial transactions
- **Tournament Routes**: Tournament registration, bracket display, status updates
- **Store Routes**: Item purchases, gem transactions, payment processing

### 🔧 Services (`tests/services/`)
Tests for business logic and data processing:
- **Tournament Service**: Bracket generation, winner determination, prize distribution
- **Match Service**: Game simulation, event generation, stat tracking
- **Player Service**: Progression calculations, aging algorithms, retirement logic
- **Economy Service**: Credit/gem transactions, marketplace operations, reward distribution

### 🗄️ Database (`tests/database/`)
Tests for data storage and integrity:
- **Storage Operations**: CRUD operations, query optimization, data validation
- **Schema Compliance**: Foreign key constraints, data type validation, relationship integrity
- **Transaction Management**: Atomic operations, rollback scenarios, concurrent access
- **Data Migration**: Schema changes, data transformation, backup/restore operations

### 🔗 Integration (`tests/integration/`)
Tests for end-to-end workflows:
- **Full Season Cycle**: Complete 17-day season simulation with all automated systems
- **Tournament Workflows**: Registration → Bracket → Live Matches → Completion → Prizes
- **Player Lifecycle**: Creation → Progression → Peak Performance → Aging → Retirement
- **Match-to-Standings**: Game completion → Team record updates → League standings refresh

## Running Tests

### Quick Start
```bash
# Run all tests
node tests/run-tests.js

# Run specific category
node tests/run-tests.js automated
node tests/run-tests.js manual
node tests/run-tests.js api
node tests/run-tests.js services
node tests/run-tests.js database
node tests/run-tests.js integration
```

### Test Options
```bash
# Run with coverage report
node tests/run-tests.js --coverage

# Run with verbose output
node tests/run-tests.js --verbose

# Run in watch mode
node tests/run-tests.js --watch

# Run specific category with coverage
node tests/run-tests.js automated --coverage
```

### Alternative Jest Commands
```bash
# Run all tests with Jest directly
npx jest --config ./tests/jest.config.js

# Run specific test file
npx jest tests/automated/daily-progression.test.js

# Run tests matching pattern
npx jest --testPathPattern="automated" --config ./tests/jest.config.js
```

## Coverage Targets

### 100% Coverage Requirements
- **Branches**: 100% - All decision paths tested
- **Functions**: 100% - All functions executed
- **Lines**: 100% - All code lines covered
- **Statements**: 100% - All statements executed

### Coverage Categories
- **Critical Paths**: 100% coverage required (match simulation, tournament brackets, player progression)
- **Business Logic**: 100% coverage required (economy, rewards, standings)
- **API Endpoints**: 100% coverage required (authentication, validation, responses)
- **Error Handling**: 100% coverage required (all error conditions and edge cases)

## Test Infrastructure

### Mock System
- **Database**: Complete Prisma Client mocking with all models
- **Authentication**: Automatic user authentication bypass for testing
- **WebSocket**: Mock real-time communication for live match testing
- **External Services**: Mock payment processing and third-party integrations

### Test Utilities
- **Mock Data Generators**: Consistent test data creation for teams, players, matches
- **Database Helpers**: Setup/teardown utilities for database testing
- **Authentication Helpers**: User session management for endpoint testing
- **Time Helpers**: Date/time manipulation for season timing tests

### Test Environment
- **Node Environment**: Tests run in isolated Node.js environment
- **Database**: Mock database operations prevent test data pollution
- **Network**: All external API calls mocked for consistent testing
- **File System**: Temporary test files cleaned up after each test run

## Writing New Tests

### Test Structure
```javascript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup for each test
    jest.clearAllMocks();
  });

  describe('Specific Functionality', () => {
    it('should perform expected behavior', async () => {
      // Arrange
      const mockData = testUtils.createMockTeam();
      
      // Act
      const result = await serviceMethod(mockData);
      
      // Assert
      expect(result).toEqual(expectedResult);
    });
  });
});
```

### Mock Usage
```javascript
// Use global test utilities
const mockUser = global.testUtils.createMockUser();
const mockTeam = global.testUtils.createMockTeam();
const mockPlayer = global.testUtils.createMockPlayer();

// Mock database operations
mockPrisma.team.findUnique.mockResolvedValue(mockTeam);
mockPrisma.player.findMany.mockResolvedValue([mockPlayer]);
```

### Coverage Best Practices
1. **Test all branches**: Include both success and failure paths
2. **Test edge cases**: Boundary conditions, empty inputs, invalid data
3. **Test error handling**: Exception scenarios, network failures, timeout conditions
4. **Test async operations**: Promise resolution/rejection, callback handling
5. **Test integration points**: Service-to-service communication, API responses

## Continuous Integration

### Pre-commit Testing
```bash
# Run critical tests before committing
node tests/run-tests.js automated --coverage
node tests/run-tests.js integration --coverage
```

### Full Test Suite
```bash
# Run complete test suite with coverage
node tests/run-tests.js --coverage --verbose
```

### Coverage Reports
- **HTML Report**: `coverage/index.html` - Visual coverage report
- **LCOV Report**: `coverage/lcov.info` - Machine-readable coverage data
- **Console Report**: Real-time coverage feedback during test execution

## Troubleshooting

### Common Issues
1. **Mock not working**: Ensure mock is defined before importing tested module
2. **Database errors**: Check that all Prisma operations are mocked
3. **Timeout errors**: Increase timeout for slow operations or add proper mocking
4. **Coverage gaps**: Use `--verbose` to identify untested code paths

### Debug Commands
```bash
# Run single test with detailed output
npx jest tests/automated/daily-progression.test.js --verbose

# Run tests with coverage and open HTML report
node tests/run-tests.js --coverage && open coverage/index.html
```

## Production Readiness

✅ **Complete Test Coverage**: All game functions tested
✅ **Mock Infrastructure**: Comprehensive mocking system
✅ **CI/CD Ready**: Automated testing pipeline prepared
✅ **Performance Optimized**: Fast test execution with parallel processing
✅ **Documentation**: Complete test documentation and examples
✅ **Quality Assurance**: 100% coverage target with comprehensive validation