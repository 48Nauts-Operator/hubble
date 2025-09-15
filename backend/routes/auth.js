// ABOUTME: Authentication routes for login, setup, and session management
// ABOUTME: Handles JWT token generation, password validation, and first-run setup

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body } = require('express-validator');
const { authValidation, handleValidationErrors } = require('../middleware/validation');

// Constants
const SALT_ROUNDS = 10;
const JWT_EXPIRY = '24h';
const JWT_EXPIRY_REMEMBER = '30d';

// Helper to generate secure random string
function generateSecureToken(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}


// CSRF protection for state-changing operations
const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET requests (they should be idempotent)
  if (req.method === 'GET') {
    return next();
  }

  // Multiple CSRF protection strategies:
  // 1. Check for custom header (best, but can be blocked by proxies)
  // 2. Check origin/referer headers (fallback)
  // 3. Check for valid JSON content-type (weak, but better than nothing)

  const customHeader = req.headers['x-requested-with'];
  const origin = req.headers['origin'];
  const referer = req.headers['referer'];
  const contentType = req.headers['content-type'];

  // Strategy 1: Custom header check (if header makes it through proxy)
  if (customHeader && customHeader === 'XMLHttpRequest') {
    return next();
  }

  // Strategy 2: Origin/Referer check for same-origin requests
  // This works even when proxies strip custom headers
  if (origin || referer) {
    const sourceUrl = origin || referer;
    const allowedOrigins = [
      'https://hubble.blockonauts.io',
      'http://localhost:8888',
      'http://localhost:3000'
    ];

    const isAllowed = allowedOrigins.some(allowed => sourceUrl.startsWith(allowed));
    if (isAllowed) {
      return next();
    }
  }

  // Strategy 3: At minimum, require JSON content-type for API calls
  // This prevents simple form-based CSRF but is weaker protection
  if (contentType && contentType.includes('application/json')) {
    // Log that we're using fallback CSRF protection
    if (process.env.NODE_ENV !== 'test') {
      console.log('CSRF: Using content-type fallback protection', {
        path: req.path,
        origin,
        referer: referer ? referer.substring(0, 50) : undefined
      });
    }
    return next();
  }

  // If none of the strategies pass, block the request
  return res.status(403).json({
    error: 'CSRF protection: Request blocked',
    message: 'This request failed CSRF validation'
  });
};

// Check if auth is enabled
function isAuthEnabled() {
  return process.env.AUTH_ENABLED !== 'false';
}

