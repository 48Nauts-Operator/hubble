// ABOUTME: Express server for Hubble backend API
// ABOUTME: Provides REST endpoints for bookmark management

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { 
  userWriteLimiter, 
  userReadLimiter, 
  userSensitiveLimiter, 
  userAuthLimiter,
  extractUserForRateLimit 
} = require('./middleware/rateLimiting');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const { Server } = require('socket.io');
const http = require('http');

// Import routes
const groupRoutes = require('./routes/groups');
const bookmarkRoutes = require('./routes/bookmarks');
const analyticsRoutes = require('./routes/analytics');
const healthRoutes = require('./routes/health');
const discoveryRoutes = require('./routes/discovery');
const backupRoutes = require('./routes/backup');
const shareAdminRoutes = require('./routes/shares-admin');
const sharePublicRoutes = require('./routes/shares-public');
const authRoutes = require('./routes/auth');
const faviconRoutes = require('./routes/favicon');

// Import middleware
const { authMiddleware } = require('./middleware/auth');

// Load environment variables
require('dotenv').config();

const app = express();
// CORS configuration based on environment
const getAllowedOrigins = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const customOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [];
  
  if (isProduction) {
    // Production: Only allow configured domains
    return customOrigins.length > 0 ? customOrigins : ['https://hubble.blockonauts.io'];
  } else {
    // Development: Only allow specific frontend port and configured origins
    const devOrigins = [
      'http://localhost:8888', // Frontend dev server
      'http://127.0.0.1:8888', // Frontend dev server (IP)
      'https://hubble.blockonauts.io', // Allow production domain in dev
    ];
    
    // Allow additional origins only if explicitly configured
    if (customOrigins.length > 0) {
      console.log('Adding custom CORS origins:', customOrigins);
    }
    
    return [...devOrigins, ...customOrigins];
  }
};

