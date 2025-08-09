# DATABASE_URL Secret Configuration Fix

## Problem Identified
The production deployment fails because the `DATABASE_URL` secret in Google Cloud Secret Manager is pointing to the wrong database instance.

## Current State
- **Deployment:** NODE_ENV=production ✅
- **Expected Database:** realm-rivalry-prod (34.171.83.78) ✅  
- **Actual Issue:** DATABASE_URL secret points to wrong database ❌

## Fix Required: Update DATABASE_URL Secret

### Step 1: Check Current Secret Value
```bash
gcloud secrets versions access latest --secret="DATABASE_URL" --project="direct-glider-465821-p7"
```

### Step 2: Create Correct Production DATABASE_URL
The DATABASE_URL should contain:
```
postgresql://realm_app:PASSWORD@localhost/realm_app_db?host=/cloudsql/direct-glider-465821-p7:us-central1:realm-rivalry-prod
```

### Step 3: Update the Secret
```bash
echo "postgresql://realm_app:qGlB8JhxixnZoxZvCvbdcBKFKDsOE5rCyi8iQA2BJKw=@localhost/realm_app_db?host=/cloudsql/direct-glider-465821-p7:us-central1:realm-rivalry-prod" | \
gcloud secrets versions add DATABASE_URL --data-file=- --project="direct-glider-465821-p7"
```

### Step 4: Verify Database Exists
Ensure the `realm-rivalry-prod` Cloud SQL instance exists and is running.

## Testing
After updating the secret, the next deployment should:
1. Connect to realm-rivalry-prod (34.171.83.78)
2. Container starts successfully
3. Health checks pass
4. Deployment completes

## Database Instance Mapping
- **Development:** `realm-rivalry-dev` → `35.225.150.44:5432`
- **Production:** `realm-rivalry-prod` → `34.171.83.78:5432`