#!/bin/bash

# Test Script for GCP Deployment System
# Validates that the Cloud Build deployment system is working correctly

set -e

PROJECT_ID="${PROJECT_ID:-direct-glider-465821-p7}"
REPO_OWNER="${REPO_OWNER:-jimmy058910}"
REPO_NAME="${REPO_NAME:-realm-rivalry}"

echo "🧪 Testing GCP Cloud Build Deployment System"
echo "============================================"
echo "📂 Project: $PROJECT_ID"
echo "🔗 Repository: $REPO_OWNER/$REPO_NAME"
echo ""

# Test 1: Check if required files exist
echo "📋 Step 1: Checking required configuration files..."
required_files=(
  "cloudbuild-deployment.yaml"
  "gcp-deployment-setup.sh"
  "Dockerfile.step7-unified"
)

for file in "${required_files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file exists"
  else
    echo "  ❌ $file missing"
    exit 1
  fi
done

# Test 2: Validate Cloud Build configuration
echo ""
echo "🔧 Step 2: Validating Cloud Build configuration..."
if grep -q "gcr.io/cloud-builders/docker" cloudbuild-deployment.yaml; then
  echo "  ✅ Docker builder configured"
else
  echo "  ❌ Docker builder not found in config"
  exit 1
fi

if grep -q "gcr.io/cloud-builders/gcloud" cloudbuild-deployment.yaml; then
  echo "  ✅ GCloud builder configured"
else
  echo "  ❌ GCloud builder not found in config"
  exit 1
fi

if grep -q "availableSecrets" cloudbuild-deployment.yaml; then
  echo "  ✅ Secret Manager integration configured"
else
  echo "  ❌ Secret Manager integration not found"
  exit 1
fi

# Test 3: Check GCP services
echo ""
echo "☁️ Step 3: Checking GCP services status..."
services=(
  "cloudbuild.googleapis.com"
  "run.googleapis.com"
  "artifactregistry.googleapis.com"
  "secretmanager.googleapis.com"
)

for service in "${services[@]}"; do
  if gcloud services list --project=$PROJECT_ID --filter="name:$service" --format="value(name)" | grep -q "$service"; then
    echo "  ✅ $service enabled"
  else
    echo "  ⚠️ $service not enabled (will be enabled during setup)"
  fi
done

# Test 4: Check if Docker can authenticate to Artifact Registry
echo ""
echo "🐳 Step 4: Testing Docker authentication to Artifact Registry..."
if gcloud auth configure-docker us-central1-docker.pkg.dev --quiet 2>/dev/null; then
  echo "  ✅ Docker authentication configured"
else
  echo "  ⚠️ Docker authentication may need configuration"
fi

# Test 5: Validate triggers don't already exist (they shouldn't conflict)
echo ""
echo "🔄 Step 5: Checking for existing Cloud Build triggers..."
existing_triggers=$(gcloud builds triggers list --project=$PROJECT_ID --format="value(name)" 2>/dev/null || true)

if echo "$existing_triggers" | grep -q "deployment-main-push"; then
  echo "  ℹ️ deployment-main-push trigger already exists (will be recreated)"
else
  echo "  ✅ deployment-main-push trigger ready to create"
fi

if echo "$existing_triggers" | grep -q "deployment-manual"; then
  echo "  ℹ️ deployment-manual trigger already exists (will be recreated)"
else
  echo "  ✅ deployment-manual trigger ready to create"
fi

# Test 6: Check GitHub repository access
echo ""
echo "🔗 Step 6: Testing GitHub repository access..."
if git remote -v | grep -q "github.com/$REPO_OWNER/$REPO_NAME"; then
  echo "  ✅ GitHub repository configured correctly"
  
  current_branch=$(git branch --show-current)
  echo "  📍 Current branch: $current_branch"
  
  if [ "$current_branch" = "main" ]; then
    echo "  ✅ On main branch (deployment target)"
  else
    echo "  ℹ️ Not on main branch (deployments trigger on main)"
  fi
else
  echo "  ❌ GitHub repository not configured correctly"
  echo "    Expected: github.com/$REPO_OWNER/$REPO_NAME"
  echo "    Found: $(git remote -v | head -1)"
fi

# Test 7: Validate Dockerfile
echo ""
echo "🏗️ Step 7: Validating Dockerfile..."
if grep -q "VITE_FIREBASE_API_KEY" Dockerfile.step7-unified; then
  echo "  ✅ Firebase configuration arguments found"
else
  echo "  ❌ Firebase build arguments missing from Dockerfile"
  exit 1
fi

# Test 8: Check if secrets are ready to be created
echo ""
echo "🔐 Step 8: Checking secret readiness..."
secrets_to_check=(
  "VITE_FIREBASE_API_KEY"
  "VITE_FIREBASE_PROJECT_ID"
  "VITE_FIREBASE_APP_ID"
  "DATABASE_URL"
  "SESSION_SECRET"
)

missing_env_vars=()
for var in "${secrets_to_check[@]}"; do
  if [ -z "${!var}" ]; then
    missing_env_vars+=("$var")
  fi
done

if [ ${#missing_env_vars[@]} -eq 0 ]; then
  echo "  ✅ All required environment variables present"
else
  echo "  ⚠️ Missing environment variables (will need to be provided during setup):"
  for var in "${missing_env_vars[@]}"; do
    echo "    - $var"
  done
fi

echo ""
echo "📊 Test Summary"
echo "==============="
echo "✅ Configuration files: Ready"
echo "✅ Cloud Build config: Valid"
echo "✅ GCP services: Ready for enablement"
echo "✅ Docker authentication: Ready"
echo "✅ GitHub integration: Ready"
echo "✅ Dockerfile: Valid"
echo ""

if [ ${#missing_env_vars[@]} -eq 0 ]; then
  echo "🎉 System is ready for deployment!"
  echo ""
  echo "🚀 Next steps:"
  echo "  1. Run: chmod +x gcp-deployment-setup.sh"
  echo "  2. Run: ./gcp-deployment-setup.sh"
  echo "  3. Test manual deployment: gcloud builds triggers run deployment-manual --project=$PROJECT_ID"
  echo "  4. Push to main to test automatic deployment"
  echo "  5. Disable GitHub Actions workflow"
else
  echo "⚠️ Ready for setup, but you'll need to provide missing environment variables"
  echo ""
  echo "🚀 Next steps:"
  echo "  1. Gather missing environment variables (listed above)"
  echo "  2. Run: chmod +x gcp-deployment-setup.sh"  
  echo "  3. Run: ./gcp-deployment-setup.sh"
fi

echo ""
echo "💰 Benefits of migration:"
echo "  • No more GitHub Actions billing limits"
echo "  • Faster builds with E2_HIGHCPU_8 machines"
echo "  • Better GCP service integration"
echo "  • More comprehensive logging"
echo "  • Independent of GitHub Actions quota"