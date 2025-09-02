// ABOUTME: Express server for Hubble backend API
// ABOUTME: Provides REST endpoints for bookmark management

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
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

// Import middleware
const authMiddleware = require('./middleware/auth');

// Load environment variables
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['https://hubble.blockonauts.io', 'http://rufus.blockonauts.io:8888', 'http://localhost:3378', 'http://localhost:8888', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(cors({
  origin: ['https://hubble.blockonauts.io', 'http://rufus.blockonauts.io:8888', 'http://localhost:3378', 'http://localhost:8888', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
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

// Auth routes (no middleware needed - handles its own auth)
app.use('/api/auth', authRoutes);

// Public share routes (no auth required)
app.use('/api/public', sharePublicRoutes);

// Apply auth middleware to all protected routes
app.use(authMiddleware);

// Protected API Routes
app.use('/api/groups', groupRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/discovery', discoveryRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/shares', shareAdminRoutes);

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
  console.error('Error:', err);
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
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