#!/usr/bin/env node

// ABOUTME: Fixed MCP STDIO server for Hubble that works with Claude
// ABOUTME: Can be added via: claude mcp add hubble -s user -- node /home/jarvis/projects/Hubble/mcp-server/mcp-stdio-fixed.js

const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

class HubbleStdioMCP {
  constructor() {
    this.db = null;
    this.requestId = 0;
  }

  async initDatabase() {
    // Try multiple possible database locations
    const possiblePaths = [
      process.env.HUBBLE_DB_PATH,
      '/home/jarvis/projects/Hubble/data/hubble.db',
      path.join(__dirname, '../data/hubble.db'),
      path.join(process.cwd(), 'hubble.db'),
      '/tmp/hubble.db'
    ].filter(Boolean);

    let dbPath = null;
    for (const testPath of possiblePaths) {
      try {
        const dir = path.dirname(testPath);
        require('fs').mkdirSync(dir, { recursive: true });
        this.db = await open({
          filename: testPath,
          driver: sqlite3.Database
        });
        await this.db.run('PRAGMA foreign_keys = ON');
        await this.ensureSchema();
        dbPath = testPath;
        break;
      } catch (error) {
        // Try next path
        continue;
      }
    }

    if (!this.db) {
      throw new Error('Could not connect to database');
    }

    this.logError(`Hubble MCP connected to database: ${dbPath}`);
  }

