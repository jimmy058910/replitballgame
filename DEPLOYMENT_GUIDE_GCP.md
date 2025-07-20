# Google Cloud Platform Deployment Guide
## Realm Rivalry Fantasy Sports App

This comprehensive guide will walk you through deploying your Realm Rivalry fantasy sports app to Google Cloud Platform while maintaining your Neon database.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [GCP Project Setup](#gcp-project-setup)
3. [Application Preparation](#application-preparation)
4. [Docker Configuration](#docker-configuration)
5. [Environment Variables & Secrets](#environment-variables--secrets)
6. [Cloud Run Deployment](#cloud-run-deployment)
7. [Domain & SSL Setup](#domain--ssl-setup)
8. [Monitoring & Logging](#monitoring--logging)
9. [CI/CD Pipeline (Optional)](#cicd-pipeline-optional)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Accounts & Tools
- [ ] Google Cloud Platform account with billing enabled
- [ ] Neon database account (existing)
- [ ] Domain name (optional, for custom domain)
- [ ] Local development environment with:
  - [ ] Google Cloud CLI (`gcloud`)
  - [ ] Docker Desktop
  - [ ] Node.js 18+ 
  - [ ] Git

### Install Google Cloud CLI
```bash
# macOS
brew install google-cloud-sdk

# Windows
# Download from https://cloud.google.com/sdk/docs/install

# Linux (Ubuntu/Debian)
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

### Verify Prerequisites
```bash
# Check gcloud installation
gcloud version

# Check Docker installation
docker --version

# Check Node.js version
node --version
```

## GCP Project Setup

### Step 1: Create New GCP Project
```bash
# Set project variables
export PROJECT_ID="realm-rivalry-prod"  # Choose unique name
export PROJECT_NAME="Realm Rivalry Production"
export REGION="us-central1"  # Choose region closest to your users

# Create project
gcloud projects create $PROJECT_ID --name="$PROJECT_NAME"

# Set as active project
gcloud config set project $PROJECT_ID

# Link billing account (required)
gcloud billing projects link $PROJECT_ID --billing-account=BILLING_ACCOUNT_ID
```

### Step 2: Enable Required APIs
```bash
# Enable essential APIs
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  containerregistry.googleapis.com \
  secretmanager.googleapis.com \
  compute.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com
```

### Step 3: Set Default Region
```bash
gcloud config set run/region $REGION
gcloud config set compute/region $REGION
```

## Application Preparation

### Step 1: Optimize Build Configuration

Create `vite.config.production.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['wouter'],
          ui: ['@radix-ui/react-tabs', '@radix-ui/react-dialog'],
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@assets': path.resolve(__dirname, './attached_assets')
    }
  }
})
```

### Step 2: Update Package.json Scripts
```json
{
  "scripts": {
    "build": "vite build --config vite.config.production.ts",
    "start": "NODE_ENV=production node dist/server/index.js",
    "build:server": "tsc --project tsconfig.server.json",
    "build:all": "npm run build:server && npm run build",
    "postbuild": "cp -r public dist/ && cp -r shared dist/"
  }
}
```

### Step 3: Create Production TypeScript Config

Create `tsconfig.server.json`:
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": ".",
    "noEmit": false,
    "target": "ES2020",
    "module": "commonjs"
  },
  "include": [
    "server/**/*",
    "shared/**/*",
    "types/**/*"
  ],
  "exclude": [
    "client",
    "tests",
    "dist"
  ]
}
```

## Docker Configuration

### Step 1: Create Dockerfile
```dockerfile
# Multi-stage build for optimal size
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.server.json ./
COPY vite.config.production.ts ./

# Install all dependencies
RUN npm ci --only=production=false

# Copy source code
COPY . .

# Build application
RUN npm run build:all

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server/index.js"]
```

### Step 2: Create .dockerignore
```
# Development files
node_modules
npm-debug.log*
.env.local
.env.development

# Build outputs (will be created in container)
dist
build

# Version control
.git
.gitignore

# Documentation
*.md
docs/

# Tests
tests/
*.test.*
*.spec.*

# Development tools
.vscode
.idea

# Temporary files
tmp/
logs/
*.log

# OS generated files
.DS_Store
Thumbs.db
```

### Step 3: Add Health Check Endpoint

Update your `server/index.ts`:
```typescript
// Add health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

## Environment Variables & Secrets

### Step 1: Prepare Environment Variables

Create `env.production.example`:
```env
# Database
DATABASE_URL=your_neon_database_url

# Authentication (Google OAuth recommended for GCP)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Alternative: Replit Auth (requires special setup)
# REPLIT_AUTH_CLIENT_ID=your_auth_client_id  
# REPLIT_AUTH_CLIENT_SECRET=your_auth_client_secret
# REPLIT_AUTH_REDIRECT_URI=https://your-domain.com/auth/callback

# Session
SESSION_SECRET=your_session_secret

# External APIs
OPENAI_API_KEY=your_openai_key
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Application
NODE_ENV=production
PORT=8080
```

### Step 2: Store Secrets in GCP Secret Manager
```bash
# Create secrets for sensitive data
gcloud secrets create database-url --data-file=<(echo -n "$DATABASE_URL")
gcloud secrets create session-secret --data-file=<(echo -n "$SESSION_SECRET")
gcloud secrets create stripe-secret-key --data-file=<(echo -n "$STRIPE_SECRET_KEY")
gcloud secrets create stripe-webhook-secret --data-file=<(echo -n "$STRIPE_WEBHOOK_SECRET")
gcloud secrets create openai-api-key --data-file=<(echo -n "$OPENAI_API_KEY")
gcloud secrets create replit-auth-client-secret --data-file=<(echo -n "$REPLIT_AUTH_CLIENT_SECRET")

# Verify secrets
gcloud secrets list
```

### Step 3: Create Service Account
```bash
# Create service account for Cloud Run
gcloud iam service-accounts create realm-rivalry-runner \
  --display-name="Realm Rivalry Cloud Run Service Account"

# Grant secret access
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:realm-rivalry-runner@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Cloud Run Deployment

### Step 1: Build and Push Docker Image
```bash
# Configure Docker for GCP
gcloud auth configure-docker

# Build image
docker build -t gcr.io/$PROJECT_ID/realm-rivalry:latest .

# Push image
docker push gcr.io/$PROJECT_ID/realm-rivalry:latest
```

### Step 2: Deploy to Cloud Run
```bash
# Deploy with environment variables and secrets
gcloud run deploy realm-rivalry \
  --image gcr.io/$PROJECT_ID/realm-rivalry:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --service-account realm-rivalry-runner@$PROJECT_ID.iam.gserviceaccount.com \
  --set-env-vars NODE_ENV=production \
  --set-env-vars PORT=8080 \
  --set-env-vars REPLIT_AUTH_CLIENT_ID=$REPLIT_AUTH_CLIENT_ID \
  --set-secrets DATABASE_URL=database-url:latest \
  --set-secrets SESSION_SECRET=session-secret:latest \
  --set-secrets STRIPE_SECRET_KEY=stripe-secret-key:latest \
  --set-secrets STRIPE_WEBHOOK_SECRET=stripe-webhook-secret:latest \
  --set-secrets OPENAI_API_KEY=openai-api-key:latest \
  --set-secrets REPLIT_AUTH_CLIENT_SECRET=replit-auth-client-secret:latest \
  --memory 2Gi \
  --cpu 2 \
  --concurrency 100 \
  --max-instances 10 \
  --port 8080 \
  --timeout 300s
```

### Step 3: Configure Custom Domain (Optional)
```bash
# Map custom domain
gcloud run domain-mappings create \
  --service realm-rivalry \
  --domain your-domain.com \
  --region $REGION

# Get DNS records to configure
gcloud run domain-mappings describe \
  --domain your-domain.com \
  --region $REGION
```

### Step 4: Configure SSL Certificate
```bash
# Cloud Run automatically provisions SSL certificates for custom domains
# Verify SSL certificate status
gcloud run domain-mappings describe \
  --domain your-domain.com \
  --region $REGION
```

## Monitoring & Logging

### Step 1: Enable Cloud Logging
```bash
# Logs are automatically collected by Cloud Run
# View logs
gcloud logs tail /projects/$PROJECT_ID/logs/run.googleapis.com%2Fstderr --follow

# Create log-based metric for errors
gcloud logging metrics create error_count \
  --description="Count of application errors" \
  --log-filter='resource.type="cloud_run_revision" AND severity="ERROR"'
```

### Step 2: Set Up Monitoring Dashboard
```bash
# Create uptime check
gcloud alpha monitoring uptime-check-configs create \
  --display-name="Realm Rivalry Health Check" \
  --http-check-path="/health" \
  --hostname="your-domain.com" \
  --port=443 \
  --use-ssl
```

### Step 3: Configure Alerting
```bash
# Create alert policy for high error rate
gcloud alpha monitoring policies create \
  --policy-from-file=monitoring-policy.yaml
```

Create `monitoring-policy.yaml`:
```yaml
displayName: "High Error Rate Alert"
conditions:
- displayName: "Error rate above threshold"
  conditionThreshold:
    filter: resource.type="cloud_run_revision"
    comparison: COMPARISON_ABOVE
    thresholdValue: 10
    duration: 300s
    aggregations:
    - alignmentPeriod: 300s
      perSeriesAligner: ALIGN_RATE
      crossSeriesReducer: REDUCE_SUM
notificationChannels:
- projects/$PROJECT_ID/notificationChannels/NOTIFICATION_CHANNEL_ID
```

## CI/CD Pipeline (Optional)

### Step 1: Create GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  PROJECT_ID: realm-rivalry-prod
  SERVICE: realm-rivalry
  REGION: us-central1

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout
      uses: actions/checkout@v3

    - name: Setup Google Cloud CLI
      uses: google-github-actions/setup-gcloud@v1
      with:
        service_account_key: ${{ secrets.GCP_SA_KEY }}
        project_id: ${{ env.PROJECT_ID }}

    - name: Configure Docker
      run: gcloud auth configure-docker

    - name: Build Docker image
      run: |
        docker build -t gcr.io/$PROJECT_ID/$SERVICE:$GITHUB_SHA .
        docker tag gcr.io/$PROJECT_ID/$SERVICE:$GITHUB_SHA gcr.io/$PROJECT_ID/$SERVICE:latest

    - name: Push Docker image
      run: |
        docker push gcr.io/$PROJECT_ID/$SERVICE:$GITHUB_SHA
        docker push gcr.io/$PROJECT_ID/$SERVICE:latest

    - name: Deploy to Cloud Run
      run: |
        gcloud run deploy $SERVICE \
          --image gcr.io/$PROJECT_ID/$SERVICE:$GITHUB_SHA \
          --platform managed \
          --region $REGION \
          --allow-unauthenticated
```

### Step 2: Setup GitHub Secrets
```bash
# Create service account key for GitHub Actions
gcloud iam service-accounts keys create key.json \
  --iam-account realm-rivalry-runner@$PROJECT_ID.iam.gserviceaccount.com

# Add to GitHub repository secrets:
# GCP_SA_KEY: (contents of key.json)
```

## Database Connection Optimization

### Step 1: Configure Connection Pooling

Update your database configuration for production:
```typescript
// server/database/connection.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Connection pool configuration for production
if (process.env.NODE_ENV === 'production') {
  // Configure connection pool
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}
```

### Step 2: Network Configuration for Neon
```bash
# No additional network configuration needed for Neon
# Neon databases are accessible over the internet with SSL
# Ensure DATABASE_URL includes sslmode=require
```

## Performance Optimization

### Step 1: Enable Compression
```typescript
// server/index.ts
import compression from 'compression'

app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false
    }
    return compression.filter(req, res)
  }
}))
```

### Step 2: Configure Caching Headers
```typescript
// Static file caching
app.use(express.static('dist', {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0',
  etag: true,
  lastModified: true
}))