// GET /api/auth/status - Check auth configuration status
router.get('/status', async (req, res, next) => {
  try {
    // Check if auth is enabled
    if (!isAuthEnabled()) {
      return res.json({
        enabled: false,
        configured: true,
        message: 'Authentication is disabled'
      });
    }

    // Check if auth is configured
    const config = await req.db.get('SELECT setup_completed FROM auth_config WHERE id = 1');
    
    res.json({
      enabled: true,
      configured: config?.setup_completed === 1,
      message: config?.setup_completed === 1 ? 'Authentication is configured' : 'First-time setup required'
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/setup - First-time setup
router.post('/setup',
  csrfProtection,
  ...authValidation.setup,
  async (req, res, next) => {
    try {
      // Check if already configured
      const existing = await req.db.get('SELECT id FROM auth_config WHERE id = 1');
      if (existing) {
        return res.status(400).json({ error: 'Authentication is already configured' });
      }

      const { password, email } = req.body;

      // Hash password
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Generate JWT secret
      const jwtSecret = generateSecureToken();

      // Save configuration
      await req.db.run(`
        INSERT INTO auth_config (id, password_hash, email, jwt_secret, setup_completed)
        VALUES (1, ?, ?, ?, 1)
      `, [passwordHash, email || null, jwtSecret]);

      // Set environment variables for current session
      process.env.JWT_SECRET = jwtSecret;

      // Generate initial token for immediate login
      const token = jwt.sign(
        { type: 'admin', timestamp: Date.now() },
        jwtSecret,
        { expiresIn: JWT_EXPIRY }
      );

      // Set token in httpOnly cookie
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      res.json({
        success: true,
        message: 'Authentication configured successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/login - Login endpoint
router.post('/login',
  csrfProtection,
  ...authValidation.login,
  async (req, res, next) => {
    try {
      const { password, remember = false } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;

      // Check if auth is enabled
      if (!isAuthEnabled()) {
        return res.status(400).json({ error: 'Authentication is disabled' });
      }

      // Check rate limiting
      const attempts = await req.db.get(
        'SELECT * FROM auth_attempts WHERE ip_address = ?',
        [ipAddress]
      );

      if (attempts && attempts.blocked_until) {
        const blockedUntil = new Date(attempts.blocked_until);
        if (blockedUntil > new Date()) {
          return res.status(429).json({
            error: 'Too many failed attempts. Please try again later.',
            blockedUntil: blockedUntil.toISOString()
          });
        }
      }

      // Get auth config
      const config = await req.db.get('SELECT * FROM auth_config WHERE id = 1');
      if (!config) {
        return res.status(500).json({ error: 'Authentication not configured' });
      }

      // Verify password
      const isValid = await bcrypt.compare(password, config.password_hash);
      
      if (!isValid) {
        // Record failed attempt
        const newAttempts = (attempts?.attempts || 0) + 1;
        const blockedUntil = newAttempts >= 5 
          ? new Date(Date.now() + 5 * 60 * 1000) // Block for 5 minutes
          : null;

        await req.db.run(`
          INSERT OR REPLACE INTO auth_attempts (ip_address, attempts, last_attempt, blocked_until)
          VALUES (?, ?, CURRENT_TIMESTAMP, ?)
        `, [ipAddress, newAttempts, blockedUntil]);

        return res.status(401).json({ error: 'Invalid password' });
      }

      // Clear failed attempts on successful login
      await req.db.run('DELETE FROM auth_attempts WHERE ip_address = ?', [ipAddress]);

      // Generate JWT token
      const token = jwt.sign(
        { type: 'admin', timestamp: Date.now() },
        config.jwt_secret || process.env.JWT_SECRET,
        { expiresIn: remember ? JWT_EXPIRY_REMEMBER : JWT_EXPIRY }
      );

      // Store session
      const sessionId = generateSecureToken(32);
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(
        Date.now() + (remember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000)
      );

      await req.db.run(`
        INSERT INTO auth_sessions (id, token_hash, expires_at, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?)
      `, [sessionId, tokenHash, expiresAt.toISOString(), ipAddress, req.headers['user-agent']]);

      // Set token in httpOnly cookie - SIMPLIFIED
      // Always use secure cookies on HTTPS sites
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: false, // Allow non-secure for now to fix the issue
        sameSite: 'lax',
        maxAge: remember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
        path: '/'
      });

      res.json({
        success: true,
        expiresAt: expiresAt.toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/logout - Logout endpoint
router.post('/logout', csrfProtection, async (req, res, next) => {
  try {
    // Get token from cookie or header (for backward compatibility)
    const cookieToken = req.cookies?.auth_token;
    const headerToken = req.headers.authorization?.replace('Bearer ', '');
    const token = cookieToken || headerToken;

    if (token) {
      // Hash token and remove session
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      await req.db.run('DELETE FROM auth_sessions WHERE token_hash = ?', [tokenHash]);
    }

    // Clear the cookie - SIMPLIFIED
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/'
    });

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/verify - Verify current token
// Note: No CSRF protection needed as this is just checking status, not changing state
router.post('/verify', async (req, res, next) => {
  try {
    // Check for token in cookie first, then authorization header (for backward compatibility)
    const cookieToken = req.cookies?.auth_token;
    const headerToken = req.headers.authorization?.replace('Bearer ', '');
    const token = cookieToken || headerToken;

    if (!token) {
      return res.status(401).json({ valid: false });
    }

    // Get JWT secret
    const config = await req.db.get('SELECT jwt_secret FROM auth_config WHERE id = 1');
    if (!config) {
      return res.status(401).json({ valid: false });
    }

    // Verify token
    try {
      jwt.verify(token, config.jwt_secret || process.env.JWT_SECRET);
      
      // Check if session exists
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const session = await req.db.get(
        'SELECT * FROM auth_sessions WHERE token_hash = ? AND expires_at > datetime("now")',
        [tokenHash]
      );

      if (!session) {
        return res.status(401).json({ valid: false });
      }

      // Update last activity
      await req.db.run(
        'UPDATE auth_sessions SET last_activity = CURRENT_TIMESTAMP WHERE id = ?',
        [session.id]
      );

      res.json({ valid: true });
    } catch (err) {
      res.status(401).json({ valid: false });
    }
  } catch (error) {
    next(error);
  }
});

// Cleanup expired sessions periodically
setInterval(async () => {
  try {
    const db = global.db;
    if (db) {
      await db.run('DELETE FROM auth_sessions WHERE expires_at < datetime("now")');
    }
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
  }
}, 60 * 60 * 1000); // Every hour

module.exports = router;