  async ensureSchema() {
    // Create groups table
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        parent_id TEXT,
        icon TEXT,
        description TEXT,
        color TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create bookmarks table
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id TEXT PRIMARY KEY,
        group_id TEXT,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        tags TEXT,
        environment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES groups(id)
      )
    `);

    // Ensure default group
    await this.db.run(
      `INSERT OR IGNORE INTO groups (id, name, icon, description) 
       VALUES ('default', 'Uncategorized', '📁', 'Default group for bookmarks')`
    );
  }

  logError(message) {
    process.stderr.write(`[Hubble MCP] ${message}\n`);
  }

  sendResponse(id, result) {
    const response = {
      jsonrpc: '2.0',
      id: id,
      result: result
    };
    process.stdout.write(JSON.stringify(response) + '\n');
  }

  sendError(id, error) {
    const response = {
      jsonrpc: '2.0',
      id: id,
      error: {
        code: -1,
        message: error.message || error.toString()
      }
    };
    process.stdout.write(JSON.stringify(response) + '\n');
  }

  async handleRequest(request) {
    const { method, id, params } = request;

    try {
      switch (method) {
        case 'initialize':
          return this.sendResponse(id, {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: 'hubble-mcp',
              version: '1.0.0'
            }
          });

        case 'tools/list':
          return this.sendResponse(id, {
            tools: [
              {
                name: 'hubble_add_bookmark',
                description: 'Add a new bookmark to Hubble',
                inputSchema: {
                  type: 'object',
                  properties: {
                    title: { type: 'string', description: 'Bookmark title' },
                    url: { type: 'string', description: 'Bookmark URL' },
                    group: { type: 'string', description: 'Group name' },
                    description: { type: 'string', description: 'Description' },
                    icon: { type: 'string', description: 'Icon emoji' }
                  },
                  required: ['title', 'url']
                }
              },
              {
                name: 'hubble_list_bookmarks',
                description: 'List all bookmarks in Hubble',
                inputSchema: {
                  type: 'object',
                  properties: {
                    group: { type: 'string', description: 'Filter by group' },
                    limit: { type: 'number', description: 'Max results' }
                  }
                }
              },
              {
                name: 'hubble_search_bookmarks',
                description: 'Search bookmarks by title or URL',
                inputSchema: {
                  type: 'object',
                  properties: {
                    query: { type: 'string', description: 'Search query' }
                  },
                  required: ['query']
                }
              }
            ]
          });

        case 'tools/call':
          if (!this.db) {
            await this.initDatabase();
          }
          return await this.handleToolCall(id, params);

        default:
          this.sendError(id, new Error(`Unknown method: ${method}`));
      }
    } catch (error) {
      this.sendError(id, error);
    }
  }

  async handleToolCall(id, params) {
    const { name, arguments: args } = params;

    try {
      let result;
      switch (name) {
        case 'hubble_add_bookmark':
          result = await this.addBookmark(args);
          break;
        case 'hubble_list_bookmarks':
          result = await this.listBookmarks(args || {});
          break;
        case 'hubble_search_bookmarks':
          result = await this.searchBookmarks(args);
          break;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
      
      this.sendResponse(id, result);
    } catch (error) {
      this.sendResponse(id, {
        content: [{
          type: 'text',
          text: `Error: ${error.message}`
        }]
      });
    }
  }

  async addBookmark(args) {
    const { title, url, group = 'Uncategorized', description = '', icon = '🔖' } = args;

    // Check if bookmark exists
    const existing = await this.db.get('SELECT id FROM bookmarks WHERE url = ?', [url]);
    if (existing) {
      return {
        content: [{
          type: 'text',
          text: `⚠️ Bookmark already exists: ${title}\nURL: ${url}`
        }]
      };
    }

    // Find or create group
    let groupData = await this.db.get('SELECT id FROM groups WHERE name = ?', [group]);
    if (!groupData) {
      const groupId = group.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await this.db.run(
        'INSERT INTO groups (id, name, icon) VALUES (?, ?, ?)',
        [groupId, group, '📁']
      );
      groupData = { id: groupId };
    }

    // Add bookmark
    const bookmarkId = 'bm-' + Date.now();
    await this.db.run(
      'INSERT INTO bookmarks (id, group_id, title, url, description, icon) VALUES (?, ?, ?, ?, ?, ?)',
      [bookmarkId, groupData.id, title, url, description, icon]
    );

    return {
      content: [{
        type: 'text',
        text: `✅ Added bookmark to Hubble!\n\n${icon} ${title}\n🔗 ${url}\n📁 ${group}${description ? `\n📝 ${description}` : ''}\n\nID: ${bookmarkId}`
      }]
    };
  }

  async listBookmarks(args) {
    const { group, limit = 20 } = args;
    
    let query = 'SELECT b.*, g.name as group_name FROM bookmarks b LEFT JOIN groups g ON b.group_id = g.id WHERE 1=1';
    const params = [];
    
    if (group) {
      const groupData = await this.db.get('SELECT id FROM groups WHERE name = ?', [group]);
      if (groupData) {
        query += ' AND b.group_id = ?';
        params.push(groupData.id);
      }
    }
    
    query += ' ORDER BY b.created_at DESC LIMIT ?';
    params.push(limit);
    
    const bookmarks = await this.db.all(query, params);
    
    if (bookmarks.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'No bookmarks found in Hubble.'
        }]
      };
    }
    
    const list = bookmarks.map(b => 
      `${b.icon || '🔖'} ${b.title}\n   🔗 ${b.url}\n   📁 ${b.group_name}${b.description ? `\n   📝 ${b.description}` : ''}`
    ).join('\n\n');
    
    return {
      content: [{
        type: 'text',
        text: `Found ${bookmarks.length} bookmarks in Hubble:\n\n${list}`
      }]
    };
  }

  async searchBookmarks(args) {
    const { query } = args;
    
    const bookmarks = await this.db.all(
      'SELECT b.*, g.name as group_name FROM bookmarks b LEFT JOIN groups g ON b.group_id = g.id WHERE b.title LIKE ? OR b.url LIKE ? LIMIT 10',
      [`%${query}%`, `%${query}%`]
    );
    
    if (bookmarks.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No bookmarks found matching "${query}"`
        }]
      };
    }
    
    const results = bookmarks.map(b => 
      `${b.icon || '🔖'} ${b.title}\n   🔗 ${b.url}\n   📁 ${b.group_name}`
    ).join('\n\n');
    
    return {
      content: [{
        type: 'text',
        text: `Found ${bookmarks.length} bookmarks matching "${query}":\n\n${results}`
      }]
    };
  }

  start() {
    this.logError('Hubble MCP Server starting...');
    
    process.stdin.setEncoding('utf8');
    
    let buffer = '';
    process.stdin.on('data', (chunk) => {
      buffer += chunk;
      let lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const request = JSON.parse(line);
            this.handleRequest(request).catch(error => {
              this.logError(`Error handling request: ${error.message}`);
            });
          } catch (error) {
            this.logError(`JSON parse error: ${error.message}`);
          }
        }
      }
    });

    process.stdin.on('end', () => {
      this.logError('Hubble MCP Server stopping...');
      process.exit(0);
    });

    this.logError('Hubble MCP Server ready for STDIO communication');
  }
}

// Start server
if (require.main === module) {
  const server = new HubbleStdioMCP();
  server.start();
}

module.exports = { HubbleStdioMCP };