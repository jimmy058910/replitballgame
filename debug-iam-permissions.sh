#!/bin/bash
echo "=== VERIFYING IAM PERMISSIONS FOR CLOUD RUN SECRETS ==="

# Check if secrets exist
echo "Checking secret existence:"
for SECRET_NAME in database-url firebase-api-key firebase-project-id firebase-app-id google-client-id google-client-secret; do
  gcloud secrets describe $SECRET_NAME --project=direct-glider-465821-p7 >/dev/null 2>&1 && echo "✅ $SECRET_NAME exists" || echo "❌ $SECRET_NAME NOT FOUND"
done

echo ""
echo "Checking Cloud Run service account permissions:"
SERVICE_ACCOUNT="$(gcloud run services describe realm-rivalry-backend --region=us-east5 --format='value(spec.template.spec.serviceAccountName)' 2>/dev/null || echo 'default')"
echo "Service account: $SERVICE_ACCOUNT"

# If using default, show the actual default compute service account
if [ "$SERVICE_ACCOUNT" = "default" ]; then
  PROJECT_ID="direct-glider-465821-p7"
  SERVICE_ACCOUNT="$PROJECT_ID-compute@developer.gserviceaccount.com"
  echo "Actual service account: $SERVICE_ACCOUNT"
fi

echo ""
echo "Checking IAM bindings for secrets:"
for SECRET_NAME in database-url firebase-api-key firebase-project-id firebase-app-id google-client-id google-client-secret; do
  echo "Checking $SECRET_NAME:"
  gcloud secrets get-iam-policy $SECRET_NAME --project=direct-glider-465821-p7 --format="table(bindings.members)" 2>/dev/null | grep -q "$SERVICE_ACCOUNT" && echo "  ✅ Has access" || echo "  ❌ NO ACCESS"
done
