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
