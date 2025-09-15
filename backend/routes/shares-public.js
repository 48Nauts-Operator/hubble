// ABOUTME: Public share routes that don't require authentication
// ABOUTME: Handles public access to shared bookmark views

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const crypto = require('crypto');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

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

// Check if a shared view is accessible
async function checkAccessibility(db, sharedView) {
  // Check if expired
  if (sharedView.expires_at) {
    const expiresAt = new Date(sharedView.expires_at);
    if (expiresAt < new Date()) {
      return { accessible: false, reason: 'Share has expired' };
    }
  }

  // Check max uses
  if (sharedView.max_uses && sharedView.current_uses >= sharedView.max_uses) {
    return { accessible: false, reason: 'Share has reached maximum uses' };
  }

  // Check access type
  if (sharedView.access_type === 'restricted') {
    // TODO: Implement restricted access logic (e.g., password, token)
    return { accessible: false, reason: 'Restricted access' };
  }

  return { accessible: true };
}

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
      const excludedTags = JSON.parse(sharedView.excluded_tags || '[]');

      // Build query to get bookmarks
      let query = `
        SELECT b.* 
        FROM bookmarks b
        WHERE 1=1
      `;
      const params = [];

      // Apply group filters
      if (includedGroups.length > 0) {
        query += ` AND b.group_id IN (${includedGroups.map(() => '?').join(',')})`;
        params.push(...includedGroups);
      }
      if (excludedGroups.length > 0) {
        query += ` AND b.group_id NOT IN (${excludedGroups.map(() => '?').join(',')})`;
        params.push(...excludedGroups);
      }

      // Apply tag filters (tags are stored as JSON array)
      if (includedTags.length > 0) {
        query += ` AND EXISTS (
          SELECT 1 FROM json_each(b.tags) 
          WHERE value IN (${includedTags.map(() => '?').join(',')})
        )`;
        params.push(...includedTags);
      }
      if (excludedTags.length > 0) {
        query += ` AND NOT EXISTS (
          SELECT 1 FROM json_each(b.tags) 
          WHERE value IN (${excludedTags.map(() => '?').join(',')})
        )`;
        params.push(...excludedTags);
      }

      query += ' ORDER BY b.created_at DESC';

      const bookmarks = await req.db.all(query, params);

      // Also get groups if included
      let groups = [];
      if (includedGroups.length > 0) {
        groups = await req.db.all(
          `SELECT * FROM groups WHERE id IN (${includedGroups.map(() => '?').join(',')})`,
          includedGroups
        );
      }

      // Get groups for all bookmarks if no specific groups are filtered
      if (includedGroups.length === 0) {
        const groupIds = [...new Set(bookmarks.map(b => b.group_id).filter(Boolean))];
        if (groupIds.length > 0) {
          groups = await req.db.all(
            `SELECT * FROM groups WHERE id IN (${groupIds.map(() => '?').join(',')})`,
            groupIds
          );
        }
      }

      res.json({
        share: {
          uid: sharedView.uid,
          name: sharedView.name,
          description: sharedView.description,
          theme: sharedView.theme || 'system',
          layout: sharedView.layout || 'card',
          showGroups: sharedView.show_groups === 1,
          showSearch: sharedView.show_search === 1,
          showFilters: sharedView.show_filters === 1,
          customCSS: sharedView.custom_css,
          customBranding: sharedView.custom_branding ? JSON.parse(sharedView.custom_branding) : null
        },
        bookmarks,
        groups
      });

    } catch (error) {
      console.error('Error accessing shared view:', error);
      next(error);
    }
  }
);

