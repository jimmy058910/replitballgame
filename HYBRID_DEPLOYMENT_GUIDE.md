# Hybrid Architecture Deployment Guide

## Overview
The Realm Rivalry application uses a hybrid architecture to solve critical deployment issues while maintaining full functionality:

- **Frontend**: Firebase Hosting (domain mapping, SSL, authentication)
- **Backend**: Google Cloud Run (APIs, WebSockets, database, real-time features)

## Architecture Diagram
```
User → Firebase Hosting (realmrivalry.com) → Firebase Auth
      ↓
      API Calls (CORS enabled)
      ↓
      Google Cloud Run Backend → Neon Database
      ↓
      WebSockets, Live Matches, Background Automation
```

## Deployment Methods

### 1. Automated Deployment (Recommended)
Push to main branch triggers GitHub Actions:
```bash
git add .
git commit -m "Deploy hybrid architecture"
git push origin main
```

### 2. Manual Deployment
Run the deployment script:
```bash
./deploy-hybrid.sh
```

### 3. Individual Component Deployment

#### Backend Only:
```bash
# Build and deploy backend to Cloud Run
docker build -f Dockerfile.backend -t us-east5-docker.pkg.dev/direct-glider-465821-p7/realm-rivalry/backend:latest .
docker push us-east5-docker.pkg.dev/direct-glider-465821-p7/realm-rivalry/backend:latest
gcloud run deploy realm-rivalry-backend --image us-east5-docker.pkg.dev/direct-glider-465821-p7/realm-rivalry/backend:latest --region us-east5
```

#### Frontend Only:
```bash
# Build frontend with backend URL and deploy to Firebase
VITE_API_BASE_URL=https://realm-rivalry-backend-108005641993.us-east5.run.app npm run build
firebase deploy --project direct-glider-465821-p7
```

## Environment Variables

### Required for Frontend (.env or GitHub Secrets):
```
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_PROJECT_ID=direct-glider-465821-p7  
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_API_BASE_URL=https://realm-rivalry-backend-108005641993.us-east5.run.app
```

### Required for Backend (Google Cloud Secrets):
```
NODE_ENV=production
DATABASE_URL=your_neon_database_url
SESSION_SECRET=your_session_secret
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
```

## URLs
- **Frontend**: https://realmrivalry.com
- **Backend APIs**: https://realm-rivalry-backend-108005641993.us-east5.run.app
- **WebSocket**: wss://realm-rivalry-backend-108005641993.us-east5.run.app/ws
- **Health Check**: https://realm-rivalry-backend-108005641993.us-east5.run.app/health

## Key Benefits
1. **Domain Issues Solved**: Firebase handles realmrivalry.com automatically
2. **SSL Issues Solved**: Firebase provides automatic HTTPS
3. **Authentication Simplified**: Firebase Auth client-side
4. **Full Game Features**: All WebSocket and real-time features work via Cloud Run
5. **Cost Effective**: Static files on Firebase, dynamic features on Cloud Run
6. **Scalable**: Firebase CDN + Cloud Run autoscaling

## Troubleshooting

### Frontend not connecting to backend:
- Check VITE_API_BASE_URL environment variable
- Verify CORS configuration in backend
- Check browser network tab for API calls

### Backend deployment fails:
- Verify Docker image builds successfully
- Check Google Cloud permissions
- Ensure secrets are configured in Secret Manager

### Authentication not working:
- Verify Firebase configuration
- Check Firebase Auth is enabled in console
- Ensure authorized domains include realmrivalry.com