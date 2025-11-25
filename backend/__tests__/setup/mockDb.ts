/**
 * Mock database setup for tests without mongodb-memory-server
 * This approach mocks Mongoose methods to avoid needing a real database
 */

// Mock Mongoose connection
export const setupMockDb = () => {
  // No actual database connection needed
  // Tests will mock individual model methods as needed
};

export const clearMockDb = () => {
  jest.clearAllMocks();
};

export const teardownMockDb = () => {
  jest.resetAllMocks();
};
