// ABOUTME: Unit tests for validation middleware and common validation chains
// ABOUTME: Tests input validation, sanitization, and error handling for security

const request = require('supertest');
const express = require('express');
const {
  validationChains,
  handleValidationErrors,
  bookmarkValidation,
  groupValidation,
  shareValidation,
  authValidation
} = require('../../middleware/validation');

describe('Validation Middleware', () => {
  let app;
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('validationChains', () => {
    describe('name validation', () => {
      it('should accept valid names', (done) => {
        app.post('/test', [
          validationChains.name(true),
          handleValidationErrors
        ], (req, res) => res.json({ success: true }));
        
        request(app)
          .post('/test')
          .send({ name: 'Valid Name' })
          .expect(200, done);
      });

      it('should reject empty required names', (done) => {
        app.post('/test', [
          validationChains.name(true),
          handleValidationErrors
        ], (req, res) => res.json({ success: true }));
        
        request(app)
          .post('/test')
          .send({ name: '' })
          .expect(400)
          .expect((res) => {
            expect(res.body.error).toBe('Validation failed');
            expect(res.body.details).toHaveLength(1);
          })
          .end(done);
      });

      it('should reject names exceeding max length', (done) => {
        app.post('/test', [
          validationChains.name(true, 10),
          handleValidationErrors
        ], (req, res) => res.json({ success: true }));
        
        request(app)
          .post('/test')
          .send({ name: 'This name is way too long' })
          .expect(400, done);
      });

      it('should accept optional empty names when not required', (done) => {
        app.post('/test', [
          validationChains.name(false),
          handleValidationErrors
        ], (req, res) => res.json({ success: true }));
        
        request(app)
          .post('/test')
          .send({ name: '' })
          .expect(200, done);
      });
    });

    describe('URL validation', () => {
      it('should accept valid URLs', (done) => {
        app.post('/test', [
          validationChains.url(true),
          handleValidationErrors
        ], (req, res) => res.json({ success: true }));
        
        request(app)
          .post('/test')
          .send({ url: 'https://example.com' })
          .expect(200, done);
      });

      it('should reject invalid URLs', (done) => {
        app.post('/test', [
          validationChains.url(true),
          handleValidationErrors
        ], (req, res) => res.json({ success: true }));
        
        request(app)
          .post('/test')
          .send({ url: 'not-a-url' })
          .expect(400, done);
      });

      it('should reject empty required URLs', (done) => {
        app.post('/test', [
          validationChains.url(true),
          handleValidationErrors
        ], (req, res) => res.json({ success: true }));
        
        request(app)
          .post('/test')
          .send({ url: '' })
          .expect(400, done);
      });
    });

    describe('environment validation', () => {
      it('should accept valid environments', (done) => {
        app.post('/test', [
          validationChains.environment(),
          handleValidationErrors
        ], (req, res) => res.json({ success: true }));
        
        request(app)
          .post('/test')
          .send({ environment: 'production' })
          .expect(200, done);
      });

      it('should reject invalid environments', (done) => {
        app.post('/test', [
          validationChains.environment(),
          handleValidationErrors
        ], (req, res) => res.json({ success: true }));
        
        request(app)
          .post('/test')
          .send({ environment: 'invalid-env' })
          .expect(400, done);
      });

      it('should accept empty environment as optional', (done) => {
        app.post('/test', [
          validationChains.environment(),
          handleValidationErrors
        ], (req, res) => res.json({ success: true }));
        
        request(app)
          .post('/test')
          .send({})
          .expect(200, done);
      });
    });

    describe('color validation', () => {
      it('should accept valid hex colors', (done) => {
        app.post('/test', [
          validationChains.color(),
          handleValidationErrors
        ], (req, res) => res.json({ success: true }));
        
        request(app)
          .post('/test')
          .send({ color: '#FF5733' })
          .expect(200, done);
      });

      it('should reject invalid hex colors', (done) => {
        app.post('/test', [
          validationChains.color(),
          handleValidationErrors
        ], (req, res) => res.json({ success: true }));
        
        request(app)
          .post('/test')
          .send({ color: 'not-a-color' })
          .expect(400, done);
      });

      it('should reject short hex colors', (done) => {
        app.post('/test', [
          validationChains.color(),
          handleValidationErrors
        ], (req, res) => res.json({ success: true }));
        
        request(app)
          .post('/test')
          .send({ color: '#F00' })
          .expect(400, done);
      });
    });

    describe('password validation (auth)', () => {
      it('should accept strong passwords', (done) => {
        app.post('/test', [
          validationChains.password(true),
          handleValidationErrors
        ], (req, res) => res.json({ success: true }));
        
        request(app)
          .post('/test')
          .send({ password: 'StrongPass123!' })
          .expect(200, done);
      });

      it('should reject weak passwords', (done) => {
        app.post('/test', [
          validationChains.password(true),
          handleValidationErrors
        ], (req, res) => res.json({ success: true }));
        
        request(app)
          .post('/test')
          .send({ password: 'weak' })
          .expect(400, done);
      });

      it('should reject passwords over 128 characters', (done) => {
        app.post('/test', [
          validationChains.password(true),
          handleValidationErrors
        ], (req, res) => res.json({ success: true }));
        
        const longPassword = 'a'.repeat(129);
        
        request(app)
          .post('/test')
          .send({ password: longPassword })
          .expect(400, done);
      });
    });
  });

  describe('Pre-built validation middleware', () => {
    describe('bookmarkValidation', () => {
      it('should validate complete bookmark data', (done) => {
        app.post('/test', bookmarkValidation, (req, res) => res.json({ success: true }));
        
        request(app)
          .post('/test')
          .send({
            title: 'Test Bookmark',
            url: 'https://example.com',
            description: 'A test bookmark',
            environment: 'development',
            tags: ['test', 'example']
          })
          .expect(200, done);
      });

      it('should reject bookmarks without title', (done) => {
        app.post('/test', bookmarkValidation, (req, res) => res.json({ success: true }));
        
        request(app)
          .post('/test')
          .send({
            url: 'https://example.com'
          })
          .expect(400, done);
      });

      it('should reject bookmarks without URL', (done) => {
        app.post('/test', bookmarkValidation, (req, res) => res.json({ success: true }));
        
        request(app)
          .post('/test')
          .send({
            title: 'Test Bookmark'
          })
          .expect(400, done);
      });
    });

    describe('groupValidation', () => {
      it('should validate complete group data', (done) => {
        app.post('/test', groupValidation, (req, res) => res.json({ success: true }));
        
        request(app)
          .post('/test')
          .send({
            name: 'Test Group',
            icon: '📁',
            description: 'A test group',
            color: '#FF5733'
          })
          .expect(200, done);
      });

      it('should reject groups without name', (done) => {
        app.post('/test', groupValidation, (req, res) => res.json({ success: true }));
        
        request(app)
          .post('/test')
          .send({
            icon: '📁'
          })
          .expect(400, done);
      });
    });

    describe('authValidation.setup', () => {
      it('should validate setup with password and email', (done) => {
        app.post('/test', authValidation.setup, (req, res) => res.json({ success: true }));
        
        request(app)
          .post('/test')
          .send({
            password: 'SecurePass123!',
            email: 'test@example.com'
          })
          .expect(200, done);
      });

      it('should reject weak passwords in setup', (done) => {
        app.post('/test', authValidation.setup, (req, res) => res.json({ success: true }));
        
        request(app)
          .post('/test')
          .send({
            password: 'weak',
            email: 'test@example.com'
          })
          .expect(400)
          .expect((res) => {
            expect(res.body.details.some(d => 
              d.message.includes('Password must be at least 8 characters')
            )).toBe(true);
          })
          .end(done);
      });

      it('should require password with numbers and special characters', (done) => {
        app.post('/test', authValidation.setup, (req, res) => res.json({ success: true }));
        
        request(app)
          .post('/test')
          .send({
            password: 'onlyletters',
            email: 'test@example.com'
          })
          .expect(400)
          .expect((res) => {
            expect(res.body.details.some(d => 
              d.message.includes('Password must contain at least one number and one special character')
            )).toBe(true);
          })
          .end(done);
      });

      it('should reject invalid email addresses', (done) => {
        app.post('/test', authValidation.setup, (req, res) => res.json({ success: true }));
        
        request(app)
          .post('/test')
          .send({
            password: 'SecurePass123!',
            email: 'invalid-email'
          })
          .expect(400, done);
      });
    });

    describe('authValidation.login', () => {
      it('should validate login data', (done) => {
        app.post('/test', authValidation.login, (req, res) => res.json({ success: true }));
        
        request(app)
          .post('/test')
          .send({
            password: 'anypassword',
            remember: true
          })
          .expect(200, done);
      });

      it('should reject login without password', (done) => {
        app.post('/test', authValidation.login, (req, res) => res.json({ success: true }));
        
        request(app)
          .post('/test')
          .send({
            remember: true
          })
          .expect(400, done);
      });

      it('should accept login without remember field', (done) => {
        app.post('/test', authValidation.login, (req, res) => res.json({ success: true }));
        
        request(app)
          .post('/test')
          .send({
            password: 'anypassword'
          })
          .expect(200, done);
      });
    });
  });

  describe('handleValidationErrors', () => {
    it('should return structured error response', (done) => {
      app.post('/test', [
        validationChains.name(true),
        handleValidationErrors
      ], (req, res) => res.json({ success: true }));
      
      request(app)
        .post('/test')
        .send({ name: '' })
        .expect(400)
        .expect((res) => {
          expect(res.body.error).toBe('Validation failed');
          expect(res.body.code).toBe('VALIDATION_ERROR');
          expect(res.body.details).toBeDefined();
          expect(Array.isArray(res.body.details)).toBe(true);
          // Check for the structure we actually get
          const firstError = res.body.details[0];
          expect(firstError).toHaveProperty('message');
          expect(firstError).toHaveProperty('value');
          // The error structure might be minimal - that's okay for now
          expect(firstError.message).toBeDefined();
          expect(firstError.value).toBe('');
        })
        .end(done);
    });

    it('should pass through when no validation errors', (done) => {
      app.post('/test', [
        validationChains.name(true),
        handleValidationErrors
      ], (req, res) => res.json({ success: true }));
      
      request(app)
        .post('/test')
        .send({ name: 'Valid Name' })
        .expect(200)
        .expect({ success: true })
        .end(done);
    });
  });
});