#!/bin/bash

# Google Cloud SQL Setup Script for Realm Rivalry
# Creates production and development PostgreSQL instances

PROJECT_ID="direct-glider-465821-p7"
REGION="us-central1"

echo "🚀 Setting up Google Cloud SQL for Realm Rivalry..."

# Create Production Database Instance
echo "📊 Creating production database instance..."
gcloud sql instances create realm-rivalry-prod \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=$REGION \
  --storage-type=SSD \
  --storage-size=10GB \
  --storage-auto-increase \
  --backup-start-time=03:00 \
  --deletion-protection \
  --project=$PROJECT_ID

# Create Development Database Instance  
echo "🛠️ Creating development database instance..."
gcloud sql instances create realm-rivalry-dev \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=$REGION \
  --storage-type=SSD \
  --storage-size=10GB \
  --storage-auto-increase \
  --backup-start-time=04:00 \
  --project=$PROJECT_ID

# Create databases
echo "📦 Creating databases..."
gcloud sql databases create realm_rivalry --instance=realm-rivalry-prod --project=$PROJECT_ID
gcloud sql databases create realm_rivalry --instance=realm-rivalry-dev --project=$PROJECT_ID

# Create database users
echo "👤 Creating database users..."
gcloud sql users create realm_app --instance=realm-rivalry-prod --password=$(openssl rand -base64 32) --project=$PROJECT_ID
gcloud sql users create realm_app --instance=realm-rivalry-dev --password=$(openssl rand -base64 32) --project=$PROJECT_ID

# Get connection strings
echo "🔗 Getting connection information..."
echo "Production Instance IP:"
gcloud sql instances describe realm-rivalry-prod --format="value(ipAddresses[0].ipAddress)" --project=$PROJECT_ID

echo "Development Instance IP:"
gcloud sql instances describe realm-rivalry-dev --format="value(ipAddresses[0].ipAddress)" --project=$PROJECT_ID

echo "✅ Cloud SQL instances created successfully!"