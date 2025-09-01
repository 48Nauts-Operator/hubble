# 🚀 Hubble Implementation Guide

## Phase 1: Foundation Setup (Day 1)

### 1.1 Project Initialization
```bash
# Create project structure
mkdir -p {frontend,backend,mcp-server,database,docker,scripts,docs}

# Initialize package.json for each service
cd backend && npm init -y
cd ../frontend && npm init -y
cd ../mcp-server && npm init -y
```

### 1.2 Docker Setup
```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "8888:3073"
    environment:
      - REACT_APP_API_URL=http://localhost:8889
      - REACT_APP_MCP_URL=http://localhost:9900
    volumes:
      - ./frontend:/app
      - /app/node_modules

  backend:
    build: ./backend
    ports:
      - "8889:5000"
    environment:
      - DATABASE_URL=/data/hubble.db
      - MCP_SERVER_URL=http://mcp-server:9900
    volumes:
      - ./backend:/app
      - ./data:/data
      - /app/node_modules

  mcp-server:
    build: ./mcp-server
    ports:
      - "9900:9900"
    environment:
      - DATABASE_URL=/data/hubble.db
    volumes:
      - ./mcp-server:/app
      - ./data:/data
      - /app/node_modules

volumes:
  data:
```

### 1.3 Database Schema
```sql
-- database/schema.sql

-- Groups table for hierarchical organization
CREATE TABLE groups (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  parent_id TEXT,
  icon TEXT,
  description TEXT,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES groups(id) ON DELETE CASCADE
);

-- Bookmarks table
CREATE TABLE bookmarks (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  group_id TEXT,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  tags TEXT, -- JSON array
  color TEXT,
  environment TEXT, -- 'development', 'uat', 'production'
  health_status TEXT DEFAULT 'unknown',
  last_health_check DATETIME,
  click_count INTEGER DEFAULT 0,
  last_accessed DATETIME,
  created_by TEXT, -- 'mcp' or 'user'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT, -- JSON object
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_bookmarks_group ON bookmarks(group_id);
CREATE INDEX idx_bookmarks_url ON bookmarks(url);
CREATE INDEX idx_groups_parent ON groups(parent_id);
```

## Phase 2: Backend API (Day 2)

### 2.1 Express Server Setup
```javascript
// backend/server.js
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const app = express();
app.use(cors());
app.use(express.json());

// Database connection
let db;
(async () => {
  db = await open({
    filename: process.env.DATABASE_URL,
    driver: sqlite3.Database
  });
})();

// Groups endpoints
app.get('/api/groups', async (req, res) => {
  const groups = await db.all('SELECT * FROM groups ORDER BY sort_order');
  res.json(groups);
});

app.post('/api/groups', async (req, res) => {
  const { name, parent_id, icon, description, color } = req.body;
  const result = await db.run(
    'INSERT INTO groups (name, parent_id, icon, description, color) VALUES (?, ?, ?, ?, ?)',
    [name, parent_id, icon, description, color]
  );
  res.json({ id: result.lastID, ...req.body });
});

// Bookmarks endpoints
app.get('/api/bookmarks', async (req, res) => {
  const { group_id } = req.query;
  const query = group_id 
    ? 'SELECT * FROM bookmarks WHERE group_id = ?'
    : 'SELECT * FROM bookmarks';
  const bookmarks = await db.all(query, group_id ? [group_id] : []);
  res.json(bookmarks);
});

app.post('/api/bookmarks', async (req, res) => {
  const { group_id, title, url, description, icon, tags, environment } = req.body;
  const result = await db.run(
    'INSERT INTO bookmarks (group_id, title, url, description, icon, tags, environment, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [group_id, title, url, description, icon, JSON.stringify(tags), environment, 'user']
  );
  res.json({ id: result.lastID, ...req.body });
});

app.listen(5000, () => {
  console.log('Backend API running on port 5000');
});
```

## Phase 3: MCP Server (Day 3)

