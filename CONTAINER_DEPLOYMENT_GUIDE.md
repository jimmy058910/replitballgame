# CONTAINER DEPLOYMENT GUIDE - INDUSTRY STANDARD

## Why This Approach
**Source-based deployment failed** due to missing Cloud Build permissions on the service account. Container-based deployment is equally industry-standard and avoids permission issues.

## What This Uses
✅ **Industry-Standard Dockerfile** (`Dockerfile.simple`):
- Platform-specific build (`--platform linux/amd64`)
- Node.js 20 Alpine (production standard)
- `dumb-init` for proper signal handling
- Non-root user for security
- Optimized layers and cache

✅ **Simple Server** (`app.js`):
- Listens on `0.0.0.0:$PORT` (Cloud Run requirement)
- Immediate startup with health checks
- Proper static file serving
- SPA routing support

## Deploy Now
**Go to GitHub repository** → **Actions** → **"Deploy Container Industry Standard"** → **Run workflow**

## Expected Result
- Clean container build using existing permissions
- Deployment to Cloud Run without Cloud Build dependencies
- Full application available at https://www.realmrivalry.com

## Why This Works
- Uses Docker build (which we have permissions for)
- Pushes to Artifact Registry (existing permissions)
- Deploys to Cloud Run (existing permissions)
- No Cloud Build service required

**This is still 100% industry standard - many production apps use container-based deployment.**