const allowedOrigins = getAllowedOrigins();
const corsOptions = {
  origin: function (origin, callback) {
    // In production, reject requests with no origin for security
    // In development, allow for testing with curl, etc.
    if (!origin) {
      return process.env.NODE_ENV === 'production' 
        ? callback(new Error('Origin required by CORS policy'), false)
        : callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`, {
        allowed: allowedOrigins,
        environment: process.env.NODE_ENV
      });
      callback(new Error('Not allowed by CORS policy'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  maxAge: process.env.NODE_ENV === 'production' ? 86400 : 300, // Cache preflight: 24h prod, 5m dev
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions
});

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false // Will be configured separately
}));
app.use(cors(corsOptions));

// Trust proxy settings for correct IP detection behind nginx
app.set('trust proxy', 1);

// Rate limiting configuration
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  validate: { xForwardedForHeader: false }, // Disable x-forwarded-for validation
});

// Stricter rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 login attempts per windowMs
  message: {
    error: 'Too many authentication attempts from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }, // Disable x-forwarded-for validation
});

// Moderate rate limiting for data modification endpoints
const writeLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // limit each IP to 100 write operations per 5 minutes
  message: {
    error: 'Too many write requests from this IP, please slow down.',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }, // Disable x-forwarded-for validation
});

// Apply general rate limiting to all routes
app.use(generalLimiter);

// Extract user info for rate limiting (before route-specific limits)
app.use(extractUserForRateLimit);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Database connection
let db;

async function initializeDb() {
  const dbPath = process.env.DATABASE_URL || '/data/hubble.db';
  
  try {
    // Open database connection
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    console.log('Connected to SQLite database at:', dbPath);
    
    // Initialize database schema
    const { initializeDatabase } = require('./database/init');
    await initializeDatabase(db);
    
    return db;
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
}

// Make database and io available to routes
app.use((req, res, next) => {
  req.db = db;
  req.io = io;
  global.db = db; // Make db available for auth cleanup
  next();
});

// Auth routes - apply rate limiting selectively
// Status checks need less restrictive rate limiting as they're called frequently
app.use('/api/auth/status', generalLimiter, authRoutes);
app.use('/api/auth/verify', generalLimiter, authRoutes);

// Login/setup need strict rate limiting to prevent brute force
app.use('/api/auth/login', userAuthLimiter, authRoutes);
app.use('/api/auth/setup', userAuthLimiter, authRoutes);
app.use('/api/auth/logout', generalLimiter, authRoutes);

// Fallback for any other auth routes
app.use('/api/auth', authRoutes);

// Public share routes (no auth required, moderate limiting)
app.use('/api/public', sharePublicRoutes);

// Favicon proxy route (public but rate limited)
app.use('/api/favicon', userReadLimiter, faviconRoutes);

// Apply auth middleware to all protected routes
app.use(authMiddleware);

// Protected API Routes with user-based rate limiting
app.use('/api/groups', userWriteLimiter, groupRoutes);
app.use('/api/bookmarks', userWriteLimiter, bookmarkRoutes);
app.use('/api/analytics', userReadLimiter, analyticsRoutes); // Read-only, moderate user limits
app.use('/api/health', userReadLimiter, healthRoutes); // Health checks
app.use('/api/discovery', userReadLimiter, discoveryRoutes); // Discovery
app.use('/api/backup', userSensitiveLimiter, backupRoutes); // Backup operations are sensitive
app.use('/api/shares', userWriteLimiter, shareAdminRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Hubble Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      groups: '/api/groups',
      bookmarks: '/api/bookmarks',
      analytics: '/api/analytics',
      health: '/api/health',
      discovery: '/api/discovery',
      backup: '/api/backup',
      shares: {
        admin: {
          list: 'GET /api/shares',
          create: 'POST /api/shares',
          get: 'GET /api/shares/:id',
          update: 'PUT /api/shares/:id',
          delete: 'DELETE /api/shares/:id'
        },
        public: {
          access: 'GET /api/public/share/:uid',
          overlay: {
            save: 'POST /api/public/share/:uid/overlay',
            get: 'GET /api/public/share/:uid/overlay/:sessionId',
            addBookmark: 'POST /api/public/share/:uid/bookmark'
          }
        }
      }
    }
  });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
  
  // Handle bookmark updates
  socket.on('bookmark:update', async (data) => {
    // Broadcast to all clients
    socket.broadcast.emit('bookmark:updated', data);
  });
  
  // Handle health check updates
  socket.on('health:check', async (bookmarkId) => {
    // Trigger health check
    socket.emit('health:result', { bookmarkId, status: 'checking' });
  });
  
  // Handle share view updates
  socket.on('share:join', async (shareUid) => {
    socket.join(`share:${shareUid}`);
    console.log(`Client ${socket.id} joined share room: ${shareUid}`);
  });
  
  socket.on('share:leave', async (shareUid) => {
    socket.leave(`share:${shareUid}`);
    console.log(`Client ${socket.id} left share room: ${shareUid}`);
  });
  
  // Handle personal overlay updates
  socket.on('overlay:update', async (data) => {
    if (data.shareUid) {
      socket.to(`share:${data.shareUid}`).emit('overlay:updated', {
        sessionId: data.sessionId,
        overlay: data.overlay
      });
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  // Log the full error for debugging (server-side only)
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  
  // Categorize errors and provide safe responses
  let status = 500;
  let message = 'Internal server error';
  let code = 'INTERNAL_ERROR';
  
  // Handle specific error types
  if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid request format';
    code = 'INVALID_JSON';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Request entity too large';
    code = 'PAYLOAD_TOO_LARGE';
  } else if (err.name === 'ValidationError') {
    status = 400;
    message = 'Request validation failed';
    code = 'VALIDATION_ERROR';
  } else if (err.name === 'UnauthorizedError' || err.status === 401) {
    status = 401;
    message = 'Authentication required';
    code = 'UNAUTHORIZED';
  } else if (err.status === 403) {
    status = 403;
    message = 'Access forbidden';
    code = 'FORBIDDEN';
  } else if (err.status === 404) {
    status = 404;
    message = 'Resource not found';
    code = 'NOT_FOUND';
  } else if (err.status === 429) {
    status = 429;
    message = 'Too many requests';
    code = 'RATE_LIMITED';
  } else if (err.status && err.status >= 400 && err.status < 500) {
    // Client errors - use status and sanitize message
    status = err.status;
    message = err.message || 'Client error';
    code = 'CLIENT_ERROR';
  } else if (err.status && err.status >= 500 && err.status < 600) {
    // Server errors - log details but return generic message
    status = err.status;
    message = 'Internal server error';
    code = 'SERVER_ERROR';
  } else if (err.name === 'DatabaseError' || err.code === 'SQLITE_ERROR') {
    // Database errors
    status = 503;
    message = 'Service temporarily unavailable';
    code = 'DATABASE_ERROR';
  } else if (err.name === 'TimeoutError' || err.code === 'ETIMEDOUT') {
    // Timeout errors
    status = 504;
    message = 'Request timeout';
    code = 'TIMEOUT';
  }
  
  // Sanitize error message to prevent information disclosure
  const sanitizedMessage = typeof message === 'string' 
    ? message.replace(/\\/g, '').replace(/"/g, '') 
    : 'Internal server error';
  
  const errorResponse = {
    error: sanitizedMessage,
    code: code,
    timestamp: new Date().toISOString(),
    requestId: req.id || 'unknown'
  };
  
  // Only include development details in development environment
  // and only for internal server errors
  if (process.env.NODE_ENV === 'development' && status >= 500) {
    errorResponse.debug = {
      originalMessage: err.message,
      name: err.name,
      // Only include stack for truly internal errors, not client errors
      ...(status >= 500 && { stack: err.stack })
    };
  }
  
  res.status(status).json(errorResponse);
});

// 404 handler
app.use((req, res) => {
  console.log('404 - Endpoint not found:', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'ENDPOINT_NOT_FOUND',
    timestamp: new Date().toISOString(),
    requestId: req.id || 'unknown'
  });
});

// Start server
const PORT = process.env.PORT || 5000;

async function startServer() {
  await initializeDb();
  
  server.listen(PORT, () => {
    console.log(`Hubble Backend API running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Closing server...');
  server.close(() => {
    console.log('Server closed');
  });
  
  if (db) {
    db.close();
    console.log('Database connection closed');
  }
  
  process.exit(0);
});

try {
  startServer();
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}

module.exports = { app, io };