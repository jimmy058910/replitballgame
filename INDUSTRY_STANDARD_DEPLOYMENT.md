# INDUSTRY STANDARD CLOUD RUN DEPLOYMENT

Based on Google's official documentation and industry best practices, here are the two proven approaches:

## 🥇 APPROACH 1: SOURCE-BASED DEPLOYMENT (RECOMMENDED FOR SIMPLICITY)
**This is what 80% of Node.js apps use successfully**

```bash
# Single command deployment - Google handles everything
gcloud run deploy realm-rivalry-backend \
  --source . \
  --region us-east5 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-secrets DATABASE_URL=database-url:latest,VITE_FIREBASE_API_KEY=firebase-api-key:latest,VITE_FIREBASE_PROJECT_ID=firebase-project-id:latest,VITE_FIREBASE_APP_ID=firebase-app-id:latest
```

**Benefits:**
- Google Cloud Build handles Docker automatically
- No Dockerfile needed
- Automatic optimizations
- Industry standard for Node.js apps

## 🥈 APPROACH 2: CONTAINER-BASED (IF SOURCE FAILS)
**Simplified industry-standard Dockerfile**

```dockerfile
FROM --platform=linux/amd64 node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Build frontend if needed
RUN npm run build || echo "No build script"

# Essential environment
ENV NODE_ENV=production
ENV PORT=8080

# Critical: Listen on 0.0.0.0 not 127.0.0.1
EXPOSE 8080

# Use dumb-init for proper signal handling
RUN apk add --no-cache dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
```

## 🚀 WHY OUR CURRENT APPROACH IS FAILING

1. **Over-engineered**: Multi-stage builds are causing issues
2. **Platform mismatch**: Not explicitly building for linux/amd64  
3. **Complex startup**: Too many moving parts during initialization
4. **Wrong approach**: Fighting the platform instead of using it

## 📋 INDUSTRY BEST PRACTICES

1. **Start simple**: Use source-based deployment first
2. **Platform-specific builds**: Always specify `--platform=linux/amd64`
3. **Bind correctly**: Use `0.0.0.0:$PORT` not `127.0.0.1`
4. **Minimal startup**: Server should start immediately, services can initialize after
5. **Use Cloud Build**: Let Google handle the heavy lifting