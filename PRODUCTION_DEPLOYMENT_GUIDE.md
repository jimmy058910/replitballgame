# Production Deployment Guide

## 🚀 Auto-Deployment Configuration

### **PRODUCTION PIPELINE (AUTO-TRIGGERED)**
**Workflow**: `.github/workflows/production-deploy.yml`  
**Auto-triggers on**: `git push origin main`  
**Features**: Full Blue/Green deployment with zero downtime  

**Pipeline Phases:**
1. **Setup & Authentication** - GCP authentication  
2. **Build Production Image** - Multi-stage Docker build with security scan  
3. **Blue-Green Deployment** - Deploy Green revision with 0% traffic  
4. **Health Verification** - Test `/health` endpoint & API routes  
5. **Gradual Traffic Shift** - 0% → 10% → 50% → 100% with monitoring  
6. **Production Verification** - Final comprehensive testing  

**Production Configuration:**
- **Resources**: 2Gi memory, 2 CPU  
- **Scaling**: 1-10 instances (auto-scaling)  
- **Timeout**: 300 seconds  
- **Concurrency**: 100 requests/container  

### **SIMPLE TEST PIPELINE (MANUAL ONLY)**
**Workflow**: `.github/workflows/blue-green-deploy.yml`  
**Trigger**: Manual only via GitHub Actions  
**Purpose**: Basic container testing for development  

---

## 📋 Deployment Commands

### Automatic Production Deployment
```bash
# Any push to main automatically triggers production deployment
git add .
git commit -m "Production deployment"
git push origin main

# Monitor deployment: GitHub Actions → "Production Blue-Green Deployment"
```

### Manual Production Deployment
```bash
# GitHub Actions → "Production Blue-Green Deployment" → "Run workflow"
```

### Testing Deployment (Simple)
```bash
# GitHub Actions → "Simple Test Deployment" → "Run workflow"
```

---

## 🔧 Build Testing

### Local Production Build Test
```bash
# Test complete production build process
./scripts/test-production-build.sh
```

### Build Steps Validated:
1. ✅ Prisma client generation
2. ✅ TypeScript server compilation  
3. ✅ React frontend build
4. ✅ JavaScript syntax validation
5. ✅ Build integrity verification

---

## 🎯 Deployment Status

### Current Configuration:
- **Production Pipeline**: ✅ Auto-configured for `main` branch pushes
- **Build Process**: ✅ Fixed system process errors
- **Health Checks**: ✅ Uses existing `/health` endpoint  
- **Security**: ✅ Multi-stage builds, non-root user
- **Monitoring**: ✅ Comprehensive logging and rollback procedures

### Ready for Production:
✅ Push any changes to `main` branch for automatic deployment  
✅ Production Blue/Green deployment with zero downtime  
✅ All 100+ debugging lessons incorporated  
✅ Industry-standard practices implemented  

---

## 🚨 Emergency Rollback

If issues occur, the deployment workflow provides rollback commands:

```bash
# Get previous revision name from deployment logs, then:
gcloud run services update-traffic realm-rivalry-backend \
  --region=us-central1 \
  --to-revisions=PREVIOUS_REVISION_NAME=100
```

---

## 📊 Monitoring

**Production URL**: Will be provided in deployment logs  
**Health Check**: `https://your-service-url/health`  
**Logs**: Google Cloud Console → Cloud Run → realm-rivalry-backend → Logs  
**GitHub Actions**: Monitor deployment progress in real-time  

---

**Last Updated**: August 2025  
**Status**: Production-ready with auto-deployment configured