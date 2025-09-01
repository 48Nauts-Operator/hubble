# Hubble MCP Client SDK

Easy integration for projects to register their bookmarks with Hubble.

## Installation

```bash
npm install hubble-mcp-client
# or
yarn add hubble-mcp-client
```

## Quick Start

```javascript
const { HubbleClient } = require('hubble-mcp-client');

// Initialize client
const hubble = new HubbleClient({
  mcpUrl: 'http://localhost:9900', // Default Hubble MCP server
  projectName: 'MyProject'
});

// Register a bookmark
await hubble.addBookmark({
  title: 'My App Frontend',
  url: 'http://localhost:3000',
  group: 'MyProject',
  subgroup: 'Development',
  icon: '🎨',
  tags: ['frontend', 'react'],
  environment: 'development'
});
```

## Docker Integration

Add labels to your `docker-compose.yml`:

```yaml
services:
  my-app:
    image: my-app:latest
    labels:
      - "hubble.enable=true"
      - "hubble.title=My Application"
      - "hubble.group=MyProject"
      - "hubble.icon=🚀"
      - "hubble.environment=development"
      - "hubble.tags=frontend,react"
```

## Auto-Registration

Register on application startup:

```javascript
// In your app's entry point
const { autoRegister } = require('hubble-mcp-client');

autoRegister({
  title: process.env.APP_NAME || 'My App',
  url: process.env.APP_URL || `http://localhost:${process.env.PORT}`,
  group: 'MyProject',
  environment: process.env.NODE_ENV || 'development'
});
```

## API Reference

### `HubbleClient`

#### Constructor Options
- `mcpUrl` (string): URL to Hubble MCP server
- `projectName` (string): Your project name

#### Methods

##### `addBookmark(options)`
Add a new bookmark.

```javascript
await hubble.addBookmark({
  title: 'Service Name',        // Required
  url: 'http://...',            // Required
  group: 'Project',             // Required
  subgroup: 'Category',         // Optional
  icon: '🎯',                   // Optional
  description: 'Description',   // Optional
  tags: ['tag1', 'tag2'],      // Optional
  environment: 'production'     // Optional
});
```

##### `updateBookmark(id, updates)`
Update existing bookmark.

##### `deleteBookmark(id)`
Remove a bookmark.

##### `searchBookmarks(query)`
Search for bookmarks.

##### `listBookmarks(filters)`
List bookmarks with filters.

##### `healthCheck(id)`
Check URL health status.

## Environment Variables

```bash
HUBBLE_MCP_URL=http://localhost:9900
HUBBLE_AUTO_REGISTER=true
HUBBLE_PROJECT_NAME=MyProject
HUBBLE_ENVIRONMENT=development
```

## Examples

### Express.js Integration

```javascript
const express = require('express');
const { HubbleClient } = require('hubble-mcp-client');

const app = express();
const hubble = new HubbleClient();

app.listen(3000, async () => {
  await hubble.addBookmark({
    title: 'My Express API',
    url: 'http://localhost:3000',
    group: 'MyProject',
    subgroup: 'APIs',
    environment: 'development'
  });
  console.log('Server running and registered with Hubble');
});
```

### Next.js Integration

```javascript
// next.config.js
const { autoRegister } = require('hubble-mcp-client');

module.exports = {
  async onStart() {
    await autoRegister({
      title: 'Next.js App',
      url: process.env.NEXT_PUBLIC_URL || 'http://localhost:3000',
      group: 'MyProject',
      icon: '⚛️',
      environment: process.env.NODE_ENV
    });
  }
};
```

### Kubernetes Integration

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
  annotations:
    hubble.io/enable: "true"
    hubble.io/title: "My Service"
    hubble.io/group: "Production"
    hubble.io/icon: "🌐"
```

## Error Handling

```javascript
try {
  await hubble.addBookmark({...});
} catch (error) {
  console.error('Failed to register with Hubble:', error);
  // Your app continues to work even if Hubble is down
}
```

## License

MIT