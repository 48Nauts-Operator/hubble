// ABOUTME: Health check routes for monitoring bookmark availability
// ABOUTME: Provides endpoints for system and bookmark health status

const express = require('express');
const router = express.Router();

// GET /api/health - System health check
router.get('/', async (req, res) => {
  try {
    // Check database connection
    const dbCheck = await req.db.get('SELECT 1 as healthy');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: dbCheck ? 'connected' : 'disconnected',
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// POST /api/health/check/:id - Check health of specific bookmark
router.post('/check/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Get bookmark
    const bookmark = await req.db.get('SELECT * FROM bookmarks WHERE id = ?', [id]);
    if (!bookmark) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }
    
    // Perform health check
    const healthResult = await checkBookmarkHealth(bookmark.url);
    
    // Update bookmark health status
    await req.db.run(
      'UPDATE bookmarks SET health_status = ?, last_health_check = CURRENT_TIMESTAMP WHERE id = ?',
      [healthResult.status, id]
    );
    
    // Log analytics event
    await req.db.run(
      'INSERT INTO analytics (bookmark_id, event_type, metadata) VALUES (?, ?, ?)',
      [id, 'health_check', JSON.stringify(healthResult)]
    );
    
    // Emit WebSocket event
    req.io.emit('health:updated', { id, ...healthResult });
    
    res.json({
      id,
      url: bookmark.url,
      ...healthResult
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/health/check-all - Check health of all bookmarks
router.post('/check-all', async (req, res, next) => {
  try {
    const bookmarks = await req.db.all('SELECT id, url FROM bookmarks');
    const results = [];
    
    // Check each bookmark (with rate limiting)
    for (const bookmark of bookmarks) {
      const healthResult = await checkBookmarkHealth(bookmark.url);
      
      // Update bookmark health status
      await req.db.run(
        'UPDATE bookmarks SET health_status = ?, last_health_check = CURRENT_TIMESTAMP WHERE id = ?',
        [healthResult.status, bookmark.id]
      );
      
      // Log analytics event
      await req.db.run(
        'INSERT INTO analytics (bookmark_id, event_type, metadata) VALUES (?, ?, ?)',
        [bookmark.id, 'health_check', JSON.stringify(healthResult)]
      );
      
      results.push({
        id: bookmark.id,
        url: bookmark.url,
        ...healthResult
      });
      
      // Rate limit: wait 100ms between checks
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Emit WebSocket event
    req.io.emit('health:bulk-updated', results);
    
    res.json({
      checked: results.length,
      results: results
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/health/status - Get health status summary
router.get('/status', async (req, res, next) => {
  try {
    const summary = await req.db.all(
      `SELECT health_status, COUNT(*) as count 
       FROM bookmarks 
       GROUP BY health_status`
    );
    
    const unhealthy = await req.db.all(
      `SELECT id, title, url, health_status, last_health_check 
       FROM bookmarks 
       WHERE health_status = 'down' 
       ORDER BY last_health_check DESC`
    );
    
    const stale = await req.db.all(
      `SELECT id, title, url, last_health_check 
       FROM bookmarks 
       WHERE last_health_check IS NULL 
       OR last_health_check < datetime('now', '-1 day')
       ORDER BY last_health_check ASC`
    );
    
    res.json({
      summary,
      unhealthy,
      stale,
      last_check: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Helper function to check bookmark health
async function checkBookmarkHealth(url) {
  const startTime = Date.now();
  
  try {
    // Skip health check for certain protocols
    if (url.startsWith('file://') || url.startsWith('chrome://')) {
      return { status: 'unknown', responseTime: 0, statusCode: null };
    }
    
    
    // Use built-in https/http modules instead of fetch for health checks
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const httpModule = isHttps ? require('https') : require('http');
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'HEAD',
      timeout: 5000,
      headers: {
        'User-Agent': 'Hubble Health Checker 1.0'
      }
    };
    
    const response = await new Promise((resolve, reject) => {
      const req = httpModule.request(options, resolve);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      req.on('error', reject);
      req.end();
    });
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: response.statusCode >= 200 && response.statusCode < 400 ? 'up' : 'down',
      statusCode: response.statusCode,
      responseTime,
      checkedAt: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'down',
      statusCode: null,
      responseTime: Date.now() - startTime,
      error: error.message,
      checkedAt: new Date().toISOString()
    };
  }
}

module.exports = router;