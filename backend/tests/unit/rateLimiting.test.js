// ABOUTME: Unit tests for user-based rate limiting middleware
// ABOUTME: Tests custom rate limiting logic, user key generation, and limit enforcement

const {
  createUserBasedKeyGenerator,
  createUserBasedStore,
  createUserBasedLimiter,
  extractUserForRateLimit
} = require('../../middleware/rateLimiting');

describe('Rate Limiting Middleware', () => {
  describe('createUserBasedKeyGenerator', () => {
    it('should use user ID when available', () => {
      const keyGen = createUserBasedKeyGenerator();
      const req = { user: { id: 'user123' } };
      
      expect(keyGen(req)).toBe('user:user123');
    });

    it('should use session ID when user ID not available', () => {
      const keyGen = createUserBasedKeyGenerator();
      const req = { sessionID: 'session456' };
      
      expect(keyGen(req)).toBe('session:session456');
    });

    it('should fall back to IP address', () => {
      const keyGen = createUserBasedKeyGenerator();
      const req = { ip: '192.168.1.1' };
      
      expect(keyGen(req)).toBe('ip:192.168.1.1');
    });

    it('should use connection.remoteAddress if ip not available', () => {
      const keyGen = createUserBasedKeyGenerator();
      const req = { connection: { remoteAddress: '10.0.0.1' } };
      
      expect(keyGen(req)).toBe('ip:10.0.0.1');
    });

    it('should return anonymous if no identification available and fallback disabled', () => {
      const keyGen = createUserBasedKeyGenerator(false);
      const req = {};
      
      expect(keyGen(req)).toBe('anonymous');
    });
  });

  describe('createUserBasedStore', () => {
    let store;
    
    beforeEach(() => {
      store = createUserBasedStore();
    });

    it('should track requests per key', (done) => {
      const key = 'test:user1';
      
      store.incr(key, (err, result) => {
        expect(err).toBeNull();
        expect(result).toBe(1); // Should return hit count directly
        done();
      });
    });

    it('should increment request count for same key', (done) => {
      const key = 'test:user1';
      
      store.incr(key, (err, result1) => {
        expect(result1).toBe(1);
        
        store.incr(key, (err, result2) => {
          expect(result2).toBe(2);
          done();
        });
      });
    });

    it('should reset key properly', (done) => {
      const key = 'test:user1';
      
      store.incr(key, (err, result) => {
        expect(result).toBe(1);
        
        store.resetKey(key);
        
        store.incr(key, (err, result) => {
          expect(result).toBe(1);
          done();
        });
      });
    });

    it('should clean up old entries', (done) => {
      const key = 'test:user1';
      
      // Mock old timestamp (older than 15 minutes)
      const oldTime = Date.now() - (16 * 60 * 1000);
      
      // Get the internal store and manually add old request
      const internalStore = store._getStore();
      internalStore.set(key, [oldTime]);
      
      store.cleanup();
      
      // Should have removed old entry
      expect(internalStore.has(key)).toBe(false);
      done();
    });
  });

  describe('extractUserForRateLimit', () => {
    it('should extract user from valid JWT token', () => {
      const jwt = require('jsonwebtoken');
      const secret = 'test-secret';
      const token = jwt.sign({ userId: 'user123' }, secret);
      
      process.env.JWT_SECRET = secret;
      
      const req = {
        headers: {
          authorization: `Bearer ${token}`
        }
      };
      const res = {};
      const next = jest.fn();
      
      extractUserForRateLimit(req, res, next);
      
      expect(req.user).toEqual({ id: 'user123' });
      expect(next).toHaveBeenCalled();
    });

    it('should handle invalid JWT token gracefully', () => {
      const req = {
        headers: {
          authorization: 'Bearer invalid-token'
        }
      };
      const res = {};
      const next = jest.fn();
      
      extractUserForRateLimit(req, res, next);
      
      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalled();
    });

    it('should handle missing authorization header', () => {
      const req = { headers: {} };
      const res = {};
      const next = jest.fn();
      
      extractUserForRateLimit(req, res, next);
      
      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should handle malformed authorization header', () => {
      const req = {
        headers: {
          authorization: 'InvalidFormat token'
        }
      };
      const res = {};
      const next = jest.fn();
      
      extractUserForRateLimit(req, res, next);
      
      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('createUserBasedLimiter', () => {
    it('should create a limiter with correct defaults', () => {
      const limiter = createUserBasedLimiter();
      expect(typeof limiter).toBe('function');
    });

    it('should create a limiter with custom options', () => {
      const customOptions = {
        windowMs: 60000,
        max: 10,
        message: { error: 'Custom message' }
      };
      
      const limiter = createUserBasedLimiter(customOptions);
      expect(typeof limiter).toBe('function');
    });
  });
});