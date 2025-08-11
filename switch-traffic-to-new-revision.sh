#!/bin/bash

echo "🔄 MANUAL TRAFFIC SWITCH: Testing new revision with Cloud SQL code"
echo "Switch traffic from old revision (external DB) to new revision (Cloud SQL)"
echo ""
echo "Current traffic routing:"
gcloud run services describe realm-rivalry-express-database \
  --region=us-central1 \
  --format='value(status.traffic[].percent,status.traffic[].revisionName)' | paste - -

echo ""
echo "Available revisions:"
gcloud run revisions list \
  --service=realm-rivalry-express-database \
  --region=us-central1 \
  --format='table(name,creationTimestamp,status.conditions[0].status)'

echo ""
echo "🎯 Switching 100% traffic to latest revision..."
gcloud run services update-traffic realm-rivalry-express-database \
  --region=us-central1 \
  --to-latest \
  --quiet

echo ""
echo "✅ Traffic switch completed. New traffic routing:"
gcloud run services describe realm-rivalry-express-database \
  --region=us-central1 \
  --format='value(status.traffic[].percent,status.traffic[].revisionName)' | paste - -

echo ""
echo "🔍 Testing new revision with Cloud SQL:"
SERVICE_URL=$(gcloud run services describe realm-rivalry-express-database \
  --region=us-central1 \
  --format='value(status.url)')

echo "Health check:"
curl -s "$SERVICE_URL/health" | jq '.'

echo ""
echo "Database test:"
curl -s "$SERVICE_URL/db-test" || echo "Database test failed - expected for Cloud SQL connection setup"