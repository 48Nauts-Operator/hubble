# Contributing to Hubble

First off, thank you for considering contributing to Hubble! It's people like you that make Hubble such a great tool for the developer community.

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct:

- **Be respectful** - Disagreements happen, but respect differing viewpoints
- **Be constructive** - Provide helpful feedback and suggestions
- **Be inclusive** - Welcome newcomers and help them get started
- **Be patient** - Remember that everyone was a beginner once

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

1. **Use a clear and descriptive title**
2. **Describe the exact steps to reproduce the problem**
3. **Provide specific examples**
4. **Describe the behavior you observed and expected**
5. **Include screenshots if relevant**
6. **Include your environment details** (OS, browser, Docker version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

1. **Use a clear and descriptive title**
2. **Provide a detailed description of the suggested enhancement**
3. **Explain why this enhancement would be useful**
4. **List any alternative solutions you've considered**

### Pull Requests

1. **Fork the repo** and create your branch from `main`
2. **Follow the existing code style** - consistency is key
3. **Write clear commit messages**:
   ```
   feat: Add bookmark export functionality
   
   - Implement CSV export for bookmarks
   - Add JSON export option
   - Include group hierarchy in exports
   ```
4. **Add tests** if you're adding new functionality
5. **Update documentation** if needed
6. **Ensure all tests pass** before submitting
7. **Request review** from maintainers

## Development Setup

### Prerequisites
- Node.js 20+
- Docker and Docker Compose
- Git

### Local Development

1. **Clone your fork**
```bash
git clone git@github.com:your-username/hubble.git
cd hubble
```

2. **Install dependencies**
```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install

# MCP Server
cd ../mcp-server
npm install
```

3. **Start development servers**
```bash
# Using Docker Compose (recommended)
docker-compose up

# Or manually
cd frontend && npm run dev
cd backend && npm run dev
cd mcp-server && npm start
```

4. **Make your changes**
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`
- MCP Server: `http://localhost:9900`

## Coding Standards

### JavaScript/TypeScript
- Use ESLint configuration provided
- Prefer functional components in React
- Use TypeScript for new code
- Keep functions small and focused

### CSS
- Use Tailwind CSS utilities when possible
- Follow mobile-first responsive design
- Maintain consistent spacing and colors

### Git Commits
- Use conventional commits format
- Keep commits atomic and focused
- Write meaningful commit messages

Types:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

### Testing

Run tests before submitting:

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# E2E tests
npm run test:e2e
```

## Project Structure

```
Hubble/
├── frontend/          # React application
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── stores/       # Zustand stores
│   │   ├── services/     # API services
│   │   └── utils/        # Utility functions
│   └── tests/           # Frontend tests
│
├── backend/           # Express.js server
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── database/        # Database schemas
│   └── tests/           # Backend tests
│
└── mcp-server/        # MCP protocol server
    └── tests/           # MCP tests
```

## Areas for Contribution

### High Priority
- 🔐 Optional authentication system
- 🌍 Internationalization (i18n)
- 📱 Mobile app (React Native)
- 🔄 Browser extension

### Medium Priority
- 📊 Advanced analytics dashboard
- 🏷️ AI-powered tagging
- 🔍 Advanced search filters
- 🎨 Custom themes

### Good First Issues
- 📝 Documentation improvements
- 🐛 Bug fixes
- 🎨 UI/UX enhancements
- ✅ Test coverage improvements

## Questions?

Feel free to:
- Open an issue for questions
- Start a discussion in GitHub Discussions
- Tag @48Nauts-Operator in your PR

## Recognition

Contributors will be:
- Listed in the README
- Mentioned in release notes
- Given credit in commit messages

Thank you for making Hubble better! 🚀