// API response caching middleware
app.use('/api', (req, res, next) => {
  if (req.method === 'GET') {
    res.set({
      'Cache-Control': 'private, max-age=300', // 5 minutes
      'ETag': generateETag(req.url)
    })
  }
  next()
})
```

## Security Configuration

### Step 1: Update CORS Settings
```typescript
// server/index.ts
import cors from 'cors'

const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com', 'https://www.your-domain.com']
    : ['http://localhost:5000', 'http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
}

app.use(cors(corsOptions))
```

### Step 2: Security Headers
```typescript
import helmet from 'helmet'

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "wss:"]
    }
  }
}))
```

## Testing Deployment

### Step 1: Verify Application
```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe realm-rivalry \
  --region $REGION \
  --format 'value(status.url)')

echo "Service URL: $SERVICE_URL"

# Test health endpoint
curl $SERVICE_URL/health

# Test main application
curl -I $SERVICE_URL
```

### Step 2: Load Testing (Optional)
```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Run load test
ab -n 1000 -c 10 $SERVICE_URL/health
```

## Troubleshooting

### Common Issues

#### 1. Container Not Starting
```bash
# Check Cloud Run logs
gcloud logs tail /projects/$PROJECT_ID/logs/run.googleapis.com%2Fstdout --follow

# Common fixes:
# - Ensure PORT environment variable is set to 8080
# - Check Dockerfile EXPOSE directive
# - Verify health check endpoint
```

#### 2. Database Connection Issues
```bash
# Test database connection locally
node -e "
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
prisma.\$connect()
  .then(() => console.log('Database connected'))
  .catch(console.error)
