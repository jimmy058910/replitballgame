#!/bin/bash

# Setup Artifact Registry for Realm Rivalry
echo "🚀 Setting up Artifact Registry for Realm Rivalry..."

PROJECT_ID="direct-glider-465821-p7"
REPOSITORY="realm-rivalry"
REGION="us-east5"

# Create Artifact Registry repository
echo "📦 Creating Artifact Registry repository..."
gcloud artifacts repositories create $REPOSITORY \
  --repository-format=docker \
  --location=$REGION \
  --description="Realm Rivalry Fantasy Sports Platform Docker repository"

echo "✅ Artifact Registry setup complete!"
echo "Repository: $REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY"