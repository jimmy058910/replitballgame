#!/bin/bash
# Set up automatic deployment trigger for Cloud Build

echo "🔧 Setting up Cloud Build automatic deployment trigger..."
echo "========================================"

PROJECT_ID="direct-glider-465821-p7"
REPO_NAME="replitballgame"
REPO_OWNER="jimmy058910"
TRIGGER_NAME="realm-rivalry-auto-deploy"
BRANCH="main"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Please install Google Cloud SDK."
    exit 1
fi

# Set the project
gcloud config set project $PROJECT_ID

echo "📍 Creating Cloud Build trigger for automatic deployment..."

# Create the trigger
gcloud builds triggers create github \
  --repo-name="$REPO_NAME" \
  --repo-owner="$REPO_OWNER" \
  --branch-pattern="^${BRANCH}$" \
  --build-config="cloudbuild-deployment.yaml" \
  --name="$TRIGGER_NAME" \
  --description="Automatic deployment on push to main branch" \
  --substitutions=SHORT_SHA='${SHORT_SHA}' \
  --project=$PROJECT_ID

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Cloud Build trigger created successfully!"
    echo ""
    echo "📊 The deployment will now automatically trigger when:"
    echo "   • You push to the 'main' branch"
    echo "   • You merge a PR to 'main'"
    echo ""
    echo "🔗 Manage your trigger at:"
    echo "https://console.cloud.google.com/cloud-build/triggers?project=$PROJECT_ID"
else
    echo ""
    echo "❌ Failed to create trigger"
    echo ""
    echo "If the trigger already exists, you can update it manually at:"
    echo "https://console.cloud.google.com/cloud-build/triggers?project=$PROJECT_ID"
fi

echo ""
echo "📝 To manually trigger a deployment, run:"
echo "   ./deploy-to-gcp.sh (Linux/Mac)"
echo "   deploy-to-gcp.bat (Windows)"