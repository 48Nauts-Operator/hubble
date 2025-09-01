FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy application files
COPY . .

# Build the application
RUN npm run build 2>/dev/null || echo "Build step will be configured later"

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]