# Production Dockerfile - optimized for Cloud Run
FROM node:20-alpine

# Install system dependencies
RUN apk update && apk upgrade && apk add --no-cache \
    dumb-init \
    ca-certificates

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm install tsx && \
    npm cache clean --force

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 && \
    chown -R nextjs:nodejs /app

USER nextjs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start production server
ENTRYPOINT ["dumb-init", "--"]
CMD ["npx", "tsx", "server/production.ts"]