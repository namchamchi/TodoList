# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Run tests
RUN npm test

# Production stage
FROM node:20-alpine

WORKDIR /app  

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --production

# Copy built files from builder
COPY --from=builder /app/app.js .
COPY --from=builder /app/routes ./routes
COPY --from=builder /app/controllers ./controllers
COPY --from=builder /app/models ./models
COPY --from=builder /app/data ./data
COPY --from=builder /app/public ./public

# Expose port
EXPOSE 3000

# Health checkk
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:3000/api/todos || exit 1

# Start application
CMD ["node", "app.js"] 