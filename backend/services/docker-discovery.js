// ABOUTME: Docker container discovery service for auto-registering bookmarks
// ABOUTME: Scans Docker containers for Hubble labels and registers them

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class DockerDiscovery {
  constructor(db, io) {
    this.db = db;
    this.io = io;
    this.discoveredContainers = new Set();
  }

  async scanContainers() {
    try {
      // Get all running containers with labels
      const { stdout } = await execAsync('docker ps --format "{{json .}}"');
      const lines = stdout.trim().split('\n').filter(line => line);
      
      const containers = lines.map(line => JSON.parse(line));
      
      for (const container of containers) {
        await this.processContainer(container);
      }
      
      return containers.length;
    } catch (error) {
      console.error('Docker discovery error:', error);
      return 0;
    }
  }

  async processContainer(container) {
    try {
      // Get container details with labels
      const { stdout } = await execAsync(`docker inspect ${container.ID}`);
      const [details] = JSON.parse(stdout);
      
      const labels = details.Config.Labels || {};
      
      // Check for Hubble labels
      if (labels['hubble.enable'] === 'true' || labels['hubble.title']) {
        await this.registerContainer(details, labels);
      }
    } catch (error) {
      console.error(`Error processing container ${container.ID}:`, error);
    }
  }

  async registerContainer(details, labels) {
    const containerId = details.Id;
    
    // Skip if already discovered
    if (this.discoveredContainers.has(containerId)) {
      return;
    }
    
    // Extract Hubble configuration from labels
    const config = {
      title: labels['hubble.title'] || details.Name.replace(/^\//, ''),
      group: labels['hubble.group'] || 'Docker Services',
      icon: labels['hubble.icon'] || '🐳',
      environment: labels['hubble.environment'] || 'development',
      tags: labels['hubble.tags'] ? labels['hubble.tags'].split(',') : ['docker'],
      description: labels['hubble.description'] || `Docker container: ${details.Name}`
    };
    
    // Extract URL from port mappings
    const url = await this.extractUrl(details, labels);
    
    if (!url) {
      console.log(`No URL found for container ${config.title}`);
      return;
    }
    
    // Check if bookmark already exists
    const existing = await this.db.get('SELECT id FROM bookmarks WHERE url = ?', [url]);
    
    if (!existing) {
      // Find or create group
      let group = await this.db.get('SELECT id FROM groups WHERE name = ?', [config.group]);
      
      if (!group) {
        const groupId = config.group.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        await this.db.run(
          'INSERT INTO groups (id, name, icon) VALUES (?, ?, ?)',
          [groupId, config.group, '🐳']
        );
        group = { id: groupId };
      }
      
      // Generate bookmark ID
      const bookmarkId = `docker-${containerId.substring(0, 12)}-${Date.now()}`;
      
      // Insert bookmark
      await this.db.run(
        `INSERT INTO bookmarks (id, group_id, title, url, description, icon, tags, environment, created_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          bookmarkId,
          group.id,
          config.title,
          url,
          config.description,
          config.icon,
          JSON.stringify(config.tags),
          config.environment,
          'docker'
        ]
      );
      
      console.log(`✅ Auto-registered Docker container: ${config.title} at ${url}`);
      
      // Emit WebSocket event
      this.io.emit('bookmark:created', {
        id: bookmarkId,
        title: config.title,
        url,
        source: 'docker-discovery'
      });
      
      this.discoveredContainers.add(containerId);
    }
  }

  extractUrl(details, labels) {
    // Check for explicit URL label
    if (labels['hubble.url']) {
      return labels['hubble.url'];
    }
    
    // Extract from port mappings
    const ports = details.NetworkSettings.Ports || {};
    
    for (const [containerPort, hostPorts] of Object.entries(ports)) {
      if (hostPorts && hostPorts.length > 0) {
        const hostPort = hostPorts[0].HostPort;
        const protocol = labels['hubble.protocol'] || 'http';
        const hostname = labels['hubble.hostname'] || 'localhost';
        
        return `${protocol}://${hostname}:${hostPort}`;
      }
    }
    
    // Check for network alias
    const networks = details.NetworkSettings.Networks || {};
    const networkNames = Object.keys(networks);
    
    if (networkNames.length > 0) {
      const network = networks[networkNames[0]];
      if (network.IPAddress) {
        const port = labels['hubble.port'] || '80';
        const protocol = labels['hubble.protocol'] || 'http';
        
        return `${protocol}://${details.Name.replace(/^\//, '')}:${port}`;
      }
    }
    
    return null;
  }

  async startAutoDiscovery(intervalMs = 60000) {
    console.log('Starting Docker auto-discovery...');
    
    // Initial scan
    const count = await this.scanContainers();
    console.log(`Initial scan found ${count} containers`);
    
    // Periodic scans
    setInterval(async () => {
      const count = await this.scanContainers();
      if (count > 0) {
        console.log(`Docker scan found ${count} containers`);
      }
    }, intervalMs);
  }

  async cleanupStoppedContainers() {
    try {
      // Get all stopped containers
      const { stdout } = await execAsync('docker ps -a --filter "status=exited" --format "{{.ID}}"');
      const stoppedIds = stdout.trim().split('\n').filter(line => line);
      
      // Remove bookmarks for stopped containers
      for (const containerId of stoppedIds) {
        const pattern = `docker-${containerId.substring(0, 12)}%`;
        
        const deleted = await this.db.run(
          'DELETE FROM bookmarks WHERE id LIKE ? AND created_by = ?',
          [pattern, 'docker']
        );
        
        if (deleted.changes > 0) {
          console.log(`Removed bookmark for stopped container: ${containerId.substring(0, 12)}`);
          
          this.io.emit('bookmark:deleted', {
            containerId: containerId.substring(0, 12),
            source: 'docker-discovery'
          });
        }
        
        this.discoveredContainers.delete(containerId);
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}

module.exports = DockerDiscovery;