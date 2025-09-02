// ABOUTME: Database initialization and schema creation
// ABOUTME: Sets up tables for bookmarks, groups, and analytics

const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

async function initializeDatabase(db) {
  console.log('Initializing database schema');
  
  // Create groups table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT,
      color TEXT,
      parent_id TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES groups(id) ON DELETE CASCADE
    )
  `);
  
  // Create bookmarks table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      group_id TEXT,
      tags TEXT,
      is_favorite BOOLEAN DEFAULT 0,
      visit_count INTEGER DEFAULT 0,
      last_visited DATETIME,
      health_status TEXT DEFAULT 'unknown',
      last_health_check DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL
    )
  `);
  
  // Create analytics table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bookmark_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      event_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bookmark_id) REFERENCES bookmarks(id) ON DELETE CASCADE
    )
  `);
  
  // Create indices for better performance
  try {
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_bookmarks_group ON bookmarks(group_id)`);
  } catch (e) {}
  try {
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_bookmarks_favorite ON bookmarks(is_favorite)`);
  } catch (e) {}
  try {
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_groups_parent ON groups(parent_id)`);
  } catch (e) {}
  try {
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_analytics_bookmark ON analytics(bookmark_id)`);
  } catch (e) {}
  try {
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics(created_at)`);
  } catch (e) {}
  
  // Add missing columns if they don't exist
  try {
    await db.exec(`ALTER TABLE groups ADD COLUMN sort_order INTEGER DEFAULT 0`);
  } catch (error) {
    // Column might already exist, ignore error
  }
  
  try {
    await db.exec(`ALTER TABLE groups ADD COLUMN description TEXT`);
  } catch (error) {
    // Column might already exist, ignore error
  }
  
  try {
    await db.exec(`ALTER TABLE bookmarks ADD COLUMN color TEXT`);
  } catch (error) {
    // Column might already exist, ignore error
  }
  
  try {
    await db.exec(`ALTER TABLE bookmarks ADD COLUMN environment TEXT`);
  } catch (error) {
    // Column might already exist, ignore error
  }
  
  try {
    await db.exec(`ALTER TABLE bookmarks ADD COLUMN created_by TEXT`);
  } catch (error) {
    // Column might already exist, ignore error
  }
  
  try {
    await db.exec(`ALTER TABLE bookmarks ADD COLUMN click_count INTEGER DEFAULT 0`);
  } catch (error) {
    // Column might already exist, ignore error
  }

  try {
    await db.exec(`ALTER TABLE bookmarks ADD COLUMN internal_url TEXT`);
  } catch (error) {
    // Column might already exist, ignore error
  }
  
  try {
    await db.exec(`ALTER TABLE bookmarks ADD COLUMN external_url TEXT`);
  } catch (error) {
    // Column might already exist, ignore error
  }
  
  try {
    await db.exec(`ALTER TABLE bookmarks ADD COLUMN auto_discovered BOOLEAN DEFAULT 0`);
  } catch (error) {
    // Column might already exist, ignore error
  }
  
  try {
    await db.exec(`ALTER TABLE bookmarks ADD COLUMN metadata TEXT`);
  } catch (error) {
    // Column might already exist, ignore error
  }
  
  // Migrate existing URL data to external_url for backward compatibility
  try {
    await db.exec(`UPDATE bookmarks SET external_url = url WHERE external_url IS NULL`);
  } catch (error) {
    // Ignore errors if migration has already been run
  }

  // Run migrations
  const fs = require('fs').promises;
  const path = require('path');
  
  // Run sharing system migration
  try {
    const migrationPath = path.join(__dirname, 'migrations', '002_sharing_system.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    await db.exec(migrationSQL);
    console.log('Sharing system migration applied');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.log('Sharing system migration error (may already exist):', error.message);
    }
  }

  // Run auth system migration
  try {
    const authMigrationPath = path.join(__dirname, 'migrations', '003_auth_system.sql');
    const authMigrationSQL = await fs.readFile(authMigrationPath, 'utf8');
    await db.exec(authMigrationSQL);
    console.log('Auth system migration applied');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.log('Auth system migration error (may already exist):', error.message);
    }
  }

  console.log('Database initialized successfully');
}

module.exports = { initializeDatabase };