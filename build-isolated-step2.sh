#!/bin/bash
# STEP 2 ISOLATED BUILD: Create completely clean build directory with ZERO external dependencies

echo "🧹 STEP 2 ISOLATION: Creating completely clean build environment..."

# Create isolated build directory
rm -rf /tmp/step2-isolated
mkdir -p /tmp/step2-isolated

# Copy ONLY the essential files (no server/ directory contamination)
echo "📋 Copying essential files only..."
cp package.json /tmp/step2-isolated/
cp package-lock.json /tmp/step2-isolated/
cp server-express-database.js /tmp/step2-isolated/
cp -r prisma /tmp/step2-isolated/

# Create minimal Dockerfile for isolated build
cat > /tmp/step2-isolated/Dockerfile << 'EOF'
FROM node:20.19.4-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache curl

WORKDIR /app

# Copy and install dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy application and schema
COPY server-express-database.js ./
COPY prisma ./prisma/

# Generate Prisma client (in isolation)
RUN npx prisma generate

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs
RUN chown -R nodejs:nodejs /app

USER nodejs
EXPOSE 8080
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

CMD ["node", "server-express-database.js"]
EOF

echo "✅ Isolated Step 2 build environment created in /tmp/step2-isolated"
echo "🚀 Ready for clean Docker build without external dependencies"