"

# Common fixes:
# - Verify DATABASE_URL in Secret Manager
# - Check Neon database status
# - Ensure SSL mode is enabled
```

#### 3. WebSocket Connection Issues
```bash
# WebSocket connections may require additional configuration
# Cloud Run supports WebSocket connections by default
# Ensure proper WebSocket headers are set
```

### Rollback Deployment
```bash
# List revisions
gcloud run revisions list --service realm-rivalry --region $REGION

# Rollback to previous revision
gcloud run services update-traffic realm-rivalry \
  --to-revisions REVISION-NAME=100 \
  --region $REGION
```

## Cost Optimization

### Step 1: Configure Auto-scaling
```bash
# Update service with cost-optimized settings
gcloud run services update realm-rivalry \
  --min-instances 0 \
  --max-instances 5 \
  --concurrency 100 \
  --cpu 1 \
  --memory 1Gi \
  --region $REGION
```

### Step 2: Enable Budget Alerts
```bash
# Create budget alert
gcloud billing budgets create \
  --billing-account $BILLING_ACCOUNT_ID \
  --display-name "Realm Rivalry Monthly Budget" \
  --budget-amount 100USD \
  --threshold-rule percent=50,basis=current-spend \
  --threshold-rule percent=90,basis=current-spend \
  --threshold-rule percent=100,basis=current-spend