### 3.1 MCP Implementation
```javascript
// mcp-server/index.js
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

class HubbleMCPServer {
  constructor() {
    this.server = new Server({
      name: 'hubble-mcp',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {}
      }
    });
    
    this.setupTools();
  }

  setupTools() {
    // Add bookmark tool
    this.server.setRequestHandler('tools/list', async () => ({
      tools: [
        {
          name: 'add_bookmark',
          description: 'Add a new bookmark to Hubble',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              url: { type: 'string' },
              group: { type: 'string' },
              subgroup: { type: 'string' },
              icon: { type: 'string' },
              description: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } }
            },
            required: ['title', 'url', 'group']
          }
        },
        {
          name: 'list_bookmarks',
          description: 'List bookmarks from a group',
          inputSchema: {
            type: 'object',
            properties: {
              group: { type: 'string' },
              subgroup: { type: 'string' }
            }
          }
        }
      ]
    }));

    // Handle tool calls
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;
      
      switch (name) {
        case 'add_bookmark':
          return await this.addBookmark(args);
        case 'list_bookmarks':
          return await this.listBookmarks(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async addBookmark(args) {
    // Implementation here
    const db = await this.getDb();
    // Add bookmark logic
    return { content: [{ type: 'text', text: 'Bookmark added successfully' }] };
  }

  async listBookmarks(args) {
    // Implementation here
    const db = await this.getDb();
    // List bookmarks logic
    return { content: [{ type: 'text', text: JSON.stringify(bookmarks) }] };
  }
}

// Start server
const server = new HubbleMCPServer();
const transport = new StdioServerTransport();
server.server.connect(transport);
```

## Phase 4: Frontend UI (Day 4-5)

### 4.1 React Setup
```jsx
// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import { GroupGrid } from './components/GroupGrid';
import { BookmarkGrid } from './components/BookmarkGrid';
import { SearchBar } from './components/SearchBar';

function App() {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    const res = await fetch('http://localhost:8889/api/groups');
    const data = await res.json();
    setGroups(data);
  };

  const fetchBookmarks = async (groupId) => {
    const res = await fetch(`http://localhost:8889/api/bookmarks?group_id=${groupId}`);
    const data = await res.json();
    setBookmarks(data);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">🔭 Hubble</h1>
            <SearchBar />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {!selectedGroup ? (
          <GroupGrid 
            groups={groups} 
            onGroupClick={(group) => {
              setSelectedGroup(group);
              fetchBookmarks(group.id);
            }}
          />
        ) : (
          <BookmarkGrid 
            group={selectedGroup}
            bookmarks={bookmarks}
            onBack={() => setSelectedGroup(null)}
          />
        )}
      </main>
    </div>
  );
}

export default App;
```

### 4.2 Group Card Component
```jsx
// frontend/src/components/GroupCard.jsx
import React from 'react';
import { motion } from 'framer-motion';

export function GroupCard({ group, onClick }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 cursor-pointer"
      onClick={() => onClick(group)}
    >
      <div className="text-4xl mb-2">{group.icon || '📁'}</div>
      <h3 className="text-lg font-semibold">{group.name}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {group.description || `${group.bookmarkCount || 0} bookmarks`}
      </p>
    </motion.div>
  );
}
```

## Phase 5: Testing & Deployment (Day 6)

### 5.1 Testing
```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# E2E tests
npm run test:e2e
```

### 5.2 Production Build
```bash
# Build all services
docker-compose build

# Start production
docker-compose -f docker-compose.prod.yml up -d
```

## 🎯 Success Metrics

- [ ] Groups and subgroups working
- [ ] MCP server accepting connections
- [ ] Bookmarks can be added via UI and MCP
- [ ] Search functionality working
- [ ] Dark/light mode toggle
- [ ] Health checks for URLs
- [ ] Click tracking working
- [ ] Mobile responsive

## 📝 Next Steps

1. Add authentication (optional)
2. Implement health monitoring
3. Add import/export functionality
4. Create browser extension
5. Add webhook support

---

Ready to build! Start with Phase 1 and work through each phase systematically.