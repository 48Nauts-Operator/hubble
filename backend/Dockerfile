FROM node:20-slim

WORKDIR /app

# Install SQLite3
RUN apt-get update && apt-get install -y sqlite3 && rm -rf /var/lib/apt/lists/*

# Create data directory with proper permissions
RUN mkdir -p /data && chmod 777 /data

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy application files
COPY . .

# Expose port
EXPOSE 5000

# Start the application
CMD ["node", "server.js"]