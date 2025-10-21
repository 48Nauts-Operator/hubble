// ABOUTME: Security tests for admin route authentication
// ABOUTME: Validates that all admin routes require proper authentication and admin privileges

const request = require('supertest');
const app = require('../../server');
const { initializeDatabase } = require('../../database/init');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

describe('Admin Route Authentication', () => {
  let adminToken;
  let userToken;
  let expiredToken;
  let invalidToken;
  let shareId;

  beforeAll(async () => {
    // Initialize test database
    const testDbPath = path.join(__dirname, '../../../data/test-admin-auth.db');
    process.env.DATABASE_URL = testDbPath;
    process.env.AUTH_ENABLED = 'true';
    process.env.JWT_SECRET = 'test-secret-key';

    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    await initializeDatabase();

    // Create admin token
    adminToken = jwt.sign(
      { type: 'admin', userId: 'admin-user' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create regular user token
    userToken = jwt.sign(
      { type: 'user', userId: 'regular-user' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create expired token
    expiredToken = jwt.sign(
      { type: 'admin', userId: 'admin-user' },
      process.env.JWT_SECRET,
      { expiresIn: '-1h' }
    );

    // Create invalid token
    invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature';
  });

  afterAll(async () => {
    // Clean up test database
    const testDbPath = path.join(__dirname, '../../../data/test-admin-auth.db');
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('GET /api/shares-admin', () => {
    test('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/shares-admin');

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    test('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/shares-admin')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    test('should reject request with expired token', async () => {
      const response = await request(app)
        .get('/api/shares-admin')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('expired');
    });

    test('should reject request from non-admin user', async () => {
      const response = await request(app)
        .get('/api/shares-admin')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Admin privileges required');
    });

    test('should accept request from admin user', async () => {
      const response = await request(app)
        .get('/api/shares-admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.shares).toBeDefined();
      expect(Array.isArray(response.body.shares)).toBe(true);
    });
  });

  describe('POST /api/shares-admin', () => {
    test('should reject creation without authentication', async () => {
      const response = await request(app)
        .post('/api/shares-admin')
        .send({
          name: 'Test Share',
          description: 'Test share without auth'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    test('should reject creation from non-admin user', async () => {
      const response = await request(app)
        .post('/api/shares-admin')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Test Share',
          description: 'Test share from regular user'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Admin privileges required');
    });

    test('should allow creation from admin user', async () => {
      const response = await request(app)
        .post('/api/shares-admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Admin Test Share',
          description: 'Test share from admin',
          access_type: 'public'
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.uid).toBeDefined();
      expect(response.body.name).toBe('Admin Test Share');

      shareId = response.body.id;
    });
  });

  describe('GET /api/shares-admin/:id', () => {
    test('should reject request without authentication', async () => {
      const response = await request(app)
        .get(`/api/shares-admin/${shareId}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    test('should reject request from non-admin user', async () => {
      const response = await request(app)
        .get(`/api/shares-admin/${shareId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Admin privileges required');
    });

    test('should allow request from admin user', async () => {
      const response = await request(app)
        .get(`/api/shares-admin/${shareId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(shareId);
      expect(response.body.name).toBe('Admin Test Share');
    });
  });

  describe('PUT /api/shares-admin/:id', () => {
    test('should reject update without authentication', async () => {
      const response = await request(app)
        .put(`/api/shares-admin/${shareId}`)
        .send({
          name: 'Updated Share Name'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    test('should reject update from non-admin user', async () => {
      const response = await request(app)
        .put(`/api/shares-admin/${shareId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Updated Share Name'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Admin privileges required');
    });

    test('should allow update from admin user', async () => {
      const response = await request(app)
        .put(`/api/shares-admin/${shareId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Admin Share',
          description: 'Updated description'
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Admin Share');
      expect(response.body.description).toBe('Updated description');
    });
  });

  describe('DELETE /api/shares-admin/:id', () => {
    test('should reject deletion without authentication', async () => {
      const response = await request(app)
        .delete(`/api/shares-admin/${shareId}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    test('should reject deletion from non-admin user', async () => {
      const response = await request(app)
        .delete(`/api/shares-admin/${shareId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Admin privileges required');
    });

    test('should allow deletion from admin user', async () => {
      const response = await request(app)
        .delete(`/api/shares-admin/${shareId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(204);

      // Verify deletion
      const verifyResponse = await request(app)
        .get(`/api/shares-admin/${shareId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(verifyResponse.status).toBe(404);
    });
  });

  describe('Token Security', () => {
    test('should reject token without Bearer prefix', async () => {
      const response = await request(app)
        .get('/api/shares-admin')
        .set('Authorization', adminToken);

      expect(response.status).toBe(401);
    });

    test('should reject malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/shares-admin')
        .set('Authorization', 'InvalidFormat token');

      expect(response.status).toBe(401);
    });

    test('should reject request with token in query parameter', async () => {
      const response = await request(app)
        .get(`/api/shares-admin?token=${adminToken}`);

      expect(response.status).toBe(401);
    });

    test('should reject request with token in body', async () => {
      const response = await request(app)
        .post('/api/shares-admin')
        .send({
          token: adminToken,
          name: 'Test Share'
        });

      expect(response.status).toBe(401);
    });
  });
});