# Project Structure - Hubble v1.3.0

## Directory Tree Overview
```
Hubble/
├── .github/                    # GitHub specific files
│   ├── workflows/             # CI/CD workflows
│   │   └── claude-review.yml  # Automated PR reviews
│   ├── scripts/              
│   │   └── claude-review.js   # Review automation script
│   ├── ISSUE_TEMPLATE/        # Issue templates
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── PULL_REQUEST_TEMPLATE.md
│
├── backend/                    # Express.js API server
│   ├── database/              # Database files
│   │   ├── migrations/        # SQL migration files
│   │   │   ├── 002_sharing_system.sql
│   │   │   ├── 003_auth_system.sql
│   │   │   └── add-dual-urls.sql
│   │   ├── init.js           # Database initialization
│   │   ├── schema.sql         # Main database schema
│   │   └── hubble.db          # SQLite database file
│   ├── middleware/            # Express middleware
│   │   └── auth.js           # JWT authentication middleware
│   ├── routes/               # API endpoints
│   │   ├── analytics.js     # Analytics endpoints
│   │   ├── auth.js          # Authentication endpoints
│   │   ├── backup.js        # Backup/restore endpoints
│   │   ├── bookmarks.js     # Bookmark CRUD operations
│   │   ├── discovery.js     # Docker discovery endpoints
│   │   ├── groups.js        # Group management
│   │   ├── health.js        # Health check endpoints
│   │   ├── shares.js        # Share management
│   │   ├── shares-admin.js  # Admin share operations
│   │   └── shares-public.js # Public share access
│   ├── services/             # Business logic
│   │   └── dockerDiscovery.js # Docker container discovery
│   ├── scripts/              # Utility scripts
│   │   └── seed-developer-data.js # Demo data seeder
│   ├── tests/                # Test files
│   │   └── api.test.js      # API endpoint tests
│   ├── server.js            # Main server file
│   ├── package.json         # Node dependencies
│   ├── package-lock.json    # Dependency lock file
│   └── Dockerfile           # Backend container config
│
├── frontend/                   # React TypeScript application
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── shares/     # Sharing system components
│   │   │   │   ├── CreateShareWizard.tsx
│   │   │   │   ├── ShareManager.tsx
│   │   │   │   └── SharesList.tsx
│   │   │   ├── ui/         # Reusable UI components
│   │   │   ├── AddBookmarkModal.tsx
│   │   │   ├── AddGroupModal.tsx
│   │   │   ├── BackupRestore.tsx
│   │   │   ├── BookmarkCard.tsx
│   │   │   ├── BookmarkGrid.tsx
│   │   │   ├── BookmarkList.tsx
│   │   │   ├── DiscoveryPanel.tsx
│   │   │   ├── EditBookmarkModal.tsx
│   │   │   ├── EditGroupModal.tsx
│   │   │   ├── GroupSidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   └── SettingsModal.tsx
│   │   ├── pages/          # Page components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Login.tsx
│   │   │   └── SharedView.tsx
│   │   ├── services/       # API clients
│   │   │   ├── api.ts     # API service layer
│   │   │   └── auth.ts    # Auth service
│   │   ├── stores/        # Zustand state management
│   │   │   ├── authStore.ts
│   │   │   ├── bookmarkStore.ts
│   │   │   └── uiStore.ts
│   │   ├── styles/        # CSS and styling
│   │   │   └── index.css  # Global styles
│   │   ├── utils/         # Utility functions
│   │   │   └── helpers.ts
│   │   ├── hooks/         # Custom React hooks
│   │   ├── App.tsx        # Main app component
│   │   └── main.tsx       # Entry point
│   ├── public/            # Static assets
│   │   ├── hubble-icon.svg
│   │   └── vite.svg
│   ├── package.json       # Frontend dependencies
│   ├── tsconfig.json      # TypeScript config
│   ├── vite.config.ts     # Vite build config
│   └── Dockerfile         # Frontend container config
│
├── mcp-server/                 # MCP Protocol Server
│   ├── index.js             # MCP server implementation
│   ├── package.json         # MCP dependencies
│   └── Dockerfile          # MCP container config
│
├── mcp-client/                # MCP test client
│   ├── index.js            # Test client script
│   ├── package.json        
│   └── README.md
│
├── docs/                      # Documentation
│   ├── active-workload/    # Current work documents
│   ├── assets/            # Images and media
│   ├── HUBBLE-BOOKMARK-DASHBOARD-CONCEPT.md
│   ├── IMPLEMENTATION-GUIDE.md
│   ├── MCP-CLAUDE-SETUP.md
│   └── [screenshots]      # Various UI screenshots
│
├── .context/                  # Project analysis (NEW)
│   ├── overall_project_status.md
│   ├── feature_checklist.md
│   ├── identified_issues.md
│   ├── recommendations.md
│   ├── deployment_readiness.md
│   └── project_structure.md
│
├── data/                      # Persistent data volumes
│   └── hubble.db           # Production database
│
├── .vscode/                   # VS Code settings
│   └── settings.json
│
├── docker-compose.yml         # Container orchestration
├── .env.example              # Environment template
├── README.md                 # Project documentation
├── CONTRIBUTING.md           # Contribution guidelines
├── LICENSE                   # CC BY-NC 4.0 License
├── CLAUDE.md                # AI assistant instructions
└── .gitignore               # Git ignore rules
```

