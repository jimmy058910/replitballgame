# Complete Deployment Guide - Realm Rivalry

This guide documents the **proven working deployment process** for Realm Rivalry to Google Cloud Run.

## 🎯 Deployment Success Summary

**Status**: ✅ PRODUCTION OPERATIONAL  
**Live URL**: https://realmrivalry.com  
**Service URL**: https://realm-rivalry-108005641993.us-east5.run.app  
**Last Successful Deploy**: July 29, 2025

## 🔧 Critical Fix Required Before Deployment

### Logger TypeError Fix (MANDATORY)

**Problem**: Server crashes with `TypeError: createLogger is not a function`  
**Root Cause**: Export/import mismatch between logger utility and service files  
**Solution**: Fix import statements in 3 critical files

```bash
# Run this FIRST before any deployment attempt
FILES=(
  "server/services/webSocketService.ts"
  "server/services/matchStateManager.ts"
  "server/routes/tournamentFixRoutes.ts"
)

echo "🚀 Fixing logger TypeError in 3 files..."
for file in "${FILES[@]}"; do
  echo "Fixing $file..."
  # Remove the incorrect line: const logger = createLogger(...)
  sed -i '/const logger = createLogger/d' "$file"
  # Change the incorrect import to the correct one
  sed -i 's/import createLogger from/import logger from/' "$file"
done
echo "✅ All logger issues fixed."
```

## 🚀 Deployment Methods

### Method 1: Automated GitHub Actions (Recommended)

**Setup**: Already configured in `.github/workflows/deploy.yml`

**Trigger Deployment**:
```bash
# Push to main branch triggers automatic deployment
git add .
git commit -m "Deploy to production"
git push origin main
```

**Manual Trigger**:
1. Go to GitHub Actions tab
2. Select "Deploy to Cloud Run" workflow
3. Click "Run workflow" button

### Method 2: Manual Script Deployment

**Prerequisites**:
```bash
# Authenticate with Google Cloud
gcloud auth login
gcloud config set project direct-glider-465821-p7
gcloud auth configure-docker us-east5-docker.pkg.dev
```

**Deploy**:
```bash
# Apply logger fix first (if not done)
./fix-logger-issue.sh

# Run deployment script
./deploy-production.sh
```

### Method 3: Manual Command Deployment

```bash
# 1. Apply logger fix
./fix-logger-issue.sh

# 2. Build Docker image
docker build -f Dockerfile.production -t us-east5-docker.pkg.dev/direct-glider-465821-p7/realm-rivalry/production:latest .

# 3. Push to registry
docker push us-east5-docker.pkg.dev/direct-glider-465821-p7/realm-rivalry/production:latest

# 4. Deploy to Cloud Run
gcloud run deploy realm-rivalry \
  --image us-east5-docker.pkg.dev/direct-glider-465821-p7/realm-rivalry/production:latest \
  --platform managed \
  --region us-east5 \
  --allow-unauthenticated \
  --service-account realm-rivalry-runner@direct-glider-465821-p7.iam.gserviceaccount.com \
  --set-env-vars NODE_ENV=production,GOOGLE_CLIENT_ID=108005641993-e642ered12jj7ka6unpqhgjdls92c0u8.apps.googleusercontent.com \
  --set-secrets DATABASE_URL=database-url:latest,SESSION_SECRET=session-secret:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest \
  --memory 2Gi \
  --cpu 1 \
  --concurrency 80 \
  --max-instances 10 \
  --port 8080 \
  --timeout 300s
```

## 🏗️ Infrastructure Configuration

### Google Cloud Project Setup
- **Project ID**: `direct-glider-465821-p7`
- **Region**: `us-east5`
- **Service Name**: `realm-rivalry`

### Service Accounts
- **Manual/Script**: `realm-rivalry-runner@direct-glider-465821-p7.iam.gserviceaccount.com`
- **GitHub Actions**: `realm-rivalry-github-runner@direct-glider-465821-p7.iam.gserviceaccount.com`

### Secrets Management (Google Secret Manager)
- `database-url`: Neon PostgreSQL connection string
- `session-secret`: Express session signing key  
- `google-client-secret`: Google OAuth client secret

### Environment Variables
- `NODE_ENV=production`
- `GOOGLE_CLIENT_ID=108005641993-e642ered12jj7ka6unpqhgjdls92c0u8.apps.googleusercontent.com`

### Resource Configuration
- **Memory**: 2Gi
- **CPU**: 1
- **Concurrency**: 80
- **Max Instances**: 10
- **Port**: 8080
- **Timeout**: 300s

## 🔍 Verification Steps

### 1. Health Check
```bash
curl https://realm-rivalry-108005641993.us-east5.run.app/health
# Expected: {"status":"ok","timestamp":"...","service":"realm-rivalry-production","version":"1.0.0"}
```

### 2. Frontend Check
```bash
curl https://realmrivalry.com
# Expected: HTML content with React app
```

### 3. Authentication Check
```bash
curl https://realmrivalry.com/api/me
# Expected: 401 Unauthorized (authentication required)
```

## 🐛 Common Issues & Solutions

### Issue 1: Container fails to start
**Symptom**: `Default STARTUP TCP probe failed`  
**Solution**: Apply logger fix before deployment

### Issue 2: Import errors in production
**Symptom**: `Cannot find module '/app/server/replitAuth'`  
**Solution**: Dockerfile.production automatically removes replitAuth.ts

### Issue 3: Google OAuth not working
**Symptom**: Authentication redirects fail  
**Solution**: Verify GOOGLE_CLIENT_ID and google-client-secret are set

### Issue 4: Database connection errors
**Symptom**: Prisma connection failures  
**Solution**: Verify DATABASE_URL secret in Google Secret Manager

## 📋 Pre-Deployment Checklist

- [ ] Logger fix applied to 3 service files
- [ ] Google Cloud CLI authenticated
- [ ] Artifact Registry configured  
- [ ] Secrets exist in Google Secret Manager
- [ ] Service accounts have proper IAM roles
- [ ] Frontend builds successfully (`npm run build`)
- [ ] Database is accessible from Cloud Run

## 🎉 Success Indicators

**Deployment Successful When**:
- Cloud Run service shows "Ready" status
- Health check returns 200 OK
- Frontend loads at https://realmrivalry.com
- No container startup errors in logs
- Google OAuth authentication works

## 📞 Support & Troubleshooting

### View Deployment Logs
```bash
gcloud logs read --service=realm-rivalry --limit=50
```

### Check Service Status
```bash
gcloud run services describe realm-rivalry --region=us-east5
```

### Debug Container Locally
```bash
docker build -f Dockerfile.production -t realm-rivalry-debug .
docker run -p 8080:8080 -e NODE_ENV=production realm-rivalry-debug
```

---

**Last Updated**: July 29, 2025  
**Deployment Status**: ✅ Production Operational  
**Next Review**: Prior to Alpha testing launch