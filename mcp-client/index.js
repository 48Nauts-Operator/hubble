// ABOUTME: Hubble MCP Client SDK for easy bookmark registration
// ABOUTME: Provides simple API for projects to integrate with Hubble

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

class HubbleClient {
  constructor(options = {}) {
    this.mcpUrl = options.mcpUrl || process.env.HUBBLE_MCP_URL || 'http://localhost:9900';
    this.projectName = options.projectName || process.env.HUBBLE_PROJECT_NAME || 'Unknown';
    this.client = null;
  }

  async connect() {
    if (this.client) return;
    
    try {
      this.client = new Client({
        name: `hubble-client-${this.projectName}`,
        version: '1.0.0'
      });
      
      const transport = new StdioClientTransport({
        command: 'node',
        args: ['/home/jarvis/projects/Hubble/mcp-server/index.js']
      });
      
      await this.client.connect(transport);
    } catch (error) {
      console.error('Failed to connect to Hubble MCP:', error);
      throw error;
    }
  }

  async addBookmark(options) {
    await this.connect();
    
    const { title, url, group, subgroup, icon, description, tags, environment } = options;
    
    if (!title || !url || !group) {
      throw new Error('title, url, and group are required');
    }
    
    try {
      const result = await this.client.callTool('add_bookmark', {
        title,
        url,
        group: group || this.projectName,
        subgroup,
        icon,
        description,
        tags: tags || [],
        environment: environment || process.env.NODE_ENV || 'development'
      });
      
      return result;
    } catch (error) {
      console.error('Failed to add bookmark:', error);
      throw error;
    }
  }

  async updateBookmark(id, updates) {
    await this.connect();
    
    if (!id) {
      throw new Error('Bookmark ID is required');
    }
    
    try {
      const result = await this.client.callTool('update_bookmark', {
        id,
        ...updates
      });
      
      return result;
    } catch (error) {
      console.error('Failed to update bookmark:', error);
      throw error;
    }
  }

  async deleteBookmark(id) {
    await this.connect();
    
    if (!id) {
      throw new Error('Bookmark ID is required');
    }
    
    try {
      const result = await this.client.callTool('delete_bookmark', { id });
      return result;
    } catch (error) {
      console.error('Failed to delete bookmark:', error);
      throw error;
    }
  }

  async searchBookmarks(query, limit = 10) {
    await this.connect();
    
    try {
      const result = await this.client.callTool('search_bookmarks', {
        query,
        limit
      });
      
      return result;
    } catch (error) {
      console.error('Failed to search bookmarks:', error);
      throw error;
    }
  }

  async listBookmarks(filters = {}) {
    await this.connect();
    
    try {
      const result = await this.client.callTool('list_bookmarks', filters);
      return result;
    } catch (error) {
      console.error('Failed to list bookmarks:', error);
      throw error;
    }
  }

  async createGroup(options) {
    await this.connect();
    
    const { name, parent, icon, description, color } = options;
    
    if (!name) {
      throw new Error('Group name is required');
    }
    
    try {
      const result = await this.client.callTool('create_group', {
        name,
        parent,
        icon,
        description,
        color
      });
      
      return result;
    } catch (error) {
      console.error('Failed to create group:', error);
      throw error;
    }
  }

  async healthCheck(id) {
    await this.connect();
    
    if (!id) {
      throw new Error('Bookmark ID is required');
    }
    
    try {
      const result = await this.client.callTool('health_check', { id });
      return result;
    } catch (error) {
      console.error('Failed to check health:', error);
      throw error;
    }
  }

  async getStats(days = 7) {
    await this.connect();
    
    try {
      const result = await this.client.callTool('get_stats', { days });
      return result;
    } catch (error) {
      console.error('Failed to get stats:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
  }
}

// Auto-registration helper
async function autoRegister(options) {
  if (process.env.HUBBLE_AUTO_REGISTER === 'false') {
    return;
  }
  
  const client = new HubbleClient();
  
  try {
    const result = await client.addBookmark({
      title: options.title || process.env.APP_NAME || 'Unknown Service',
      url: options.url || process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`,
      group: options.group || process.env.HUBBLE_PROJECT_NAME || 'Default',
      subgroup: options.subgroup,
      icon: options.icon || '📦',
      description: options.description,
      tags: options.tags || [],
      environment: options.environment || process.env.NODE_ENV || 'development'
    });
    
    console.log('✅ Registered with Hubble:', result);
    await client.disconnect();
    return result;
  } catch (error) {
    console.error('Failed to auto-register with Hubble:', error);
    // Don't throw - allow app to continue even if Hubble is down
  }
}

// Docker label parser
function parseDockerLabels() {
  const labels = {};
  
  // In a real implementation, this would read Docker labels
  // For now, return environment variables as fallback
  labels.title = process.env.HUBBLE_TITLE || process.env.APP_NAME;
  labels.group = process.env.HUBBLE_GROUP || process.env.HUBBLE_PROJECT_NAME;
  labels.icon = process.env.HUBBLE_ICON;
  labels.environment = process.env.HUBBLE_ENVIRONMENT || process.env.NODE_ENV;
  labels.tags = process.env.HUBBLE_TAGS ? process.env.HUBBLE_TAGS.split(',') : [];
  
  return labels;
}

// Express middleware
function hubbleMiddleware(options = {}) {
  return async (req, res, next) => {
    if (!req.app.locals.hubbleRegistered) {
      req.app.locals.hubbleRegistered = true;
      
      const port = req.app.get('port') || process.env.PORT || 3000;
      const host = req.hostname || 'localhost';
      
      await autoRegister({
        ...options,
        url: options.url || `http://${host}:${port}`
      });
    }
    
    next();
  };
}

module.exports = {
  HubbleClient,
  autoRegister,
  parseDockerLabels,
  hubbleMiddleware
};