## File Count Statistics
- **Total Files**: 146 (excluding node_modules)
- **TypeScript/TSX**: 35 files
- **JavaScript**: 25 files
- **SQL**: 5 files
- **JSON**: 12 files
- **Markdown**: 15 files
- **Docker**: 4 files

## Key Component Locations

### Frontend Components
- **Authentication**: `frontend/src/pages/Login.tsx`
- **Main Dashboard**: `frontend/src/pages/Dashboard.tsx`
- **Bookmark Display**: `frontend/src/components/BookmarkCard.tsx`
- **Group Management**: `frontend/src/components/GroupSidebar.tsx`
- **Sharing System**: `frontend/src/components/shares/`
- **State Management**: `frontend/src/stores/`

### Backend Services
- **API Server**: `backend/server.js`
- **Authentication**: `backend/middleware/auth.js`
- **Database**: `backend/database/`
- **API Routes**: `backend/routes/`
- **Docker Integration**: `backend/services/dockerDiscovery.js`

### MCP Integration
- **Server**: `mcp-server/index.js`
- **Tools**: 9 MCP tools implemented
- **Client**: `mcp-client/index.js` (for testing)

## New Files Since Last Analysis
The `.context/` directory has been created with 6 comprehensive analysis files:
1. `overall_project_status.md` - Executive summary and metrics
2. `feature_checklist.md` - Detailed feature completion tracking
3. `identified_issues.md` - Bugs and improvement areas
4. `recommendations.md` - Strategic next steps
5. `deployment_readiness.md` - Production readiness assessment
6. `project_structure.md` - This file

## Database Structure
- **Main Database**: `data/hubble.db`
- **Tables**: 11 tables including bookmarks, groups, auth, shares
- **Migrations**: 3 migration files applied
- **Indexes**: 10 indexes for performance
- **Views**: 1 view for bookmark statistics

## Docker Services
1. **hubble-frontend** (Port 8888)
   - React application
   - Nginx serving static files
   
2. **hubble-backend** (Port 8889)
   - Express.js API
   - SQLite database
   - WebSocket server
   
3. **hubble-mcp** (Port 9900)
   - MCP protocol server
   - 9 bookmark management tools

## Configuration Files
- **Frontend Build**: `vite.config.ts`
- **TypeScript**: `tsconfig.json`
- **Docker**: `docker-compose.yml`
- **Environment**: `.env.example`
- **Git Ignore**: `.gitignore`
- **VS Code**: `.vscode/settings.json`

## Test Coverage
- **Backend Tests**: `backend/tests/`
- **Frontend Tests**: Not yet implemented
- **Coverage**: ~40% overall

## Documentation
- **User Guide**: `README.md`
- **Contributing**: `CONTRIBUTING.md`
- **Concepts**: `docs/HUBBLE-BOOKMARK-DASHBOARD-CONCEPT.md`
- **Implementation**: `docs/IMPLEMENTATION-GUIDE.md`
- **MCP Setup**: `docs/MCP-CLAUDE-SETUP.md`

## Recent Changes
- Added comprehensive `.context/` analysis directory
- Authentication system fully implemented
- Sharing system with QR codes completed
- Docker discovery fixed for auth
- Documentation updated to v1.3.0

## Critical Paths
- **User Registration**: Login.tsx → auth.js → auth_config table
- **Bookmark Creation**: AddBookmarkModal → bookmarks.js → bookmarks table
- **Share Creation**: CreateShareWizard → shares.js → shared_views table
- **Docker Discovery**: DiscoveryPanel → discovery.js → dockerDiscovery.js
- **MCP Operations**: MCP client → mcp-server/index.js → database

## Build & Deploy
```bash
# Development
npm run dev (frontend)
npm start (backend)

# Production
docker-compose up -d

# Testing
npm test (backend)
```

## Module Dependencies
- **Frontend**: React 18, TypeScript, Tailwind, Zustand, Framer Motion
- **Backend**: Express, SQLite3, Socket.io, bcrypt, jsonwebtoken
- **MCP**: @modelcontextprotocol/sdk
- **Build**: Vite, Docker, Docker Compose