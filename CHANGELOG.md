# Changelog

## [1.3.1] - 2025-01-13

### 🚨 BREAKING CHANGE - MCP Users Must Update Configuration

#### The Problem
If you're using Hubble with Claude Desktop's MCP integration, your bookmarks were being saved to the wrong database (`/tmp/hubble.db`) instead of the main Hubble database. This caused bookmarks added via MCP to not appear in the web interface.

#### The Fix
We've fixed the database path issue and consolidated to a single database. However, **you must update your Claude Desktop configuration**.

#### Migration Steps (Required for MCP Users)

1. **Remove the old configuration:**
   ```bash
   claude mcp remove hubble
   ```

2. **Add the fixed configuration:**
   ```bash
   HUBBLE_DB_PATH="/home/jarvis/projects/Hubble/data/hubble.db" \
     claude mcp add hubble -s user -- \
     node /home/jarvis/projects/Hubble/mcp-server/mcp-stdio.js
   ```

3. **Restart Claude Desktop**

#### What This Fixes
- ✅ Bookmarks added via MCP now appear in the web interface
- ✅ No more split-brain database issues
- ✅ Single source of truth for all bookmarks
- ✅ Consistent behavior across all access methods

### Changed
- Fixed `mcp-stdio.js` to use correct database path
- Removed dangerous fallback database paths
- Consolidated multiple MCP server instances

### Security
- Fixed IPv6 rate limiting validation errors
- Enhanced rate limiting middleware with proper IP handling

### Documentation
- Added clear MCP configuration update instructions
- Created migration guide for affected users
- Documented the root cause and prevention steps

## 2025-01-03 – security: comprehensive vulnerability fixes, rate limiting, validation optimization, 3 bugs resolved
## 2025-01-03 – fix: settings.json syntax, discovery: analyzed Docker capabilities, hook troubleshooting