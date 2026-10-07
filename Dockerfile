# syntax=docker/dockerfile:1
# Production Dockerfile for Hermes Launchpad (Coolify / Docker Deployment)

FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies required for vite build and tsx)
RUN npm install --legacy-peer-deps

# Copy source files
COPY . .

# Build the frontend assets to /app/dist
RUN npm run build

# --- Production Runner Stage ---
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data
ENV DATABASE_PATH=/app/data/dashboard.sqlite

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy dependencies and source from builder
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/server ./server
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/index.html ./index.html

# Create persistent storage directory for SQLite database
RUN mkdir -p /app/data && chmod 777 /app/data

# Persistent volume for SQLite data
VOLUME ["/app/data"]

# Expose port (Coolify routes traffic to this port)
EXPOSE 3000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT}/api/stats || exit 1

# Start full-stack server
CMD ["npm", "start"]
