// ABOUTME: Authentication middleware for protecting API routes
// ABOUTME: Verifies JWT tokens and manages session validation

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Check if auth is enabled
function isAuthEnabled() {
  return process.env.AUTH_ENABLED !== 'false';
}

// Main auth middleware
async function authMiddleware(req, res, next) {
  try {
    // Skip auth if disabled
    if (!isAuthEnabled()) {
      return next();
    }

    // Skip auth for public routes
    const publicPaths = [
      '/api/auth/status',
      '/api/auth/setup',
      '/api/auth/login',
      '/api/public'
    ];

    const isPublicPath = publicPaths.some(path => req.path.startsWith(path));
    if (isPublicPath) {
      return next();
    }

    // Check for authorization header
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get JWT secret from database
    const config = await req.db.get('SELECT jwt_secret FROM auth_config WHERE id = 1');
    if (!config) {
      return res.status(500).json({ error: 'Authentication not configured' });
    }

    // Verify token
    try {
      const decoded = jwt.verify(token, config.jwt_secret || process.env.JWT_SECRET);
      
      // Check if session exists and is valid
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const session = await req.db.get(
        'SELECT * FROM auth_sessions WHERE token_hash = ? AND expires_at > datetime("now")',
        [tokenHash]
      );

      if (!session) {
        return res.status(401).json({ error: 'Session expired or invalid' });
      }

      // Update last activity
      await req.db.run(
        'UPDATE auth_sessions SET last_activity = CURRENT_TIMESTAMP WHERE id = ?',
        [session.id]
      );

      // Add auth info to request
      req.auth = {
        type: decoded.type,
        sessionId: session.id
      };

      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
}

module.exports = authMiddleware;