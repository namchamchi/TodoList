# Build stage
FROM --platform=linux/amd64 node:20.1.0-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Run tests
RUN npm run build

# Production stage
FROM --platform=linux/amd64 node:20.1.0-alpine

WORKDIR /app  

# Copy package files
COPY --from=builder /app/package*.json ./

# Install production dependencies only
RUN npm install --production

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Expose port
EXPOSE 3000

# Health checkk
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:3000/api/todos || exit 1

# Start application
CMD ["npm", "start"] 