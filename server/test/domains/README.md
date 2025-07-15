# Domain Tests

This directory contains comprehensive tests for the domain-driven architecture implementation.

## Test Structure

### Domain Test Files
- `tournaments.test.ts` - Tests for tournament domain services
- `matches.test.ts` - Tests for match domain services  
- `economy.test.ts` - Tests for economy domain services

### Test Coverage Goals
- **Branch Coverage**: Target 80% branch coverage across all domain services
- **Unit Tests**: Focus on individual service methods and business logic
- **Integration Tests**: Test domain boundaries and data flow
- **Error Handling**: Comprehensive error scenario testing

## Running Tests

```bash
# Run all domain tests
npm run test server/test/domains

# Run specific domain tests
npm run test server/test/domains/tournaments.test.ts

# Run with coverage
npm run test:coverage server/test/domains
```

## Test Patterns

### Service Testing
- Mock Prisma database calls
- Test successful operations
- Test error scenarios
- Validate input/output schemas

### Schema Validation
- Test Zod schema validation
- Test edge cases and boundaries
- Test type inference

### Error Handling
- Test domain-specific errors
- Test error propagation
- Test logging integration

## Best Practices

1. **Isolation**: Each test should be independent and isolated
2. **Mocking**: Mock external dependencies (database, logging, etc.)
3. **Assertions**: Use specific assertions for better error messages
4. **Setup/Teardown**: Clear mocks between tests
5. **Coverage**: Aim for high branch coverage, not just line coverage

## Integration with CI/CD

These tests are designed to run in the CI/CD pipeline with:
- Automated test execution
- Coverage reporting
- Performance monitoring
- Quality gates for deployment