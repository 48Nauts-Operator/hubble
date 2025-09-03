// ABOUTME: Analytics API routes for tracking and reporting
// ABOUTME: Provides insights into bookmark usage patterns

const express = require('express');
const router = express.Router();

// GET /api/analytics/stats - Get overall statistics
router.get('/stats', async (req, res, next) => {
  try {
    const stats = {};
    
    // Total bookmarks
    const bookmarkCount = await req.db.get('SELECT COUNT(*) as count FROM bookmarks');
    stats.total_bookmarks = bookmarkCount.count;
    
    // Total groups
    const groupCount = await req.db.get('SELECT COUNT(*) as count FROM groups');
    stats.total_groups = groupCount.count;
    
    // Total clicks
    const clickSum = await req.db.get('SELECT SUM(click_count) as total FROM bookmarks');
    stats.total_clicks = clickSum.total || 0;
    
    // Most popular bookmarks
    const popular = await req.db.all(
      'SELECT id, title, url, click_count FROM bookmarks ORDER BY click_count DESC LIMIT 10'
    );
    stats.popular_bookmarks = popular;
    
    // Recent activity
    const recentActivity = await req.db.all(
      `SELECT a.*, b.title as bookmark_title 
       FROM analytics a 
       LEFT JOIN bookmarks b ON a.bookmark_id = b.id 
       ORDER BY a.timestamp DESC 
       LIMIT 20`
    );
    stats.recent_activity = recentActivity;
    
    // Environment distribution
    const environments = await req.db.all(
      `SELECT environment, COUNT(*) as count 
       FROM bookmarks 
       WHERE environment IS NOT NULL 
       GROUP BY environment`
    );
    stats.environment_distribution = environments;
    
    // Health status distribution
    const healthStatus = await req.db.all(
      `SELECT health_status, COUNT(*) as count 
       FROM bookmarks 
       GROUP BY health_status`
    );
    stats.health_distribution = healthStatus;
    
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/bookmark/:id - Get analytics for specific bookmark
router.get('/bookmark/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Get bookmark details
    const bookmark = await req.db.get('SELECT * FROM bookmarks WHERE id = ?', [id]);
    if (!bookmark) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }
    
    // Get click history (last 30 days)
    const clickHistory = await req.db.all(
      `SELECT DATE(timestamp) as date, COUNT(*) as clicks 
       FROM analytics 
       WHERE bookmark_id = ? AND event_type = 'click' 
       AND timestamp >= datetime('now', '-30 days')
       GROUP BY DATE(timestamp)
       ORDER BY date DESC`,
      [id]
    );
    
    // Get all events
    const events = await req.db.all(
      'SELECT * FROM analytics WHERE bookmark_id = ? ORDER BY timestamp DESC LIMIT 100',
      [id]
    );
    
    res.json({
      bookmark,
      click_history: clickHistory,
      events
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/trends - Get usage trends
router.get('/trends', async (req, res, next) => {
  try {
    let { days = 7 } = req.query;
    
    // Validate and sanitize days parameter
    days = parseInt(days);
    if (isNaN(days) || days < 1 || days > 365) {
      return res.status(400).json({ error: 'Invalid days parameter. Must be between 1 and 365.' });
    }
    
    // Build the date threshold using parameterized query
    const dateThreshold = `datetime('now', '-${days} days')`;
    
    // Daily clicks - using safe parameterized approach
    const dailyClicks = await req.db.all(
      `SELECT DATE(timestamp) as date, COUNT(*) as clicks 
       FROM analytics 
       WHERE event_type = 'click' 
       AND timestamp >= datetime('now', '-' || ? || ' days')
       GROUP BY DATE(timestamp)
       ORDER BY date ASC`,
      [days]
    );
    
    // New bookmarks per day - using safe parameterized approach
    const dailyBookmarks = await req.db.all(
      `SELECT DATE(created_at) as date, COUNT(*) as new_bookmarks 
       FROM bookmarks 
       WHERE created_at >= datetime('now', '-' || ? || ' days')
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [days]
    );
    
    // Most active times (hourly distribution) - using safe parameterized approach
    const hourlyActivity = await req.db.all(
      `SELECT strftime('%H', timestamp) as hour, COUNT(*) as activity 
       FROM analytics 
       WHERE timestamp >= datetime('now', '-' || ? || ' days')
       GROUP BY strftime('%H', timestamp)
       ORDER BY hour ASC`,
      [days]
    );
    
    res.json({
      daily_clicks: dailyClicks,
      daily_bookmarks: dailyBookmarks,
      hourly_activity: hourlyActivity,
      period_days: days
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;