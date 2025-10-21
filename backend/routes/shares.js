// ABOUTME: REST API routes for sharing system management
// ABOUTME: Handles shared views, public access, and personal overlays

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const crypto = require('crypto');
const { authMiddleware, checkResourceOwnership, requireAdmin } = require('../middleware/auth');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Generate unique 8-character UID for public sharing using cryptographically secure random
function generateShareUID() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  const randomBytes = crypto.randomBytes(8);

  for (let i = 0; i < 8; i++) {
    result += chars.charAt(randomBytes[i] % chars.length);
  }
  return result;
}

// Generate unique ID for database records using cryptographically secure random
function generateId(prefix = '') {
  const randomHex = crypto.randomBytes(6).toString('hex');
  return prefix + Date.now() + '-' + randomHex;
}

// Middleware to log access for shared views
async function logAccess(req, sharedViewId) {
  try {
    const sessionId = req.headers['x-session-id'] || 'anonymous';
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';

    await req.db.run(`
      INSERT INTO shared_view_access (shared_view_id, session_id, ip_address, user_agent)
      VALUES (?, ?, ?, ?)
    `, [sharedViewId, sessionId, ipAddress, userAgent]);

    // Update last_accessed_at
    await req.db.run(`
      UPDATE shared_views 
      SET last_accessed_at = CURRENT_TIMESTAMP,
          current_uses = current_uses + 1
      WHERE id = ?
    `, [sharedViewId]);
  } catch (error) {
    console.error('Error logging access:', error);
  }
}

// Check if shared view is accessible (not expired, under usage limits)
async function checkAccessibility(db, sharedView) {
  const now = new Date().toISOString();
  
  // Check expiration
  if (sharedView.expires_at && sharedView.expires_at < now) {
    return { accessible: false, reason: 'expired' };
  }
  
  // Check usage limits
  if (sharedView.max_uses && sharedView.current_uses >= sharedView.max_uses) {
    return { accessible: false, reason: 'usage_limit_exceeded' };
  }
  
  return { accessible: true };
}

// PUBLIC ACCESS ENDPOINTS (no authentication required) - These must come FIRST

