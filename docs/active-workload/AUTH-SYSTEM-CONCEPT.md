# 🔐 Hubble Authentication System Concept

## Overview
Hubble needs a simple but secure authentication system to protect the main dashboard while keeping shared views publicly accessible.

## Proposed Solution: Simple Token-Based Auth

### Why This Approach?
- **No Complex User Management** - Single admin/owner concept
- **Easy Setup** - One-time configuration during first run
- **Secure** - Uses industry-standard JWT tokens
- **Lightweight** - No external auth providers needed
- **Developer-Friendly** - Can be easily disabled for local development

## Implementation Design

### 1. Initial Setup (First Run)
```yaml
When Hubble starts for the first time:
1. Check if auth is configured
2. If not, show setup screen:
   - Set admin password
   - Optional: Set admin email
   - Generate secure JWT secret
   - Save to .env file
3. Redirect to login
```

### 2. Authentication Flow
```yaml
Login:
1. User enters password (no username needed for single-user)
2. Server validates password (bcrypt)
3. Returns JWT token (24h expiry)
4. Frontend stores token in localStorage
5. All API calls include token in header

Protected Routes:
- / (main dashboard)
- /settings
- /version
- All API endpoints except /api/public/*

Public Routes:
- /share/:uid (shared views)
- /login
- /api/public/* (public API endpoints)
```

### 3. Environment Configuration
```env
# .env file (auto-generated on first run)
AUTH_ENABLED=true
ADMIN_PASSWORD_HASH=$2b$10$... (bcrypt hash)
JWT_SECRET=<random-64-char-string>
JWT_EXPIRY=24h
SESSION_TIMEOUT=30m (auto-logout after inactivity)
```

### 4. Optional Features

#### A. Remember Me
- Extended JWT expiry (30 days)
- Refresh token mechanism

#### B. API Keys (Future)
- Generate API keys for MCP/programmatic access
- Separate from web auth

#### C. Quick Toggle for Development
```bash
# Disable auth for local development
AUTH_ENABLED=false npm run dev
```

## Security Features

### 1. Password Requirements
- Minimum 8 characters
- At least one number
- At least one special character
- Not in common password list

### 2. Rate Limiting
- Max 5 login attempts per minute
- Progressive delay after failed attempts
- IP-based tracking

### 3. Session Management
- Auto-logout after inactivity
- "Logout everywhere" option
- Session indicator in UI

### 4. Security Headers
- CORS properly configured
- CSP headers
- X-Frame-Options: DENY
- Secure cookie flags

## UI/UX Design

### Login Page
```
┌─────────────────────────────────┐
│         🔭 Hubble               │
│   Intelligent Bookmark Dashboard │
│                                 │
│   ┌─────────────────────────┐   │
│   │ Password: ************  │   │
│   └─────────────────────────┘   │
│                                 │
│   [ ] Remember me for 30 days   │
│                                 │
│   [     Login     ]             │
│                                 │
│   Forgot password? → Reset      │
└─────────────────────────────────┘
```

### First-Time Setup
```
┌─────────────────────────────────┐
│      Welcome to Hubble! 🎉      │
│                                 │
│   Let's secure your dashboard   │
│                                 │
│   Set Admin Password:           │
│   ┌─────────────────────────┐   │
│   │ ******************      │   │
│   └─────────────────────────┘   │
│                                 │
│   Confirm Password:             │
│   ┌─────────────────────────┐   │
│   │ ******************      │   │
│   └─────────────────────────┘   │
│                                 │
│   Email (optional):             │
│   ┌─────────────────────────┐   │
│   │ admin@example.com       │   │
│   └─────────────────────────┘   │
│                                 │
│   [   Secure Hubble   ]         │
└─────────────────────────────────┘
```

### Authenticated State
- Small lock icon in header showing auth status
- User menu with logout option
- Session timer (optional)

## Database Schema

```sql
-- auth_config table (single row)
CREATE TABLE auth_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  password_hash TEXT NOT NULL,
  email TEXT,
  jwt_secret TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CHECK (id = 1) -- Ensure only one row
);

-- auth_sessions table (track active sessions)
CREATE TABLE auth_sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT
);

-- auth_attempts table (rate limiting)
CREATE TABLE auth_attempts (
  ip_address TEXT PRIMARY KEY,
  attempts INTEGER DEFAULT 0,
  last_attempt DATETIME DEFAULT CURRENT_TIMESTAMP,
  blocked_until DATETIME
);
```

## Implementation Steps

### Phase 1: Basic Auth (MVP)
1. ✅ Create auth database tables
2. ✅ Build first-time setup flow
3. ✅ Implement login page
4. ✅ Add JWT middleware to backend
5. ✅ Protect frontend routes
6. ✅ Add logout functionality

### Phase 2: Enhanced Security
1. ⏳ Add rate limiting
2. ⏳ Implement session management
3. ⏳ Add "forgot password" flow
4. ⏳ Security headers

### Phase 3: Advanced Features
1. ⏳ API key generation
2. ⏳ Two-factor authentication (TOTP)
3. ⏳ Audit logging

## Alternative Approaches Considered

### 1. OAuth2/Social Login
- ❌ Too complex for single-user setup
- ❌ Requires external dependencies
- ❌ Overkill for bookmark manager

### 2. Basic Auth (HTTP)
- ❌ Less secure
- ❌ Poor UX (browser popup)
- ❌ No session management

### 3. Passkey/WebAuthn
- ❌ Requires HTTPS
- ❌ Complex setup
- ❌ Not all browsers support

### 4. Magic Links
- ❌ Requires email setup
- ❌ Slower login process
- ❌ Not ideal for frequent access

## Environment Variables

```bash
# Development (no auth)
AUTH_ENABLED=false

# Production (with auth)
AUTH_ENABLED=true
ADMIN_PASSWORD_HASH=$2b$10$...
JWT_SECRET=your-secret-key-min-64-chars
JWT_EXPIRY=24h
SESSION_TIMEOUT=30m
```

## Benefits

1. **Simple Setup** - One password, done
2. **Secure** - Industry-standard JWT + bcrypt
3. **Flexible** - Easy to disable for development
4. **Lightweight** - No external services needed
5. **Future-Proof** - Can add OAuth2 later if needed

## Conclusion

This approach provides the right balance of security and simplicity for Hubble:
- Protects the main dashboard
- Keeps shared links public
- Easy one-time setup
- No user management complexity
- Developer-friendly with auth toggle

The implementation is straightforward and can be completed in a single sprint while maintaining the rapid development philosophy of the project.