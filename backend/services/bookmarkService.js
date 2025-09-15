// ABOUTME: Business logic service for bookmark operations
// ABOUTME: Handles CRUD operations, validation, and data transformation

class BookmarkService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Parse JSON fields in bookmark data
   */
  parseBookmarkData(bookmark) {
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
    return bookmark;
  }

  /**
   * Get bookmarks with filtering and pagination
   */
  async getBookmarks({ group_id, environment, search, tags, limit = 50, offset = 0 } = {}) {
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

    const bookmarks = await this.db.all(queryStr, params);

    // Parse JSON fields
    bookmarks.forEach(bookmark => this.parseBookmarkData(bookmark));

    // Get total count
    const countQuery = queryStr.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM').replace(/ORDER BY.*$/, '');
    const countResult = await this.db.get(countQuery, params.slice(0, -2));

    return {
      bookmarks,
      total: countResult.total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };
  }

  /**
   * Get single bookmark by ID
   */
  async getBookmarkById(id) {
    const bookmark = await this.db.get(
      'SELECT b.*, g.name as group_name FROM bookmarks b LEFT JOIN groups g ON b.group_id = g.id WHERE b.id = ?',
      [id]
    );

    if (!bookmark) {
      return null;
    }

    return this.parseBookmarkData(bookmark);
  }

  /**
   * Process URL priority logic for internal/external URLs
   */
  processUrlFields({ url, internal_url, external_url }) {
    let processedUrl = url;
    let processedInternal = internal_url;
    let processedExternal = external_url;

    // URL priority logic: If we have both internal and external URLs,
    // the external (FQDN) should be the primary URL
    if (external_url && internal_url) {
      // External URL becomes the primary
      processedUrl = external_url;
      // Keep internal_url as is for secondary access
    } else if (internal_url && !external_url) {
      // Only internal URL provided - check if it's actually a localhost URL
      if (internal_url.includes('localhost') || internal_url.includes('127.0.0.1') || internal_url.includes('192.168')) {
        // It's truly internal, keep it as internal_url
        processedUrl = url || internal_url; // Use provided url or fallback to internal
      } else {
        // It's actually an external URL mislabeled
        processedExternal = internal_url;
        processedUrl = processedExternal;
        processedInternal = null;
      }
    }

    return {
      url: processedUrl,
      internal_url: processedInternal,
      external_url: processedExternal
    };
  }

  /**
   * Check if bookmark with given URL already exists
   */
  async checkBookmarkExists(url) {
    return await this.db.get('SELECT id FROM bookmarks WHERE url = ?', [url]);
  }

  /**
   * Verify that group exists
   */
  async verifyGroupExists(groupId) {
    return await this.db.get('SELECT id FROM groups WHERE id = ?', [groupId]);
  }

  /**
   * Generate unique bookmark ID
   */
  generateBookmarkId(url) {
    return Buffer.from(url).toString('base64').replace(/[^a-z0-9]/gi, '').substring(0, 16) + Date.now();
  }

  /**
   * Create new bookmark
   */
  async createBookmark(bookmarkData) {
    const {
      title,
      url: originalUrl,
      internal_url,
      external_url,
      group_id = 'default',
      description,
      icon,
      tags = [],
      color,
      environment
    } = bookmarkData;

    // Process URL fields
    const { url, internal_url: processedInternal, external_url: processedExternal } =
      this.processUrlFields({ url: originalUrl, internal_url, external_url });

    // Check if URL already exists
    const existing = await this.checkBookmarkExists(url);
    if (existing) {
      throw new Error(`Bookmark with this URL already exists: ${existing.id}`);
    }

    // Verify group exists
    const group = await this.verifyGroupExists(group_id);
    if (!group) {
      throw new Error('Group not found');
    }

    // Generate ID
    const id = this.generateBookmarkId(url);

    const result = await this.db.run(
      `INSERT INTO bookmarks (id, group_id, title, url, internal_url, external_url, description, icon, tags, color, environment, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        group_id,
        title,
        url,
        processedInternal || null,
        processedExternal || null,
        description || null,
        icon || null,
        JSON.stringify(tags),
        color || null,
        environment || null,
        'user'
      ]
    );

    if (result.changes === 0) {
      throw new Error('Failed to create bookmark');
    }

    return { id, lastID: result.lastID };
  }

  /**
   * Update existing bookmark
   */
  async updateBookmark(id, updateData) {
    // Get existing bookmark
    const existing = await this.getBookmarkById(id);
    if (!existing) {
      throw new Error('Bookmark not found');
    }

    const {
      title,
      url,
      internal_url,
      external_url,
      group_id,
      description,
      icon,
      tags,
      color,
      environment
    } = updateData;

    // Build dynamic update query
    const updateFields = [];
    const params = [];

    if (title !== undefined) {
      updateFields.push('title = ?');
      params.push(title);
    }
    if (url !== undefined) {
      updateFields.push('url = ?');
      params.push(url);
    }
    if (internal_url !== undefined) {
      updateFields.push('internal_url = ?');
      params.push(internal_url);
    }
    if (external_url !== undefined) {
      updateFields.push('external_url = ?');
      params.push(external_url);
    }
    if (group_id !== undefined) {
      // Verify group exists
      const group = await this.verifyGroupExists(group_id);
      if (!group) {
        throw new Error('Group not found');
      }
      updateFields.push('group_id = ?');
      params.push(group_id);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      params.push(description);
    }
    if (icon !== undefined) {
      updateFields.push('icon = ?');
      params.push(icon);
    }
    if (tags !== undefined) {
      updateFields.push('tags = ?');
      params.push(JSON.stringify(tags));
    }
    if (color !== undefined) {
      updateFields.push('color = ?');
      params.push(color);
    }
    if (environment !== undefined) {
      updateFields.push('environment = ?');
      params.push(environment);
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const result = await this.db.run(
      `UPDATE bookmarks SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );

    if (result.changes === 0) {
      throw new Error('Failed to update bookmark');
    }

    return { updated: true };
  }

  /**
   * Delete bookmark by ID
   */
  async deleteBookmark(id) {
    const result = await this.db.run('DELETE FROM bookmarks WHERE id = ?', [id]);

    if (result.changes === 0) {
      throw new Error('Bookmark not found');
    }

    return { deleted: true };
  }

  /**
   * Track bookmark click
   */
  async trackClick(id) {
    // Check if bookmark exists
    const bookmark = await this.getBookmarkById(id);
    if (!bookmark) {
      throw new Error('Bookmark not found');
    }

    // Update click count and last visited
    await this.db.run(
      'UPDATE bookmarks SET click_count = click_count + 1, last_visited = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );

    // Log analytics event
    await this.db.run(
      'INSERT INTO analytics (bookmark_id, event_type, event_data) VALUES (?, ?, ?)',
      [id, 'click', JSON.stringify({ timestamp: new Date().toISOString() })]
    );

    return { tracked: true };
  }
}

module.exports = BookmarkService;