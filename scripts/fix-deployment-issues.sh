#!/bin/bash

PROJECT_ID="direct-glider-465821-p7"
SERVICE="realm-rivalry"
REGION="us-east5"

echo "🔧 Fixing common deployment issues..."

echo ""
echo "1️⃣ Creating Artifact Registry repository (if missing)..."
gcloud artifacts repositories create $SERVICE \
  --repository-format=docker \
  --location=$REGION \
  --description="Realm Rivalry Fantasy Sports Platform" || echo "Repository already exists"

echo ""
echo "2️⃣ Creating missing secrets (you'll need to provide values)..."

if ! gcloud secrets describe DATABASE_URL >/dev/null 2>&1; then
    echo "❌ DATABASE_URL secret missing"
    echo "Create it manually: gcloud secrets create DATABASE_URL --data-file=<(echo 'YOUR_DATABASE_URL')"
fi

if ! gcloud secrets describe SESSION_SECRET >/dev/null 2>&1; then
    echo "❌ SESSION_SECRET secret missing" 
    echo "Create it manually: gcloud secrets create SESSION_SECRET --data-file=<(echo 'YOUR_SESSION_SECRET')"
fi

if ! gcloud secrets describe GOOGLE_CLIENT_ID >/dev/null 2>&1; then
    echo "❌ GOOGLE_CLIENT_ID secret missing"
    echo "Create it manually: gcloud secrets create GOOGLE_CLIENT_ID --data-file=<(echo 'YOUR_CLIENT_ID')"
fi

if ! gcloud secrets describe GOOGLE_CLIENT_SECRET >/dev/null 2>&1; then
    echo "❌ GOOGLE_CLIENT_SECRET secret missing"
    echo "Create it manually: gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=<(echo 'YOUR_CLIENT_SECRET')"
fi

echo ""
echo "3️⃣ Ensuring service account has proper permissions..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:realm-rivalry-github-runner@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:realm-rivalry-github-runner@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:realm-rivalry-github-runner@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:realm-rivalry-github-runner@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

echo ""
echo "✅ Fix attempts complete. Run debug script again to verify."