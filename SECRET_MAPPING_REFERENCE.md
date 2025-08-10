# Secret Mapping Reference - Realm Rivalry

## Environment Overview

- **Development (Replit)**: Uses Replit secrets
- **Production (Google Cloud Run)**: Uses Google Cloud Secret Manager

## DEVELOPMENT Environment (Replit Secrets)
**Used when running locally in Replit**

| Environment Variable | Replit Secret Name | Purpose |
|---------------------|-------------------|---------|
| `DATABASE_URL` | `DATABASE_URL_DEVELOPMENT` | Development database |
| `SESSION_SECRET` | `SESSION_SECRET` | Session encryption |
| `GOOGLE_CLIENT_ID` | `GOOGLE_CLIENT_ID` | OAuth login |
| `GOOGLE_CLIENT_SECRET` | `GOOGLE_CLIENT_SECRET` | OAuth login |
| `VITE_FIREBASE_API_KEY` | `VITE_FIREBASE_API_KEY` | Frontend Firebase |
| `VITE_FIREBASE_PROJECT_ID` | `VITE_FIREBASE_PROJECT_ID` | Frontend Firebase |
| `VITE_FIREBASE_APP_ID` | `VITE_FIREBASE_APP_ID` | Frontend Firebase |

## PRODUCTION Environment (Google Cloud Secret Manager)
**Used when deployed to Google Cloud Run**

| Environment Variable | GCP Secret Name | Purpose |
|---------------------|-----------------|---------|
| `DATABASE_URL` | `DATABASE_URL` | Production database |
| `SESSION_SECRET` | `SESSION_SECRET` | Session encryption |
| `GOOGLE_CLIENT_ID` | `GOOGLE_CLIENT_ID` | OAuth login |
| `GOOGLE_CLIENT_SECRET` | `GOOGLE_CLIENT_SECRET` | OAuth login |
| `VITE_FIREBASE_API_KEY` | `firebase-api-key` | Frontend Firebase |
| `VITE_FIREBASE_PROJECT_ID` | `firebase-project-id` | Frontend Firebase |
| `VITE_FIREBASE_APP_ID` | `firebase-app-id` | Frontend Firebase |

## Current Deployment Configuration (FIXED WITH LOWERCASE SECRETS)
```bash
--set-secrets DATABASE_URL=projects/PROJECT_NUMBER/secrets/database-url:latest,SESSION_SECRET=projects/PROJECT_NUMBER/secrets/session-secret:latest,VITE_FIREBASE_API_KEY=projects/PROJECT_NUMBER/secrets/firebase-api-key:latest,VITE_FIREBASE_PROJECT_ID=projects/PROJECT_NUMBER/secrets/firebase-project-id:latest,VITE_FIREBASE_APP_ID=projects/PROJECT_NUMBER/secrets/firebase-app-id:latest,GOOGLE_CLIENT_ID=projects/PROJECT_NUMBER/secrets/google-client-id:latest,GOOGLE_CLIENT_SECRET=projects/PROJECT_NUMBER/secrets/google-client-secret:latest
```

**Key Fixes**: 
1. Using PROJECT_NUMBER instead of PROJECT_ID for secret references
2. Using lowercase-hyphenated secret names as required by Google Cloud Run
3. Auto-creating lowercase secrets from uppercase ones during deployment

## Verification Checklist

### ✅ Confirmed Existing in Google Cloud Secret Manager:
- `DATABASE_URL` ✅ (UPPERCASE_UNDERSCORE format)
- `SESSION_SECRET` ✅ (UPPERCASE_UNDERSCORE format) 
- `GOOGLE_CLIENT_ID` ✅ (UPPERCASE_UNDERSCORE format)
- `GOOGLE_CLIENT_SECRET` ✅ (UPPERCASE_UNDERSCORE format)
- `firebase-api-key` ✅
- `firebase-project-id` ✅
- `firebase-app-id` ✅

### ✅ Confirmed Existing in Replit Secrets:
- `DATABASE_URL_DEVELOPMENT` ✅
- `DATABASE_URL_PRODUCTION` ✅
- `SESSION_SECRET` ✅
- `GOOGLE_CLIENT_ID` ✅
- `GOOGLE_CLIENT_SECRET` ✅
- `VITE_FIREBASE_API_KEY` ✅
- `VITE_FIREBASE_PROJECT_ID` ✅
- `VITE_FIREBASE_APP_ID` ✅

## Key Insights
1. **Firebase secrets have different naming conventions** between environments
2. **Database secrets use different variables** (`DATABASE_URL` vs `DATABASE_URL_PRODUCTION`)
3. **All other secrets use consistent naming** between environments