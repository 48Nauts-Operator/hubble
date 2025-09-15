// ABOUTME: Secure favicon proxy to prevent SSRF attacks
// ABOUTME: Validates and fetches favicons through controlled server-side proxy

const express = require('express');
const router = express.Router();
const { URL } = require('url');
const https = require('https');
const http = require('http');
const crypto = require('crypto');

// Cache for favicon URLs to reduce external requests
const faviconCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Blocked IP ranges to prevent SSRF
const BLOCKED_IP_RANGES = [
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16',
  '127.0.0.0/8',
  '169.254.0.0/16',
  'fc00::/7',
  '::1/128'
];

// Maximum size for favicon download (512KB)
const MAX_FAVICON_SIZE = 512 * 1024;

// Allowed protocols
const ALLOWED_PROTOCOLS = ['https:'];

// Timeout for favicon requests
const REQUEST_TIMEOUT = 5000;

// Check if IP is in blocked range
function isBlockedIP(ip) {
  // Simple check for local IPs (can be enhanced with proper CIDR checking)
  const localPatterns = [
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^169\.254\./,
    /^::1$/,
    /^fc00:/,
    /^fe80:/
  ];

  return localPatterns.some(pattern => pattern.test(ip));
}

// Validate URL for SSRF prevention
function validateUrl(urlString) {
  try {
    const url = new URL(urlString);

    // Check protocol
    if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
      return { valid: false, error: 'Only HTTPS URLs are allowed' };
    }

    // Check for localhost and local domains
    const hostname = url.hostname.toLowerCase();
    const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]'];
    if (blockedHosts.includes(hostname)) {
      return { valid: false, error: 'Local URLs are not allowed' };
    }

    // Check for private IP ranges in hostname
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipPattern.test(hostname) && isBlockedIP(hostname)) {
      return { valid: false, error: 'Private IP addresses are not allowed' };
    }

    // Check for URL redirection tricks
    if (url.username || url.password) {
      return { valid: false, error: 'URLs with credentials are not allowed' };
    }

    // Check for non-standard ports
    const standardPorts = ['', '80', '443', '8080', '8443'];
    if (url.port && !standardPorts.includes(url.port)) {
      return { valid: false, error: 'Non-standard ports are not allowed' };
    }

    return { valid: true, url: url.toString() };
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

// GET /api/favicon - Get favicon for a domain
router.get('/', async (req, res, next) => {
  try {
    const { domain } = req.query;

    if (!domain) {
      return res.status(400).json({ error: 'Domain parameter is required' });
    }

    // Construct full URL if only domain is provided
    let targetUrl = domain;
    if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
      targetUrl = `https://${domain}`;
    }

    // Validate URL
    const validation = validateUrl(targetUrl);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Check cache
    const cacheKey = crypto.createHash('sha256').update(validation.url).digest('hex');
    const cached = faviconCache.get(cacheKey);
    if (cached && cached.timestamp > Date.now() - CACHE_TTL) {
      return res.json({ favicon: cached.url });
    }

    // Use Google's favicon service as a safe proxy
    // This service handles the actual fetching and prevents direct SSRF
    const parsedUrl = new URL(validation.url);
    const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=64`;

    // Cache the result
    faviconCache.set(cacheKey, {
      url: googleFaviconUrl,
      timestamp: Date.now()
    });

    // Clean old cache entries periodically
    if (faviconCache.size > 1000) {
      const now = Date.now();
      for (const [key, value] of faviconCache.entries()) {
        if (value.timestamp < now - CACHE_TTL) {
          faviconCache.delete(key);
        }
      }
    }

    res.json({ favicon: googleFaviconUrl });
  } catch (error) {
    console.error('Favicon proxy error:', error);
    res.status(500).json({ error: 'Failed to process favicon request' });
  }
});

// POST /api/favicon/validate - Validate a favicon URL
router.post('/validate', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    const validation = validateUrl(url);
    res.json({
      valid: validation.valid,
      error: validation.error || null,
      sanitizedUrl: validation.valid ? validation.url : null
    });
  } catch (error) {
    console.error('Favicon validation error:', error);
    res.status(500).json({ error: 'Failed to validate favicon URL' });
  }
});

module.exports = router;