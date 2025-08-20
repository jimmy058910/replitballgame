#!/bin/bash

# Database Migration Script: Google Cloud SQL Management
# Exports schema and data from Google Cloud SQL for backups/transfers

echo "🔄 Starting Google Cloud SQL database backup..."

# Use Google Cloud SQL Proxy for local access
echo "📤 Exporting from Google Cloud SQL database..."
# DATABASE_URL should be provided by environment (Google Cloud secrets)

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set. Please ensure Google Cloud secrets are available."
    exit 1
fi

# Export schema and data
pg_dump "$DATABASE_URL" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --file=realm-rivalry-schema.sql

pg_dump "$DATABASE_URL" \
  --data-only \
  --no-owner \
  --no-privileges \
  --file=realm-rivalry-data.sql

echo "📥 Importing to Cloud SQL..."

# Get Cloud SQL connection details (replace with actual values)
PROD_CONNECTION_NAME="direct-glider-465821-p7:us-central1:realm-rivalry-prod"
DEV_CONNECTION_NAME="direct-glider-465821-p7:us-central1:realm-rivalry-dev"

# Import to production
gcloud sql import sql realm-rivalry-prod gs://your-bucket/realm-rivalry-schema.sql \
  --database=realm_rivalry \
  --project=direct-glider-465821-p7

gcloud sql import sql realm-rivalry-prod gs://your-bucket/realm-rivalry-data.sql \
  --database=realm_rivalry \
  --project=direct-glider-465821-p7

# Import to development  
gcloud sql import sql realm-rivalry-dev gs://your-bucket/realm-rivalry-schema.sql \
  --database=realm_rivalry \
  --project=direct-glider-465821-p7

echo "✅ Database migration completed!"