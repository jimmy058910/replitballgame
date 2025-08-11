#!/bin/bash

# COMPREHENSIVE CLOUD SQL PUBLIC IP CONFIGURATION
# This script configures Cloud SQL for both unix socket and public IP access

set -e

PROJECT_ID="direct-glider-465821-p7"
INSTANCE_NAME="realm-rivalry-dev"
REGION="us-central1"

echo "🔧 CONFIGURING CLOUD SQL FOR DUAL ACCESS..."
echo "Project: $PROJECT_ID"
echo "Instance: $INSTANCE_NAME"
echo "Region: $REGION"
echo ""

# 1. Enable public IP on Cloud SQL instance
echo "1️⃣ Enabling public IP on Cloud SQL instance..."
gcloud sql instances patch $INSTANCE_NAME \
  --assign-ip \
  --project=$PROJECT_ID

# 2. Get current public IP
echo "2️⃣ Getting public IP address..."
PUBLIC_IP=$(gcloud sql instances describe $INSTANCE_NAME \
  --project=$PROJECT_ID \
  --format="value(ipAddresses[ipType=PRIMARY].ipAddress)")

echo "✅ Cloud SQL Public IP: $PUBLIC_IP"

# 3. Add Cloud Run IP ranges to authorized networks
echo "3️⃣ Adding Cloud Run IP ranges to authorized networks..."

# Cloud Run in us-central1 IP ranges
gcloud sql instances patch $INSTANCE_NAME \
  --authorized-networks="0.0.0.0/0" \
  --project=$PROJECT_ID

echo "⚠️  NOTE: Using 0.0.0.0/0 for testing. In production, restrict to specific IP ranges."

# 4. Display connection information
echo ""
echo "🎉 CLOUD SQL CONFIGURATION COMPLETE!"
echo ""
echo "CONNECTION METHODS:"
echo "📍 Unix Socket (Cloud Run): postgresql://user:pass@/cloudsql/$PROJECT_ID:$REGION:$INSTANCE_NAME/database"
echo "📍 Public IP (Universal): postgresql://user:pass@$PUBLIC_IP:5432/database"
echo ""
echo "NEXT STEPS:"
echo "1. Update DATABASE_URL secret with public IP format"
echo "2. Deploy simple database server"
echo "3. Test both local and Cloud Run connectivity"

# 5. Generate both connection strings
echo ""
echo "🔗 EXAMPLE CONNECTION STRINGS:"
echo "Unix Socket: postgresql://realm_app:PASSWORD@/cloudsql/$PROJECT_ID:$REGION:$INSTANCE_NAME/realm_rivalry"
echo "Public IP:   postgresql://realm_app:PASSWORD@$PUBLIC_IP:5432/realm_rivalry"