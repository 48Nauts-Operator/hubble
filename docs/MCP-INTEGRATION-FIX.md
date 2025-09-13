# MCP Integration Fix Documentation

## Problem Identified
The Hubble project had two separate MCP servers running:

1. **Docker MCP Server** (Port 9900)
   - Running in container `hubble-mcp`
   - Uses database: `/data/hubble.db` (mapped to `/home/jarvis/projects/Hubble/data/hubble.db`)
   - This is the CORRECT server that integrates with the main application

2. **Standalone MCP Server** (`mcp-stdio.js`)
   - Running as separate process via Claude Desktop
   - Was using database: `/tmp/hubble.db`
   - This was causing the split-brain issue

## Root Cause
- The `mcp-stdio.js` file was created as a "fixed" version but was misconfigured
- It had fallback database paths that defaulted to `/tmp/hubble.db` when the main database wasn't accessible
- Claude Desktop was configured to use this standalone server instead of the Docker one

## Fix Applied

### 1. Updated `mcp-stdio.js` Database Path
Changed from multiple fallback paths to single authoritative path:
```javascript
// BEFORE - Multiple fallback paths including /tmp
const possiblePaths = [
  process.env.HUBBLE_DB_PATH,
  '/home/jarvis/projects/Hubble/data/hubble.db',
  path.join(__dirname, '../data/hubble.db'),
  path.join(process.cwd(), 'hubble.db'),
  '/tmp/hubble.db'  // THIS WAS THE PROBLEM
].filter(Boolean);

// AFTER - Single authoritative path
const possiblePaths = [
  process.env.HUBBLE_DB_PATH || '/home/jarvis/projects/Hubble/data/hubble.db'
].filter(Boolean);
```

### 2. Killed Duplicate Processes
- Terminated all standalone `mcp-stdio.js` processes
- These should not be running alongside the Docker container

## Correct Configuration

### For Docker Environment (RECOMMENDED)
The MCP server should run as part of the Docker stack:
- Container: `hubble-mcp`
- Port: 9900
- Database: `/data/hubble.db` (shared with backend)

### For Claude Desktop Integration
If you need Claude to interact with Hubble MCP, configure it to connect to the Docker server:
```json
{
  "mcpServers": {
    "hubble": {
      "command": "curl",
      "args": ["-X", "POST", "http://hubble.blockonauts.io:9900/mcp"],
      "env": {
        "HUBBLE_API_URL": "http://hubble.blockonauts.io:8889"
      }
    }
  }
}
```

## Verification Steps
1. Check only Docker MCP is running: `docker ps | grep hubble-mcp`
2. Verify no standalone processes: `ps aux | grep mcp-stdio | grep -v grep`
3. Confirm single database: All bookmarks in `/home/jarvis/projects/Hubble/data/hubble.db`
4. Test MCP operations point to correct database

## Prevention
- Remove or rename `mcp-stdio.js` to prevent accidental usage
- Document that MCP should ONLY run via Docker
- Add environment check to prevent database path fallbacks