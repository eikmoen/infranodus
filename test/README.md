# InfraNodus Testing Suite

This directory contains tests for various InfraNodus components, including the new modules for exponential growth, cosmic symphony visualization, memory protection, and celestial veritas.

## Testing Structure

The tests are organized as follows:

- `unit/` - Unit tests for individual components
- `integration/` - Tests for interactions between components
- `e2e/` - End-to-end tests for complete user flows
- `performance/` - Tests for performance and stress testing
- `fixtures/` - Test data used by the various tests

## Running Tests

### Prerequisites

- Node.js 14+ installed
- All InfraNodus dependencies installed
- Test database configured (see below)

### Commands

Run all tests:
```bash
npm test
```

Run specific test categories:
```bash
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:performance
```

Run specific test files:
```bash
npx mocha test/unit/celestialVeritas.test.js
```

## Setting Up Test Database

The tests use a separate database to avoid affecting your development or production data:

1. Create a test database (e.g., `infranodus_test`)
2. Update `test/config.js` with the connection details
3. Tests will automatically create necessary tables and fixtures

## Test Coverage

Generate test coverage reports:
```bash
npm run test:coverage
```

This will create a `coverage/` directory with detailed reports on test coverage.

## Writing New Tests

### Unit Tests

When writing unit tests for new components:

1. Create a new file in `test/unit/` named after your component
2. Import the necessary test utilities
3. Use the following template:

```javascript
const assert = require('assert');
const { expect } = require('chai');
const sinon = require('sinon');
const ComponentToTest = require('../../path/to/component');

describe('Component Name', function() {
  before(function() {
    // Setup code that runs once before all tests
  });

  beforeEach(function() {
    // Setup code that runs before each test
  });

  it('should perform specific function correctly', function() {
    // Test code
    expect(result).to.equal(expectedValue);
  });

  // More tests...

  afterEach(function() {
    // Cleanup after each test
  });

  after(function() {
    // Final cleanup after all tests
  });
});
```

### Integration Tests

Integration tests should focus on how components interact with each other:

1. Create a new file in `test/integration/`
2. Set up both components being tested
3. Test their interactions

### Performance Tests

Performance tests should:

1. Measure execution time
2. Test with progressively larger data sets
3. Define acceptable thresholds for performance
