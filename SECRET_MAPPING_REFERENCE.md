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
| `DATABASE_URL` | `database-url` | Production database |
| `SESSION_SECRET` | `session-secret` | Session encryption |
| `GOOGLE_CLIENT_ID` | `google-client-id` | OAuth login |
| `GOOGLE_CLIENT_SECRET` | `google-client-secret` | OAuth login |
| `VITE_FIREBASE_API_KEY` | `firebase-api-key` | Frontend Firebase |
| `VITE_FIREBASE_PROJECT_ID` | `firebase-project-id` | Frontend Firebase |
| `VITE_FIREBASE_APP_ID` | `firebase-app-id` | Frontend Firebase |

## Current Deployment Configuration
```bash
--set-secrets DATABASE_URL=database-url:latest,SESSION_SECRET=session-secret:latest,VITE_FIREBASE_API_KEY=firebase-api-key:latest,VITE_FIREBASE_PROJECT_ID=firebase-project-id:latest,VITE_FIREBASE_APP_ID=firebase-app-id:latest,GOOGLE_CLIENT_ID=google-client-id:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest
```

## Verification Checklist

### ✅ Confirmed Existing in Google Cloud Secret Manager:
- `database-url` ✅
- `session-secret` ✅  
- `google-client-id` ✅
- `google-client-secret` ✅
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