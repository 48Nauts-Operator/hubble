# Claude Code MCP Configuration Update

## Required Update
You need to update your Claude Code MCP configuration to use the fixed database path.

## Update Instructions

### Option 1: Use the Fixed mcp-stdio.js (Recommended)
Add this to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "hubble": {
      "command": "node",
      "args": ["/home/jarvis/projects/Hubble/mcp-server/mcp-stdio.js"],
      "env": {
        "HUBBLE_DB_PATH": "/home/jarvis/projects/Hubble/data/hubble.db"
      }
    }
  }
}
```

### Option 2: Connect to Docker MCP Server
If you want to use the Docker-based MCP server (port 9900):

```json
{
  "mcpServers": {
    "hubble": {
      "command": "node",
      "args": ["/home/jarvis/projects/Hubble/mcp-server/index.js"],
      "env": {
        "DATABASE_URL": "/home/jarvis/projects/Hubble/data/hubble.db",
        "PORT": "9900"
      }
    }
  }
}
```

## How to Apply the Update

1. **Remove the old Hubble MCP** from Claude:
   ```bash
   claude mcp remove hubble
   ```

2. **Add the updated configuration**:
   ```bash
   claude mcp add hubble -s user -- node /home/jarvis/projects/Hubble/mcp-server/mcp-stdio.js
   ```

   Or manually edit your Claude config file and add the JSON above.

3. **Set the environment variable** (important!):
   ```bash
   export HUBBLE_DB_PATH="/home/jarvis/projects/Hubble/data/hubble.db"
   ```

4. **Restart Claude Code** to apply the changes

## Verification

After updating, test that bookmarks are going to the correct database:

1. Add a test bookmark via MCP:
   ```
   mcp__hubble__hubble_add_bookmark(title: "Test", url: "https://test.com", group: "Test")
   ```

2. Check it appears in the web interface at https://hubble.blockonauts.io

3. Verify it's in the main database:
   ```bash
   docker exec hubble-backend sqlite3 /data/hubble.db "SELECT title FROM bookmarks WHERE title='Test';"
   ```

## Important Notes

- **DO NOT** use the old configuration that doesn't specify `HUBBLE_DB_PATH`
- The old config was using `/tmp/hubble.db` which is the wrong database
- All Claude Code instances need this update to work correctly
- The Docker MCP server (port 9900) always uses the correct database