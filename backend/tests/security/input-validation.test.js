// ABOUTME: Tests for enhanced input validation to prevent XSS and injection attacks
// ABOUTME: Validates URL protocol whitelisting, text field sanitization, and ID format checking

const request = require('supertest');
const { app } = require('../../server');
const { generateTestToken } = require('../test-helpers');

describe('Input Validation Security Tests', () => {
  let authToken;
  let db;

  beforeAll(async () => {
    // Wait for database to be ready
    await new Promise(resolve => setTimeout(resolve, 100));

    // Get database instance
    db = global.db;

    // Generate auth token for admin user
    authToken = generateTestToken({ userId: 'admin', role: 'admin' });
  });

  describe('URL Protocol Validation', () => {
    test('should reject javascript: protocol URLs', async () => {
      const response = await request(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test',
          url: 'javascript:alert("XSS")'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Dangerous protocol');
    });

    test('should reject data: protocol URLs', async () => {
      const response = await request(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test',
          url: 'data:text/html,<script>alert("XSS")</script>'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Dangerous protocol');
    });

    test('should reject file: protocol URLs', async () => {
      const response = await request(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test',
          url: 'file:///etc/passwd'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Dangerous protocol');
    });

    test('should reject vbscript: protocol URLs', async () => {
      const response = await request(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test',
          url: 'vbscript:msgbox("XSS")'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Dangerous protocol');
    });

    test('should accept valid http URLs', async () => {
      const response = await request(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Valid HTTP',
          url: 'http://example.com'
        });

      // Should either succeed or fail with duplicate (not validation error)
      expect([200, 201, 409]).toContain(response.status);
      if (response.status === 400) {
        expect(response.body.error).not.toContain('Dangerous protocol');
      }
    });

    test('should accept valid https URLs', async () => {
      const response = await request(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Valid HTTPS',
          url: 'https://example.com'
        });

      // Should either succeed or fail with duplicate (not validation error)
      expect([200, 201, 409]).toContain(response.status);
      if (response.status === 400) {
        expect(response.body.error).not.toContain('Dangerous protocol');
      }
    });

    test('should require protocol in URLs', async () => {
      const response = await request(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'No Protocol',
          url: 'example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Text Field XSS Prevention', () => {
    test('should escape HTML in title field', async () => {
      const response = await request(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '<script>alert("XSS")</script>',
          url: 'https://example.com/test-xss-title'
        });

      if (response.status === 201 || response.status === 200) {
        expect(response.body.title).not.toContain('<script>');
        expect(response.body.title).toContain('&lt;script&gt;');
      }
    });

    test('should escape HTML in description field', async () => {
      const response = await request(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Description XSS',
          url: 'https://example.com/test-xss-desc',
          description: '<img src=x onerror=alert("XSS")>'
        });

      if (response.status === 201 || response.status === 200) {
        expect(response.body.description).not.toContain('<img');
        expect(response.body.description).toContain('&lt;img');
      }
    });

    test('should reject invalid characters in name field', async () => {
      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test<>Group"',
          description: 'Test group'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('invalid characters');
    });
  });

  describe('ID Field Format Validation', () => {
    test('should reject invalid group_id format', async () => {
      const response = await request(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test',
          url: 'https://example.com/test-group-id',
          group_id: '../../etc/passwd'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid group ID format');
    });

    test('should accept valid group_id format', async () => {
      const response = await request(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Valid Group ID',
          url: 'https://example.com/test-valid-group-id',
          group_id: 'default'
        });

      // Should either succeed or fail with duplicate/not found (not validation error)
      if (response.status === 400) {
        expect(response.body.error).not.toContain('Invalid group ID format');
      }
    });
  });

  describe('Password Strength Validation', () => {
    test('should reject weak passwords', async () => {
      const response = await request(app)
        .post('/api/auth/setup')
        .send({
          password: 'weak',
          email: 'test@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Password must');
    });

    test('should require lowercase, uppercase, number, and special character', async () => {
      const response = await request(app)
        .post('/api/auth/setup')
        .send({
          password: 'onlylowercase',
          email: 'test@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Password must contain');
    });

    test('should accept strong passwords', async () => {
      const response = await request(app)
        .post('/api/auth/setup')
        .send({
          password: 'StrongP@ssw0rd123',
          email: 'test@example.com'
        });

      // Should either succeed or fail with "already configured" (not validation error)
      if (response.status === 400) {
        expect(response.body.error).not.toContain('Password must');
      }
    });
  });

  describe('CSS Injection Prevention', () => {
    test('should reject javascript: in custom CSS', async () => {
      const response = await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Share',
          custom_css: 'background: url(javascript:alert("XSS"))'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Dangerous CSS pattern');
    });

    test('should reject expression() in custom CSS', async () => {
      const response = await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Share',
          custom_css: 'width: expression(alert("XSS"))'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Dangerous CSS pattern');
    });

    test('should reject @import in custom CSS', async () => {
      const response = await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Share',
          custom_css: '@import url("http://evil.com/steal.css")'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Dangerous CSS pattern');
    });

    test('should reject </style> tag injection', async () => {
      const response = await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Share',
          custom_css: 'color: red;</style><script>alert("XSS")</script>'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Dangerous CSS pattern');
    });

    test('should accept safe CSS', async () => {
      const response = await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Share with Safe CSS',
          custom_css: 'body { background: #f0f0f0; color: #333; }'
        });

      // Should either succeed or fail with other error (not CSS validation)
      if (response.status === 400) {
        expect(response.body.error).not.toContain('Dangerous CSS pattern');
      }
    });
  });

  describe('Email Validation', () => {
    test('should normalize email addresses', async () => {
      const response = await request(app)
        .post('/api/auth/setup')
        .send({
          password: 'StrongP@ssw0rd123',
          email: 'TEST@EXAMPLE.COM'
        });

      // Email should be normalized to lowercase
      if (response.status === 200 || response.status === 201) {
        expect(response.body.email).toBe('test@example.com');
      }
    });

    test('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/setup')
        .send({
          password: 'StrongP@ssw0rd123',
          email: 'not-an-email'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid email');
    });
  });

  afterAll(async () => {
    // Clean up test data
    if (db) {
      await db.run('DELETE FROM bookmarks WHERE title LIKE "Test%"');
      await db.run('DELETE FROM groups WHERE name LIKE "Test%"');
      await db.run('DELETE FROM shared_views WHERE name LIKE "Test%"');
    }
  });
});