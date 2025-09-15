// ABOUTME: Shared test utilities and helper functions
// ABOUTME: Provides authentication token generation and database setup for tests

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Generate a test JWT token for authentication
function generateTestToken(payload = {}) {
  const defaultPayload = {
    userId: 'test-user',
    role: 'user',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
  };

  const tokenPayload = { ...defaultPayload, ...payload };

  // Use a test secret (in production this would come from environment)
  const secret = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';

  return jwt.sign(tokenPayload, secret);
}

// Generate a random ID for testing
function generateTestId(prefix = 'test') {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

// Create a test database connection
async function setupTestDatabase() {
  const sqlite3 = require('sqlite3').verbose();
  const { open } = require('sqlite');

  const db = await open({
    filename: ':memory:', // Use in-memory database for tests
    driver: sqlite3.Database
  });

  // Initialize schema
  const { initializeDatabase } = require('../database/init');
  await initializeDatabase(db);

  return db;
}

// Clean up test data
async function cleanupTestData(db, tables = ['bookmarks', 'groups', 'shared_views']) {
  for (const table of tables) {
    await db.run(`DELETE FROM ${table} WHERE id LIKE 'test-%' OR title LIKE 'Test%' OR name LIKE 'Test%'`);
  }
}

// Create mock request object
function createMockRequest(overrides = {}) {
  return {
    params: {},
    query: {},
    body: {},
    headers: {},
    user: { userId: 'test-user', role: 'user' },
    db: null,
    io: { emit: jest.fn() },
    ...overrides
  };
}

// Create mock response object
function createMockResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis()
  };
  return res;
}

// Wait for async operations to complete
function waitForAsync(ms = 100) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  generateTestToken,
  generateTestId,
  setupTestDatabase,
  cleanupTestData,
  createMockRequest,
  createMockResponse,
  waitForAsync
};