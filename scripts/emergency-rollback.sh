#!/bin/bash

# Emergency Rollback Script for Realm Rivalry
# Instantly rollback to previous stable revision

set -e

PROJECT_ID="direct-glider-465821-p7"
REGION="us-east5"
SERVICE_NAME="realm-rivalry-backend"

echo "🚨 EMERGENCY ROLLBACK INITIATED"
echo "Service: $SERVICE_NAME"
echo "Region: $REGION"

# Get current revision receiving traffic
echo "🔍 Finding current and previous revisions..."
CURRENT_REVISION=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(spec.traffic[0].revisionName)')
echo "Current revision: $CURRENT_REVISION"

# Get previous revision (second-to-last)
PREVIOUS_REVISION=$(gcloud run revisions list --service=$SERVICE_NAME --region=$REGION --format='value(REVISION)' --sort-by='~creationTimestamp' --limit=1 --skip=1)

if [ -z "$PREVIOUS_REVISION" ]; then
  echo "❌ ERROR: No previous revision found for rollback"
  echo "Available revisions:"
  gcloud run revisions list --service=$SERVICE_NAME --region=$REGION
  exit 1
fi

echo "Previous stable revision: $PREVIOUS_REVISION"

# Confirm rollback
echo ""
echo "⚠️  ROLLBACK CONFIRMATION"
echo "This will instantly switch 100% traffic from:"
echo "  FROM: $CURRENT_REVISION"
echo "  TO:   $PREVIOUS_REVISION"
echo ""
read -p "Continue with rollback? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Rollback cancelled."
  exit 0
fi

# Execute rollback
echo "🔄 Executing rollback..."
gcloud run services update-traffic $SERVICE_NAME \
  --region=$REGION \
  --to-revisions=$PREVIOUS_REVISION=100

echo "✅ Rollback completed!"

# Verify rollback
echo "🔍 Verifying rollback..."
sleep 5

SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")
echo "Service URL: $SERVICE_URL"

echo "Testing health endpoint..."
if curl -f "$SERVICE_URL/health" &>/dev/null; then
  echo "✅ Health check passed - rollback successful"
else
  echo "❌ Health check failed - investigate immediately"
  exit 1
fi

echo ""
echo "🎉 ROLLBACK SUCCESSFUL"
echo "Service is now running previous stable revision: $PREVIOUS_REVISION"
echo "Monitor the service at: $SERVICE_URL"