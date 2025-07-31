#!/bin/bash

# Fix Artifact Registry permissions for hybrid deployment
PROJECT_ID="direct-glider-465821-p7"
REGION="us-east5"
REPO_NAME="realm-rivalry"

echo "🔧 Fixing Artifact Registry setup..."

# 1. Create the Artifact Registry repository if it doesn't exist
echo "📦 Creating Artifact Registry repository..."
gcloud artifacts repositories create $REPO_NAME \
    --repository-format=docker \
    --location=$REGION \
    --project=$PROJECT_ID \
    --description="Docker repository for Realm Rivalry hybrid deployment" || echo "Repository might already exist, continuing..."

# 2. Grant the GitHub Actions service account permission to push images
echo "🔐 Granting Artifact Registry permissions..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:firebase-github-deploy@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/artifactregistry.writer"

# 3. Also grant Cloud Run permissions
echo "🚀 Granting Cloud Run permissions..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:firebase-github-deploy@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:firebase-github-deploy@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser"

echo "✅ Artifact Registry setup complete!"
echo "🔄 You can now re-run the hybrid deployment"