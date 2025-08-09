# Google Cloud SQL Migration Guide

## Migration Steps (Best Practice)

### 1. Create Cloud SQL Instances
```bash
# Run the setup script
chmod +x scripts/setup-cloud-sql.sh
./scripts/setup-cloud-sql.sh
```

### 2. Configure Connection Strings

**Production Database (realm-rivalry-prod):**
- Instance: `direct-glider-465821-p7:us-central1:realm-rivalry-prod`
- Public IP: `34.171.83.78`
- Socket: `/cloudsql/direct-glider-465821-p7:us-central1:realm-rivalry-prod`
- Connection URL (Cloud Run): `postgresql://realm_app:PASSWORD@localhost/realm_rivalry?host=/cloudsql/direct-glider-465821-p7:us-central1:realm-rivalry-prod`
- Connection URL (TCP): `postgresql://realm_app:PASSWORD@34.171.83.78:5432/realm_rivalry?sslmode=require`

**Development Database (realm-rivalry-dev):**
- Instance: `direct-glider-465821-p7:us-central1:realm-rivalry-dev`
- Public IP: `35.225.150.44`
- Socket: `/cloudsql/direct-glider-465821-p7:us-central1:realm-rivalry-dev`
- Connection URL (Cloud Run): `postgresql://realm_app:PASSWORD@localhost/realm_rivalry?host=/cloudsql/direct-glider-465821-p7:us-central1:realm-rivalry-dev`
- Connection URL (TCP): `postgresql://realm_app:PASSWORD@35.225.150.44:5432/realm_rivalry?sslmode=require`

### 3. Update Secret Manager

```bash
# Update production database URL
echo "postgresql://realm_app:PROD_PASSWORD@PROD_IP:5432/realm_rivalry?sslmode=require" | \
  gcloud secrets versions add DATABASE_URL --data-file=-

# Create development database URL secret
echo "postgresql://realm_app:DEV_PASSWORD@DEV_IP:5432/realm_rivalry?sslmode=require" | \
  gcloud secrets create DATABASE_URL_DEV --data-file=-
```

### 4. Migrate Data

#### Option A: Using pg_dump/pg_restore (Recommended)
```bash
# Export from Neon
pg_dump "NEON_URL" --clean --no-owner --no-privileges > backup.sql

# Import to Cloud SQL
psql "CLOUD_SQL_URL" < backup.sql
```

#### Option B: Using Prisma
```bash
# Reset and push schema
npx prisma migrate reset --force
npx prisma db push

# Seed with production data if needed
npx prisma db seed
```

### 5. Update Application Configuration

No code changes needed - Prisma works identically with any PostgreSQL instance.

### 6. Deploy and Test

Your existing deployment pipeline will work immediately with the new database URLs.

## Benefits Achieved

- ✅ **Zero Network Issues**: Same VPC as Cloud Run
- ✅ **Native GCP Integration**: Monitoring, logging, IAM
- ✅ **Automatic Backups**: Point-in-time recovery
- ✅ **Performance**: Lower latency (same region)
- ✅ **Cost Efficiency**: GCP credits eligible
- ✅ **Security**: VPC-native, automatic SSL

## Cost Optimization

- **Instance Type**: db-f1-micro (shared CPU, cost-effective)
- **Storage**: 10GB SSD with auto-increase
- **Backups**: Daily automated backups
- **Estimated Cost**: ~$25/month (offset by GCP credits)

## Development vs Production

- **Separate instances** for data isolation
- **Same configuration** for consistency
- **Different backup schedules** (prod: 3am, dev: 4am)