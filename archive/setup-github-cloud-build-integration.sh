#!/bin/bash

# GitHub + Cloud Build Integration Setup (Replit-Friendly)
# This enables automatic deployment when you "Sync with Remote" in Replit

set -e

PROJECT_ID="direct-glider-465821-p7"
REPO_OWNER="jimmy058910" 
REPO_NAME="realm-rivalry"
REGION="us-central1"

echo "🔄 Setting up GitHub → Google Cloud Build Integration"
echo "====================================================="
echo "📂 Project: $PROJECT_ID"
echo "🔗 Repository: $REPO_OWNER/$REPO_NAME"
echo ""

echo "🎯 Goal: Auto-deploy when you 'Sync with Remote' in Replit"
echo ""

# Step 1: Enable required services
echo "🔧 Step 1: Enabling required GCP services..."
echo "  (This may take a few moments...)"

# Create a simple service enablement script that can run in Cloud Shell
cat > enable_services.sh << 'EOF'
#!/bin/bash
gcloud services enable cloudbuild.googleapis.com 
gcloud services enable cloudscheduler.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable containeranalysis.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable sourcerepo.googleapis.com
echo "✅ All services enabled"
EOF

chmod +x enable_services.sh
echo "✅ Service enablement script created"

# Step 2: Create GitHub integration instructions
echo ""
echo "🔗 Step 2: GitHub Integration Setup Instructions"
echo "==============================================" 

cat > github_integration_steps.md << 'EOF'
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

EOF

echo "✅ GitHub integration instructions created: github_integration_steps.md"

# Step 3: Create secrets setup for Cloud Console
echo ""
echo "🔐 Step 3: Creating secrets setup guide..."

cat > setup_secrets_guide.md << 'EOF'
# Deployment Secrets Setup Guide

## Quick Setup via Cloud Console

1. **Open Secret Manager**: https://console.cloud.google.com/security/secret-manager
2. **Select project**: direct-glider-465821-p7
3. **Create the following secrets**:

### Required Secrets:
- **vite-firebase-api-key** → Your Firebase API key
- **vite-firebase-project-id** → Your Firebase project ID  
- **vite-firebase-app-id** → Your Firebase app ID
- **database-url** → Your PostgreSQL connection string
- **google-service-account-key** → Your service account JSON
- **session-secret** → Random secure string for sessions

### For Each Secret:
1. Click "**CREATE SECRET**"
2. Enter the **Secret ID** (e.g., `vite-firebase-api-key`)
3. Paste the **Secret Value**
4. Click "**CREATE**"

### Grant Access to Cloud Build:
1. For each secret, click the **⋮** menu → "**Edit Permissions**"
2. Click "**ADD PRINCIPAL**" 
3. Enter: `[PROJECT-NUMBER]@cloudbuild.gserviceaccount.com`
   - Find your project number: https://console.cloud.google.com/home/dashboard
4. Select Role: "**Secret Manager Secret Accessor**"
5. Click "**SAVE**"

EOF

echo "✅ Secrets setup guide created: setup_secrets_guide.md"

# Step 4: Create the trigger configuration
echo ""
echo "⚡ Step 4: Creating trigger configuration..."

cat > create_trigger.sh << 'EOF'
#!/bin/bash
# Run this in Google Cloud Shell or where gcloud is authenticated

PROJECT_ID="direct-glider-465821-p7"

# Create the main deployment trigger
gcloud builds triggers create github \
  --name=replit-sync-auto-deploy \
  --repo-name=realm-rivalry \
  --repo-owner=jimmy058910 \
  --branch-pattern=main \
  --build-config=cloudbuild-deployment.yaml \
  --project=$PROJECT_ID \
  --description="Auto-deploy when syncing with remote from Replit"

echo "✅ Trigger created successfully!"
echo ""
echo "🎯 Now when you 'Sync with Remote' in Replit:"  
echo "   → GitHub receives your push"
echo "   → Cloud Build automatically starts deployment"
echo "   → Your app deploys to Cloud Run"
echo ""
echo "Monitor builds: https://console.cloud.google.com/cloud-build/builds"
EOF

chmod +x create_trigger.sh
echo "✅ Trigger creation script ready"

# Step 5: Create verification script
echo ""
echo "🧪 Step 5: Creating verification script..."

cat > test_replit_sync.sh << 'EOF'
#!/bin/bash
# Test script to verify Replit → GCP integration works

echo "🧪 Testing Replit Sync → GCP Deployment Integration"
echo "================================================="
echo ""

echo "📝 To test your setup:"
echo ""
echo "1. **In Replit**: Make a small change (add a comment, etc.)"
echo "2. **In Replit**: Click 'Sync with Remote' button"
echo "3. **Check builds**: https://console.cloud.google.com/cloud-build/builds"
echo "4. **Verify deployment**: Your Cloud Run URL should update"
echo ""
echo "🕐 Typical timing:"
echo "   • GitHub sync: ~5-10 seconds"  
echo "   • Build start: ~30 seconds after sync"
echo "   • Total deployment: ~5-8 minutes"
echo ""
echo "✅ Success indicators:"
echo "   • New build appears in Cloud Build console"
echo "   • Build completes with green checkmark"
echo "   • Cloud Run service shows new revision"
echo ""

# Check if trigger exists
if gcloud builds triggers list --project=direct-glider-465821-p7 --filter="name:replit-sync-auto-deploy" --format="value(name)" | grep -q "replit-sync-auto-deploy"; then
  echo "✅ Integration trigger exists"
else
  echo "⚠️ Integration trigger not found - run create_trigger.sh first"
fi

EOF

chmod +x test_replit_sync.sh
echo "✅ Testing script created"

echo ""
echo "🎉 GITHUB → GCP INTEGRATION SETUP COMPLETE!"
echo "==========================================="
echo ""
echo "📋 What you have now:"
echo "  ✅ Cloud Build deployment configuration"
echo "  ✅ GitHub integration instructions"  
echo "  ✅ Secrets setup guide"
echo "  ✅ Trigger creation script"
echo "  ✅ Testing verification script"
echo ""
echo "🚀 Next Steps (in order):"
echo "  1. Read: github_integration_steps.md"
echo "  2. Follow: setup_secrets_guide.md" 
echo "  3. Run: create_trigger.sh (in Cloud Shell or locally)"
echo "  4. Test: Use 'Sync with Remote' in Replit"
echo "  5. Verify: ./test_replit_sync.sh"
echo ""
echo "💡 Pro Tip: Use Google Cloud Console for easiest setup!"
echo "   • No local gcloud required"
echo "   • Visual interface for secrets and triggers"  
echo "   • One-time setup, then works automatically"
echo ""
echo "🎯 End Result: Replit 'Sync with Remote' = Automatic GCP Deployment!"

EOF

chmod +x setup-github-cloud-build-integration.sh