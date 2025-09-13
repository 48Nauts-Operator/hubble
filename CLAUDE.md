# 🔭 Hubble - Intelligent Bookmark Dashboard with MCP Integration

## 🎯 Project Overview
Hubble is a modern, self-hosted bookmark dashboard designed for developers and teams managing multiple projects. Unlike traditional bookmark managers, Hubble provides programmatic access via MCP (Model Context Protocol) for automatic bookmark synchronization and intelligent organization.

**Project Domain**: https://hubble.blockonauts.io (to be configured)
**Frontend Port**: 8888
**Backend API Port**: 8889  
**MCP Server Port**: 9900

## 📁 PROJECT ORGANIZATION RULES - MANDATORY
**CRITICAL**: Keep the codebase clean and organized at all times
- All current working documentation MUST go in `/home/jarvis/projects/Hubble/docs/active-workload/`
- Completed documentation should be moved to appropriate `/docs/` subdirectories
- NEVER leave documentation files in project root or scattered in code directories
- Use clear, descriptive filenames with proper prefixes (e.g., `MCP-`, `API-`, `DATABASE-`, `UI-`)
- Keep README files minimal and point to `/docs/` for detailed documentation

## 🚨 CRITICAL: Development Environment
**IMPORTANT**: We work on a headless Ubuntu server
- Domain: hubble.blockonauts.io
- Nginx reverse proxy with port jump configured
- Docker and Docker Compose available
- SQLite for database (portable, simple)
- MCP SDK available for integration

## 🚨 CRITICAL: Development Environment
**IMPORTANT**: Always check if the docker container are up and running and health 
before you tell Andre the system is ready.
- Always make sure you deployed the frontend or backend changes
- Always make sure you update the versioning and new features or fixes in the UI

## 🚨 CRITICAL: Git Updates
**IMPORTANT**: Always create new PRs with any feature changes you deployed. 

## 🏗️ Architecture Overview

### Tech Stack
```yaml
Frontend:
  Framework: React 18 with TypeScript
  Styling: Tailwind CSS + Radix UI
  State: Zustand (lightweight)
  Icons: Lucide Icons + dynamic favicons
  Search: Fuse.js for fuzzy search
  Animations: Framer Motion

Backend:
  Runtime: Node.js 20+
  Framework: Express.js
  Database: SQLite (portable, simple)
  Websocket: Socket.io
  
MCP Server:
  Framework: @modelcontextprotocol/sdk
  Transport: STDIO
  Tools: bookmark management via MCP protocol

DevOps:
  Container: Docker + Docker Compose
  Proxy: Nginx for reverse proxy
  Storage: Local volumes for persistence
```

## 📋 Task Management
- **DO NOT USE TodoWrite** - It times out at high context
- Use Betty Task Manager instead:
  - Add task: `/home/jarvis/projects/Hubble/betty-tasks.py add "Your task" -p 3`
  - List tasks: `/home/jarvis/projects/Hubble/betty-tasks.py list`
  - Complete task: `/home/jarvis/projects/Hubble/betty-tasks.py complete <task_id>`

## 🎯 Core Features to Implement

### 1. Hierarchical Groups System
- Projects as top-level groups
- Subgroups for environments (Development, UAT, Production)
- Drag-and-drop organization
- Visual hierarchy with icons and colors

### 2. Smart Bookmark Cards
- Title, URL, description, icon
- Environment tags (dev, staging, prod)
- Health status monitoring
- Click tracking and analytics
- Auto-generated favicons

### 3. MCP Integration
```javascript
// Core MCP Tools to implement:
- add_bookmark: Add new bookmark programmatically
- update_bookmark: Update existing bookmark
- delete_bookmark: Remove bookmark
- search_bookmarks: Search across all bookmarks
- list_categories: Get all categories/groups
- health_check: Check URL availability
```

### 4. Auto-Discovery Features
- Docker container inspection
- Service discovery from Docker labels
- Auto-registration on project startup
- Health checks and dead link cleanup

## 🚀 Implementation Phases

### Phase 1: MVP Foundation ✅ CURRENT
- [ ] Project structure setup
- [ ] Docker Compose configuration
- [ ] SQLite database with schema
- [ ] Basic Express.js API
- [ ] CRUD operations for bookmarks/groups

### Phase 2: MCP Server
- [ ] MCP server implementation
- [ ] Tool definitions for bookmark management
- [ ] Client SDK for projects to register
- [ ] Audit logging for MCP operations

### Phase 3: Frontend UI
- [ ] React dashboard with TypeScript
- [ ] Group/Project view navigation
- [ ] Bookmark cards with actions
- [ ] Search functionality
- [ ] Dark/light theme toggle

### Phase 4: Smart Features
- [ ] Health monitoring for URLs
- [ ] Auto-discovery from Docker
- [ ] Analytics dashboard
- [ ] Bulk operations
- [ ] Import/export functionality

### Phase 5: Integrations
- [ ] Docker label scanning
- [ ] Browser extension
- [ ] CLI tool for bookmark management
- [ ] Webhook support for changes

## 🗄️ Database Schema

```sql
-- Groups table for hierarchical organization
groups (
  id, name, parent_id, icon, description, 
  color, sort_order, created_at, updated_at
)

-- Bookmarks table
bookmarks (
  id, group_id, title, url, description, icon,
  tags, color, environment, health_status,
  click_count, created_by, metadata
)

-- Analytics and audit tables
analytics (event tracking)
mcp_audit (MCP operation logging)
```

