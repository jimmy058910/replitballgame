# Production Domain Configuration - realmrivalry.com

## 🌍 Hybrid Architecture Overview

Your production setup uses a **hybrid architecture** for optimal performance and scalability:

```
realmrivalry.com (Custom Domain)
     ↓
Firebase Hosting (Frontend - Static Files)
     ↓ (API Routes)
Google Cloud Run (Backend - realm-rivalry-unified)
     ↓
Cloud SQL PostgreSQL (Database)
```

## 🔧 Configuration Details

### **Firebase Hosting Configuration** (`firebase.json`)
- **Frontend**: Serves static React build from Firebase Hosting
- **API Routing**: Routes `/api/**` and `/health` to Cloud Run service
- **Service Target**: `realm-rivalry-unified` (Step 7 Unified Application)
- **Region**: `us-central1`

### **Domain Routing Flow**
1. **User visits**: `https://realmrivalry.com`
2. **Frontend loads**: from Firebase Hosting 
3. **API calls**: automatically routed to `https://realm-rivalry-unified-<project>.us-central1.run.app`
4. **Database**: Cloud SQL PostgreSQL connection

## ✅ Step 7 Production Integration

### **Updated Firebase Configuration**
```json
{
  "source": "/api/**",
  "run": {
    "serviceId": "realm-rivalry-unified",  // ← Updated for Step 7
    "region": "us-central1"
  }
}
```

### **Benefits of This Architecture**
- **Performance**: Firebase Hosting CDN for fast frontend delivery
- **Scalability**: Cloud Run auto-scaling for backend services  
- **Custom Domain**: Direct access via realmrivalry.com
- **SSL/TLS**: Automatic HTTPS certificate management
- **Global Distribution**: Firebase's global edge network

## 🚀 Deployment Process

1. **Cloud Run Deployment**: Step 7 unified application deploys to `realm-rivalry-unified`
2. **Firebase Hosting**: Updated configuration routes API calls to new service
3. **Production Access**: Users access complete app via `https://realmrivalry.com`

## 🔍 Verification Steps

After deployment, verify the integration:

```bash
# Frontend (Firebase Hosting)
curl https://realmrivalry.com

# API Routes (Cloud Run via Firebase)
curl https://realmrivalry.com/api/health
curl https://realmrivalry.com/api/divisions
curl https://realmrivalry.com/api/players
```

## 🎯 Result

- **Frontend URL**: `https://realmrivalry.com` (Firebase Hosting)
- **API Endpoints**: `https://realmrivalry.com/api/*` (Cloud Run via Firebase)
- **Direct Cloud Run**: `https://realm-rivalry-unified-*.us-central1.run.app` (backup access)

Your Step 7 unified application will be fully accessible at **realmrivalry.com** with proper hybrid architecture!