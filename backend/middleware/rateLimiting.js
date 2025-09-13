// ABOUTME: Enhanced rate limiting with user-based tracking for authenticated endpoints
// ABOUTME: Provides per-user rate limiting for authenticated requests and stricter limits for write operations

const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

// Custom key generator that uses user ID for authenticated requests
const createUserBasedKeyGenerator = (fallbackToIP = true) => {
  return (req) => {
    // Use user ID from JWT token if available
    if (req.user?.id) {
      return `user:${req.user.id}`;
    }
    
    // Use session ID if available (for unauthenticated but identified users)
    if (req.sessionID) {
      return `session:${req.sessionID}`;
    }
    
    // Fall back to IP address
    if (fallbackToIP) {
      // Use the built-in ipKeyGenerator helper for proper IPv6 handling
      return `ip:${ipKeyGenerator(req)}`;
    }
    
    return 'anonymous';
  };
};

// Custom store for user-based rate limiting
const createUserBasedStore = () => {
  // Create a new Map instance for each store to avoid shared state
  const localStore = new Map();
  
  return {
    incr: (key, callback) => {
      const now = Date.now();
      const windowStart = now - (15 * 60 * 1000); // 15 minute window
      
      if (!localStore.has(key)) {
        localStore.set(key, []);
      }
      
      const requests = localStore.get(key);
      
      // Remove old requests outside the window
      const validRequests = requests.filter(timestamp => timestamp > windowStart);
      
      // Add current request
      validRequests.push(now);
      localStore.set(key, validRequests);
      
      // Clean up old entries periodically
      if (Math.random() < 0.01) { // 1% chance to clean up
        this.cleanup();
      }
      
      callback(null, validRequests.length);
    },
    
    decrement: (key) => {
      // Optional: implement decrement logic if needed
    },
    
    resetKey: (key) => {
      localStore.delete(key);
    },
    
    cleanup: () => {
      const now = Date.now();
      const windowStart = now - (15 * 60 * 1000);
      
      for (const [key, requests] of localStore.entries()) {
        const validRequests = requests.filter(timestamp => timestamp > windowStart);
        if (validRequests.length === 0) {
          localStore.delete(key);
        } else {
          localStore.set(key, validRequests);
        }
      }
    },
    
    // Export for testing purposes
    _getStore: () => localStore
  };
};

// User-based rate limiting for authenticated endpoints
const createUserBasedLimiter = (options = {}) => {
  const defaults = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // per user, not per IP
    keyGenerator: createUserBasedKeyGenerator(),
    store: createUserBasedStore(),
    message: {
      error: 'Too many requests from your account, please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    validate: {
      xForwardedForHeader: false,
      keyGeneratorIpFallback: false // Disable IPv6 validation since we're using ipKeyGenerator properly
    }
  };
  
  return rateLimit({ ...defaults, ...options });
};

// Stricter limits for write operations by authenticated users
const userWriteLimiter = createUserBasedLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // 50 write operations per user per 5 minutes
  message: {
    error: 'Too many write operations from your account, please slow down.',
    retryAfter: '5 minutes'
  }
});

// Moderate limits for read operations by authenticated users
const userReadLimiter = createUserBasedLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 read operations per user per 15 minutes
  message: {
    error: 'Too many read requests from your account, please slow down.',
    retryAfter: '15 minutes'
  }
});

// Very strict limits for sensitive operations (admin actions, password changes)
const userSensitiveLimiter = createUserBasedLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 sensitive operations per user per hour
  message: {
    error: 'Too many sensitive operations from your account, please try again later.',
    retryAfter: '1 hour'
  }
});

// Auth-specific user-based limiting (login attempts per user)
const userAuthLimiter = createUserBasedLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 authentication attempts per user per 15 minutes
  keyGenerator: (req) => {
    // For login attempts, use email or username if provided
    if (req.body?.email) {
      return `auth:email:${req.body.email}`;
    }
    // Fall back to IP for anonymous attempts using proper IPv6 handling
    return `auth:ip:${ipKeyGenerator(req)}`;
  },
  message: {
    error: 'Too many login attempts for this account, please try again later.',
    retryAfter: '15 minutes'
  }
});

// Middleware to extract user info from JWT and attach to request
const extractUserForRateLimit = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      req.user = { id: decoded.userId || decoded.id };
    } catch (error) {
      // Token invalid, but don't fail - just fall back to IP limiting
      req.user = null;
    }
  }
  next();
};

module.exports = {
  createUserBasedLimiter,
  createUserBasedKeyGenerator,
  createUserBasedStore,
  userWriteLimiter,
  userReadLimiter,
  userSensitiveLimiter,
  userAuthLimiter,
  extractUserForRateLimit
};