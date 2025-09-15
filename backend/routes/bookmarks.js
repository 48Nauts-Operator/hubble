// ABOUTME: REST API routes for bookmark management
// ABOUTME: Handles CRUD operations and click tracking for bookmarks

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { authMiddleware, checkResourceOwnership, requireAdmin } = require('../middleware/auth');
const {
  validationChains,
  bookmarkValidation,
  handleValidationErrors
} = require('../middleware/validation');
const BookmarkService = require('../services/bookmarkService');

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
      const bookmarkService = new BookmarkService(req.db);
      const result = await bookmarkService.getBookmarks(req.query);
      res.json(result);
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
      const bookmarkService = new BookmarkService(req.db);
      const bookmark = await bookmarkService.getBookmarkById(req.params.id);

      if (!bookmark) {
        return res.status(404).json({ error: 'Bookmark not found' });
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
  bookmarkValidation,
  async (req, res, next) => {
    try {
      const bookmarkService = new BookmarkService(req.db);
      const result = await bookmarkService.createBookmark(req.body);

      // Get the created bookmark with group info
      const newBookmark = await bookmarkService.getBookmarkById(result.id);

      // Log analytics event
      await req.db.run(
        'INSERT INTO analytics (bookmark_id, event_type) VALUES (?, ?)',
        [result.id, 'create']
      );

      // Emit WebSocket event
      req.io.emit('bookmark:created', newBookmark);

      res.status(201).json(newBookmark);
    } catch (error) {
      if (error.message.includes('already exists')) {
        const match = error.message.match(/already exists: (.+)$/);
        return res.status(409).json({
          error: 'Bookmark with this URL already exists',
          id: match ? match[1] : null
        });
      }
      if (error.message === 'Group not found') {
        return res.status(400).json({ error: 'Group not found' });
      }
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
  // Use centralized validation for updates (all fields optional)
  validationChains.title(false),
  validationChains.url(false),
  validationChains.internal_url(),
  validationChains.external_url(),
  validationChains.group_id(),
  validationChains.description(false),
  validationChains.icon(),
  validationChains.tags(),
  validationChains.color(),
  validationChains.environment(),
  validationChains.health_status(),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const bookmarkService = new BookmarkService(req.db);

      await bookmarkService.updateBookmark(id, req.body);

      // Get updated bookmark with group info
      const updatedBookmark = await bookmarkService.getBookmarkById(id);

      // Log analytics event
      await req.db.run(
        'INSERT INTO analytics (bookmark_id, event_type) VALUES (?, ?)',
        [id, 'update']
      );

      // Emit WebSocket event
      req.io.emit('bookmark:updated', updatedBookmark);

      res.json(updatedBookmark);
    } catch (error) {
      if (error.message === 'Bookmark not found') {
        return res.status(404).json({ error: 'Bookmark not found' });
      }
      if (error.message === 'Group not found') {
        return res.status(400).json({ error: 'Group not found' });
      }
      if (error.message === 'No fields to update') {
        // If no fields to update, just return current bookmark
        const bookmarkService = new BookmarkService(req.db);
        const bookmark = await bookmarkService.getBookmarkById(id);
        return res.json(bookmark);
      }
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
      const bookmarkService = new BookmarkService(req.db);

      await bookmarkService.trackClick(id);

      const bookmark = await bookmarkService.getBookmarkById(id);

      // Emit WebSocket event
      req.io.emit('bookmark:clicked', { id, click_count: bookmark.click_count });

      res.json({ success: true, click_count: bookmark.click_count });
    } catch (error) {
      if (error.message === 'Bookmark not found') {
        return res.status(404).json({ error: 'Bookmark not found' });
      }
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
      const bookmarkService = new BookmarkService(req.db);

      await bookmarkService.deleteBookmark(id);

      // Emit WebSocket event
      req.io.emit('bookmark:deleted', { id });

      res.json({ message: 'Bookmark deleted successfully', id });
    } catch (error) {
      if (error.message === 'Bookmark not found') {
        return res.status(404).json({ error: 'Bookmark not found' });
      }
      next(error);
    }
  }
);

module.exports = router;