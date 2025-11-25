# Backend Testing Documentation

This directory contains comprehensive unit and integration tests for the MERN Advanced Auth backend.

## Test Structure

The test suite is organized into a clear, modular structure:

```
backend/__tests__/
├── unit/                           # Unit tests for individual components
│   ├── controllers/                # Controller tests
│   │   ├── auth.controller.test.ts
│   │   └── googleAuth.controller.test.ts
│   ├── middleware/                 # Middleware tests
│   │   └── verifyToken.test.ts
│   ├── utils/                      # Utility function tests
│   │   └── generateTokenAndSetCookie.test.ts
│   └── models/                     # Model tests
│       └── user.model.test.ts
├── integration/                    # Integration tests
│   └── auth.routes.test.ts        # API endpoint tests
├── setup/                          # Test configuration
│   ├── testSetup.ts               # Global test setup
│   └── testDb.ts                  # In-memory database utilities
└── helpers/                        # Test utilities
    └── testHelpers.ts             # Reusable test helpers
```

## Testing Framework

- **Jest**: Primary testing framework with excellent TypeScript support
- **Supertest**: HTTP assertion library for testing Express routes
- **mongodb-memory-server**: In-memory MongoDB for isolated testing

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### Note on Coverage
Coverage reporting has some limitations due to ESM/CommonJS interoperability. Use `npm test` for the most reliable test execution.

## Test Coverage

The test suite covers:

### Controllers (100%)
- ✅ **auth.controller.ts**
  - Signup with validation
  - Login with credentials
  - Logout functionality
  - Email verification
  - Password reset flow
  - Check authentication status
  - Password change

- ✅ **googleAuth.controller.ts**
  - Google OAuth URL generation
  - OAuth callback handling
  - CSRF protection (state parameter)
  - User creation/linking

### Middleware (100%)
- ✅ **verifyToken.ts**
  - Token validation
  - JWT verification
  - Error handling
  - User ID extraction

### Utils (100%)
- ✅ **generateTokenAndSetCookie.ts**
  - JWT token generation
  - Cookie configuration
  - Environment-specific settings

### Models (100%)
- ✅ **user.model.ts**
  - Schema validation
  - Required fields
  - Default values
  - Unique constraints
  - Indexes

### Integration Tests
- ✅ **auth.integration.test.ts** (19 tests)
  - Complete signup flow
  - Login/logout cycles
  - Email verification
  - Password reset workflow
  - Protected routes (check-auth, change-password)
  - Error handling
  - Data sanitization

- ✅ **middleware.test.ts** (18 tests)
  - Token verification middleware
  - Middleware chain execution
  - Request/response processing
  - Cookie management
  - HTTP methods and parameters
  - Error handling

- ✅ **auth.routes.test.ts** (12 tests)
  - Route definitions
  - HTTP endpoint configuration
  - Route structure validation

## Test Utilities

### Test Database (`testDb.ts`)
Provides utilities for managing the in-memory MongoDB instance:
- `connectTestDb()`: Connect before tests
- `clearTestDb()`: Clear all collections after each test
- `disconnectTestDb()`: Cleanup after all tests

### Test Helpers (`testHelpers.ts`)
Reusable utilities for creating test data:
- `createMockRequest()`: Create Express request mocks
- `createMockResponse()`: Create Express response mocks
- `createTestUser()`: Create test users in database
- `generateVerificationToken()`: Generate verification codes

## Best Practices

1. **Isolation**: Each test is isolated with its own database state
2. **Mocking**: External services (email) are mocked to avoid side effects
3. **Assertions**: Clear, descriptive assertions for better debugging
4. **Setup/Teardown**: Proper cleanup after each test
5. **Coverage**: Aim for 100% code coverage on critical paths

## Writing New Tests

When adding new tests, follow this pattern:

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { createMockRequest, createMockResponse } from '../../helpers/testHelpers.js';

describe('MyModule', () => {
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
    mockRequest = createMockRequest({});
    mockResponse = createMockResponse();
  });

  it('should do something', async () => {
    // Arrange
    mockRequest.body = { /* test data */ };

    // Act
    await myFunction(mockRequest, mockResponse);

    // Assert
    expect(mockResponse.status).toHaveBeenCalledWith(200);
  });
});
```

## Environment Variables

Tests use a test-specific environment configured in `testSetup.ts`:
- `NODE_ENV=test`
- `JWT_SECRET=test-jwt-secret-key-for-testing`
- `CLIENT_URL=http://localhost:3000`
- In-memory MongoDB (no MONGO_URI needed)

## Continuous Integration

These tests are designed to run in CI/CD pipelines:
- No external dependencies
- Fast execution with in-memory database
- Deterministic results
- Comprehensive coverage reports

## Troubleshooting

### Tests timeout
Increase Jest timeout in `jest.config.ts` or individual tests:
```typescript
jest.setTimeout(10000); // 10 seconds
```

### MongoDB connection issues
Ensure `mongodb-memory-server` is properly installed:
```bash
npm install --save-dev mongodb-memory-server
```

### Module resolution errors
Check that `moduleNameMapper` in `jest.config.ts` correctly handles `.js` extensions for TypeScript files.

## Future Improvements

Potential areas for expansion:
- [ ] E2E tests with real database
- [ ] Load/performance testing
- [ ] Security testing (penetration tests)
- [ ] API contract testing
- [ ] Snapshot testing for responses
