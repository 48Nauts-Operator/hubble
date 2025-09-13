// ABOUTME: REST API routes for group management
// ABOUTME: Handles CRUD operations for bookmark groups

const express = require('express');
const router = express.Router();
const { param, body } = require('express-validator');
const { groupValidation, validationChains, handleValidationErrors } = require('../middleware/validation');

// GET /api/groups - Get all groups with hierarchy
router.get('/', async (req, res, next) => {
  try {
    const { parent_id } = req.query;
    
    let query = 'SELECT * FROM groups';
    const params = [];
    
    if (parent_id) {
      query += ' WHERE parent_id = ?';
      params.push(parent_id);
    } else if (parent_id === 'null') {
      query += ' WHERE parent_id IS NULL';
    }
    
    query += ' ORDER BY sort_order, name';
    
    const groups = await req.db.all(query, params);
    
    // Get bookmark counts for each group
    for (const group of groups) {
      const countResult = await req.db.get(
        'SELECT COUNT(*) as count FROM bookmarks WHERE group_id = ?',
        [group.id]
      );
      group.bookmark_count = countResult.count;
    }
    
    res.json(groups);
  } catch (error) {
    next(error);
  }
});

// GET /api/groups/:id - Get single group with its bookmarks
router.get('/:id', 
  param('id').notEmpty(),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const group = await req.db.get(
        'SELECT * FROM groups WHERE id = ?',
        [req.params.id]
      );
      
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }
      
      // Get bookmarks in this group
      const bookmarks = await req.db.all(
        'SELECT * FROM bookmarks WHERE group_id = ? ORDER BY title',
        [req.params.id]
      );
      
      // Get subgroups
      const subgroups = await req.db.all(
        'SELECT * FROM groups WHERE parent_id = ? ORDER BY sort_order, name',
        [req.params.id]
      );
      
      res.json({
        ...group,
        bookmarks,
        subgroups
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/groups - Create new group
router.post('/', groupValidation,
  async (req, res, next) => {
    try {
      const { name, icon, description, color, parent_id, sort_order } = req.body;
      
      // Check if parent exists
      if (parent_id) {
        const parent = await req.db.get('SELECT id FROM groups WHERE id = ?', [parent_id]);
        if (!parent) {
          return res.status(400).json({ error: 'Parent group not found' });
        }
      }
      
      // Generate ID
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
      
      const result = await req.db.run(
        `INSERT INTO groups (id, name, icon, description, color, parent_id, sort_order) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, name, icon || null, description || null, color || null, parent_id || null, sort_order || 0]
      );
      
      const newGroup = await req.db.get('SELECT * FROM groups WHERE id = ?', [id]);
      
      // Emit WebSocket event
      req.io.emit('group:created', newGroup);
      
      res.status(201).json(newGroup);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/groups/:id - Update group
router.put('/:id',
  param('id').notEmpty(),
  validationChains.name(false), // optional for updates
  validationChains.icon(),
  validationChains.description(),
  validationChains.color(),
  validationChains.parent_id(),
  validationChains.sort_order(),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Check if group exists
      const group = await req.db.get('SELECT * FROM groups WHERE id = ?', [id]);
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }
      
      // Prevent setting parent_id to self
      if (updates.parent_id === id) {
        return res.status(400).json({ error: 'Group cannot be its own parent' });
      }
      
      // Build update query
      const fields = [];
      const values = [];
      
      for (const [key, value] of Object.entries(updates)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
      
      if (fields.length === 0) {
        return res.json(group);
      }
      
      values.push(id);
      
      await req.db.run(
        `UPDATE groups SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
      
      const updatedGroup = await req.db.get('SELECT * FROM groups WHERE id = ?', [id]);
      
      // Emit WebSocket event
      req.io.emit('group:updated', updatedGroup);
      
      res.json(updatedGroup);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/groups/reorder - Update sort order for multiple groups
router.put('/reorder', [
  body('groups').isArray(),
  body('groups.*.id').notEmpty(),
  body('groups.*.sort_order').isInt(),
  handleValidationErrors
],
  async (req, res, next) => {
    try {
      const { groups } = req.body;
      
      // Update each group's sort_order
      for (const group of groups) {
        await req.db.run(
          'UPDATE groups SET sort_order = ? WHERE id = ?',
          [group.sort_order, group.id]
        );
      }
      
      // Return updated groups
      const updatedGroups = await req.db.all(
        'SELECT * FROM groups ORDER BY sort_order ASC, name ASC'
      );
      
      // Emit WebSocket event
      req.io.emit('groups:reordered', updatedGroups);
      
      res.json(updatedGroups);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/groups/:id - Delete group
router.delete('/:id',
  param('id').notEmpty(),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      
      // Prevent deleting default group
      if (id === 'default') {
        return res.status(400).json({ error: 'Cannot delete default group' });
      }
      
      // Check if group exists
      const group = await req.db.get('SELECT * FROM groups WHERE id = ?', [id]);
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }
      
      // Move bookmarks to default group before deleting
      await req.db.run(
        'UPDATE bookmarks SET group_id = "default" WHERE group_id = ?',
        [id]
      );
      
      // Move subgroups to parent or null
      await req.db.run(
        'UPDATE groups SET parent_id = ? WHERE parent_id = ?',
        [group.parent_id, id]
      );
      
      // Delete the group
      await req.db.run('DELETE FROM groups WHERE id = ?', [id]);
      
      // Emit WebSocket event
      req.io.emit('group:deleted', { id });
      
      res.json({ message: 'Group deleted successfully', id });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;