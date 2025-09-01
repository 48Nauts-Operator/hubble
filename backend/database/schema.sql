-- ABOUTME: Database schema for Hubble bookmark dashboard
-- ABOUTME: Defines groups, bookmarks, analytics, and audit tables

-- Groups table for hierarchical organization
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  parent_id TEXT,
  icon TEXT,
  description TEXT,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES groups(id) ON DELETE CASCADE
);

-- Bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  group_id TEXT,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  tags TEXT, -- JSON array
  color TEXT,
  environment TEXT CHECK(environment IN ('development', 'uat', 'production', 'staging')),
  health_status TEXT DEFAULT 'unknown' CHECK(health_status IN ('up', 'down', 'unknown')),
  last_health_check DATETIME,
  click_count INTEGER DEFAULT 0,
  last_accessed DATETIME,
  created_by TEXT CHECK(created_by IN ('mcp', 'user', 'docker', 'import')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT, -- JSON object
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
);

-- Analytics table for tracking events
CREATE TABLE IF NOT EXISTS analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bookmark_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK(event_type IN ('click', 'health_check', 'update', 'create', 'delete')),
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT, -- JSON object with additional event data
  FOREIGN KEY (bookmark_id) REFERENCES bookmarks(id) ON DELETE CASCADE
);

-- MCP audit log for tracking MCP operations
CREATE TABLE IF NOT EXISTS mcp_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  bookmark_id TEXT,
  changes TEXT, -- JSON diff of changes
  source TEXT, -- Which MCP client/project
  status TEXT CHECK(status IN ('success', 'failure')),
  error_message TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table for managing user sessions
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  data TEXT, -- JSON session data
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bookmarks_group ON bookmarks(group_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_url ON bookmarks(url);
CREATE INDEX IF NOT EXISTS idx_bookmarks_environment ON bookmarks(environment);
CREATE INDEX IF NOT EXISTS idx_bookmarks_health ON bookmarks(health_status);
CREATE INDEX IF NOT EXISTS idx_groups_parent ON groups(parent_id);
CREATE INDEX IF NOT EXISTS idx_analytics_bookmark ON analytics(bookmark_id);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_mcp_audit_timestamp ON mcp_audit(timestamp);

-- Trigger to update the updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_groups_timestamp 
AFTER UPDATE ON groups
BEGIN
  UPDATE groups SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_bookmarks_timestamp 
AFTER UPDATE ON bookmarks
BEGIN
  UPDATE bookmarks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Insert default groups
INSERT OR IGNORE INTO groups (id, name, icon, description, color, sort_order) VALUES
  ('default', 'Uncategorized', '📁', 'Default group for uncategorized bookmarks', '#6b7280', 999);

-- Create view for bookmark statistics
CREATE VIEW IF NOT EXISTS bookmark_stats AS
SELECT 
  b.id,
  b.title,
  b.url,
  b.click_count,
  b.health_status,
  g.name as group_name,
  COUNT(a.id) as total_events,
  MAX(a.timestamp) as last_event
FROM bookmarks b
LEFT JOIN groups g ON b.group_id = g.id
LEFT JOIN analytics a ON b.id = a.bookmark_id
GROUP BY b.id;