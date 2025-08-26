# GitHub + Cloud Build Integration Steps

## Option A: Quick Setup via Cloud Console (Recommended)

1. **Open Google Cloud Console**: https://console.cloud.google.com/cloud-build/triggers
2. **Select your project**: direct-glider-465821-p7
3. **Click "Connect Repository"**
4. **Select "GitHub (Cloud Build GitHub App)"** 
5. **Authenticate with GitHub**
6. **Select Repository**: jimmy058910/realm-rivalry
7. **Click "Connect"**

## Option B: Using gcloud (if you have it set up)

```bash
# Run this in your terminal where gcloud is authenticated
gcloud builds triggers create github \
  --name=auto-deploy-on-sync \
  --repo-name=realm-rivalry \
  --repo-owner=jimmy058910 \
  --branch-pattern=main \
  --build-config=cloudbuild-deployment.yaml \
  --project=direct-glider-465821-p7
```

## What This Enables

✅ **Replit "Sync with Remote"** → **Auto-deployment to GCP**
✅ **No manual steps required after initial setup**
✅ **No GitHub Actions billing**
✅ **Faster builds with dedicated GCP resources**

## Testing Your Setup

1. Make a small change in Replit
2. Click "Sync with Remote" 
3. Check Cloud Build console: https://console.cloud.google.com/cloud-build/builds
4. Your deployment should start automatically!

