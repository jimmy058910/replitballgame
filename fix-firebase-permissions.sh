#!/bin/bash

# Fix Firebase Hosting permissions for GitHub Actions service account
# Run this in Google Cloud Shell Terminal

echo "🔧 Adding Firebase Hosting permissions to service account..."

# Set variables
PROJECT_ID="direct-glider-465821-p7"
SERVICE_ACCOUNT="realm-rivalry-github-runner@${PROJECT_ID}.iam.gserviceaccount.com"

# Add Firebase Admin role (includes hosting permissions)
echo "Adding Firebase Admin role..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/firebase.admin"

# Alternative: Add specific Firebase Hosting Admin role if the above is too broad
echo "Adding Firebase Hosting Admin role..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/firebasehosting.admin"

# Verify permissions
echo "✅ Verifying service account permissions..."
gcloud projects get-iam-policy $PROJECT_ID \
    --flatten="bindings[].members" \
    --filter="bindings.members:$SERVICE_ACCOUNT" \
    --format="table(bindings.role)"

echo "🎉 Firebase permissions added! Try deploying again."