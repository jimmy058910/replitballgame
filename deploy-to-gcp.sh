#!/bin/bash
# Deploy to GCP using Cloud Build

echo "🚀 Starting GCP Cloud Build deployment..."
echo "========================================"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Please install Google Cloud SDK."
    echo "Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set project ID
PROJECT_ID="direct-glider-465821-p7"
echo "📍 Project ID: $PROJECT_ID"

# Set the project
gcloud config set project $PROJECT_ID

# Get current git commit SHA
SHORT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "latest")
echo "📍 Git commit: $SHORT_SHA"

# Trigger the Cloud Build
echo "🏗️ Triggering Cloud Build..."
gcloud builds submit \
  --config=cloudbuild-deployment.yaml \
  --substitutions=SHORT_SHA=$SHORT_SHA \
  --project=$PROJECT_ID

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Cloud Build triggered successfully!"
    echo "📊 View build progress at:"
    echo "https://console.cloud.google.com/cloud-build/builds?project=$PROJECT_ID"
else
    echo ""
    echo "❌ Cloud Build failed to trigger"
    echo "Please check your GCP permissions and configuration"
    exit 1
fi