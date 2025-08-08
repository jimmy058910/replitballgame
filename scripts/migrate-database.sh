#!/bin/bash

# Database Migration Script: Neon -> Google Cloud SQL
# Exports schema and data from Neon, imports to Cloud SQL

echo "🔄 Starting database migration from Neon to Google Cloud SQL..."

# Export from Neon (requires local pg_dump)
echo "📤 Exporting from Neon database..."
NEON_URL="postgresql://neondb_owner:npg_FYwi4k2MuTUp@ep-silent-dust-a5y8sn6m-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Export schema and data
pg_dump "$NEON_URL" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --file=realm-rivalry-schema.sql

pg_dump "$NEON_URL" \
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