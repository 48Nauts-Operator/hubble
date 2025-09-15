#!/usr/bin/env node

// ABOUTME: HTTP-based MCP server for Hubble that works in Docker containers
// ABOUTME: Provides REST API wrapper around MCP tools for bookmark management

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const cors = require('cors');

class HubbleHttpMCP {
  constructor() {
    this.db = null;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
      next();
    });
  }

  initDatabase() {
    const dbPath = process.env.DATABASE_URL || '/data/hubble.db';

    try {
      // Ensure directory exists
      const dir = path.dirname(dbPath);
      require('fs').mkdirSync(dir, { recursive: true });

      this.db = new Database(dbPath);
      this.ensureSchema();

      console.log(`Hubble MCP connected to database: ${dbPath}`);
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }

  ensureSchema() {
    // Create groups table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        parent_id TEXT,
        icon TEXT,
        description TEXT,
        color TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create bookmarks table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id TEXT PRIMARY KEY,
        group_id TEXT,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        tags TEXT,
        environment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES groups(id)
      )
    `);

    // Ensure default group
    const insert = this.db.prepare(
      `INSERT OR IGNORE INTO groups (id, name, icon, description)
       VALUES (?, ?, ?, ?)`
    );
    insert.run('default', 'Uncategorized', '📁', 'Default group for bookmarks');
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        database: this.db ? 'connected' : 'disconnected'
      });
    });

    // MCP tools info
    this.app.get('/tools', (req, res) => {
      res.json({
        tools: [
          {
            name: 'hubble_add_bookmark',
            description: 'Add a new bookmark to Hubble',
            endpoint: 'POST /tools/add-bookmark'
          },
          {
            name: 'hubble_list_bookmarks',
            description: 'List all bookmarks in Hubble',
            endpoint: 'GET /tools/list-bookmarks'
          },
          {
            name: 'hubble_search_bookmarks',
            description: 'Search bookmarks by title or URL',
            endpoint: 'GET /tools/search-bookmarks'
          }
        ]
      });
    });

    // Add bookmark
    this.app.post('/tools/add-bookmark', (req, res) => {
      try {
        const result = this.addBookmark(req.body);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // List bookmarks
    this.app.get('/tools/list-bookmarks', (req, res) => {
      try {
        const result = this.listBookmarks(req.query);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Search bookmarks
    this.app.get('/tools/search-bookmarks', (req, res) => {
      try {
        const { query } = req.query;
        if (!query) {
          return res.status(400).json({ error: 'Query parameter required' });
        }
        const result = this.searchBookmarks({ query });
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Hubble MCP HTTP Server',
        version: '1.0.0',
        status: 'running',
        endpoints: {
          health: '/health',
          tools: '/tools',
          addBookmark: 'POST /tools/add-bookmark',
          listBookmarks: 'GET /tools/list-bookmarks',
          searchBookmarks: 'GET /tools/search-bookmarks'
        }
      });
    });
  }

  addBookmark(args) {
    const { title, url, group = 'Uncategorized', description = '', icon = '🔖' } = args;

    if (!title || !url) {
      throw new Error('Title and URL are required');
    }

    // Check if bookmark exists
    const existingStmt = this.db.prepare('SELECT id FROM bookmarks WHERE url = ?');
    const existing = existingStmt.get(url);
    if (existing) {
      return {
        success: false,
        message: `Bookmark already exists: ${title}`,
        bookmark: { title, url }
      };
    }

    // Find or create group
    const groupStmt = this.db.prepare('SELECT id FROM groups WHERE name = ?');
    let groupData = groupStmt.get(group);
    if (!groupData) {
      const groupId = group.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const insertGroup = this.db.prepare(
        'INSERT INTO groups (id, name, icon) VALUES (?, ?, ?)'
      );
      insertGroup.run(groupId, group, '📁');
      groupData = { id: groupId };
    }

    // Add bookmark
    const bookmarkId = 'bm-' + Date.now();
    const insertBookmark = this.db.prepare(
      'INSERT INTO bookmarks (id, group_id, title, url, description, icon) VALUES (?, ?, ?, ?, ?, ?)'
    );
    insertBookmark.run(bookmarkId, groupData.id, title, url, description, icon);

    return {
      success: true,
      message: `Added bookmark: ${title}`,
      bookmark: {
        id: bookmarkId,
        title,
        url,
        group,
        description,
        icon
      }
    };
  }

  listBookmarks(args) {
    const { group, limit = 50 } = args;
    
    let query = 'SELECT b.*, g.name as group_name FROM bookmarks b LEFT JOIN groups g ON b.group_id = g.id WHERE 1=1';
    const params = [];
    
    if (group) {
      const groupStmt = this.db.prepare('SELECT id FROM groups WHERE name = ?');
      const groupData = groupStmt.get(group);
      if (groupData) {
        query += ' AND b.group_id = ?';
        params.push(groupData.id);
      }
    }
    
    query += ' ORDER BY b.created_at DESC LIMIT ?';
    params.push(parseInt(limit));
    
    const stmt = this.db.prepare(query);
    const bookmarks = stmt.all(...params);
    
    return {
      success: true,
      count: bookmarks.length,
      bookmarks: bookmarks.map(b => ({
        id: b.id,
        title: b.title,
        url: b.url,
        description: b.description,
        icon: b.icon,
        group: b.group_name,
        created_at: b.created_at
      }))
    };
  }

  searchBookmarks(args) {
    const { query } = args;
    
    const stmt = this.db.prepare(
      'SELECT b.*, g.name as group_name FROM bookmarks b LEFT JOIN groups g ON b.group_id = g.id WHERE b.title LIKE ? OR b.url LIKE ? OR b.description LIKE ? LIMIT 20'
    );
    const bookmarks = stmt.all(`%${query}%`, `%${query}%`, `%${query}%`);
    
    return {
      success: true,
      query,
      count: bookmarks.length,
      bookmarks: bookmarks.map(b => ({
        id: b.id,
        title: b.title,
        url: b.url,
        description: b.description,
        icon: b.icon,
        group: b.group_name,
        created_at: b.created_at
      }))
    };
  }

  start() {
    try {
      this.initDatabase();
      
      const port = process.env.PORT || 9900;
      this.app.listen(port, '0.0.0.0', () => {
        console.log(`Hubble MCP HTTP Server running on port ${port}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`Access endpoints at: http://localhost:${port}`);
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

// Start server
if (require.main === module) {
  const server = new HubbleHttpMCP();
  try {
    server.start();
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

module.exports = { HubbleHttpMCP };