// POST /api/public/share/:uid/overlay - Save personal overlay for a shared view
router.post('/share/:uid/overlay',
  param('uid').isLength({ min: 8, max: 8 }),
  body('notes').optional().isObject(),
  body('hiddenBookmarks').optional().isArray(),
  body('customOrder').optional().isArray(),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { uid } = req.params;
      const sessionId = req.headers['x-session-id'] || crypto.randomBytes(16).toString('hex');
      const { notes, hiddenBookmarks, customOrder } = req.body;

      // Verify shared view exists
      const sharedView = await req.db.get('SELECT id FROM shared_views WHERE uid = ?', [uid]);
      if (!sharedView) {
        return res.status(404).json({ error: 'Shared view not found' });
      }

      // Save or update overlay
      const overlayId = `overlay-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
      
      await req.db.run(`
        INSERT OR REPLACE INTO personal_overlays (
          id, shared_view_id, session_id, notes, hidden_bookmarks, custom_order
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        overlayId,
        sharedView.id,
        sessionId,
        JSON.stringify(notes || {}),
        JSON.stringify(hiddenBookmarks || []),
        JSON.stringify(customOrder || [])
      ]);

      res.json({
        success: true,
        sessionId,
        message: 'Personal overlay saved'
      });

    } catch (error) {
      console.error('Error saving overlay:', error);
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

      // Get shared view
      const sharedView = await req.db.get('SELECT id FROM shared_views WHERE uid = ?', [uid]);
      if (!sharedView) {
        return res.status(404).json({ error: 'Shared view not found' });
      }

      // Get overlay
      const overlay = await req.db.get(`
        SELECT * FROM personal_overlays 
        WHERE shared_view_id = ? AND session_id = ?
      `, [sharedView.id, sessionId]);

      if (!overlay) {
        return res.status(404).json({ error: 'No overlay found for this session' });
      }

      res.json({
        notes: JSON.parse(overlay.notes || '{}'),
        hiddenBookmarks: JSON.parse(overlay.hidden_bookmarks || '[]'),
        customOrder: JSON.parse(overlay.custom_order || '[]'),
        createdAt: overlay.created_at,
        updatedAt: overlay.updated_at
      });

    } catch (error) {
      console.error('Error getting overlay:', error);
      next(error);
    }
  }
);

// POST /api/public/share/:uid/bookmark - Add bookmark to personal overlay
router.post('/share/:uid/bookmark',
  param('uid').isLength({ min: 8, max: 8 }),
  body('title').notEmpty().trim(),
  body('url').notEmpty().isURL(),
  body('description').optional().trim(),
  body('icon').optional(),
  body('tags').optional().isArray(),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { uid } = req.params;
      const sessionId = req.headers['x-session-id'];
      const { title, url, description, icon, tags } = req.body;

      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID required' });
      }

      // Verify shared view exists
      const sharedView = await req.db.get('SELECT id FROM shared_views WHERE uid = ?', [uid]);
      if (!sharedView) {
        return res.status(404).json({ error: 'Shared view not found' });
      }

      // Get or create overlay
      let overlay = await req.db.get(`
        SELECT * FROM personal_overlays 
        WHERE shared_view_id = ? AND session_id = ?
      `, [sharedView.id, sessionId]);

      if (!overlay) {
        const overlayId = `overlay-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
        await req.db.run(`
          INSERT INTO personal_overlays (
            id, shared_view_id, session_id, notes, hidden_bookmarks, custom_order, custom_bookmarks
          ) VALUES (?, ?, ?, '{}', '[]', '[]', '[]')
        `, [overlayId, sharedView.id, sessionId]);
        
        overlay = { 
          id: overlayId, 
          custom_bookmarks: '[]' 
        };
      }

      // Add bookmark to custom bookmarks
      const customBookmarks = JSON.parse(overlay.custom_bookmarks || '[]');
      const newBookmark = {
        id: `custom-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`,
        title,
        url,
        description: description || '',
        icon: icon || '🔗',
        tags: tags || [],
        createdAt: new Date().toISOString()
      };
      
      customBookmarks.push(newBookmark);

      await req.db.run(`
        UPDATE personal_overlays 
        SET custom_bookmarks = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [JSON.stringify(customBookmarks), overlay.id]);

      res.json({
        success: true,
        bookmark: newBookmark,
        message: 'Bookmark added to personal overlay'
      });

    } catch (error) {
      console.error('Error adding bookmark to overlay:', error);
      next(error);
    }
  }
);

module.exports = router;