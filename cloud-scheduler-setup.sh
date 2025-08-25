#!/bin/bash

# GCP Cloud Scheduler Setup for Dependency Management
# Replaces GitHub Dependabot with automated GCP-powered dependency updates

set -e

PROJECT_ID="${PROJECT_ID:-your-project-id}"
REPO_OWNER="${REPO_OWNER:-your-github-username}"
REPO_NAME="${REPO_NAME:-realm-rivalry}"
GITHUB_TOKEN="${GITHUB_TOKEN:-your-github-token}"

echo "🚀 Setting up GCP Cloud Scheduler for dependency management..."
echo "📂 Project: $PROJECT_ID"
echo "🔗 Repository: $REPO_OWNER/$REPO_NAME"

# Ensure required services are enabled
echo "🔧 Enabling required GCP services..."
gcloud services enable cloudbuild.googleapis.com --project=$PROJECT_ID
gcloud services enable cloudscheduler.googleapis.com --project=$PROJECT_ID
gcloud services enable secretmanager.googleapis.com --project=$PROJECT_ID
gcloud services enable containeranalysis.googleapis.com --project=$PROJECT_ID

# Create GitHub token secret if it doesn't exist
echo "🔐 Creating GitHub token secret..."
if ! gcloud secrets describe github-token --project=$PROJECT_ID &>/dev/null; then
  echo -n "$GITHUB_TOKEN" | gcloud secrets create github-token \
    --data-file=- \
    --project=$PROJECT_ID
  echo "✅ GitHub token secret created"
else
  echo "ℹ️ GitHub token secret already exists"
fi

# Grant Cloud Build access to secrets
echo "🔑 Granting Cloud Build access to secrets..."
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

gcloud secrets add-iam-policy-binding github-token \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$PROJECT_ID

# Create Cloud Scheduler job for weekly dependency updates
echo "📅 Creating Cloud Scheduler job for weekly dependency updates..."
gcloud scheduler jobs delete dependency-updates --location=us-central1 --project=$PROJECT_ID --quiet || true

gcloud scheduler jobs create http dependency-updates \
  --location=us-central1 \
  --schedule="0 9 * * 1" \
  --time-zone="America/Detroit" \
  --uri="https://cloudbuild.googleapis.com/v1/projects/${PROJECT_ID}/triggers/dependency-updates:run" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --oauth-service-account-email="${CLOUD_BUILD_SA}" \
  --project=$PROJECT_ID

echo "✅ Weekly dependency update job created (Mondays at 9 AM EST)"

# Create Cloud Scheduler job for critical security updates (daily)
echo "🔒 Creating Cloud Scheduler job for daily security scans..."
gcloud scheduler jobs delete security-updates --location=us-central1 --project=$PROJECT_ID --quiet || true

gcloud scheduler jobs create http security-updates \
  --location=us-central1 \
  --schedule="0 6 * * *" \
  --time-zone="America/Detroit" \
  --uri="https://cloudbuild.googleapis.com/v1/projects/${PROJECT_ID}/triggers/security-updates:run" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --oauth-service-account-email="${CLOUD_BUILD_SA}" \
  --project=$PROJECT_ID

echo "✅ Daily security update job created (6 AM EST daily)"

# Create Cloud Build trigger for dependency updates
echo "🔨 Creating Cloud Build trigger for dependency updates..."
gcloud builds triggers delete dependency-updates --project=$PROJECT_ID --quiet || true

gcloud builds triggers create manual \
  --name=dependency-updates \
  --repo-name=$REPO_NAME \
  --repo-owner=$REPO_OWNER \
  --branch-pattern="main" \
  --build-config=cloudbuild-dependency-update.yaml \
  --substitutions="_REPO_OWNER=$REPO_OWNER,_REPO_NAME=$REPO_NAME" \
  --project=$PROJECT_ID

echo "✅ Cloud Build trigger created"

# Create notification topic for dependency updates
echo "📢 Creating Pub/Sub topic for notifications..."
gcloud pubsub topics create dependency-updates --project=$PROJECT_ID || true

echo ""
echo "🎉 GCP Dependency Management System Setup Complete!"
echo ""
echo "📋 Summary:"
echo "  • Weekly dependency updates: Mondays at 9 AM EST"
echo "  • Daily security scans: 6 AM EST daily"
echo "  • Build triggers: dependency-updates, security-updates"
echo "  • GitHub token stored in Secret Manager"
echo "  • Notifications via Pub/Sub topic"
echo ""
echo "🔧 Next steps:"
echo "  1. Test the system: gcloud builds triggers run dependency-updates --project=$PROJECT_ID"
echo "  2. Monitor via Cloud Build console"
echo "  3. Configure notifications (optional)"
echo "  4. Remove existing Dependabot configuration"
echo ""
echo "✅ Ready to replace Dependabot with GCP-powered dependency management!"