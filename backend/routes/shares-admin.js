// ABOUTME: Admin share routes that require authentication
// ABOUTME: Handles CRUD operations for shared views management

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const crypto = require('crypto');
const { authMiddleware, checkResourceOwnership, requireAdmin } = require('../middleware/auth');
const {
  validationChains,
  shareValidation,
  handleValidationErrors
} = require('../middleware/validation');

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

// GET /api/shares - List all shared views
router.get('/',
  authMiddleware,
  requireAdmin,
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const shares = await req.db.all(`
        SELECT 
          sv.*,
          COUNT(DISTINCT sva.id) as access_count
        FROM shared_views sv
        LEFT JOIN shared_view_access sva ON sv.id = sva.shared_view_id
        GROUP BY sv.id
        ORDER BY sv.created_at DESC
        LIMIT ? OFFSET ?
      `, [limit, offset]);

      const total = await req.db.get('SELECT COUNT(*) as count FROM shared_views');

      res.json({
        shares: shares.map(share => ({
          ...share,
          includedGroups: JSON.parse(share.included_groups || '[]'),
          excludedGroups: JSON.parse(share.excluded_groups || '[]'),
          includedTags: JSON.parse(share.included_tags || '[]'),
          excludedTags: JSON.parse(share.excluded_tags || '[]'),
          customBranding: share.custom_branding ? JSON.parse(share.custom_branding) : null
        })),
        pagination: {
          total: total.count,
          limit,
          offset
        }
      });

    } catch (error) {
      console.error('Error listing shares:', error);
      next(error);
    }
  }
);

// POST /api/shares - Create new shared view
router.post('/',
  authMiddleware,
  requireAdmin,
  shareValidation,
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
        excluded_tags = [],
        theme = 'auto',
        layout = 'card',
        show_groups = true,
        show_search = true,
        show_filters = false,
        custom_css = '',
        custom_branding = null
      } = req.body;

      const id = generateId('share-');
      const uid = generateShareUID();

      // Ensure unique UID
      let existingShare = await req.db.get('SELECT id FROM shared_views WHERE uid = ?', [uid]);
      while (existingShare) {
        uid = generateShareUID();
        existingShare = await req.db.get('SELECT id FROM shared_views WHERE uid = ?', [uid]);
      }

      await req.db.run(`
        INSERT INTO shared_views (
          id, uid, name, description, access_type, expires_at, max_uses,
          included_groups, excluded_groups, included_tags, excluded_tags,
          theme, layout, show_groups, show_search, show_filters,
          custom_css, custom_branding
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        uid,
        name,
        description || '',
        access_type,
        expires_at || null,
        max_uses || null,
        JSON.stringify(included_groups),
        JSON.stringify(excluded_groups),
        JSON.stringify(included_tags),
        JSON.stringify(excluded_tags),
        theme,
        layout,
        show_groups ? 1 : 0,
        show_search ? 1 : 0,
        show_filters ? 1 : 0,
        custom_css,
        custom_branding ? JSON.stringify(custom_branding) : null
      ]);

      // Get the created share with domain URL
      const domain = process.env.PUBLIC_DOMAIN || 'hubble.blockonauts.io';
      const protocol = domain.includes('localhost') ? 'http' : 'https';
      const fullUrl = `${protocol}://${domain}/share/${uid}`;

      res.status(201).json({
        id,
        uid,
        name,
        url: fullUrl,
        access_type,
        expires_at,
        max_uses,
        current_uses: 0,
        created_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error creating share:', error);
      next(error);
    }
  }
);

// GET /api/shares/:id - Get specific shared view (by internal ID)
router.get('/:id',
  authMiddleware,
  requireAdmin,
  param('id').notEmpty(),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const share = await req.db.get(`
        SELECT 
          sv.*,
          COUNT(DISTINCT sva.id) as access_count
        FROM shared_views sv
        LEFT JOIN shared_view_access sva ON sv.id = sva.shared_view_id
        WHERE sv.id = ?
        GROUP BY sv.id
      `, [id]);

      if (!share) {
        return res.status(404).json({ error: 'Share not found' });
      }

      // Get the full URL
      const domain = process.env.PUBLIC_DOMAIN || 'hubble.blockonauts.io';
      const protocol = domain.includes('localhost') ? 'http' : 'https';
      const fullUrl = `${protocol}://${domain}/share/${share.uid}`;

      res.json({
        ...share,
        url: fullUrl,
        includedGroups: JSON.parse(share.included_groups || '[]'),
        excludedGroups: JSON.parse(share.excluded_groups || '[]'),
        includedTags: JSON.parse(share.included_tags || '[]'),
        excludedTags: JSON.parse(share.excluded_tags || '[]'),
        customBranding: share.custom_branding ? JSON.parse(share.custom_branding) : null
      });

    } catch (error) {
      console.error('Error getting share:', error);
      next(error);
    }
  }
);

