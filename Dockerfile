# ==================================================
# PRODUCTION TYPESCRIPT DOCKER CONFIGURATION
# Modern multi-stage build aligned with TypeScript architecture
# ==================================================

# ===================================
# STAGE 1: Frontend Build Stage
# ===================================
FROM node:20-slim AS frontend-builder

# Install system dependencies for build
RUN apt-get update && apt-get install -y \
    git \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

WORKDIR /app

# Copy package files FIRST for optimal Docker layer caching
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies in a separate layer for maximum cache efficiency
RUN npm ci --include=dev --no-audit --prefer-offline && \
    npm cache clean --force

# Copy source code
COPY . .

# Accept Firebase configuration as build arguments
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_APP_ID

# Set Firebase environment variables for build
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID

# Debug: Show Firebase configuration status
RUN echo "🔥 Firebase Build Config Check:" && \
    echo "   API Key exists: $(if [ -n "$VITE_FIREBASE_API_KEY" ]; then echo "YES"; else echo "NO"; fi)" && \
    echo "   Project ID: $VITE_FIREBASE_PROJECT_ID" && \
    echo "   App ID exists: $(if [ -n "$VITE_FIREBASE_APP_ID" ]; then echo "YES"; else echo "NO"; fi)"

# Build frontend for production with Firebase configuration
RUN npm run build

# Build TypeScript server to JavaScript
RUN echo "🏗️ Building TypeScript server..." && \
    npm run build:server

# ===================================
# STAGE 2: Production Runtime Stage  
# ===================================
FROM node:20-slim AS production

# Install production system dependencies and create user in single layer
RUN apt-get update && apt-get install -y \
    curl \
    dumb-init \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean \
    && groupadd -r nodeuser && useradd -r -g nodeuser nodeuser

WORKDIR /app

# Copy package files FIRST for optimal Docker layer caching
COPY package*.json ./

# Install production dependencies in separate cached layer
RUN npm ci --only=production --no-audit --prefer-offline \
    && npm cache clean --force

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/dist ./dist

# Copy compiled TypeScript server (compiled to dist directory)
COPY --from=frontend-builder /app/dist/server ./dist/server

# Copy shared files and prisma schema
COPY shared ./shared/
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Create necessary directories with proper permissions
RUN mkdir -p logs tmp \
    && chown -R nodeuser:nodeuser /app

# Switch to non-root user for security
USER nodeuser

# Configure health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8080}/health || exit 1

# Expose the application port
EXPOSE 8080

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Use dumb-init to handle signals properly in containerized environment
ENTRYPOINT ["dumb-init", "--"]

# Start the TypeScript compiled server
CMD ["node", "dist/server/index.js"]