## 🎯 Success Metrics
- Page load: <500ms
- Search results: <50ms  
- MCP response: <100ms
- Support 1000+ bookmarks
- Handle 100+ concurrent MCP clients

## 🔧 Development Workflow

### Starting New Work
1. Add tasks using betty-tasks.py
2. Check existing project structure
3. Follow the implementation phases
4. Test thoroughly before marking complete

### Docker Commands
```bash
# Build and start services
docker-compose up -d

# Restart specific service
docker-compose restart [service]

# View logs
docker-compose logs -f [service]

# Stop all services
docker-compose down
```

### Testing Strategy
- Unit tests for API endpoints
- Integration tests for MCP operations
- E2E tests for user workflows
- Performance tests for scalability

## ⚠️ Important Notes

### General Rules
- Never use mocked data - implement real functionality
- Never delete files without backup
- Test thoroughly before declaring complete
- Follow existing Betty project patterns where applicable
- Use MCP tools for testing and verification

### UI/UX Principles
- Clean, modern design with ample whitespace
- Developer-centric (not home lab focused)
- Mobile responsive
- Accessibility first (WCAG AAA)
- Subtle animations with Framer Motion

### Integration Examples
Projects can auto-register their bookmarks on startup:
```javascript
// Any project can register with Hubble
await mcpClient.callTool('add_bookmark', {
  title: 'My Service',
  url: 'https://service.example.com',
  group: 'ProjectName',
  subgroup: 'Production',
  icon: '🚀',
  tags: ['api', 'production']
});
```

## 📝 Current Status
- Project concept and design documented
- Implementation guide created
- Ready to begin Phase 1 implementation

## 🔗 Related Documentation
- `/home/jarvis/projects/Hubble/docs/HUBBLE-BOOKMARK-DASHBOARD-CONCEPT.md` - Full concept document
- `/home/jarvis/projects/Hubble/docs/IMPLEMENTATION-GUIDE.md` - Detailed implementation steps

---

# Multi-Agent Orchestration

**CRITICAL**: Leverage specialized sub-agents for complex tasks

## Available Specialized Agents
- **general-purpose**: For complex searches, multi-step tasks
- **frontend-developer**: For React UI implementation
- **backend-architect**: For API and database design
- **devops-automator**: For Docker and deployment setup
- **test-writer-fixer**: For comprehensive test coverage
- **mcp-specialist**: For MCP protocol implementation (if available)

## Agent Usage Rules
- Analyze what specialists are needed before starting
- Use Task tool to delegate to appropriate specialists
- Use multiple agents concurrently when possible
- Your role is orchestrator and integrator

---

*Last Updated: 2025-08-29*
*Status: Ready for Phase 1 Implementation*

## 2025-01-03 – Compact Session

### #CurrentFocus
Completed comprehensive security vulnerability fixes from automated PR review feedback

### #SessionChanges
• Fixed redundant localhost check in frontend validation.ts (lines 51-54)
• Enhanced error handling in server.js with database/timeout/server error categories  
• Extracted common validation middleware to reduce DRY violations across routes
• Implemented user-based rate limiting for authenticated endpoints with JWT/session/IP tracking
• Tightened CORS configuration restricting dev origins to frontend port 8888 only
• Added comprehensive unit tests for rate limiting and validation middleware
• Optimized validation performance with intelligent caching and memory management
• Created Jest test infrastructure with proper mocking and teardown
• Fixed JSON syntax errors in .claude/settings.json configuration file

### #NextSteps  
• Deploy security improvements to production environment
• Monitor rate limiting effectiveness and adjust limits based on usage
• Add integration tests for complete authentication flows
• Review and optimize database query performance
• Implement frontend unit testing with Vitest setup

### #BugsAndTheories
• Rate limiting IPv6 warnings ⇒ express-rate-limit API changes requiring proper keyGenerator
• Validation test failures ⇒ express-validator error format differences from expected structure
• Docker container restart issues ⇒ shared state between test runs requiring proper cleanup

### #Background
Security review identified 9 high/critical vulnerabilities requiring systematic fixes. Implemented defense-in-depth approach with multiple security layers: input validation, rate limiting, error sanitization, and CORS restrictions. All changes maintain backward compatibility while significantly improving security posture.

## 2025-01-03 – Second Compact Session  

### #CurrentFocus
Explored Hubble's existing Docker discovery capabilities and discussed next feature priorities

### #SessionChanges
• Fixed JSON syntax errors in .claude/settings.json (missing comma, improper nesting, missing closing brace)
• Analyzed sophisticated Docker discovery system revealing enterprise-grade auto-detection capabilities
• Discovered existing service type detection, reverse proxy integration, real-time monitoring features
• Reviewed PreCompact hook configuration and troubleshooted triggering at 90% context threshold

### #NextSteps
• Build frontend UI to visualize and manage discovered Docker services 
• Implement health check integration for discovered services
• Add scheduled auto-import for Docker services every 5 minutes
• Create health monitoring dashboard for real-time service status
• Add Docker Compose project-based grouping

### #BugsAndTheories  
• PreCompact hook not auto-triggering at 90% ⇒ Claude Code hook execution context or threshold detection issue
• Docker discovery lacks UI ⇒ backend functionality complete but needs user-facing interface

### #Background
Session revealed Hubble already has advanced Docker discovery capabilities including automatic service detection, metadata extraction from labels, reverse proxy support (Traefik/Nginx), and Docker event monitoring. Focus should shift to frontend interface development.