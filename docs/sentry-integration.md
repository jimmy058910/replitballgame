# SENTRY ERROR MONITORING INTEGRATION

## Overview
Professional-grade error monitoring with session replay for production debugging.

## Configuration Status
⏳ **PENDING**: Awaiting Sentry DSN keys from user
- SENTRY_DSN_BACKEND (from Node.js/Express project)
- SENTRY_DSN_FRONTEND (from React project)

## Implementation Ready
✅ Backend service created (`server/services/sentryService.ts`)
✅ Frontend client created (`client/src/lib/sentryClient.ts`) 
✅ Packages installed (@sentry/node, @sentry/profiling-node, @sentry/react)

## Features Configured
- **Error Monitoring**: Full stack error capture with context
- **Session Replay**: 10% normal sessions, 100% error sessions
- **Performance Monitoring**: 10% sampling to conserve quota
- **Environment Detection**: Development vs production handling
- **User Context**: Track errors by user ID and team
- **Breadcrumbs**: Debug trail for error reproduction

## Integration Points
- Backend: Middleware in Express app (requestHandler, errorHandler)
- Frontend: Initialize in main.tsx, wrap App with ErrorBoundary
- Cache System: Error tracking for cache operations
- Database: Monitor query failures and connection issues

## Expected Benefits
- **Production Debugging**: See exact error conditions
- **User Experience**: Replay sessions where errors occurred
- **Performance Insights**: Track slow queries and API calls
- **Proactive Monitoring**: Catch issues before user reports

## Next Steps
1. User provides Sentry DSN keys
2. Initialize backend Sentry service
3. Initialize frontend Sentry client
4. Add error boundaries to critical components
5. Test with intentional errors