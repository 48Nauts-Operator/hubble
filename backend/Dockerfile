FROM node:20-slim

WORKDIR /app

# Install SQLite3
RUN apt-get update && apt-get install -y sqlite3 && rm -rf /var/lib/apt/lists/*

# Create non-root user for running the application
RUN groupadd -r hubble && useradd -r -g hubble hubble

# Create data directory with restricted permissions
RUN mkdir -p /data && chown hubble:hubble /data && chmod 750 /data

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy application files and set ownership
COPY --chown=hubble:hubble . .

# Switch to non-root user
USER hubble

# Expose port
EXPOSE 5000

# Start the application
CMD ["node", "server.js"]