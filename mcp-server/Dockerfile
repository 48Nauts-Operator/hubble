FROM node:20-alpine

WORKDIR /app

# Install SQLite3 and build dependencies for native modules
RUN apk add --no-cache sqlite python3 make g++

# Create data directory with proper permissions
RUN mkdir -p /data && chmod 777 /data

# Copy package files
COPY package*.json ./

# Install dependencies with rebuild for Alpine
RUN npm install && npm rebuild better-sqlite3

# Copy application files
COPY . .

# Expose port
EXPOSE 9900

# Start the MCP HTTP server
CMD ["node", "mcp-http-server.js"]