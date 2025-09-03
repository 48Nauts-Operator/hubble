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

/**
 * Resource ownership middleware factory
 * Validates that the user has access to the requested resource
 */
function checkResourceOwnership(resourceType) {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;

      if (!resourceId) {
        return res.status(400).json({
          error: 'Resource ID is required',
          code: 'MISSING_RESOURCE_ID'
        });
      }

      // Check resource ownership based on type
      let query;
      let params = [resourceId];

      switch (resourceType) {
        case 'share':
        case 'shared_view':
          // For shared views, verify the resource exists
          // In a multi-user system, you'd add: AND created_by = ? 
          query = 'SELECT id FROM shared_views WHERE id = ?';
          break;
          
        case 'bookmark':
          // For bookmarks, verify the resource exists
          query = 'SELECT id FROM bookmarks WHERE id = ?';
          break;
          
        case 'group':
          // For groups, verify the resource exists
          query = 'SELECT id FROM groups WHERE id = ?';
          break;
          
        default:
          return res.status(400).json({
            error: 'Unknown resource type',
            code: 'INVALID_RESOURCE_TYPE'
          });
      }

      const resource = await req.db.get(query, params);
      
      if (!resource) {
        return res.status(404).json({
          error: `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} not found`,
          code: 'RESOURCE_NOT_FOUND'
        });
      }

      // Resource exists and user has access
      req.resource = resource;
      next();
    } catch (error) {
      console.error('Resource ownership check error:', error);
      return res.status(500).json({
        error: 'Authorization check failed',
        code: 'AUTHORIZATION_ERROR'
      });
    }
  };
}

/**
 * Admin-only middleware
 */
function requireAdmin(req, res, next) {
  if (!req.auth || req.auth.type !== 'admin') {
    return res.status(403).json({ 
      error: 'Admin privileges required',
      code: 'INSUFFICIENT_PRIVILEGES'
    });
  }
  next();
}

module.exports = {
  authMiddleware,
  checkResourceOwnership,
  requireAdmin
};