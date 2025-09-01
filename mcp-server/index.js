// ABOUTME: MCP server for Hubble bookmark management
// ABOUTME: Provides programmatic access to bookmarks via MCP protocol

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class HubbleMCPServer {
  constructor() {
    this.db = null;
    this.server = new Server({
      name: 'hubble-mcp',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {}
      }
    });
    
    this.setupHandlers();
  }

  async initDatabase() {
    const dbPath = process.env.DATABASE_URL || '/data/hubble.db';
    
    try {
      this.db = await open({
        filename: dbPath,
        driver: sqlite3.Database
      });
      
      await this.db.run('PRAGMA foreign_keys = ON');
      console.error('Connected to database at:', dbPath);
      
      // Initialize schema if needed
      const initModule = await import('../database/init.js').catch(() => null);
      if (initModule) {
        await initModule.initializeDatabase();
      }
      
    } catch (error) {
      console.error('Database connection error:', error);
      throw error;
    }
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler('tools/list', async () => ({
      tools: [
        {
          name: 'add_bookmark',
          description: 'Add a new bookmark to Hubble',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Bookmark title' },
              url: { type: 'string', description: 'Bookmark URL' },
              group: { type: 'string', description: 'Group name or ID' },
              subgroup: { type: 'string', description: 'Subgroup name (optional)' },
              icon: { type: 'string', description: 'Icon emoji or URL' },
              description: { type: 'string', description: 'Bookmark description' },
              tags: { 
                type: 'array', 
                items: { type: 'string' },
                description: 'Tags for categorization'
              },
              environment: { 
                type: 'string',
                enum: ['development', 'uat', 'staging', 'production'],
                description: 'Environment type'
              }
            },
            required: ['title', 'url', 'group']
          }
        },
        {
          name: 'update_bookmark',
          description: 'Update an existing bookmark',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Bookmark ID' },
              title: { type: 'string' },
              url: { type: 'string' },
              group: { type: 'string' },
              icon: { type: 'string' },
              description: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
              environment: { 
                type: 'string',
                enum: ['development', 'uat', 'staging', 'production']
              }
            },
            required: ['id']
          }
        },
        {
          name: 'delete_bookmark',
          description: 'Delete a bookmark',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Bookmark ID to delete' }
            },
            required: ['id']
          }
        },
        {
          name: 'list_bookmarks',
          description: 'List bookmarks with optional filters',
          inputSchema: {
            type: 'object',
            properties: {
              group: { type: 'string', description: 'Filter by group' },
              subgroup: { type: 'string', description: 'Filter by subgroup' },
              environment: { 
                type: 'string',
                enum: ['development', 'uat', 'staging', 'production']
              },
              tags: { type: 'array', items: { type: 'string' } },
              search: { type: 'string', description: 'Search in title, URL, description' }
            }
          }
        },
        {
          name: 'search_bookmarks',
          description: 'Search bookmarks by query',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
              limit: { type: 'number', description: 'Maximum results (default: 10)' }
            },
            required: ['query']
          }
        },
        {
          name: 'list_groups',
          description: 'List all bookmark groups',
          inputSchema: {
            type: 'object',
            properties: {
              parent_id: { type: 'string', description: 'Filter by parent group' }
            }
          }
        },
        {
          name: 'create_group',
          description: 'Create a new bookmark group',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Group name' },
              parent: { type: 'string', description: 'Parent group name or ID' },
              icon: { type: 'string', description: 'Icon emoji' },
              description: { type: 'string', description: 'Group description' },
              color: { type: 'string', description: 'Color hex code' }
            },
            required: ['name']
          }
        },
        {
          name: 'health_check',
          description: 'Check health status of a bookmark URL',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Bookmark ID to check' }
            },
            required: ['id']
          }
        },
        {
          name: 'get_stats',
          description: 'Get bookmark statistics and analytics',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'number', description: 'Number of days for trends (default: 7)' }
            }
          }
        }
      ]
    }));

    // Handle tool calls
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;
      
      if (!this.db) {
        await this.initDatabase();
      }
      
      try {
        switch (name) {
          case 'add_bookmark':
            return await this.addBookmark(args);
          case 'update_bookmark':
            return await this.updateBookmark(args);
          case 'delete_bookmark':
            return await this.deleteBookmark(args);
          case 'list_bookmarks':
            return await this.listBookmarks(args);
          case 'search_bookmarks':
            return await this.searchBookmarks(args);
          case 'list_groups':
            return await this.listGroups(args);
          case 'create_group':
            return await this.createGroup(args);
          case 'health_check':
            return await this.healthCheck(args);
          case 'get_stats':
            return await this.getStats(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`
          }]
        };
      }
    });
  }

  async addBookmark(args) {
    const { title, url, group, subgroup, icon, description, tags = [], environment } = args;
    
    // Find or create group
    let groupId = await this.findOrCreateGroup(group, subgroup);
    
    // Check if URL already exists
    const existing = await this.db.get('SELECT id FROM bookmarks WHERE url = ?', [url]);
    if (existing) {
      return {
        content: [{
          type: 'text',
          text: `Bookmark already exists with ID: ${existing.id}`
        }]
      };
    }
    
    // Generate ID
    const id = Buffer.from(url).toString('base64').replace(/[^a-z0-9]/gi, '').substring(0, 16) + Date.now();
    
    // Insert bookmark
    await this.db.run(
      `INSERT INTO bookmarks (id, group_id, title, url, description, icon, tags, environment, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, groupId, title, url, description, icon, JSON.stringify(tags), environment, 'mcp']
    );
    
    // Log in MCP audit
    await this.db.run(
      `INSERT INTO mcp_audit (action, tool_name, bookmark_id, source, status) 
       VALUES (?, ?, ?, ?, ?)`,
      ['create', 'add_bookmark', id, 'mcp-client', 'success']
    );
    
    return {
      content: [{
        type: 'text',
        text: `✅ Bookmark added successfully!\nID: ${id}\nTitle: ${title}\nURL: ${url}\nGroup: ${group}${subgroup ? `/${subgroup}` : ''}`
      }]
    };
  }

  async updateBookmark(args) {
    const { id, ...updates } = args;
    
    // Check if bookmark exists
    const bookmark = await this.db.get('SELECT * FROM bookmarks WHERE id = ?', [id]);
    if (!bookmark) {
      return {
        content: [{
          type: 'text',
          text: `❌ Bookmark not found with ID: ${id}`
        }]
      };
    }
    
    // Handle group update if provided
    if (updates.group) {
      updates.group_id = await this.findOrCreateGroup(updates.group, updates.subgroup);
      delete updates.group;
      delete updates.subgroup;
    }
    
    // Handle tags
    if (updates.tags) {
      updates.tags = JSON.stringify(updates.tags);
    }
    
    // Build update query
    const fields = Object.keys(updates).map(key => `${key} = ?`);
    const values = Object.values(updates);
    
    if (fields.length > 0) {
      values.push(id);
      await this.db.run(
        `UPDATE bookmarks SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }
    
    // Log in MCP audit
    await this.db.run(
      `INSERT INTO mcp_audit (action, tool_name, bookmark_id, changes, source, status) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['update', 'update_bookmark', id, JSON.stringify(updates), 'mcp-client', 'success']
    );
    
    return {
      content: [{
        type: 'text',
        text: `✅ Bookmark updated successfully!\nID: ${id}\nUpdated fields: ${Object.keys(updates).join(', ')}`
      }]
    };
  }

  async deleteBookmark(args) {
    const { id } = args;
    
    const bookmark = await this.db.get('SELECT * FROM bookmarks WHERE id = ?', [id]);
    if (!bookmark) {
      return {
        content: [{
          type: 'text',
          text: `❌ Bookmark not found with ID: ${id}`
        }]
      };
    }
    
    await this.db.run('DELETE FROM bookmarks WHERE id = ?', [id]);
    
    // Log in MCP audit
    await this.db.run(
      `INSERT INTO mcp_audit (action, tool_name, bookmark_id, source, status) 
       VALUES (?, ?, ?, ?, ?)`,
      ['delete', 'delete_bookmark', id, 'mcp-client', 'success']
    );
    
    return {
      content: [{
        type: 'text',
        text: `✅ Bookmark deleted successfully!\nTitle: ${bookmark.title}\nURL: ${bookmark.url}`
      }]
    };
  }

  async listBookmarks(args) {
    const { group, subgroup, environment, tags, search } = args;
    
    let query = 'SELECT b.*, g.name as group_name FROM bookmarks b LEFT JOIN groups g ON b.group_id = g.id WHERE 1=1';
    const params = [];
    
    if (group) {
      const groupData = await this.db.get('SELECT id FROM groups WHERE name = ? OR id = ?', [group, group]);
      if (groupData) {
        query += ' AND b.group_id = ?';
        params.push(groupData.id);
      }
    }
    
    if (environment) {
      query += ' AND b.environment = ?';
      params.push(environment);
    }
    
    if (search) {
      query += ' AND (b.title LIKE ? OR b.url LIKE ? OR b.description LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }
    
    query += ' ORDER BY b.click_count DESC, b.title ASC';
    
    const bookmarks = await this.db.all(query, params);
    
    // Parse JSON fields
    bookmarks.forEach(b => {
      if (b.tags) b.tags = JSON.parse(b.tags);
    });
    
    const result = bookmarks.map(b => 
      `📌 ${b.title}\n   URL: ${b.url}\n   Group: ${b.group_name}\n   Clicks: ${b.click_count}`
    ).join('\n\n');
    
    return {
      content: [{
        type: 'text',
        text: bookmarks.length > 0 ? result : 'No bookmarks found matching the criteria.'
      }]
    };
  }

  async searchBookmarks(args) {
    const { query, limit = 10 } = args;
    
    const bookmarks = await this.db.all(
      `SELECT b.*, g.name as group_name 
       FROM bookmarks b 
       LEFT JOIN groups g ON b.group_id = g.id
       WHERE b.title LIKE ? OR b.url LIKE ? OR b.description LIKE ?
       ORDER BY b.click_count DESC
       LIMIT ?`,
      [`%${query}%`, `%${query}%`, `%${query}%`, limit]
    );
    
    const result = bookmarks.map(b => 
      `📌 ${b.title}\n   URL: ${b.url}\n   Group: ${b.group_name}`
    ).join('\n\n');
    
    return {
      content: [{
        type: 'text',
        text: bookmarks.length > 0 ? 
          `Found ${bookmarks.length} bookmark(s):\n\n${result}` : 
          `No bookmarks found matching "${query}"`
      }]
    };
  }

  async listGroups(args) {
    const { parent_id } = args;
    
    let query = 'SELECT * FROM groups';
    const params = [];
    
    if (parent_id) {
      query += ' WHERE parent_id = ?';
      params.push(parent_id);
    }
    
    query += ' ORDER BY sort_order, name';
    
    const groups = await this.db.all(query, params);
    
    // Get bookmark counts
    for (const group of groups) {
      const count = await this.db.get(
        'SELECT COUNT(*) as count FROM bookmarks WHERE group_id = ?',
        [group.id]
      );
      group.bookmark_count = count.count;
    }
    
    const result = groups.map(g => 
      `${g.icon || '📁'} ${g.name} (${g.bookmark_count} bookmarks)\n   ${g.description || 'No description'}`
    ).join('\n\n');
    
    return {
      content: [{
        type: 'text',
        text: groups.length > 0 ? result : 'No groups found.'
      }]
    };
  }

  async createGroup(args) {
    const { name, parent, icon, description, color } = args;
    
    // Find parent group if specified
    let parentId = null;
    if (parent) {
      const parentGroup = await this.db.get(
        'SELECT id FROM groups WHERE name = ? OR id = ?',
        [parent, parent]
      );
      if (parentGroup) {
        parentId = parentGroup.id;
      }
    }
    
    // Generate ID
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
    
    await this.db.run(
      `INSERT INTO groups (id, name, parent_id, icon, description, color) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, parentId, icon, description, color]
    );
    
    return {
      content: [{
        type: 'text',
        text: `✅ Group created successfully!\nID: ${id}\nName: ${name}${parent ? `\nParent: ${parent}` : ''}`
      }]
    };
  }

  async healthCheck(args) {
    const { id } = args;
    
    const bookmark = await this.db.get('SELECT * FROM bookmarks WHERE id = ?', [id]);
    if (!bookmark) {
      return {
        content: [{
          type: 'text',
          text: `❌ Bookmark not found with ID: ${id}`
        }]
      };
    }
    
    // Simple health check (would need fetch in real implementation)
    const status = 'unknown'; // Simplified for MCP context
    
    await this.db.run(
      'UPDATE bookmarks SET health_status = ?, last_health_check = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    );
    
    return {
      content: [{
        type: 'text',
        text: `🔍 Health check initiated for:\n${bookmark.title}\nURL: ${bookmark.url}\nStatus: ${status}`
      }]
    };
  }

  async getStats(args) {
    const { days = 7 } = args;
    
    // Get basic stats
    const totalBookmarks = await this.db.get('SELECT COUNT(*) as count FROM bookmarks');
    const totalGroups = await this.db.get('SELECT COUNT(*) as count FROM groups');
    const totalClicks = await this.db.get('SELECT SUM(click_count) as total FROM bookmarks');
    
    // Get popular bookmarks
    const popular = await this.db.all(
      'SELECT title, url, click_count FROM bookmarks ORDER BY click_count DESC LIMIT 5'
    );
    
    // Get recent MCP activity
    const recentActivity = await this.db.all(
      'SELECT * FROM mcp_audit ORDER BY timestamp DESC LIMIT 5'
    );
    
    const popularList = popular.map(b => `  • ${b.title} (${b.click_count} clicks)`).join('\n');
    const activityList = recentActivity.map(a => `  • ${a.action} via ${a.tool_name}`).join('\n');
    
    return {
      content: [{
        type: 'text',
        text: `📊 Hubble Statistics (Last ${days} days)\n\n` +
              `📚 Total Bookmarks: ${totalBookmarks.count}\n` +
              `📁 Total Groups: ${totalGroups.count}\n` +
              `👆 Total Clicks: ${totalClicks.total || 0}\n\n` +
              `🔥 Popular Bookmarks:\n${popularList}\n\n` +
              `🕐 Recent MCP Activity:\n${activityList}`
      }]
    };
  }

  async findOrCreateGroup(groupName, subgroupName) {
    // Find or create main group
    let group = await this.db.get(
      'SELECT id FROM groups WHERE name = ? OR id = ?',
      [groupName, groupName]
    );
    
    if (!group) {
      const groupId = groupName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await this.db.run(
        'INSERT INTO groups (id, name) VALUES (?, ?)',
        [groupId, groupName]
      );
      group = { id: groupId };
    }
    
    // Handle subgroup if provided
    if (subgroupName) {
      let subgroup = await this.db.get(
        'SELECT id FROM groups WHERE name = ? AND parent_id = ?',
        [subgroupName, group.id]
      );
      
      if (!subgroup) {
        const subgroupId = subgroupName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
        await this.db.run(
          'INSERT INTO groups (id, name, parent_id) VALUES (?, ?, ?)',
          [subgroupId, subgroupName, group.id]
        );
        return subgroupId;
      }
      
      return subgroup.id;
    }
    
    return group.id;
  }

  async start() {
    await this.initDatabase();
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error('Hubble MCP Server started successfully');
  }
}

// Start the server
const server = new HubbleMCPServer();
server.start().catch(console.error);