```

## Final Checklist

Before going live:
- [ ] All secrets properly stored in Secret Manager
- [ ] Domain name configured and SSL verified
- [ ] Health checks passing
- [ ] Monitoring and alerts configured
- [ ] Database backups verified (Neon automatic backups)
- [ ] Load testing completed
- [ ] Error handling tested
- [ ] Rollback procedure tested
- [ ] Team access configured
- [ ] Documentation updated

## Post-Deployment

### Step 1: Monitor Initial Traffic
```bash
# Monitor logs for first hour
gcloud logs tail /projects/$PROJECT_ID/logs/run.googleapis.com%2Fstderr --follow

# Check metrics
gcloud monitoring metrics list --filter="resource.type=cloud_run_revision"
```

### Step 2: Performance Tuning
- Monitor response times and adjust CPU/memory if needed
- Analyze slow database queries
- Optimize caching strategies
- Consider CDN for static assets

### Step 3: Regular Maintenance
- Update Docker base images monthly
- Monitor and rotate secrets quarterly
- Review and update IAM permissions
- Keep dependencies updated

## Support Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Neon Database Documentation](https://neon.tech/docs)
- [Google Cloud Pricing Calculator](https://cloud.google.com/products/calculator)
- [Cloud Run Troubleshooting](https://cloud.google.com/run/docs/troubleshooting)

---

This deployment will provide you with a highly scalable, secure, and cost-effective production environment for your Realm Rivalry fantasy sports application on Google Cloud Platform.