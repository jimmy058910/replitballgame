#!/bin/bash

echo "🔍 Debugging GitHub Actions Deployment Issues..."

PROJECT_ID="direct-glider-465821-p7"
SERVICE="realm-rivalry"
REGION="us-east5"

echo ""
echo "1️⃣ Checking Artifact Registry repository..."
gcloud artifacts repositories list --location=$REGION --filter="name:$SERVICE" --format="table(name,format,location)"

echo ""
echo "2️⃣ Checking required secrets in Secret Manager..."
echo "DATABASE_URL:"
gcloud secrets describe DATABASE_URL --format="table(name,createTime)" 2>/dev/null || echo "❌ DATABASE_URL secret missing"

echo "SESSION_SECRET:"
gcloud secrets describe SESSION_SECRET --format="table(name,createTime)" 2>/dev/null || echo "❌ SESSION_SECRET secret missing"

echo "GOOGLE_CLIENT_ID:"
gcloud secrets describe GOOGLE_CLIENT_ID --format="table(name,createTime)" 2>/dev/null || echo "❌ GOOGLE_CLIENT_ID secret missing"

echo "GOOGLE_CLIENT_SECRET:"
gcloud secrets describe GOOGLE_CLIENT_SECRET --format="table(name,createTime)" 2>/dev/null || echo "❌ GOOGLE_CLIENT_SECRET secret missing"

echo ""
echo "3️⃣ Checking service account permissions..."
gcloud projects get-iam-policy $PROJECT_ID --flatten="bindings[].members" --format="table(bindings.role)" --filter="bindings.members:realm-rivalry-github-runner@$PROJECT_ID.iam.gserviceaccount.com"

echo ""
echo "4️⃣ Testing Docker authentication..."
gcloud auth configure-docker us-east5-docker.pkg.dev --quiet
echo "Docker auth configured for Artifact Registry"

echo ""
echo "5️⃣ Current project and authentication..."
echo "Project: $(gcloud config get-value project)"
echo "Account: $(gcloud config get-value account)"

echo ""
echo "🔧 If any of the above show issues, run the fix commands below:"
echo ""