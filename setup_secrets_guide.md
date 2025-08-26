# Deployment Secrets Setup Guide

## Quick Setup via Cloud Console

1. **Open Secret Manager**: https://console.cloud.google.com/security/secret-manager
2. **Select project**: direct-glider-465821-p7
3. **Create the following secrets**:

### Required Secrets:
- **vite-firebase-api-key** → Your Firebase API key
- **vite-firebase-project-id** → Your Firebase project ID  
- **vite-firebase-app-id** → Your Firebase app ID
- **database-url** → Your PostgreSQL connection string
- **google-service-account-key** → Your service account JSON
- **session-secret** → Random secure string for sessions

### For Each Secret:
1. Click "**CREATE SECRET**"
2. Enter the **Secret ID** (e.g., `vite-firebase-api-key`)
3. Paste the **Secret Value**
4. Click "**CREATE**"

### Grant Access to Cloud Build:
1. For each secret, click the **⋮** menu → "**Edit Permissions**"
2. Click "**ADD PRINCIPAL**" 
3. Enter: `[PROJECT-NUMBER]@cloudbuild.gserviceaccount.com`
   - Find your project number: https://console.cloud.google.com/home/dashboard
4. Select Role: "**Secret Manager Secret Accessor**"
5. Click "**SAVE**"

