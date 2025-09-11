# Persistent Authentication Setup for Development

## Problem
Google Cloud authentication expires and breaks the entire dev environment when `gcloud auth application-default login` tokens expire.

## Solution 1: Service Account Key (Recommended)

### Steps:
1. Create a service account key for development:
```bash
gcloud iam service-accounts create realm-rivalry-dev \
    --description="Development service account for Realm Rivalry" \
    --display-name="Realm Rivalry Dev"
```

2. Grant necessary permissions:
```bash
gcloud projects add-iam-policy-binding direct-glider-465821-p7 \
    --member="serviceAccount:realm-rivalry-dev@direct-glider-465821-p7.iam.gserviceaccount.com" \
    --role="roles/cloudsql.client"
```

3. Create and download key:
```bash
gcloud iam service-accounts keys create ~/.config/gcloud/realm-rivalry-dev-key.json \
    --iam-account=realm-rivalry-dev@direct-glider-465821-p7.iam.gserviceaccount.com
```

4. Set environment variable in `.env.local`:
```env
GOOGLE_APPLICATION_CREDENTIALS=C:\Users\Jimmy\.config\gcloud\realm-rivalry-dev-key.json
```

## Solution 2: Refresh Token Automation

### Create auto-refresh script:
```bash
# scripts/refresh-auth.sh
#!/bin/bash
gcloud auth application-default print-access-token > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "🔄 Refreshing Google Cloud authentication..."
    gcloud auth application-default login --quiet
fi
```

### Add to package.json:
```json
{
  "scripts": {
    "dev:auth": "bash scripts/refresh-auth.sh && npm run dev"
  }
}
```

## Solution 3: Long-lived Tokens

### Configure longer-lived tokens:
```bash
gcloud auth application-default login --access-token-file=~/.config/gcloud/access_token
```

## Recommended Approach

Use **Service Account Key** for development because:
- ✅ Never expires (until manually rotated)
- ✅ No user interaction required
- ✅ Works across team members
- ✅ Consistent authentication
- ✅ No browser popups during development

## Implementation

Add to your development startup script:
```bash
# Check if service account key exists
if [ -f "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
    echo "✅ Using service account authentication"
else
    echo "⚠️ Service account key not found, falling back to user auth"
    gcloud auth application-default login
fi
```