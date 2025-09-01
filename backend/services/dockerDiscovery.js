// ABOUTME: Docker container discovery service for automatic bookmark generation
// ABOUTME: Scans local Docker daemon for running containers and extracts service information

const Docker = require('dockerode');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

class DockerDiscoveryService {
  constructor() {
    this.discoveredServices = [];
  }

  /**
   * Discover all running Docker containers and extract service information
   */
  async discoverServices() {
    try {
      const containers = await docker.listContainers({ all: false }); // Only running containers
      const services = [];

      for (const containerInfo of containers) {
        const container = docker.getContainer(containerInfo.Id);
        const details = await container.inspect();
        
        const service = await this.extractServiceInfo(details, containerInfo);
        if (service) {
          services.push(service);
        }
      }

      this.discoveredServices = services;
      return services;
    } catch (error) {
      console.error('Docker discovery failed:', error);
      throw error;
    }
  }

  /**
   * Extract service information from container details
   */
  async extractServiceInfo(details, containerInfo) {
    const service = {
      id: details.Id.substring(0, 12),
      name: details.Name.replace('/', ''),
      image: details.Config.Image,
      status: containerInfo.State,
      created: new Date(details.Created),
      labels: details.Config.Labels || {},
      environment: this.parseEnvironment(details.Config.Env || []),
      ports: [],
      urls: [],
      detected_type: null,
      suggested_group: null
    };

    // Extract port mappings
    if (details.NetworkSettings && details.NetworkSettings.Ports) {
      for (const [containerPort, hostBindings] of Object.entries(details.NetworkSettings.Ports)) {
        if (hostBindings && hostBindings.length > 0) {
          for (const binding of hostBindings) {
            const port = {
              container: containerPort,
              host: binding.HostPort,
              ip: binding.HostIp || '0.0.0.0'
            };
            service.ports.push(port);

            // Generate URLs based on ports
            const protocol = this.guessProtocol(parseInt(binding.HostPort));
            const url = `${protocol}://${this.getHostAddress(binding.HostIp)}:${binding.HostPort}`;
            service.urls.push(url);
          }
        }
      }
    }

    // Check for Traefik labels (common reverse proxy)
    if (service.labels['traefik.enable'] === 'true') {
      const traefikHost = this.extractTraefikHost(service.labels);
      if (traefikHost) {
        service.urls.unshift(`https://${traefikHost}`);
        service.has_reverse_proxy = true;
      }
    }

    // Check for Nginx Proxy Manager labels
    if (service.labels['nginx.proxy.host']) {
      service.urls.unshift(`https://${service.labels['nginx.proxy.host']}`);
      service.has_reverse_proxy = true;
    }

    // Detect service type based on image and labels
    service.detected_type = this.detectServiceType(service);
    service.suggested_group = this.suggestGroup(service);

    // Generate bookmark metadata
    service.bookmark_data = this.generateBookmarkData(service);

    return service;
  }

  /**
   * Parse environment variables into key-value pairs
   */
  parseEnvironment(envArray) {
    const env = {};
    for (const envVar of envArray) {
      const [key, ...valueParts] = envVar.split('=');
      env[key] = valueParts.join('=');
    }
    return env;
  }

  /**
   * Guess protocol based on port number
   */
  guessProtocol(port) {
    const httpsPorts = [443, 8443, 9443];
    const httpPorts = [80, 8080, 8081, 3000, 5000, 5173, 8888, 9000];
    
    if (httpsPorts.includes(port)) return 'https';
    if (httpPorts.includes(port)) return 'http';
    
    // Default based on port range
    if (port >= 3000 && port <= 10000) return 'http';
    return 'http';
  }

  /**
   * Get the appropriate host address
   */
  getHostAddress(bindIp) {
    if (bindIp === '0.0.0.0' || bindIp === '::') {
      // If bound to all interfaces, use the host's primary IP or localhost
      // In production, this should be the actual host IP or domain
      return process.env.HOST_IP || 'localhost';
    }
    return bindIp;
  }

