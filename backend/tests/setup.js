// ABOUTME: Jest test setup file for configuring test environment
// ABOUTME: Handles global test setup, mocking, and cleanup

// Mock process.exit to prevent it from killing Jest
const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

// Setup environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.CORS_ORIGINS = 'http://localhost:3000,http://localhost:8888';

// Clean up after all tests
afterAll(() => {
  mockExit.mockRestore();
});