// GET /api/public/share/:uid - Access shared view by public UID
router.get('/share/:uid',
  param('uid').isLength({ min: 8, max: 8 }),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { uid } = req.params;
      
      const sharedView = await req.db.get('SELECT * FROM shared_views WHERE uid = ?', [uid]);
      if (!sharedView) {
        return res.status(404).json({ error: 'Shared view not found' });
      }

      // Check accessibility
      const accessCheck = await checkAccessibility(req.db, sharedView);
      if (!accessCheck.accessible) {
        return res.status(403).json({ 
          error: 'Access denied',
          reason: accessCheck.reason 
        });
      }

      // Log access
      await logAccess(req, sharedView.id);

      // Parse configuration
      const includedGroups = JSON.parse(sharedView.included_groups || '[]');
      const excludedGroups = JSON.parse(sharedView.excluded_groups || '[]');
      const includedTags = JSON.parse(sharedView.included_tags || '[]');
      const environments = JSON.parse(sharedView.environments || '[]');

      // Build bookmark query based on configuration
      let bookmarkQuery = `
        SELECT b.*, g.name as group_name, g.icon as group_icon
        FROM bookmarks b
        LEFT JOIN groups g ON b.group_id = g.id
        WHERE 1=1
      `;
      const queryParams = [];

      // Filter by included groups
      if (includedGroups.length > 0) {
        bookmarkQuery += ` AND b.group_id IN (${includedGroups.map(() => '?').join(',')})`;
        queryParams.push(...includedGroups);
      }

      // Filter by excluded groups
      if (excludedGroups.length > 0) {
        bookmarkQuery += ` AND (b.group_id IS NULL OR b.group_id NOT IN (${excludedGroups.map(() => '?').join(',')}))`;
        queryParams.push(...excludedGroups);
      }

      // Filter by environments
      if (environments.length > 0) {
        bookmarkQuery += ` AND (b.environment IS NULL OR b.environment IN (${environments.map(() => '?').join(',')}))`;
        queryParams.push(...environments);
      }

      // Filter by tags
      if (includedTags.length > 0) {
        const tagConditions = includedTags.map(() => 'b.tags LIKE ?').join(' OR ');
        bookmarkQuery += ` AND (${tagConditions})`;
        queryParams.push(...includedTags.map(tag => `%${tag}%`));
      }

      bookmarkQuery += ' ORDER BY g.sort_order, b.title';

      const bookmarks = await req.db.all(bookmarkQuery, queryParams);

      // Get groups for navigation
      let groupQuery = 'SELECT * FROM groups ORDER BY sort_order, name';
      const groups = await req.db.all(groupQuery);

      // Filter groups based on configuration
      let filteredGroups = groups;
      if (includedGroups.length > 0) {
        filteredGroups = groups.filter(g => includedGroups.includes(g.id));
      }
      if (excludedGroups.length > 0) {
        filteredGroups = filteredGroups.filter(g => !excludedGroups.includes(g.id));
      }

      const result = {
        share: {
          uid: sharedView.uid,
          name: sharedView.name,
          description: sharedView.description,
          theme: sharedView.theme,
          layout: sharedView.layout,
          permissions: JSON.parse(sharedView.permissions),
          branding: sharedView.branding ? JSON.parse(sharedView.branding) : null,
          expires_at: sharedView.expires_at
        },
        bookmarks,
        groups: filteredGroups,
        stats: {
          total_bookmarks: bookmarks.length,
          total_groups: filteredGroups.length
        }
      };

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/public/share/:uid/overlay - Save personal overlay
router.post('/share/:uid/overlay',
  param('uid').isLength({ min: 8, max: 8 }),
  body('session_id').notEmpty().trim(),
  body('personal_bookmarks').optional().isArray(),
  body('personal_groups').optional().isArray(),
  body('hidden_bookmarks').optional().isArray(),
  body('favorite_bookmarks').optional().isArray(),
  body('custom_tags').optional().isObject(),
  body('view_mode').optional().isIn(['grid', 'list', 'compact']),
  body('sort_preference').optional().trim(),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { uid } = req.params;
      const {
        session_id,
        personal_bookmarks = [],
        personal_groups = [],
        hidden_bookmarks = [],
        favorite_bookmarks = [],
        custom_tags = {},
        view_mode = 'grid',
        sort_preference = 'name'
      } = req.body;

      const sharedView = await req.db.get('SELECT * FROM shared_views WHERE uid = ?', [uid]);
      if (!sharedView) {
        return res.status(404).json({ error: 'Shared view not found' });
      }

      // Check if overlay already exists
      const existing = await req.db.get(`
        SELECT * FROM personal_overlays 
        WHERE shared_view_id = ? AND session_id = ?
      `, [sharedView.id, session_id]);

      if (existing) {
        // Update existing overlay
        await req.db.run(`
          UPDATE personal_overlays 
          SET personal_bookmarks = ?, personal_groups = ?, hidden_bookmarks = ?,
              favorite_bookmarks = ?, custom_tags = ?, view_mode = ?,
              sort_preference = ?, updated_at = CURRENT_TIMESTAMP
          WHERE shared_view_id = ? AND session_id = ?
        `, [
          JSON.stringify(personal_bookmarks),
          JSON.stringify(personal_groups),
          JSON.stringify(hidden_bookmarks),
          JSON.stringify(favorite_bookmarks),
          JSON.stringify(custom_tags),
          view_mode,
          sort_preference,
          sharedView.id,
          session_id
        ]);
      } else {
        // Create new overlay
        const overlayId = generateId('overlay-');
        await req.db.run(`
          INSERT INTO personal_overlays (
            id, shared_view_id, session_id, personal_bookmarks, personal_groups,
            hidden_bookmarks, favorite_bookmarks, custom_tags, view_mode, sort_preference
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          overlayId, sharedView.id, session_id,
          JSON.stringify(personal_bookmarks),
          JSON.stringify(personal_groups),
          JSON.stringify(hidden_bookmarks),
          JSON.stringify(favorite_bookmarks),
          JSON.stringify(custom_tags),
          view_mode,
          sort_preference
        ]);
      }

      const overlay = await req.db.get(`
        SELECT * FROM personal_overlays 
        WHERE shared_view_id = ? AND session_id = ?
      `, [sharedView.id, session_id]);

      const result = {
        ...overlay,
        personal_bookmarks: JSON.parse(overlay.personal_bookmarks),
        personal_groups: JSON.parse(overlay.personal_groups),
        hidden_bookmarks: JSON.parse(overlay.hidden_bookmarks),
        favorite_bookmarks: JSON.parse(overlay.favorite_bookmarks),
        custom_tags: JSON.parse(overlay.custom_tags)
      };

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/public/share/:uid/overlay/:sessionId - Get personal overlay
router.get('/share/:uid/overlay/:sessionId',
  param('uid').isLength({ min: 8, max: 8 }),
  param('sessionId').notEmpty(),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { uid, sessionId } = req.params;

      const sharedView = await req.db.get('SELECT * FROM shared_views WHERE uid = ?', [uid]);
      if (!sharedView) {
        return res.status(404).json({ error: 'Shared view not found' });
      }

      const overlay = await req.db.get(`
        SELECT * FROM personal_overlays 
        WHERE shared_view_id = ? AND session_id = ?
      `, [sharedView.id, sessionId]);

      if (!overlay) {
        return res.status(404).json({ error: 'Personal overlay not found' });
      }

      const result = {
        ...overlay,
        personal_bookmarks: JSON.parse(overlay.personal_bookmarks),
        personal_groups: JSON.parse(overlay.personal_groups),
        hidden_bookmarks: JSON.parse(overlay.hidden_bookmarks),
        favorite_bookmarks: JSON.parse(overlay.favorite_bookmarks),
        custom_tags: JSON.parse(overlay.custom_tags)
      };

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/public/share/:uid/bookmark - Add personal bookmark to overlay
router.post('/share/:uid/bookmark',
  param('uid').isLength({ min: 8, max: 8 }),
  body('session_id').notEmpty().trim(),
  body('title').notEmpty().trim(),
  body('url').notEmpty().isURL(),
  body('description').optional().trim(),
  body('icon').optional().trim(),
  body('tags').optional().isArray(),
  body('group_name').optional().trim(),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { uid } = req.params;
      const { session_id, title, url, description, icon, tags = [], group_name } = req.body;

      const sharedView = await req.db.get('SELECT * FROM shared_views WHERE uid = ?', [uid]);
      if (!sharedView) {
        return res.status(404).json({ error: 'Shared view not found' });
      }

      // Check permissions
      const permissions = JSON.parse(sharedView.permissions);
      if (!permissions.canAddBookmarks) {
        return res.status(403).json({ error: 'Adding bookmarks not allowed' });
      }

      // Get or create overlay
      let overlay = await req.db.get(`
        SELECT * FROM personal_overlays 
        WHERE shared_view_id = ? AND session_id = ?
      `, [sharedView.id, session_id]);

      if (!overlay) {
        const overlayId = generateId('overlay-');
        await req.db.run(`
          INSERT INTO personal_overlays (
            id, shared_view_id, session_id, personal_bookmarks, personal_groups
          ) VALUES (?, ?, ?, ?, ?)
        `, [overlayId, sharedView.id, session_id, '[]', '[]']);

        overlay = await req.db.get(`
          SELECT * FROM personal_overlays 
          WHERE shared_view_id = ? AND session_id = ?
        `, [sharedView.id, session_id]);
      }

      // Add bookmark to personal collection
      const personalBookmarks = JSON.parse(overlay.personal_bookmarks);
      const personalGroups = JSON.parse(overlay.personal_groups);

      const newBookmark = {
        id: generateId('personal-'),
        title,
        url,
        description,
        icon,
        tags,
        group_name,
        created_at: new Date().toISOString()
      };

      personalBookmarks.push(newBookmark);

      // Add group if it doesn't exist
      if (group_name && !personalGroups.find(g => g.name === group_name)) {
        personalGroups.push({
          id: generateId('personal-group-'),
          name: group_name,
          created_at: new Date().toISOString()
        });
      }

      await req.db.run(`
        UPDATE personal_overlays 
        SET personal_bookmarks = ?, personal_groups = ?, updated_at = CURRENT_TIMESTAMP
        WHERE shared_view_id = ? AND session_id = ?
      `, [
        JSON.stringify(personalBookmarks),
        JSON.stringify(personalGroups),
        sharedView.id,
        session_id
      ]);

      res.status(201).json(newBookmark);
    } catch (error) {
      next(error);
    }
  }
);

// ADMIN ENDPOINTS (require authentication in production)

// GET /api/shares - List all shared views
router.get('/',
  authMiddleware,
  requireAdmin,
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { limit = 50, offset = 0 } = req.query;
      
      const shares = await req.db.all(`
        SELECT sv.*, sl.full_url as share_url,
               COUNT(sva.id) as total_accesses
        FROM shared_views sv
        LEFT JOIN share_links sl ON sv.id = sl.shared_view_id
        LEFT JOIN shared_view_access sva ON sv.id = sva.shared_view_id
        GROUP BY sv.id
        ORDER BY sv.created_at DESC
        LIMIT ? OFFSET ?
      `, [limit, offset]);

      const total = await req.db.get('SELECT COUNT(*) as count FROM shared_views');

      const result = shares.map(share => ({
        ...share,
        included_groups: JSON.parse(share.included_groups || '[]'),
        excluded_groups: JSON.parse(share.excluded_groups || '[]'),
        included_tags: JSON.parse(share.included_tags || '[]'),
        environments: JSON.parse(share.environments || '[]'),
        permissions: JSON.parse(share.permissions),
        branding: share.branding ? JSON.parse(share.branding) : null
      }));

      res.json({
        shares: result,
        total: total.count,
        limit,
        offset
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/shares - Create new shared view
router.post('/',
  authMiddleware,
  requireAdmin,
  body('name').notEmpty().trim().isLength({ max: 255 }),
  body('description').optional().trim(),
  body('access_type').optional().isIn(['public', 'restricted', 'expiring']),
  body('expires_at').optional().isISO8601(),
  body('max_uses').optional().isInt({ min: 1 }),
  body('included_groups').optional().isArray(),
  body('excluded_groups').optional().isArray(),
  body('included_tags').optional().isArray(),
  body('environments').optional().isArray(),
  body('permissions').optional().isObject(),
  body('theme').optional().isIn(['light', 'dark', 'auto']),
  body('layout').optional().isIn(['grid', 'list', 'compact']),
  body('branding').optional().isObject(),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const {
        name,
        description,
        access_type = 'public',
        expires_at,
        max_uses,
        included_groups = [],
        excluded_groups = [],
        included_tags = [],
        environments = [],
        permissions = {
          canAddBookmarks: false,
          canEditBookmarks: false,
          canDeleteBookmarks: false,
          canCreateGroups: false,
          canSeeAnalytics: false
        },
        theme = 'auto',
        layout = 'grid',
        branding
      } = req.body;

      const id = generateId('share-');
      let uid;
      
      // Generate unique UID
      do {
        uid = generateShareUID();
        const existing = await req.db.get('SELECT uid FROM shared_views WHERE uid = ?', [uid]);
        if (!existing) break;
      } while (true);

      await req.db.run(`
        INSERT INTO shared_views (
          id, uid, name, description, access_type, expires_at, max_uses,
          included_groups, excluded_groups, included_tags, environments,
          permissions, theme, layout, branding, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id, uid, name, description, access_type, expires_at, max_uses,
        JSON.stringify(included_groups),
        JSON.stringify(excluded_groups),
        JSON.stringify(included_tags),
        JSON.stringify(environments),
        JSON.stringify(permissions),
        theme, layout,
        branding ? JSON.stringify(branding) : null,
        'admin' // TODO: Get from authentication
      ]);

      // Create share link - use proper domain
      const domain = process.env.PUBLIC_DOMAIN || 'hubble.blockonauts.io';
      const protocol = domain.includes('localhost') ? 'http' : 'https';
      const fullUrl = `${protocol}://${domain}/share/${uid}`;
      await req.db.run(`
        INSERT INTO share_links (shared_view_id, full_url)
        VALUES (?, ?)
      `, [id, fullUrl]);

      const sharedView = await req.db.get('SELECT * FROM shared_views WHERE id = ?', [id]);
      
      // Parse JSON fields
      const result = {
        ...sharedView,
        included_groups: JSON.parse(sharedView.included_groups || '[]'),
        excluded_groups: JSON.parse(sharedView.excluded_groups || '[]'),
        included_tags: JSON.parse(sharedView.included_tags || '[]'),
        environments: JSON.parse(sharedView.environments || '[]'),
        permissions: JSON.parse(sharedView.permissions),
        branding: sharedView.branding ? JSON.parse(sharedView.branding) : null,
        share_url: fullUrl
      };

      // Emit WebSocket event
      req.io.emit('share:created', result);

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/shares/:id - Get specific shared view (by internal ID)
router.get('/:id',
  authMiddleware,
  requireAdmin,
  param('id').notEmpty().withMessage('Share ID is required'),
  checkResourceOwnership('shared_view'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      
      const share = await req.db.get(`
        SELECT sv.*, sl.full_url as share_url
        FROM shared_views sv
        LEFT JOIN share_links sl ON sv.id = sl.shared_view_id
        WHERE sv.id = ?
      `, [id]);

      if (!share) {
        return res.status(404).json({ error: 'Shared view not found' });
      }

      // Get access analytics
      const analytics = await req.db.all(`
        SELECT DATE(accessed_at) as date, COUNT(*) as accesses
        FROM shared_view_access
        WHERE shared_view_id = ?
        GROUP BY DATE(accessed_at)
        ORDER BY date DESC
        LIMIT 30
      `, [id]);

      const result = {
        ...share,
        included_groups: JSON.parse(share.included_groups || '[]'),
        excluded_groups: JSON.parse(share.excluded_groups || '[]'),
        included_tags: JSON.parse(share.included_tags || '[]'),
        environments: JSON.parse(share.environments || '[]'),
        permissions: JSON.parse(share.permissions),
        branding: share.branding ? JSON.parse(share.branding) : null,
        analytics
      };

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/shares/:id - Update shared view
router.put('/:id',
  authMiddleware,
  requireAdmin,
  param('id').notEmpty().withMessage('Share ID is required'),
  checkResourceOwnership('shared_view'),
  body('name').optional().trim().isLength({ max: 255 }),
  body('description').optional().trim(),
  body('access_type').optional().isIn(['public', 'restricted', 'expiring']),
  body('expires_at').optional().isISO8601(),
  body('max_uses').optional().isInt({ min: 1 }),
  body('included_groups').optional().isArray(),
  body('excluded_groups').optional().isArray(),
  body('included_tags').optional().isArray(),
  body('environments').optional().isArray(),
  body('permissions').optional().isObject(),
  body('theme').optional().isIn(['light', 'dark', 'auto']),
  body('layout').optional().isIn(['grid', 'list', 'compact']),
  body('branding').optional().isObject(),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      
      const existing = await req.db.get('SELECT * FROM shared_views WHERE id = ?', [id]);
      if (!existing) {
        return res.status(404).json({ error: 'Shared view not found' });
      }

      const updateFields = [];
      const updateParams = [];

      // Build dynamic update query
      const fields = [
        'name', 'description', 'access_type', 'expires_at', 'max_uses',
        'theme', 'layout'
      ];
      
      fields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateFields.push(`${field} = ?`);
          updateParams.push(req.body[field]);
        }
      });

      // Handle JSON fields
      const jsonFields = [
        'included_groups', 'excluded_groups', 'included_tags', 
        'environments', 'permissions', 'branding'
      ];
      
      jsonFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateFields.push(`${field} = ?`);
          updateParams.push(JSON.stringify(req.body[field]));
        }
      });

      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateParams.push(id);

      await req.db.run(`
        UPDATE shared_views 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `, updateParams);

      const updated = await req.db.get(`
        SELECT sv.*, sl.full_url as share_url
        FROM shared_views sv
        LEFT JOIN share_links sl ON sv.id = sl.shared_view_id
        WHERE sv.id = ?
      `, [id]);

      const result = {
        ...updated,
        included_groups: JSON.parse(updated.included_groups || '[]'),
        excluded_groups: JSON.parse(updated.excluded_groups || '[]'),
        included_tags: JSON.parse(updated.included_tags || '[]'),
        environments: JSON.parse(updated.environments || '[]'),
        permissions: JSON.parse(updated.permissions),
        branding: updated.branding ? JSON.parse(updated.branding) : null
      };

      // Emit WebSocket event
      req.io.emit('share:updated', result);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/shares/:id - Delete shared view
router.delete('/:id',
  authMiddleware,
  requireAdmin,
  param('id').notEmpty().withMessage('Share ID is required'),
  checkResourceOwnership('shared_view'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      
      // Resource ownership already verified by checkResourceOwnership middleware
      // req.resource contains the validated resource
      
      await req.db.run('DELETE FROM shared_views WHERE id = ?', [id]);

      // Emit WebSocket event
      req.io.emit('share:deleted', { id });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;