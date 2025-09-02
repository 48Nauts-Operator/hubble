// ABOUTME: REST API routes for backup and restore functionality
// ABOUTME: Handles export and import of bookmarks and groups data

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// GET /api/backup/export - Export all bookmarks and groups
router.get('/export', async (req, res, next) => {
  try {
    // Get all groups
    const groups = await req.db.all('SELECT * FROM groups ORDER BY sort_order, name');
    
    // Get all bookmarks
    const bookmarks = await req.db.all('SELECT * FROM bookmarks ORDER BY group_id, title');
    
    // Parse JSON fields in bookmarks
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
    
    // Create backup object with metadata
    const backup = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      app: 'Hubble Bookmark Dashboard',
      data: {
        groups,
        bookmarks,
        stats: {
          total_groups: groups.length,
          total_bookmarks: bookmarks.length
        }
      }
    };
    
    // Set headers for file download
    const filename = `hubble-backup-${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.json(backup);
  } catch (error) {
    next(error);
  }
});

// POST /api/backup/import - Import bookmarks and groups from backup
router.post('/import',
  body('version').notEmpty(),
  body('data').notEmpty(),
  body('data.groups').isArray(),
  body('data.bookmarks').isArray(),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { version, data } = req.body;
      
      // Check version compatibility
      if (version !== '1.0') {
        return res.status(400).json({ 
          error: 'Incompatible backup version. This version of Hubble supports version 1.0' 
        });
      }
      
      const { groups, bookmarks } = data;
      const { merge = false } = req.query; // ?merge=true to merge with existing data
      
      let importedGroups = 0;
      let importedBookmarks = 0;
      let skippedGroups = 0;
      let skippedBookmarks = 0;
      
      // Start transaction
      await req.db.run('BEGIN TRANSACTION');
      
      try {
        // If not merging, clear existing data
        if (!merge) {
          // Delete all bookmarks except in default group
          await req.db.run('DELETE FROM bookmarks WHERE group_id != "default"');
          // Delete all groups except default
          await req.db.run('DELETE FROM groups WHERE id != "default"');
        }
        
        // Import groups
        for (const group of groups) {
          // Skip default group as it always exists
          if (group.id === 'default') {
            continue;
          }
          
          // Check if group exists (for merge mode)
          const existing = await req.db.get('SELECT id FROM groups WHERE id = ?', [group.id]);
          
          if (existing && merge) {
            // Update existing group
            await req.db.run(
              `UPDATE groups SET 
                name = ?, parent_id = ?, icon = ?, description = ?, 
                color = ?, sort_order = ?
              WHERE id = ?`,
              [
                group.name, group.parent_id, group.icon, 
                group.description, group.color, group.sort_order || 0,
                group.id
              ]
            );
            skippedGroups++;
          } else if (!existing) {
            // Insert new group
            await req.db.run(
              `INSERT INTO groups (id, name, parent_id, icon, description, color, sort_order) 
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                group.id, group.name, group.parent_id, group.icon,
                group.description, group.color, group.sort_order || 0
              ]
            );
            importedGroups++;
          } else {
            skippedGroups++;
          }
        }
        
        // Import bookmarks
        for (const bookmark of bookmarks) {
          // Check if bookmark exists (for merge mode)
          const existing = await req.db.get('SELECT id FROM bookmarks WHERE id = ?', [bookmark.id]);
          
          // Ensure group exists, use default if not
          const groupExists = await req.db.get('SELECT id FROM groups WHERE id = ?', [bookmark.group_id]);
          const groupId = groupExists ? bookmark.group_id : 'default';
          
          // Convert tags array to JSON string
          const tags = Array.isArray(bookmark.tags) ? JSON.stringify(bookmark.tags) : '[]';
          
          if (existing && merge) {
            // Update existing bookmark
            await req.db.run(
              `UPDATE bookmarks SET 
                group_id = ?, title = ?, url = ?, internal_url = ?, external_url = ?,
                description = ?, icon = ?, tags = ?, color = ?, environment = ?,
                click_count = ?
              WHERE id = ?`,
              [
                groupId, bookmark.title, bookmark.url, bookmark.internal_url,
                bookmark.external_url, bookmark.description, bookmark.icon,
                tags, bookmark.color, bookmark.environment,
                bookmark.click_count || 0, bookmark.id
              ]
            );
            skippedBookmarks++;
          } else if (!existing) {
            // Insert new bookmark
            await req.db.run(
              `INSERT INTO bookmarks (
                id, group_id, title, url, internal_url, external_url,
                description, icon, tags, color, environment, click_count, created_by
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                bookmark.id, groupId, bookmark.title, bookmark.url,
                bookmark.internal_url, bookmark.external_url, bookmark.description,
                bookmark.icon, tags, bookmark.color, bookmark.environment,
                bookmark.click_count || 0, 'import'
              ]
            );
            importedBookmarks++;
          } else {
            skippedBookmarks++;
          }
        }
        
        // Commit transaction
        await req.db.run('COMMIT');
        
        // Emit WebSocket event
        req.io.emit('data:imported', { 
          groups: importedGroups, 
          bookmarks: importedBookmarks 
        });
        
        res.json({
          success: true,
          message: 'Import completed successfully',
          stats: {
            groups: {
              imported: importedGroups,
              skipped: skippedGroups,
              total: groups.length
            },
            bookmarks: {
              imported: importedBookmarks,
              skipped: skippedBookmarks,
              total: bookmarks.length
            }
          }
        });
      } catch (error) {
        // Rollback on error
        await req.db.run('ROLLBACK');
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/backup/validate - Validate backup file without importing
router.post('/validate',
  body('version').notEmpty(),
  body('data').notEmpty(),
  body('data.groups').isArray(),
  body('data.bookmarks').isArray(),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { version, data, exported_at } = req.body;
      
      // Check version
      if (version !== '1.0') {
        return res.status(400).json({ 
          valid: false,
          error: 'Incompatible backup version' 
        });
      }
      
      const { groups, bookmarks } = data;
      
      // Validate data structure
      const issues = [];
      
      // Check for required fields in groups
      groups.forEach((group, index) => {
        if (!group.id) issues.push(`Group at index ${index} missing id`);
        if (!group.name) issues.push(`Group at index ${index} missing name`);
      });
      
      // Check for required fields in bookmarks
      bookmarks.forEach((bookmark, index) => {
        if (!bookmark.id) issues.push(`Bookmark at index ${index} missing id`);
        if (!bookmark.title) issues.push(`Bookmark at index ${index} missing title`);
        if (!bookmark.url && !bookmark.external_url) {
          issues.push(`Bookmark at index ${index} missing URL`);
        }
      });
      
      if (issues.length > 0) {
        return res.json({
          valid: false,
          issues,
          stats: {
            groups: groups.length,
            bookmarks: bookmarks.length
          }
        });
      }
      
      res.json({
        valid: true,
        exported_at,
        stats: {
          groups: groups.length,
          bookmarks: bookmarks.length
        }
      });
    } catch (error) {
      res.status(400).json({
        valid: false,
        error: 'Invalid backup file format'
      });
    }
  }
);

module.exports = router;