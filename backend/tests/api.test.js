const request = require('supertest');
const { app } = require('../server');

describe('API Tests', () => {
  test('GET / returns API info', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('Hubble Backend API');
  });

  test('GET /api/health returns healthy status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('healthy');
  });
});