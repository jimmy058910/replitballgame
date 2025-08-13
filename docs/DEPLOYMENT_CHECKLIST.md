# Deployment Environment Checklist

## Development Environment (Replit)
- **Domain**: `84e7df37-b386-43d5-a4d2-28ef9c3a4ebe-00-3hsmig2a5zsfq.janeway.replit.dev`
- **Database**: Cloud SQL `realm-rivalry-dev` instance
  - IP: `35.225.150.44`
  - Connection: Direct SSL connection from Replit
- **Authentication**:
  - Firebase: Domain authorized in Firebase Console
  - OAuth Callback: `https://84e7df37-b386-43d5-a4d2-28ef9c3a4ebe-00-3hsmig2a5zsfq.janeway.replit.dev/api/auth/google/callback`
  - Fallback: Backend OAuth with Google Console redirect URI configured

## Production Environment (realmrivalry.com)
- **Domain**: `www.realmrivalry.com`
- **Database**: Cloud SQL `realm-rivalry-prod` instance
  - IP: `34.171.83.78`
  - Connection: Unix socket via `/cloudsql/` on Cloud Run
- **Authentication**:
  - Firebase: `realmrivalry.com` authorized in Firebase Console
  - OAuth Callback: `https://www.realmrivalry.com/api/auth/google/callback`
  - Backend OAuth with Google Console redirect URI configured

## Required Google Console Configuration

### Firebase Console - Authorized Domains
- `84e7df37-b386-43d5-a4d2-28ef9c3a4ebe-00-3hsmig2a5zsfq.janeway.replit.dev` (Development)
- `realmrivalry.com` (Production)
- `www.realmrivalry.com` (Production)

### Google Console OAuth - Authorized Redirect URIs  
- `https://84e7df37-b386-43d5-a4d2-28ef9c3a4ebe-00-3hsmig2a5zsfq.janeway.replit.dev/api/auth/google/callback` (Development)
- `https://www.realmrivalry.com/api/auth/google/callback` (Production)

### Cloud SQL Authorized Networks (Development Only)
**Instance**: `realm-rivalry-dev`
- **Network Name**: `replit-development`
- **IP Address**: `34.148.183.146/32` (Current Replit IP)
- **Path**: Google Cloud Console → SQL → realm-rivalry-dev → Connections → Authorized networks

**Note**: Production instance (`realm-rivalry-prod`) uses private Cloud Run connections and doesn't need authorized networks.

## Environment Variable Configuration

### Development (.env)
```
NODE_ENV=development
DATABASE_URL=postgresql://[user]:[pass]@35.225.150.44:5432/[db]?sslmode=require
GOOGLE_CLIENT_ID=[google_client_id]
GOOGLE_CLIENT_SECRET=[google_client_secret]
VITE_FIREBASE_API_KEY=[firebase_api_key]
VITE_FIREBASE_PROJECT_ID=direct-glider-465821-p7
VITE_FIREBASE_APP_ID=[firebase_app_id]
```

### Production (Cloud Run Environment Variables)
```
NODE_ENV=production  
DATABASE_URL=postgresql://[user]:[pass]@localhost/[db]?host=/cloudsql/[instance_connection_name]
GOOGLE_CLIENT_ID=[google_client_id]
GOOGLE_CLIENT_SECRET=[google_client_secret]
VITE_FIREBASE_API_KEY=[firebase_api_key]
VITE_FIREBASE_PROJECT_ID=direct-glider-465821-p7
VITE_FIREBASE_APP_ID=[firebase_app_id]
```

## Architecture Benefits
✅ **Separate Databases**: Complete data isolation between dev and production
✅ **Environment-Specific Authentication**: Each environment uses appropriate domains
✅ **Automatic Environment Detection**: Database and OAuth URLs switch automatically based on NODE_ENV
✅ **Fallback Authentication**: Firebase primary, backend OAuth secondary for development compatibility
✅ **Production Security**: Socket connections and proper domain authorization for production

## Database Technology Stack
**IMPORTANT**: This project uses **Prisma ORM ONLY**. 
- ❌ **NO Drizzle** - Drizzle has been completely removed from the project
- ✅ **Prisma Only** - All database operations use Prisma Client
- ✅ **Simple Approach** - Single ORM for all database needs
- ✅ **Migrations** - Use `npx prisma db push` for schema changes