// ABOUTME: Database initialization using better-sqlite3
// ABOUTME: Sets up basic tables with better performance and reliability

const Database = require('better-sqlite3');

function initializeDatabaseBetterSqlite3(dbPath) {
  console.log('Initializing database schema (better-sqlite3)');
  
  try {
    const db = new Database(dbPath);
    
    // Create groups table
    db.exec(`
      CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT,
        color TEXT,
        description TEXT,
        parent_id TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Groups table created');
    
    // Create bookmarks table
    db.exec(`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        group_id TEXT,
        tags TEXT,
        color TEXT,
        environment TEXT,
        created_by TEXT,
        is_favorite BOOLEAN DEFAULT 0,
        visit_count INTEGER DEFAULT 0,
        click_count INTEGER DEFAULT 0,
        last_visited DATETIME,
        health_status TEXT DEFAULT 'unknown',
        last_health_check DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Bookmarks table created');
    
    // Create analytics table
    db.exec(`
      CREATE TABLE IF NOT EXISTS analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bookmark_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        event_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Analytics table created');
    
    // Create MCP audit table for logging
    db.exec(`
      CREATE TABLE IF NOT EXISTS mcp_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operation TEXT NOT NULL,
        data TEXT,
        success BOOLEAN DEFAULT 1,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('MCP audit table created');
    
    // Insert default group if it doesn't exist
    const insertDefault = db.prepare(`
      INSERT OR IGNORE INTO groups (id, name, icon, description) 
      VALUES (?, ?, ?, ?)
    `);
    insertDefault.run('default', 'Uncategorized', '📁', 'Default group for bookmarks');
    
    console.log('Default group ensured');
    console.log('Database initialized successfully (better-sqlite3)');
    
    return db;
    
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

module.exports = { initializeDatabaseBetterSqlite3 };