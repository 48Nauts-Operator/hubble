// ABOUTME: REST API routes for bookmark management
// ABOUTME: Handles CRUD operations and click tracking for bookmarks

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { authMiddleware, checkResourceOwnership, requireAdmin } = require('../middleware/auth');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// GET /api/bookmarks - Get bookmarks with filtering
router.get('/',
  authMiddleware,
  requireAdmin,
  query('group_id').optional(),
  query('environment').optional().isIn(['development', 'uat', 'production', 'staging']),
  query('search').optional().trim(),
  query('tags').optional(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { group_id, environment, search, tags, limit = 50, offset = 0 } = req.query;
      
      let queryStr = 'SELECT b.*, g.name as group_name FROM bookmarks b LEFT JOIN groups g ON b.group_id = g.id WHERE 1=1';
      const params = [];
      
      if (group_id) {
        queryStr += ' AND b.group_id = ?';
        params.push(group_id);
      }
      
      if (environment) {
        queryStr += ' AND b.environment = ?';
        params.push(environment);
      }
      
      if (search) {
        queryStr += ' AND (b.title LIKE ? OR b.url LIKE ? OR b.description LIKE ?)';
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }
      
      if (tags) {
        queryStr += ' AND b.tags LIKE ?';
        params.push(`%${tags}%`);
      }
      
      queryStr += ' ORDER BY b.click_count DESC, b.title ASC LIMIT ? OFFSET ?';
      params.push(limit, offset);
      
      const bookmarks = await req.db.all(queryStr, params);
      
      // Parse JSON fields
      bookmarks.forEach(bookmark => {
        if (bookmark.tags) {
          try {
            bookmark.tags = JSON.parse(bookmark.tags);
          } catch (e) {
            bookmark.tags = [];
          }
        }
        if (bookmark.metadata) {
          try {
            bookmark.metadata = JSON.parse(bookmark.metadata);
          } catch (e) {
            bookmark.metadata = {};
          }
        }
      });
      
      // Get total count
      const countQuery = queryStr.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM').replace(/ORDER BY.*$/, '');
      const countResult = await req.db.get(countQuery, params.slice(0, -2));
      
      res.json({
        bookmarks,
        total: countResult.total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/bookmarks/:id - Get single bookmark
router.get('/:id',
  param('id').notEmpty(),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const bookmark = await req.db.get(
        'SELECT b.*, g.name as group_name FROM bookmarks b LEFT JOIN groups g ON b.group_id = g.id WHERE b.id = ?',
        [req.params.id]
      );
      
      if (!bookmark) {
        return res.status(404).json({ error: 'Bookmark not found' });
      }
      
      // Parse JSON fields
      if (bookmark.tags) {
        try {
          bookmark.tags = JSON.parse(bookmark.tags);
        } catch (e) {
          bookmark.tags = [];
        }
      }
      if (bookmark.metadata) {
        try {
          bookmark.metadata = JSON.parse(bookmark.metadata);
        } catch (e) {
          bookmark.metadata = {};
        }
      }
      
      res.json(bookmark);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/bookmarks - Create new bookmark
router.post('/',
  authMiddleware,
  requireAdmin,
  // Title validation - required, max 200 chars, sanitized
  body('title')
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 200 }).withMessage('Title must be less than 200 characters')
    .trim()
    .escape(),
  
  // URL validation - required, valid URL format, max 2048 chars
  body('url')
    .notEmpty().withMessage('URL is required')
    .isLength({ max: 2048 }).withMessage('URL must be less than 2048 characters')
    .isURL({ protocols: ['http', 'https'] }).withMessage('Must be a valid HTTP/HTTPS URL'),
  
  // Internal URL validation - optional, allow localhost, max 2048 chars  
  body('internal_url')
    .optional()
    .isLength({ max: 2048 }).withMessage('Internal URL must be less than 2048 characters')
    .isURL({ protocols: ['http', 'https'] }).withMessage('Must be a valid HTTP/HTTPS URL'),
  
  // External URL validation - optional, valid URL format, max 2048 chars
  body('external_url')
    .optional()
    .isLength({ max: 2048 }).withMessage('External URL must be less than 2048 characters')
    .isURL({ protocols: ['http', 'https'] }).withMessage('Must be a valid HTTP/HTTPS URL'),
  
  // Group ID validation
  body('group_id').optional().isString().trim(),
  
  // Description validation - optional, max 1000 chars, allow basic HTML
  body('description')
    .optional()
    .isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters')
    .trim(),
  
  // Icon validation - optional, max 200 chars
  body('icon')
    .optional()
    .isLength({ max: 200 }).withMessage('Icon must be less than 200 characters')
    .trim(),
  
  // Tags validation - optional array, max 10 tags, max 50 chars per tag
  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array')
    .custom((tags) => {
      if (!Array.isArray(tags)) return false;
      if (tags.length > 10) throw new Error('Maximum 10 tags allowed');
      
      for (const tag of tags) {
        if (typeof tag !== 'string') throw new Error('All tags must be strings');
        if (tag.length > 50) throw new Error('Each tag must be less than 50 characters');
        if (tag.includes('<') || tag.includes('>') || tag.includes('"') || tag.includes("'")) {
          throw new Error('Tags cannot contain HTML or quotes');
        }
      }
      return true;
    }),
  
  // Color validation - optional hex color
  body('color')
    .optional()
    .custom(value => !value || /^#[0-9A-Fa-f]{6}$/.test(value))
    .withMessage('Color must be a valid hex color'),
  
  // Environment validation - optional, predefined values
  body('environment')
    .optional()
    .isIn(['development', 'uat', 'production', 'staging', 'local'])
    .withMessage('Invalid environment value'),
  
  handleValidationErrors,
  async (req, res, next) => {
    try {
      let {
        title,
        url,
        internal_url,
        external_url,
        group_id = 'default',
        description,
        icon,
        tags = [],
        color,
        environment
      } = req.body;
      
      // URL priority logic: If we have both internal and external URLs,
      // the external (FQDN) should be the primary URL
      if (external_url && internal_url) {
        // External URL becomes the primary
        url = external_url;
        // Keep internal_url as is for secondary access
      } else if (internal_url && !external_url) {
        // Only internal URL provided - check if it's actually a localhost URL
        if (internal_url.includes('localhost') || internal_url.includes('127.0.0.1') || internal_url.includes('192.168')) {
          // It's truly internal, keep it as internal_url
          url = url || internal_url; // Use provided url or fallback to internal
        } else {
          // It's actually an external URL mislabeled
          external_url = internal_url;
          url = external_url;
          internal_url = null;
        }
      }
      
      // Check if URL already exists
      const existing = await req.db.get('SELECT id FROM bookmarks WHERE url = ?', [url]);
      if (existing) {
        return res.status(409).json({ error: 'Bookmark with this URL already exists', id: existing.id });
      }
      
      // Verify group exists
      const group = await req.db.get('SELECT id FROM groups WHERE id = ?', [group_id]);
      if (!group) {
        return res.status(400).json({ error: 'Group not found' });
      }
      
      // Generate ID
      const id = Buffer.from(url).toString('base64').replace(/[^a-z0-9]/gi, '').substring(0, 16) + Date.now();
      
      const result = await req.db.run(
        `INSERT INTO bookmarks (id, group_id, title, url, internal_url, external_url, description, icon, tags, color, environment, created_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          group_id,
          title,
          url,
          internal_url || null,
          external_url || null,
          description || null,
          icon || null,
          JSON.stringify(tags),
          color || null,
          environment || null,
          'user'
        ]
      );
      
      const newBookmark = await req.db.get(
        'SELECT b.*, g.name as group_name FROM bookmarks b LEFT JOIN groups g ON b.group_id = g.id WHERE b.id = ?',
        [id]
      );
      
      // Parse JSON fields
      newBookmark.tags = JSON.parse(newBookmark.tags || '[]');
      
      // Log analytics event
      await req.db.run(
        'INSERT INTO analytics (bookmark_id, event_type) VALUES (?, ?)',
        [id, 'create']
      );
      
      // Emit WebSocket event
      req.io.emit('bookmark:created', newBookmark);
      
      res.status(201).json(newBookmark);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/bookmarks/:id - Update bookmark
router.put('/:id',
  authMiddleware,
  requireAdmin,
  param('id').notEmpty().withMessage('Bookmark ID is required'),
  checkResourceOwnership('bookmark'),
  
  // Title validation - optional for updates, max 200 chars, sanitized
  body('title')
    .optional()
    .isLength({ max: 200 }).withMessage('Title must be less than 200 characters')
    .trim()
    .escape(),
  
  // URL validation - optional for updates, valid URL format, max 2048 chars
  body('url')
    .optional()
    .isLength({ max: 2048 }).withMessage('URL must be less than 2048 characters')
    .isURL({ protocols: ['http', 'https'] }).withMessage('Must be a valid HTTP/HTTPS URL'),
  
  // Internal URL validation - optional, allow localhost, max 2048 chars  
  body('internal_url')
    .optional()
    .isLength({ max: 2048 }).withMessage('Internal URL must be less than 2048 characters')
    .isURL({ protocols: ['http', 'https'] }).withMessage('Must be a valid HTTP/HTTPS URL'),
  
  // External URL validation - optional, valid URL format, max 2048 chars
  body('external_url')
    .optional()
    .isLength({ max: 2048 }).withMessage('External URL must be less than 2048 characters')
    .isURL({ protocols: ['http', 'https'] }).withMessage('Must be a valid HTTP/HTTPS URL'),
  
  // Group ID validation
  body('group_id').optional().isString().trim(),
  
  // Description validation - optional, max 1000 chars, allow basic HTML
  body('description')
    .optional()
    .isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters')
    .trim(),
  
  // Icon validation - optional, max 200 chars
  body('icon')
    .optional()
    .isLength({ max: 200 }).withMessage('Icon must be less than 200 characters')
    .trim(),
  
  // Tags validation - optional array, max 10 tags, max 50 chars per tag
  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array')
    .custom((tags) => {
      if (!Array.isArray(tags)) return false;
      if (tags.length > 10) throw new Error('Maximum 10 tags allowed');
      
      for (const tag of tags) {
        if (typeof tag !== 'string') throw new Error('All tags must be strings');
        if (tag.length > 50) throw new Error('Each tag must be less than 50 characters');
        if (tag.includes('<') || tag.includes('>') || tag.includes('"') || tag.includes("'")) {
          throw new Error('Tags cannot contain HTML or quotes');
        }
      }
      return true;
    }),
  
  // Color validation - optional hex color
  body('color')
    .optional()
    .custom(value => !value || /^#[0-9A-Fa-f]{6}$/.test(value))
    .withMessage('Color must be a valid hex color'),
  
  // Environment validation - optional, predefined values
  body('environment')
    .optional()
    .isIn(['development', 'uat', 'production', 'staging', 'local'])
    .withMessage('Invalid environment value'),
  
  // Health status validation - optional, predefined values
  body('health_status')
    .optional()
    .isIn(['up', 'down', 'unknown'])
    .withMessage('Invalid health status value'),
  
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Check if bookmark exists
      const bookmark = await req.db.get('SELECT * FROM bookmarks WHERE id = ?', [id]);
      if (!bookmark) {
        return res.status(404).json({ error: 'Bookmark not found' });
      }
      
      // If updating group, verify it exists
      if (updates.group_id) {
        const group = await req.db.get('SELECT id FROM groups WHERE id = ?', [updates.group_id]);
        if (!group) {
          return res.status(400).json({ error: 'Group not found' });
        }
      }
      
      // Handle tags array
      if (updates.tags) {
        updates.tags = JSON.stringify(updates.tags);
      }
      
      // Build update query
      const fields = [];
      const values = [];
      
      for (const [key, value] of Object.entries(updates)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
      
      if (fields.length === 0) {
        return res.json(bookmark);
      }
      
      values.push(id);
      
      await req.db.run(
        `UPDATE bookmarks SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
      
      const updatedBookmark = await req.db.get(
        'SELECT b.*, g.name as group_name FROM bookmarks b LEFT JOIN groups g ON b.group_id = g.id WHERE b.id = ?',
        [id]
      );
      
      // Parse JSON fields
      if (updatedBookmark.tags) {
        updatedBookmark.tags = JSON.parse(updatedBookmark.tags);
      }
      
      // Log analytics event
      await req.db.run(
        'INSERT INTO analytics (bookmark_id, event_type) VALUES (?, ?)',
        [id, 'update']
      );
      
      // Emit WebSocket event
      req.io.emit('bookmark:updated', updatedBookmark);
      
      res.json(updatedBookmark);
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/bookmarks/:id/click - Track bookmark click
router.patch('/:id/click',
  param('id').notEmpty(),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      
      // Update click count and last accessed
      await req.db.run(
        'UPDATE bookmarks SET click_count = click_count + 1, last_accessed = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );
      
      // Log analytics event
      await req.db.run(
        'INSERT INTO analytics (bookmark_id, event_type) VALUES (?, ?)',
        [id, 'click']
      );
      
      const bookmark = await req.db.get('SELECT * FROM bookmarks WHERE id = ?', [id]);
      
      if (!bookmark) {
        return res.status(404).json({ error: 'Bookmark not found' });
      }
      
      // Emit WebSocket event
      req.io.emit('bookmark:clicked', { id, click_count: bookmark.click_count });
      
      res.json({ success: true, click_count: bookmark.click_count });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/bookmarks/:id - Delete bookmark
router.delete('/:id',
  authMiddleware,
  requireAdmin,
  param('id').notEmpty().withMessage('Bookmark ID is required'),
  checkResourceOwnership('bookmark'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      
      // Check if bookmark exists
      const bookmark = await req.db.get('SELECT * FROM bookmarks WHERE id = ?', [id]);
      if (!bookmark) {
        return res.status(404).json({ error: 'Bookmark not found' });
      }
      
      // Delete the bookmark (analytics will be cascade deleted)
      await req.db.run('DELETE FROM bookmarks WHERE id = ?', [id]);
      
      // Emit WebSocket event
      req.io.emit('bookmark:deleted', { id });
      
      res.json({ message: 'Bookmark deleted successfully', id });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;