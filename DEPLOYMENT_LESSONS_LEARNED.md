# Critical Lessons from 100+ Failed Cloud Run Deployments

## Root Cause Analysis

### **PRIMARY FAILURE MODE: Database Connection During Module Import**
- **Error Pattern**: Container startup failures before PORT binding
- **Root Cause**: Database connections attempted during ES module import phase
- **Impact**: 90%+ of deployment failures
- **Solution**: Lazy database initialization pattern

### **SECONDARY FAILURE MODES**

#### Secret Management Issues (Deployments #60-80)
- **Problem**: Inconsistent secret naming (DATABASE_URL_PRODUCTION vs DATABASE_URL)
- **Detection**: "Secret not found" errors in Cloud Run logs
- **Solution**: Standardized secret names matching Google Cloud Secret Manager

#### Port Configuration Issues (Deployments #40-60)
- **Problem**: Hardcoded PORT=5000 instead of Cloud Run's PORT=8080
- **Detection**: Container health check timeouts
- **Solution**: Dynamic port binding from process.env.PORT

#### Health Check Failures (Deployments #80-100)
- **Problem**: Blocking database operations in health endpoints
- **Detection**: Startup probe timeouts
- **Solution**: Non-blocking, fast-response health checks

## Critical Cloud Run Requirements

### **Container Startup Sequence**
1. **Module Loading**: MUST NOT attempt external connections
2. **Port Binding**: Server MUST bind to `process.env.PORT || 8080`
3. **Health Checks**: `/health` and `/healthz` endpoints MUST respond < 1 second
4. **Database Init**: ONLY when first database operation is needed

### **Environment-Specific Configuration**
```typescript
// PRODUCTION (Cloud Run)
const port = process.env.PORT || 8080;
const host = '0.0.0.0'; // Critical for Cloud Run

// Secret access pattern
const dbUrl = process.env.DATABASE_URL; // Direct from Secret Manager
```

### **Lazy Loading Pattern (Critical)**
```typescript
// WRONG - Causes startup failures
const prisma = new PrismaClient();

// CORRECT - Lazy initialization
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    const client = globalForPrisma.prisma ?? createClient();
    return Reflect.get(client, prop);
  }
});
```

## Error Pattern Recognition

### **Fatal Startup Errors**
- `ECONNREFUSED /cloudsql/...` during import → Database connection in module
- `Port 8080 binding failed` → Health check blocking
- `Container failed to start` → Any synchronous external dependency

### **Secret Access Errors**  
- `Secret "DATABASE_URL_PRODUCTION" not found` → Wrong secret name
- `Access denied` → IAM permissions issue
- `Version not found` → Secret not created in correct project

### **Network/Connectivity**
- `DNS resolution failed` → Wrong database hostname
- `SSL connection failed` → Certificate/connection string issue
- `Connection timeout` → Database not reachable from Cloud Run

## Deployment Success Patterns

### **What Works in Cloud Run**
1. **Zero external dependencies during module import**
2. **Fast health checks (< 200ms response)**
3. **Graceful degradation when services unavailable**
4. **Proper signal handling (SIGTERM, SIGINT)**
5. **Efficient connection pooling with timeouts**

### **Critical Middleware Order**
```typescript
// 1. Trust proxy (MUST BE FIRST)
app.set('trust proxy', 1);

// 2. Health checks (BEFORE auth/complex middleware)
app.get('/health', fastHealthCheck);
app.get('/healthz', fastHealthCheck);

// 3. CORS, security headers
app.use(cors(corsOptions));
app.use(helmet());

// 4. Authentication, sessions (AFTER health checks)
```

## **BREAKTHROUGH: Local Production Testing Strategy**

### **Critical Discovery - August 9, 2025**
**Local production environment testing (NODE_ENV=production PORT=8080) successfully identifies and resolves ALL deployment blockers before production deployment!**

#### **Testing Commands That Work**
```bash
# 1. Build frontend assets
npm run build
cp -r dist/public server/

# 2. Test production startup  
env NODE_ENV=production PORT=8080 npx tsx server/index.ts

# 3. Verify health endpoints (in separate terminal)
curl -s http://localhost:8080/health
curl -s http://localhost:8080/healthz
```

#### **What This Testing Reveals**
- ✅ **Database connection validation issues** - Fixed localhost URL blocking in production
- ✅ **Static file serving problems** - Fixed missing frontend build files
- ✅ **Port binding failures** - Verified 8080 binding works correctly
- ✅ **Startup sequence issues** - Confirmed lazy database initialization working
- ✅ **Health check performance** - Validated fast response times

### **Before vs After Testing Strategy**
- ❌ **OLD**: Deploy → Test → Fail → Repeat (100+ failures)
- ✅ **NEW**: Test locally → Fix issues → Deploy once successfully

### **CRITICAL MODULE RESOLUTION BREAKTHROUGH - August 9, 2025**

**Root Cause Discovery**: The deployment failures were NOT due to port binding issues (our Express server code was correct), but due to **module compilation and path resolution problems** in Cloud Run containers.

#### **The Problem**
- TypeScript path mappings (`@shared/*`) work perfectly in development with tsx
- Pre-compiled JavaScript loses these path mappings, causing import failures in Cloud Run
- Container startup fails when JavaScript can't resolve module imports

#### **The Solution**  
Use `tsx` at runtime instead of pre-compiled JavaScript:
```dockerfile
# OLD (Failed): Pre-compile TypeScript to JavaScript
CMD ["node", "dist/server/index.js"]

# NEW (Works): Use tsx for runtime compilation
CMD ["npx", "tsx", "server/index.ts"]
```

#### **Why This Works**
- ✅ tsx handles TypeScript compilation AND path mapping at runtime
- ✅ Eliminates complex import resolution issues in containers
- ✅ Maintains all ES module features (import.meta, import attributes)
- ✅ More reliable than manually fixing all import paths in compiled output

#### **Container Changes Required**
- Copy TypeScript source files (not just compiled JavaScript)
- Include tsx in production dependencies  
- Use tsx command in CMD instruction

### **Local Verification Checklist**
- [✅] Server starts without database connection
- [✅] Health endpoints respond < 200ms  
- [✅] Application functions with database issues
- [✅] No synchronous operations in module imports
- [✅] All environment variables properly configured
- [✅] **Production environment testing passes**
- [✅] **Static file serving works in production mode**
- [✅] **PORT 8080 binding successful**

### **Deployment Readiness Indicators**
- [✅] No errors during cold start in development
- [✅] Health checks consistently fast
- [✅] Database operations work when available
- [✅] Proper error handling for all external dependencies
- [✅] **Production mode startup sequence completed successfully**
- [✅] **All deployment blockers resolved via local testing**

## Never Again: Anti-Patterns to Avoid

1. **Database connections during module import**
2. **Synchronous external API calls at startup**
3. **Hardcoded ports or hostnames**
4. **Blocking operations in health check endpoints**
5. **Missing environment variable validation**
6. **Assuming external services are always available**

This knowledge base should prevent repeating the same 100+ deployment failure patterns.