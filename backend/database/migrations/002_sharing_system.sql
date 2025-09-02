-- Migration: Add Sharing System Tables
-- Version: 002
-- Description: Creates tables for shared views, access logs, personal overlays, and share links

-- Shared Views table
CREATE TABLE IF NOT EXISTS shared_views (
  id TEXT PRIMARY KEY,
  uid VARCHAR(8) UNIQUE NOT NULL,  -- Short, shareable ID
  name VARCHAR(255) NOT NULL,
  description TEXT,
  access_type VARCHAR(20) DEFAULT 'public', -- public, restricted, expiring
  expires_at DATETIME,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  
  -- Content Configuration (JSON)
  included_groups TEXT,  -- JSON array of group IDs
  excluded_groups TEXT,  -- JSON array of group IDs
  included_tags TEXT,    -- JSON array of tags
  environments TEXT,     -- JSON array of environments
  
  -- Permissions (JSON)
  permissions TEXT NOT NULL DEFAULT '{"canAddBookmarks":false,"canEditBookmarks":false,"canDeleteBookmarks":false,"canCreateGroups":false,"canSeeAnalytics":false}',
  
  -- Customization
  theme VARCHAR(20) DEFAULT 'auto',
  layout VARCHAR(20) DEFAULT 'grid',
  branding TEXT,         -- JSON object with title, subtitle, logo, primaryColor
  
  -- Metadata
  created_by VARCHAR(255) DEFAULT 'admin',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at DATETIME
);

-- Access logs for shared views
CREATE TABLE IF NOT EXISTS shared_view_access (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shared_view_id TEXT REFERENCES shared_views(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Personal overlays for shared views
CREATE TABLE IF NOT EXISTS personal_overlays (
  id TEXT PRIMARY KEY,
  shared_view_id TEXT REFERENCES shared_views(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL,
  
  -- Personal data (JSON)
  personal_bookmarks TEXT DEFAULT '[]',  -- JSON array
  personal_groups TEXT DEFAULT '[]',      -- JSON array
  hidden_bookmarks TEXT DEFAULT '[]',     -- JSON array of IDs to hide
  favorite_bookmarks TEXT DEFAULT '[]',   -- JSON array of favorite IDs
  custom_tags TEXT DEFAULT '{}',          -- JSON object
  
  -- Preferences
  view_mode VARCHAR(20) DEFAULT 'grid',
  sort_preference VARCHAR(50) DEFAULT 'name',
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(shared_view_id, session_id)
);

-- Shareable links tracking
CREATE TABLE IF NOT EXISTS share_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shared_view_id TEXT REFERENCES shared_views(id) ON DELETE CASCADE,
  full_url TEXT NOT NULL,    -- Complete shareable URL
  short_code VARCHAR(20),     -- Optional short code
  click_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shared_views_uid ON shared_views(uid);
CREATE INDEX IF NOT EXISTS idx_shared_views_created_by ON shared_views(created_by);
CREATE INDEX IF NOT EXISTS idx_shared_view_access_session ON shared_view_access(session_id);
CREATE INDEX IF NOT EXISTS idx_personal_overlays_session ON personal_overlays(shared_view_id, session_id);
CREATE INDEX IF NOT EXISTS idx_share_links_short_code ON share_links(short_code);

-- Default shared view for demo/testing
INSERT INTO shared_views (id, uid, name, description, included_groups, permissions)
VALUES (
  'default-share-demo',
  'demo2024',
  'Demo Shared View',
  'Example shared view for testing',
  '["general-1756640702271"]',
  '{"canAddBookmarks":true,"canEditBookmarks":false,"canDeleteBookmarks":false,"canCreateGroups":false,"canSeeAnalytics":false}'
) ON CONFLICT(id) DO NOTHING;