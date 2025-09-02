-- Authentication System Migration
-- Creates tables for auth configuration, sessions, and rate limiting

-- Auth configuration table (single row for admin config)
CREATE TABLE IF NOT EXISTS auth_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  password_hash TEXT NOT NULL,
  email TEXT,
  jwt_secret TEXT NOT NULL,
  setup_completed BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CHECK (id = 1) -- Ensure only one row exists
);

-- Active sessions tracking
CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT
);

-- Rate limiting for login attempts
CREATE TABLE IF NOT EXISTS auth_attempts (
  ip_address TEXT PRIMARY KEY,
  attempts INTEGER DEFAULT 0,
  last_attempt DATETIME DEFAULT CURRENT_TIMESTAMP,
  blocked_until DATETIME
);

-- Index for session cleanup
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON auth_sessions(expires_at);

-- Index for finding active sessions
CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(token_hash);