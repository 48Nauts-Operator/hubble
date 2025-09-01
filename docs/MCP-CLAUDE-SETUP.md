# Adding Hubble MCP Server to Claude

## Quick Setup

To add the Hubble MCP server to Claude, run this command:

```bash
claude mcp add hubble -s user -- node /home/jarvis/projects/Hubble/mcp-server/mcp-stdio.js
```

## Available MCP Tools

Once added, you'll have access to these Hubble tools in Claude:

### 1. `hubble_add_bookmark`
Add a new bookmark to your Hubble dashboard.

**Example:**
```
Add this to Hubble: Betty API at http://localhost:3034 in the Betty project group with the robot emoji
```

**Parameters:**
- `title` (required): Bookmark title
- `url` (required): Bookmark URL
- `group`: Group name (default: "Uncategorized")
- `icon`: Emoji or icon
- `description`: Description text
- `tags`: Array of tags
- `environment`: "development", "staging", or "production"

### 2. `hubble_list_bookmarks`
List bookmarks with optional filters.

**Example:**
```
Show me all bookmarks in the Betty group
List development environment bookmarks
```

**Parameters:**
- `group`: Filter by group name
- `environment`: Filter by environment
- `limit`: Maximum results (default: 20)

### 3. `hubble_search_bookmarks`
Search bookmarks by title, URL, or description.

**Example:**
```
Search Hubble for API endpoints
Find bookmarks containing "dashboard"
```

**Parameters:**
- `query` (required): Search text
- `limit`: Maximum results (default: 10)

### 4. `hubble_delete_bookmark`
Remove a bookmark from Hubble.

**Example:**
```
Delete bookmark with ID hub-1234567890-abc123
```

**Parameters:**
- `id` (required): Bookmark ID

### 5. `hubble_list_groups`
List all bookmark groups with counts.

**Example:**
```
Show me all Hubble groups
List bookmark categories
```

## Usage Examples in Claude

### Adding Project Bookmarks
```
"Add these to Hubble:
- Betty Frontend at http://localhost:3377 in Betty group with 🎨 icon
- Betty API at http://localhost:3034 in Betty group with 🔌 icon  
- Both are development environment"
```

### Searching and Listing
```
"Search Hubble for all API endpoints"
"List all production bookmarks"
"Show me everything in the DevOps group"
```

### Managing Bookmarks
```
"List all Hubble groups to see what's available"
"Delete the old staging server bookmark"
```

## Database Location

The MCP server uses SQLite database at:
- Default: `/home/jarvis/projects/Hubble/data/hubble.db`
- Can override with: `HUBBLE_DB_PATH` environment variable

## Troubleshooting

### If MCP server doesn't start:
1. Check Node.js is installed: `node --version`
2. Install dependencies: `cd /home/jarvis/projects/Hubble/mcp-server && npm install`
3. Check database permissions: `ls -la /home/jarvis/projects/Hubble/data/`

### To test the MCP server manually:
```bash
node /home/jarvis/projects/Hubble/mcp-server/mcp-stdio.js
```

### To remove from Claude:
```bash
claude mcp remove hubble
```

### To update after changes:
```bash
claude mcp update hubble
```

## Integration with Web Dashboard

Bookmarks added via MCP will automatically appear in the Hubble web dashboard at:
- Local: http://localhost:8888
- Production: https://hubble.blockonauts.io (when configured)

The MCP server shares the same SQLite database as the web application, so all changes are immediately reflected in both interfaces.

## Advanced Configuration

### Custom Database Path
```bash
HUBBLE_DB_PATH=/custom/path/hubble.db claude mcp add hubble -s user -- node /home/jarvis/projects/Hubble/mcp-server/mcp-stdio.js
```

### Using with Docker
If Hubble is running in Docker, ensure the database volume is accessible:
```bash
claude mcp add hubble -s user -- node /home/jarvis/projects/Hubble/mcp-server/mcp-stdio.js
```

## Features

- ✅ Add bookmarks with groups, tags, and environments
- ✅ Search across all bookmarks
- ✅ Filter by group or environment
- ✅ Automatic group creation
- ✅ Duplicate URL detection
- ✅ Click tracking (when used with web UI)
- ✅ Shared database with web dashboard

## Notes

- All bookmark IDs start with "hub-" for easy identification
- Groups are created automatically when adding bookmarks
- The default group "Uncategorized" is always available
- URLs must be unique - duplicates are prevented
- All changes sync immediately with the web dashboard