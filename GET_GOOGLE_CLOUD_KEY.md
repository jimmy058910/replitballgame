# How to Get Your Google Cloud Service Account JSON Key

## Step-by-Step Instructions

### 1. Go to Google Cloud Console
- Open: https://console.cloud.google.com/
- Make sure you're in the correct project: `direct-glider-465821-p7`

### 2. Navigate to Service Accounts
- In the left sidebar, click **IAM & Admin**
- Click **Service Accounts**
- Or use direct link: https://console.cloud.google.com/iam-admin/serviceaccounts?project=direct-glider-465821-p7

### 3. Find Your Service Account
Look for a service account like:
- `realm-rivalry-deployment@direct-glider-465821-p7.iam.gserviceaccount.com`
- Or any service account with deployment permissions
- Or the default Compute Engine service account

### 4. Create a New Key
- Click on the service account email
- Go to the **Keys** tab
- Click **Add Key** → **Create new key**
- Select **JSON** format
- Click **Create**

### 5. Download the Key
- A JSON file will download automatically
- **IMPORTANT**: This file contains sensitive credentials
- Keep it secure and never commit it to version control

### 6. Copy the JSON Content
- Open the downloaded JSON file in a text editor
- Copy the **entire content** (including the outer curly braces `{ }`)
- It should look like:
```json
{
  "type": "service_account",
  "project_id": "direct-glider-465821-p7",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "...@direct-glider-465821-p7.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

## If You Don't Have a Service Account

### Create One:
1. In Service Accounts page, click **Create Service Account**
2. Name: `realm-rivalry-deployment`
3. Description: `Deployment service account for Realm Rivalry`
4. Click **Create and Continue**

### Grant Permissions:
Add these roles:
- **Cloud Run Admin**
- **Artifact Registry Writer**  
- **Storage Admin**
- **Secret Manager Secret Accessor**

### Finish:
- Click **Done**
- Follow steps 4-6 above to create and download the key

## Add to GitHub Secrets

Once you have the JSON key:

1. Go to: https://github.com/jimmy058910/replitballgame/settings/secrets/actions
2. Click **New repository secret**
3. Name: `GOOGLE_SERVICE_ACCOUNT_KEY`
4. Value: Paste the entire JSON content
5. Click **Add secret**

## Security Notes

- **Never share** this JSON key
- **Delete the downloaded file** after adding to GitHub secrets
- **Don't commit** the key to your repository
- If compromised, delete the key and create a new one

Once you add this secret, your deployment will have full Google Cloud access and database connectivity.