  /**
   * Extract Traefik host from labels
   */
  extractTraefikHost(labels) {
    // Check various Traefik label formats
    const hostLabels = [
      'traefik.http.routers.*.rule',
      'traefik.frontend.rule'
    ];

    for (const [key, value] of Object.entries(labels)) {
      if (key.includes('traefik') && key.includes('rule')) {
        // Extract host from Host(`domain.com`) or Host:domain.com format
        const hostMatch = value.match(/Host\(`?([^`)]+)`?\)/);
        if (hostMatch) return hostMatch[1];
      }
    }
    return null;
  }

  /**
   * Detect service type based on image name and labels
   */
  detectServiceType(service) {
    const image = service.image.toLowerCase();
    const name = service.name.toLowerCase();

    // Databases
    if (image.includes('postgres') || image.includes('postgresql')) return 'database';
    if (image.includes('mysql') || image.includes('mariadb')) return 'database';
    if (image.includes('mongo') || image.includes('mongodb')) return 'database';
    if (image.includes('redis')) return 'cache';
    if (image.includes('elasticsearch')) return 'search';

    // Web servers and proxies
    if (image.includes('nginx')) return 'webserver';
    if (image.includes('apache') || image.includes('httpd')) return 'webserver';
    if (image.includes('traefik')) return 'proxy';
    if (image.includes('caddy')) return 'webserver';

    // Development tools
    if (image.includes('gitlab')) return 'development';
    if (image.includes('jenkins')) return 'ci-cd';
    if (image.includes('sonarqube')) return 'development';
    if (image.includes('nexus')) return 'repository';

    // Monitoring
    if (image.includes('prometheus')) return 'monitoring';
    if (image.includes('grafana')) return 'monitoring';
    if (image.includes('portainer')) return 'management';

    // Applications
    if (image.includes('wordpress')) return 'application';
    if (image.includes('nextcloud')) return 'application';
    if (image.includes('ghost')) return 'application';
    
    // Node.js apps
    if (image.includes('node')) return 'application';
    
    // Check ports for web applications
    const webPorts = [80, 443, 3000, 5000, 8080, 8081, 8888];
    if (service.ports.some(p => webPorts.includes(parseInt(p.host)))) {
      return 'application';
    }

    return 'service';
  }

  /**
   * Suggest a group based on service type
   */
  suggestGroup(service) {
    const typeGroupMap = {
      'database': 'Databases',
      'cache': 'Infrastructure',
      'search': 'Infrastructure',
      'webserver': 'Web Services',
      'proxy': 'Infrastructure',
      'development': 'Development',
      'ci-cd': 'DevOps',
      'repository': 'DevOps',
      'monitoring': 'Monitoring',
      'management': 'Management',
      'application': 'Applications',
      'service': 'Services'
    };

    return typeGroupMap[service.detected_type] || 'Discovered';
  }

  /**
   * Generate bookmark data from service information
   */
  generateBookmarkData(service) {
    // Try to get a nice title
    let title = service.name;
    
    // Use container labels if available
    if (service.labels['com.docker.compose.service']) {
      title = service.labels['com.docker.compose.service'];
    }
    if (service.labels['org.label-schema.name']) {
      title = service.labels['org.label-schema.name'];
    }

    // Generate description
    let description = `Docker container: ${service.image}`;
    if (service.labels['org.label-schema.description']) {
      description = service.labels['org.label-schema.description'];
    } else if (service.labels['description']) {
      description = service.labels['description'];
    }

    // Pick the best URL
    let url = service.urls[0] || `http://localhost:${service.ports[0]?.host || '80'}`;
    let internalUrl = null;

    // If we have both reverse proxy and direct URLs
    if (service.has_reverse_proxy && service.urls.length > 1) {
      url = service.urls[0]; // External (reverse proxy)
      internalUrl = service.urls[1]; // Internal (direct)
    }

    // Determine icon based on service type
    const iconMap = {
      'database': '🗄️',
      'cache': '⚡',
      'search': '🔍',
      'webserver': '🌐',
      'proxy': '🔀',
      'development': '💻',
      'ci-cd': '🔄',
      'repository': '📦',
      'monitoring': '📊',
      'management': '🎛️',
      'application': '🚀',
      'service': '⚙️'
    };

    const icon = iconMap[service.detected_type] || '🐳';

    // Generate tags
    const tags = [
      'docker',
      service.detected_type,
      service.image.split(':')[0].split('/').pop() // Image name without registry/tag
    ].filter(Boolean);

    // Determine environment
    let environment = 'local';
    if (service.name.includes('prod') || service.labels['environment'] === 'production') {
      environment = 'production';
    } else if (service.name.includes('staging') || service.labels['environment'] === 'staging') {
      environment = 'staging';
    } else if (service.name.includes('dev') || service.labels['environment'] === 'development') {
      environment = 'development';
    }

    return {
      title: this.formatTitle(title),
      url,
      internalUrl,
      description,
      icon,
      tags,
      environment,
      container_id: service.id,
      container_name: service.name,
      auto_discovered: true,
      discovered_at: new Date().toISOString()
    };
  }

  /**
   * Format title to be more readable
   */
  formatTitle(title) {
    // Replace underscores and hyphens with spaces
    title = title.replace(/[_-]/g, ' ');
    
    // Capitalize first letter of each word
    title = title.replace(/\b\w/g, char => char.toUpperCase());
    
    return title;
  }

  /**
   * Monitor Docker events for real-time updates
   */
  async startMonitoring(callback) {
    const stream = await docker.getEvents();
    
    stream.on('data', async (chunk) => {
      const event = JSON.parse(chunk.toString());
      
      // Handle container start/stop events
      if (event.Type === 'container') {
        if (event.Action === 'start' || event.Action === 'stop' || event.Action === 'die') {
          // Re-discover services
          const services = await this.discoverServices();
          if (callback) {
            callback(services);
          }
        }
      }
    });

    return stream;
  }
}

module.exports = DockerDiscoveryService;