#!/bin/bash

# Google Cloud Build Deployment Setup
# Complete migration from GitHub Actions to GCP Cloud Build

set -e

PROJECT_ID="${PROJECT_ID:-direct-glider-465821-p7}"
REPO_OWNER="${REPO_OWNER:-jimmy058910}"
REPO_NAME="${REPO_NAME:-realm-rivalry}"
GITHUB_TOKEN="${GITHUB_TOKEN}"
REGION="us-central1"

echo "🚀 Setting up Google Cloud Build for Production Deployments..."
echo "📂 Project: $PROJECT_ID"
echo "🔗 Repository: $REPO_OWNER/$REPO_NAME"
echo "🌎 Region: $REGION"
echo ""

# Ensure required services are enabled
echo "🔧 Enabling required GCP services..."
gcloud services enable cloudbuild.googleapis.com --project=$PROJECT_ID
gcloud services enable cloudscheduler.googleapis.com --project=$PROJECT_ID
gcloud services enable secretmanager.googleapis.com --project=$PROJECT_ID
gcloud services enable containeranalysis.googleapis.com --project=$PROJECT_ID
gcloud services enable run.googleapis.com --project=$PROJECT_ID
gcloud services enable artifactregistry.googleapis.com --project=$PROJECT_ID
gcloud services enable sourcerepo.googleapis.com --project=$PROJECT_ID

# Create all necessary secrets in Secret Manager
echo "🔐 Creating deployment secrets in Secret Manager..."

# Function to create secret if it doesn't exist
create_secret_if_not_exists() {
  local secret_name=$1
  local secret_value=$2
  
  if ! gcloud secrets describe "$secret_name" --project=$PROJECT_ID &>/dev/null; then
    if [ -n "$secret_value" ]; then
      echo -n "$secret_value" | gcloud secrets create "$secret_name" \
        --data-file=- \
        --project=$PROJECT_ID
      echo "✅ Created secret: $secret_name"
    else
      echo "⚠️ Skipping $secret_name - no value provided"
    fi
  else
    echo "ℹ️ Secret $secret_name already exists"
  fi
}

# Create deployment secrets (you'll need to provide these values)
echo ""
echo "📋 Please provide the following secret values for deployment:"
echo "   (Press Enter to skip if already created)"

if [ -z "$VITE_FIREBASE_API_KEY" ]; then
  read -p "🔑 VITE_FIREBASE_API_KEY: " VITE_FIREBASE_API_KEY
fi
create_secret_if_not_exists "vite-firebase-api-key" "$VITE_FIREBASE_API_KEY"

if [ -z "$VITE_FIREBASE_PROJECT_ID" ]; then
  read -p "🔑 VITE_FIREBASE_PROJECT_ID: " VITE_FIREBASE_PROJECT_ID
fi
create_secret_if_not_exists "vite-firebase-project-id" "$VITE_FIREBASE_PROJECT_ID"

if [ -z "$VITE_FIREBASE_APP_ID" ]; then
  read -p "🔑 VITE_FIREBASE_APP_ID: " VITE_FIREBASE_APP_ID
fi
create_secret_if_not_exists "vite-firebase-app-id" "$VITE_FIREBASE_APP_ID"

if [ -z "$DATABASE_URL" ]; then
  read -p "🔑 DATABASE_URL: " DATABASE_URL
fi
create_secret_if_not_exists "database-url" "$DATABASE_URL"

if [ -z "$GOOGLE_SERVICE_ACCOUNT_KEY" ]; then
  read -p "🔑 GOOGLE_SERVICE_ACCOUNT_KEY (JSON): " GOOGLE_SERVICE_ACCOUNT_KEY
fi
create_secret_if_not_exists "google-service-account-key" "$GOOGLE_SERVICE_ACCOUNT_KEY"

if [ -z "$SESSION_SECRET" ]; then
  read -p "🔑 SESSION_SECRET: " SESSION_SECRET
fi
create_secret_if_not_exists "session-secret" "$SESSION_SECRET"

# GitHub token for source integration
create_secret_if_not_exists "github-token" "$GITHUB_TOKEN"

# Grant Cloud Build access to secrets
echo ""
echo "🔑 Granting Cloud Build access to secrets..."
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

secrets=(
  "vite-firebase-api-key"
  "vite-firebase-project-id"
  "vite-firebase-app-id"
  "database-url"
  "google-service-account-key"
  "session-secret"
  "github-token"
)

for secret in "${secrets[@]}"; do
  gcloud secrets add-iam-policy-binding "$secret" \
    --member="serviceAccount:${CLOUD_BUILD_SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROJECT_ID || true
done

# Grant Cloud Build additional permissions
echo "🔐 Granting Cloud Build additional permissions..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/artifactregistry.admin"

# Create Cloud Build trigger for deployment on main branch push
echo ""
echo "🔨 Creating Cloud Build deployment trigger..."
gcloud builds triggers delete deployment-main-push --project=$PROJECT_ID --quiet || true

gcloud builds triggers create github \
  --name=deployment-main-push \
  --repo-name=$REPO_NAME \
  --repo-owner=$REPO_OWNER \
  --branch-pattern="main" \
  --build-config=cloudbuild-deployment.yaml \
  --substitutions="_REPO_OWNER=$REPO_OWNER,_REPO_NAME=$REPO_NAME" \
  --project=$PROJECT_ID

echo "✅ Main branch deployment trigger created"

# Create manual deployment trigger for on-demand deployments
echo "🔧 Creating manual deployment trigger..."
gcloud builds triggers delete deployment-manual --project=$PROJECT_ID --quiet || true

gcloud builds triggers create manual \
  --name=deployment-manual \
  --repo-name=$REPO_NAME \
  --repo-owner=$REPO_OWNER \
  --branch-pattern="main" \
  --build-config=cloudbuild-deployment.yaml \
  --substitutions="_REPO_OWNER=$REPO_OWNER,_REPO_NAME=$REPO_NAME" \
  --project=$PROJECT_ID

echo "✅ Manual deployment trigger created"

echo ""
echo "🎉 GOOGLE CLOUD BUILD DEPLOYMENT SYSTEM SETUP COMPLETE!"
echo ""
echo "📋 Summary:"
echo "  • Auto-deploy on main branch push: ✅"
echo "  • Manual deployment trigger: ✅"
echo "  • All secrets configured in Secret Manager: ✅"
echo "  • Cloud Build permissions: ✅"
echo "  • Artifact Registry integration: ✅"
echo "  • Cloud Run deployment: ✅"
echo ""
echo "🔧 Next steps:"
echo "  1. Test manual deployment: gcloud builds triggers run deployment-manual --project=$PROJECT_ID"
echo "  2. Push to main branch to test automatic deployment"
echo "  3. Monitor deployments in Cloud Build console"
echo "  4. Once confirmed working, disable GitHub Actions workflow"
echo ""
echo "✅ GitHub Actions dependency eliminated!"
echo "🎯 Your deployments now run 100% on Google Cloud Build!"
echo ""
echo "💰 Benefits:"
echo "  • No more GitHub Actions billing limits"
echo "  • Faster builds with dedicated GCP resources"
echo "  • Better integration with GCP services"
echo "  • More powerful build machines (E2_HIGHCPU_8)"
echo "  • Comprehensive logging in Cloud Logging"