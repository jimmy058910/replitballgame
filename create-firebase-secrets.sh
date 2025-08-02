#!/bin/bash

# Create Firebase secrets in Google Cloud Secret Manager
# This needs to be run in Google Cloud Shell with the Firebase environment variables

echo "🔧 Creating Firebase secrets in Google Cloud Secret Manager..."

# Set project
PROJECT_ID="direct-glider-465821-p7"
echo "Using project: $PROJECT_ID"

# Function to create or update a secret
create_or_update_secret() {
    local secret_name=$1
    local secret_value=$2
    
    echo "Creating secret: $secret_name"
    
    # Delete existing secret if it exists
    if gcloud secrets describe $secret_name --project=$PROJECT_ID >/dev/null 2>&1; then
        echo "  Secret $secret_name already exists, updating..."
        echo -n "$secret_value" | gcloud secrets versions add $secret_name --data-file=- --project=$PROJECT_ID
    else
        echo "  Creating new secret $secret_name..."
        echo -n "$secret_value" | gcloud secrets create $secret_name --data-file=- --project=$PROJECT_ID
    fi
    
    # Grant access to the service account
    echo "  Granting access to service account..."
    gcloud secrets add-iam-policy-binding $secret_name \
        --member="serviceAccount:realm-rivalry-github-runner@${PROJECT_ID}.iam.gserviceaccount.com" \
        --role="roles/secretmanager.secretAccessor" \
        --project=$PROJECT_ID
}

# Get Firebase values from environment variables
FIREBASE_API_KEY="${VITE_FIREBASE_API_KEY}"
FIREBASE_PROJECT_ID="${VITE_FIREBASE_PROJECT_ID}" 
FIREBASE_APP_ID="${VITE_FIREBASE_APP_ID}"

# Validate that we have the secrets
if [ -z "$FIREBASE_API_KEY" ] || [ -z "$FIREBASE_PROJECT_ID" ] || [ -z "$FIREBASE_APP_ID" ]; then
    echo "❌ Error: Missing Firebase environment variables"
    echo "Required: VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID"
    exit 1
fi

echo "✅ Found Firebase environment variables"

# Create the secrets
create_or_update_secret "firebase-api-key" "$FIREBASE_API_KEY"
create_or_update_secret "firebase-project-id" "$FIREBASE_PROJECT_ID"  
create_or_update_secret "firebase-app-id" "$FIREBASE_APP_ID"

echo "🎉 Firebase secrets created successfully!"
echo ""
echo "Created secrets:"
echo "  - firebase-api-key"
echo "  - firebase-project-id"
echo "  - firebase-app-id"
echo ""
echo "✅ Ready to deploy backend with Firebase secrets!"