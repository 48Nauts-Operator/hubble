// ABOUTME: Simplified MCP-compatible server for Hubble
// ABOUTME: Provides HTTP API endpoints that mimic MCP functionality

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

const app = express();
app.use(cors());
app.use(express.json());

let db;

async function initDatabase() {
  const dbPath = process.env.DATABASE_URL || '/data/hubble.db';
  
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    await db.run('PRAGMA foreign_keys = ON');
    console.log('Connected to database at:', dbPath);
    
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

// MCP-style tool endpoints
app.post('/tools/call', async (req, res) => {
  const { name, arguments: args } = req.body;
  
  try {
    let result;
    
    switch (name) {
      case 'add_bookmark':
        result = await addBookmark(args);
        break;
      case 'list_bookmarks':
        result = await listBookmarks(args);
        break;
      case 'search_bookmarks':
        result = await searchBookmarks(args);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
    
    res.json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

async function addBookmark(args) {
  const { title, url, group = 'default', icon, description, tags = [], environment } = args;
  
  // Find or create group
  let groupData = await db.get('SELECT id FROM groups WHERE name = ? OR id = ?', [group, group]);
  
  if (!groupData) {
    const groupId = group.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await db.run(
      'INSERT INTO groups (id, name) VALUES (?, ?)',
      [groupId, group]
    );
    groupData = { id: groupId };
  }
  
  // Check if URL already exists
  const existing = await db.get('SELECT id FROM bookmarks WHERE url = ?', [url]);
  if (existing) {
    return { message: `Bookmark already exists with ID: ${existing.id}` };
  }
  
  // Generate ID
  const id = Buffer.from(url).toString('base64').replace(/[^a-z0-9]/gi, '').substring(0, 16) + Date.now();
  
  // Insert bookmark
  await db.run(
    `INSERT INTO bookmarks (id, group_id, title, url, description, icon, tags, environment, created_by) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, groupData.id, title, url, description, icon, JSON.stringify(tags), environment, 'mcp']
  );
  
  return { 
    message: 'Bookmark added successfully',
    id,
    title,
    url,
    group
  };
}

async function listBookmarks(args) {
  const { group, environment } = args || {};
  
  let query = 'SELECT b.*, g.name as group_name FROM bookmarks b LEFT JOIN groups g ON b.group_id = g.id WHERE 1=1';
  const params = [];
  
  if (group) {
    const groupData = await db.get('SELECT id FROM groups WHERE name = ? OR id = ?', [group, group]);
    if (groupData) {
      query += ' AND b.group_id = ?';
      params.push(groupData.id);
    }
  }
  
  if (environment) {
    query += ' AND b.environment = ?';
    params.push(environment);
  }
  
  query += ' ORDER BY b.click_count DESC, b.title ASC';
  
  const bookmarks = await db.all(query, params);
  
  // Parse JSON fields
  bookmarks.forEach(b => {
    if (b.tags) {
      try {
        b.tags = JSON.parse(b.tags);
      } catch (e) {
        b.tags = [];
      }
    }
  });
  
  return bookmarks;
}

async function searchBookmarks(args) {
  const { query: searchQuery, limit = 10 } = args;
  
  const bookmarks = await db.all(
    `SELECT b.*, g.name as group_name 
     FROM bookmarks b 
     LEFT JOIN groups g ON b.group_id = g.id
     WHERE b.title LIKE ? OR b.url LIKE ? OR b.description LIKE ?
     ORDER BY b.click_count DESC
     LIMIT ?`,
    [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`, limit]
  );
  
  // Parse JSON fields
  bookmarks.forEach(b => {
    if (b.tags) {
      try {
        b.tags = JSON.parse(b.tags);
      } catch (e) {
        b.tags = [];
      }
    }
  });
  
  return bookmarks;
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'hubble-mcp' });
});

// Start server
const PORT = process.env.PORT || 9900;

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Hubble MCP Server running on port ${PORT}`);
  });
}).catch(console.error);