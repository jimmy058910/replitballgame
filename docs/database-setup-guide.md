# Database Environment Setup Guide

## Industry Best Practice: Separate Databases

### Development Database (Replit)
- **Purpose**: Local testing, experimentation, schema changes
- **Data**: Test data, mock users, safe to reset
- **Connection**: Direct from Replit to dev database

### Production Database (realmrivalry.com)
- **Purpose**: Live user data, real teams, actual gameplay
- **Data**: Real user accounts, Oakland Cougars team, player stats
- **Connection**: Cloud Run to production database

## Setup Instructions

### Step 1: Create Development Database
1. Go to Neon Console: https://console.neon.tech
2. Create new project: "realm-rivalry-dev"
3. Copy connection string for development

### Step 2: Update Environment Variables

#### Local Development (.env)
```
# Development Database
DATABASE_URL="postgresql://dev_user:password@dev-endpoint.neon.tech/realm_rivalry_dev"
NODE_ENV="development"
```

#### Production (GitHub Secrets)
```
# Production Database (keep existing)
DATABASE_URL="postgresql://neondb_owner:npg_FYwi4k2MuTUp@ep-polished-morning-a5k0aj2x-pooler.us-east-2.aws.neon.tech/neondb"
NODE_ENV="production"
```

### Step 3: Database Migration
```bash
# Sync schema to development database
npm run db:push
```

## Testing Process

### Local Testing (Replit)
1. **Start development server**: `npm run dev`
2. **Verify database connection**: Check `/health` endpoint
3. **Test with development data**: Safe to experiment
4. **Reset if needed**: Development data is disposable

### Production Testing (realmrivalry.com)
1. **Deploy via GitHub Actions**: Automatic on git push
2. **Verify production health**: Check deployed `/health` endpoint  
3. **Test with real data**: Oakland Cougars team, real players
4. **Monitor carefully**: Production data is precious

## Benefits
- **Safe Development**: Experiment without affecting real users
- **Data Integrity**: Production data stays clean
- **Fast Testing**: Reset dev database anytime
- **Realistic Testing**: Production uses real user data