// PUT /api/shares/:id - Update shared view
router.put('/:id',
  authMiddleware,
  requireAdmin,
  param('id').notEmpty(),
  // Use shareValidation with all fields optional for updates
  validationChains.name(false),
  validationChains.description(false),
  validationChains.access_type(),
  validationChains.expires_at(),
  validationChains.max_uses(),
  validationChains.included_groups(),
  validationChains.excluded_groups(),
  validationChains.included_tags(),
  validationChains.excluded_tags(),
  validationChains.theme(),
  validationChains.layout(),
  validationChains.show_groups(),
  validationChains.show_search(),
  validationChains.show_filters(),
  validationChains.custom_css(),
  validationChains.custom_branding(),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      // Check if share exists
      const existingShare = await req.db.get('SELECT * FROM shared_views WHERE id = ?', [id]);
      if (!existingShare) {
        return res.status(404).json({ error: 'Share not found' });
      }

      // Build update query
      const updates = [];
      const values = [];

      Object.keys(req.body).forEach(key => {
        switch (key) {
          case 'included_groups':
          case 'excluded_groups':
          case 'included_tags':
          case 'excluded_tags':
            updates.push(`${key} = ?`);
            values.push(JSON.stringify(req.body[key]));
            break;
          case 'custom_branding':
            updates.push('custom_branding = ?');
            values.push(req.body[key] ? JSON.stringify(req.body[key]) : null);
            break;
          case 'show_groups':
          case 'show_search':
          case 'show_filters':
            updates.push(`${key} = ?`);
            values.push(req.body[key] ? 1 : 0);
            break;
          case 'expires_at':
          case 'max_uses':
            updates.push(`${key} = ?`);
            values.push(req.body[key] || null);
            break;
          default:
            if (['name', 'description', 'access_type', 'theme', 'layout', 'custom_css'].includes(key)) {
              updates.push(`${key} = ?`);
              values.push(req.body[key]);
            }
        }
      });

      if (updates.length > 0) {
        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        await req.db.run(
          `UPDATE shared_views SET ${updates.join(', ')} WHERE id = ?`,
          values
        );
      }

      // Get updated share
      const updatedShare = await req.db.get('SELECT * FROM shared_views WHERE id = ?', [id]);
      
      // Get the full URL
      const domain = process.env.PUBLIC_DOMAIN || 'hubble.blockonauts.io';
      const protocol = domain.includes('localhost') ? 'http' : 'https';
      const fullUrl = `${protocol}://${domain}/share/${updatedShare.uid}`;

      res.json({
        ...updatedShare,
        url: fullUrl,
        includedGroups: JSON.parse(updatedShare.included_groups || '[]'),
        excludedGroups: JSON.parse(updatedShare.excluded_groups || '[]'),
        includedTags: JSON.parse(updatedShare.included_tags || '[]'),
        excludedTags: JSON.parse(updatedShare.excluded_tags || '[]'),
        customBranding: updatedShare.custom_branding ? JSON.parse(updatedShare.custom_branding) : null
      });

    } catch (error) {
      console.error('Error updating share:', error);
      next(error);
    }
  }
);

// DELETE /api/shares/:id - Delete shared view
router.delete('/:id',
  authMiddleware,
  requireAdmin,
  param('id').notEmpty(),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      // Check if share exists
      const share = await req.db.get('SELECT id FROM shared_views WHERE id = ?', [id]);
      if (!share) {
        return res.status(404).json({ error: 'Share not found' });
      }

      // Delete related data first
      await req.db.run('DELETE FROM shared_view_access WHERE shared_view_id = ?', [id]);
      await req.db.run('DELETE FROM personal_overlays WHERE shared_view_id = ?', [id]);
      
      // Delete the share
      await req.db.run('DELETE FROM shared_views WHERE id = ?', [id]);

      res.json({ success: true, message: 'Share deleted successfully' });

    } catch (error) {
      console.error('Error deleting share:', error);
      next(error);
    }
  }
);

module.exports = router;