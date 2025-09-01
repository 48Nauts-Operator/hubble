// ABOUTME: Discovery API routes for Docker container auto-discovery
// ABOUTME: Provides endpoints to scan, preview, and import discovered services

const express = require('express');
const router = express.Router();
const DockerDiscoveryService = require('../services/dockerDiscovery');

// Initialize discovery service
const discoveryService = new DockerDiscoveryService();

// GET /api/discovery/scan - Scan for Docker containers
router.get('/scan', async (req, res) => {
  try {
    const discoveredServices = await discoveryService.discoverServices();
    
    res.json({
      success: true,
      count: discoveredServices.length,
      services: discoveredServices,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Discovery scan failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'DISCOVERY_SCAN_FAILED'
    });
  }
});

// POST /api/discovery/import - Import discovered services as bookmarks
router.post('/import', async (req, res) => {
  try {
    const { services } = req.body;
    
    if (!services || !Array.isArray(services)) {
      return res.status(400).json({
        success: false,
        error: 'Services array is required',
        code: 'INVALID_SERVICES'
      });
    }
    
    const imported = [];
    const failed = [];
    
    for (const service of services) {
      try {
        // Create group if it doesn't exist
        let groupId = null;
        if (service.suggested_group) {
          const existingGroup = await req.db.get(
            'SELECT id FROM groups WHERE name = ?',
            [service.suggested_group]
          );
          
          if (existingGroup) {
            groupId = existingGroup.id;
          } else {
            // Generate a unique ID for the group
            groupId = `docker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            await req.db.run(
              'INSERT INTO groups (id, name, icon, color, description, created_at) VALUES (?, ?, ?, ?, ?, ?)',
              [
                groupId,
                service.suggested_group,
                '🐳', // Docker icon
                '#0ea5e9', // Sky blue
                `Auto-created group for ${service.detected_type} services`,
                new Date().toISOString()
              ]
            );
          }
        }
        
        // Create bookmark from discovered service
        const bookmarkData = service.bookmark_data;
        // Generate a unique ID for the bookmark
        const bookmarkId = Buffer.from(bookmarkData.url + Date.now()).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substr(0, 20);
        
        await req.db.run(
          `INSERT INTO bookmarks (
            id, group_id, title, url, internal_url, external_url, description,
            icon, tags, environment, metadata, auto_discovered,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            bookmarkId,
            groupId,
            bookmarkData.title,
            bookmarkData.url,
            bookmarkData.internalUrl || null,
            bookmarkData.url,
            bookmarkData.description,
            bookmarkData.icon,
            JSON.stringify(bookmarkData.tags),
            bookmarkData.environment,
            JSON.stringify({
              container_id: bookmarkData.container_id,
              container_name: bookmarkData.container_name,
              discovered_at: bookmarkData.discovered_at,
              service_type: service.detected_type,
              image: service.image,
              ports: service.ports
            }),
            1, // auto_discovered
            new Date().toISOString(),
            new Date().toISOString()
          ]
        );
        
        imported.push({
          service_id: service.id,
          bookmark_id: bookmarkId,
          title: bookmarkData.title,
          url: bookmarkData.url
        });
        
        // Emit WebSocket event for real-time UI updates
        req.io.emit('bookmark:created', {
          id: bookmarkId,
          title: bookmarkData.title,
          groupId: groupId,
          auto_discovered: true
        });
        
      } catch (serviceError) {
        console.error(`Failed to import service ${service.name}:`, serviceError);
        failed.push({
          service_id: service.id,
          name: service.name,
          error: serviceError.message
        });
      }
    }
    
    res.json({
      success: true,
      imported: imported.length,
      failed: failed.length,
      details: {
        imported,
        failed
      }
    });
    
  } catch (error) {
    console.error('Discovery import failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'DISCOVERY_IMPORT_FAILED'
    });
  }
});

// POST /api/discovery/preview - Preview what would be imported
router.post('/preview', async (req, res) => {
  try {
    const { services } = req.body;
    
    if (!services || !Array.isArray(services)) {
      return res.status(400).json({
        success: false,
        error: 'Services array is required'
      });
    }
    
    const preview = services.map(service => ({
      service_id: service.id,
      bookmark_title: service.bookmark_data.title,
      bookmark_url: service.bookmark_data.url,
      group_name: service.suggested_group,
      service_type: service.detected_type,
      environment: service.bookmark_data.environment,
      already_exists: false // TODO: Check if bookmark already exists
    }));
    
    res.json({
      success: true,
      preview
    });
    
  } catch (error) {
    console.error('Discovery preview failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/discovery/status - Get discovery service status
router.get('/status', async (req, res) => {
  try {
    // Test Docker connection
    const Docker = require('dockerode');
    const docker = new Docker({ socketPath: '/var/run/docker.sock' });
    
    const info = await docker.info();
    
    res.json({
      success: true,
      docker_available: true,
      containers_running: info.ContainersRunning || 0,
      containers_total: info.Containers || 0,
      last_scan: discoveryService.lastScanTime || null
    });
    
  } catch (error) {
    res.json({
      success: false,
      docker_available: false,
      error: error.message
    });
  }
});

// POST /api/discovery/monitor/start - Start monitoring Docker events
router.post('/monitor/start', async (req, res) => {
  try {
    const stream = await discoveryService.startMonitoring((services) => {
      // Emit updated services to all connected clients
      req.io.emit('discovery:updated', {
        services,
        timestamp: new Date().toISOString()
      });
    });
    
    res.json({
      success: true,
      message: 'Docker monitoring started',
      monitoring: true
    });
    
  } catch (error) {
    console.error('Failed to start monitoring:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;