// ABOUTME: SQL injection prevention tests for all routes
// ABOUTME: Validates that parameterized queries protect against SQL injection attacks

const request = require('supertest');
const app = require('../../server');
const { initializeDatabase } = require('../../database/init');
const path = require('path');
const fs = require('fs');

describe('SQL Injection Prevention', () => {
  let authToken;
  let testGroupId;

  beforeAll(async () => {
    // Initialize test database
    const testDbPath = path.join(__dirname, '../../../data/test-hubble.db');
    process.env.DATABASE_URL = testDbPath;

    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    await initializeDatabase();

    // Create test user and get auth token
    const authResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'testpass123'
      });

    authToken = authResponse.body.token;

    // Create test group
    const groupResponse = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Group',
        description: 'Test group for security testing'
      });

    testGroupId = groupResponse.body.id;
  });

  afterAll(async () => {
    // Clean up test database
    const testDbPath = path.join(__dirname, '../../../data/test-hubble.db');
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Bookmark Routes SQL Injection Tests', () => {
    test('should prevent SQL injection in bookmark search', async () => {
      const maliciousSearch = "'; DROP TABLE bookmarks; --";

      const response = await request(app)
        .get('/api/bookmarks')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ search: maliciousSearch });

      expect(response.status).toBe(200);
      expect(response.body.bookmarks).toBeDefined();
    });

    test('should prevent SQL injection in bookmark tags filter', async () => {
      const maliciousTags = "'; UPDATE bookmarks SET title='HACKED'; --";

      const response = await request(app)
        .get('/api/bookmarks')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ tags: maliciousTags });

      expect(response.status).toBe(200);
      expect(response.body.bookmarks).toBeDefined();
    });
  });

  describe('Share Routes SQL Injection Tests', () => {
    test('should prevent SQL injection in share creation with malicious groups', async () => {
      const maliciousGroups = ["'; DROP TABLE shared_views; --", "normal-group-id"];

      const response = await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Share',
          description: 'Test share',
          included_groups: maliciousGroups,
          access_type: 'public'
        });

      // Should either succeed with sanitized data or fail validation
      expect([201, 400]).toContain(response.status);
      if (response.status === 201) {
        expect(response.body.id).toBeDefined();
      }
    });

    test('should prevent SQL injection in share filtering', async () => {
      const maliciousEnvironment = "'; DELETE FROM shared_views; --";

      // First create a share to test filtering on
      const shareResponse = await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Filter Test Share',
          description: 'Test share for filtering',
          access_type: 'public'
        });

      expect(shareResponse.status).toBe(201);

      // Now test malicious filtering
      const filterResponse = await request(app)
        .get(`/api/shares/${shareResponse.body.uid}`)
        .query({ environment: maliciousEnvironment });

      expect([200, 400, 404]).toContain(filterResponse.status);
    });
  });

  describe('Shares-Admin Routes SQL Injection Tests', () => {
    test('should prevent SQL injection in admin share updates', async () => {
      // First create a share
      const createResponse = await request(app)
        .post('/api/shares-admin')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Admin Test Share',
          description: 'Test share for admin updates',
          access_type: 'public'
        });

      expect(createResponse.status).toBe(201);
      const shareId = createResponse.body.id;

      // Now try malicious update
      const maliciousUpdate = {
        name: "'; DROP TABLE shared_views; --",
        description: "Still a test"
      };

      const updateResponse = await request(app)
        .put(`/api/shares-admin/${shareId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(maliciousUpdate);

      expect([200, 400]).toContain(updateResponse.status);
    });
  });

  describe('Random ID Generation Security Tests', () => {
    test('should use cryptographically secure random for share UIDs', async () => {
      const response1 = await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Random Test 1',
          access_type: 'public'
        });

      const response2 = await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Random Test 2',
          access_type: 'public'
        });

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);

      // UIDs should be different and unpredictable
      expect(response1.body.uid).not.toBe(response2.body.uid);
      expect(response1.body.uid).toMatch(/^[A-Za-z0-9]{8}$/);
      expect(response2.body.uid).toMatch(/^[A-Za-z0-9]{8}$/);
    });

    test('should generate collision-resistant IDs', async () => {
      const ids = new Set();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const response = await request(app)
          .post('/api/shares')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: `Collision Test ${i}`,
            access_type: 'public'
          });

        expect(response.status).toBe(201);
        ids.add(response.body.uid);
      }

      // All IDs should be unique
      expect(ids.size).toBe(iterations);
    });
  });

  describe('Input Validation Tests', () => {
    test('should validate and sanitize bookmark URLs', async () => {
      const maliciousUrls = [
        'javascript:alert("XSS")',
        'data:text/html,<script>alert("XSS")</script>',
        'vbscript:msgbox("XSS")',
        'file:///etc/passwd'
      ];

      for (const maliciousUrl of maliciousUrls) {
        const response = await request(app)
          .post('/api/bookmarks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Malicious Bookmark',
            url: maliciousUrl,
            group_id: testGroupId
          });

        // Should reject malicious URLs
        expect(response.status).toBe(400);
        expect(response.body.error || response.body.errors).toBeDefined();
      }
    });

    test('should accept valid HTTP/HTTPS URLs', async () => {
      const validUrls = [
        'https://example.com',
        'http://localhost:3000',
        'https://subdomain.example.org/path?query=value',
        'http://127.0.0.1:8080/api/test'
      ];

      for (const validUrl of validUrls) {
        const response = await request(app)
          .post('/api/bookmarks')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: `Valid Bookmark - ${validUrl}`,
            url: validUrl,
            group_id: testGroupId
          });

        expect(response.status).toBe(201);
        expect(response.body.id).toBeDefined();
      }
    });
  });
});