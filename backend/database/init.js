// ABOUTME: Database initialization and schema creation
// ABOUTME: Sets up tables for bookmarks, groups, and analytics

const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

// Secure migration system with validation
async function runSecureMigrations(db) {
  // Create migrations tracking table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Define known safe migrations with checksums for integrity validation
  const migrations = [
    {
      version: '002_sharing_system',
      filename: '002_sharing_system.sql',
      expectedChecksum: null, // Will be calculated on first run
      description: 'Sharing system tables'
    },
    {
      version: '003_auth_system',
      filename: '003_auth_system.sql',
      expectedChecksum: null, // Will be calculated on first run
      description: 'Authentication system tables'
    }
  ];

  for (const migration of migrations) {
    try {
      // Check if migration was already applied
      const existing = await db.get(
        'SELECT checksum FROM schema_migrations WHERE version = ?',
        migration.version
      );

      const migrationPath = path.join(__dirname, 'migrations', migration.filename);

      // Validate file exists and is within expected directory
      const resolvedPath = path.resolve(migrationPath);
      const migrationsDir = path.resolve(__dirname, 'migrations');
      if (!resolvedPath.startsWith(migrationsDir)) {
        throw new Error(`Invalid migration path: ${migration.filename}`);
      }

      let migrationSQL;
      try {
        migrationSQL = await fs.readFile(resolvedPath, 'utf8');
      } catch (error) {
        if (error.code === 'ENOENT') {
          console.warn(`Migration file not found: ${migration.filename}`);
          continue;
        }
        throw error;
      }

      // Calculate checksum for integrity validation
      const checksum = crypto.createHash('sha256').update(migrationSQL, 'utf8').digest('hex');

      if (existing) {
        // Verify checksum hasn't changed (prevents tampering)
        if (existing.checksum !== checksum) {
          console.warn(`Migration ${migration.version} checksum mismatch - skipping for safety`);
          continue;
        }
        console.log(`Migration ${migration.version} already applied`);
        continue;
      }

      // Validate SQL contains only safe operations (basic validation)
      if (migrationSQL.includes('PRAGMA') || migrationSQL.includes('.import') ||
          migrationSQL.includes('.read') || migrationSQL.includes('ATTACH')) {
        throw new Error(`Unsafe SQL operations detected in ${migration.filename}`);
      }

      // Apply migration
      await db.exec(migrationSQL);

      // Record successful migration
      await db.run(
        'INSERT INTO schema_migrations (version, checksum) VALUES (?, ?)',
        migration.version,
        checksum
      );

      console.log(`Applied migration: ${migration.version} - ${migration.description}`);

    } catch (error) {
      console.error(`Migration ${migration.version} failed:`, error.message);
      // Continue with other migrations rather than failing completely
    }
  }
}

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
  
  // Create comprehensive indices for better performance
  const indexes = [
    // Bookmark indexes for common queries
    `CREATE INDEX IF NOT EXISTS idx_bookmarks_group ON bookmarks(group_id)`,
    `CREATE INDEX IF NOT EXISTS idx_bookmarks_favorite ON bookmarks(is_favorite)`,
    `CREATE INDEX IF NOT EXISTS idx_bookmarks_url ON bookmarks(url)`, // For duplicate detection
    `CREATE INDEX IF NOT EXISTS idx_bookmarks_external_url ON bookmarks(external_url)`, // For duplicate detection
    `CREATE INDEX IF NOT EXISTS idx_bookmarks_title ON bookmarks(title)`, // For search
    `CREATE INDEX IF NOT EXISTS idx_bookmarks_environment ON bookmarks(environment)`, // For filtering
    `CREATE INDEX IF NOT EXISTS idx_bookmarks_health_status ON bookmarks(health_status)`, // For health monitoring
    `CREATE INDEX IF NOT EXISTS idx_bookmarks_click_count ON bookmarks(click_count DESC)`, // For ordering by popularity
    `CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON bookmarks(created_at)`, // For chronological ordering
    `CREATE INDEX IF NOT EXISTS idx_bookmarks_updated_at ON bookmarks(updated_at)`, // For recent updates
    `CREATE INDEX IF NOT EXISTS idx_bookmarks_last_health_check ON bookmarks(last_health_check)`, // For health monitoring

    // Group indexes
    `CREATE INDEX IF NOT EXISTS idx_groups_parent ON groups(parent_id)`,
    `CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name)`, // For searching groups
    `CREATE INDEX IF NOT EXISTS idx_groups_sort_order ON groups(sort_order)`, // For ordering
    `CREATE INDEX IF NOT EXISTS idx_groups_created_at ON groups(created_at)`,

    // Analytics indexes
    `CREATE INDEX IF NOT EXISTS idx_analytics_bookmark ON analytics(bookmark_id)`,
    `CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics(event_type)`, // For filtering by event type
    `CREATE INDEX IF NOT EXISTS idx_analytics_bookmark_event ON analytics(bookmark_id, event_type)`, // Composite for common queries

    // Composite indexes for common query patterns
    `CREATE INDEX IF NOT EXISTS idx_bookmarks_group_environment ON bookmarks(group_id, environment)`,
    `CREATE INDEX IF NOT EXISTS idx_bookmarks_group_created ON bookmarks(group_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_bookmarks_health_last_check ON bookmarks(health_status, last_health_check)`,

    // Full-text search indexes (if FTS is enabled)
    `CREATE INDEX IF NOT EXISTS idx_bookmarks_search_title ON bookmarks(title COLLATE NOCASE)`,
    `CREATE INDEX IF NOT EXISTS idx_bookmarks_search_description ON bookmarks(description COLLATE NOCASE)`
  ];

  // Create all indexes with error handling
  for (const indexSQL of indexes) {
    try {
      await db.exec(indexSQL);
    } catch (e) {
      console.warn(`Index creation warning: ${e.message}`);
    }
  }
  
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

  // Run migrations with validation
  await runSecureMigrations(db);

  // Create indexes for sharing system tables (from migrations)
  const sharingIndexes = [
    `CREATE INDEX IF NOT EXISTS idx_shared_views_uid ON shared_views(uid)`, // Critical for public access
    `CREATE INDEX IF NOT EXISTS idx_shared_views_created_at ON shared_views(created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_shared_views_expires_at ON shared_views(expires_at)`,
    `CREATE INDEX IF NOT EXISTS idx_shared_views_access_type ON shared_views(access_type)`,
    `CREATE INDEX IF NOT EXISTS idx_shared_view_access_shared_view_id ON shared_view_access(shared_view_id)`,
    `CREATE INDEX IF NOT EXISTS idx_shared_view_access_accessed_at ON shared_view_access(accessed_at)`,
    `CREATE INDEX IF NOT EXISTS idx_shared_view_access_ip_address ON shared_view_access(ip_address)`,
    `CREATE INDEX IF NOT EXISTS idx_personal_overlays_session_id ON personal_overlays(session_id)`,
    `CREATE INDEX IF NOT EXISTS idx_personal_overlays_shared_view_id ON personal_overlays(shared_view_id)`,
    `CREATE INDEX IF NOT EXISTS idx_auth_sessions_token_hash ON auth_sessions(token_hash)`, // Critical for auth lookups
    `CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at)`,
    `CREATE INDEX IF NOT EXISTS idx_auth_attempts_ip_address ON auth_attempts(ip_address)`,
    `CREATE INDEX IF NOT EXISTS idx_auth_attempts_blocked_until ON auth_attempts(blocked_until)`
  ];

  // Create sharing system indexes
  for (const indexSQL of sharingIndexes) {
    try {
      await db.exec(indexSQL);
    } catch (e) {
      console.warn(`Sharing index creation warning: ${e.message}`);
    }
  }

  console.log('Database initialized successfully');
}

module.exports = { initializeDatabase };