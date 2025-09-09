# Scripts Directory - Organized September 9, 2025

This directory contains utility scripts for development, deployment, and maintenance.

## 📂 **Current Organization**

### **🏗️ Development Scripts**
- `comprehensive-system-test.ts` - System integration testing
- `fix-production-roster.ts` - Production roster maintenance
- `setup-local-db.js` - Local development database setup
- `verify-setup.js` - Development environment verification
- `vitest.config.ts` - Test configuration

### **🚀 Deployment Scripts**
- `debug-deployment.sh` - Deployment debugging
- `deployment-verification.sh` - Post-deployment verification
- `emergency-rollback.sh` - Emergency rollback procedures
- `fast-deploy-test.sh` - Quick deployment testing
- `fix-deployment-issues.sh` - Deployment issue resolution
- `load-test.sh` - Performance testing
- `local-docker-test.sh` - Local Docker testing
- `setup-artifact-registry.sh` - GCP Artifact Registry setup
- `setup-cloud-sql.sh` - Cloud SQL configuration
- `start-cloud-sql-proxy.sh` - Local Cloud SQL proxy
- `switch-traffic-to-new-revision.sh` - Traffic switching
- `test-production-build.sh` - Production build verification
- `trigger-step5-deployment.sh` - Deployment triggering
- `verify-deployment.sh` - Deployment validation

### **🗄️ Database Scripts**
- `correct-roster-fix.sql` - Roster data corrections
- `create-production-user.js` - Production user setup
- `emergency-roster-fix.sql` - Emergency roster repairs
- `final-player-fix.sql` - Player data fixes
- `fix-race-names.sql` - Race name corrections
- `migrate-data.js` - Data migration utilities
- `migrate-database.sh` - Database migration runner
- `reset-and-schedule.js` - Database reset and scheduling
- `ultimate-roster-fix.sql` - Comprehensive roster fixes

### **📅 Scheduling Scripts**
- `absolute-final-clean.mjs` - Schedule cleaning (final version)
- `analyze-broken-schedule.mjs` - Schedule analysis
- `analyze-schedule.mjs` - Schedule validation
- `check-current-season.mjs` - Season state checking
- `correct-round-robin.mjs` - Round-robin corrections
- `create-final-perfect-schedule.mjs` - Perfect schedule generation
- `create-industry-standard-schedule.mjs` - Standard schedule creation
- `create-perfect-14day-schedule.mjs` - 14-day schedule generation
- `create-true-round-robin.mjs` - True round-robin creation
- `create-working-perfect-schedule.mjs` - Working schedule generation
- `final-clean-schedule.mjs` - Final schedule cleanup
- `final-perfect-schedule.mjs` - Perfect schedule implementation
- `fix-schedule-dates.mjs` - Schedule date corrections
- `fix-schedule-final.mjs` - Final schedule fixes
- `fix-season-start-date.mjs` - Season start date fixes
- `force-fix-season-date.mjs` - Forced season date correction
- `generate-full-schedule.mjs` - Full schedule generation
- `generate-proper-schedule.mjs` - Proper schedule creation
- `generate-schedule.mjs` - Basic schedule generation
- `verify-division7-schedule.mjs` - Division 7 verification
- `verify-perfect-schedule.mjs` - Perfect schedule validation

### **🔧 Utility Scripts**
- `check-frontend-backend-mismatch.mjs` - Frontend/backend sync check
- `clear-all-games.js` - Game data clearing
- `clear-games-simple.mjs` - Simple game clearing
- `debug-database-state.mjs` - Database state debugging
- `dependency-analyzer.js` - Dependency analysis
- `direct-clear.mjs` - Direct data clearing
- `ensure-dev-database.sh` - Development database setup
- `final-merge-validation.js` - Merge validation
- `github-pr-creator.js` - GitHub PR automation
- `quick-secret-setup.sh` - Quick secrets configuration
- `security-scanner.js` - Security scanning
- `sql-clear.mjs` - SQL data clearing
- `test-apis-directly.mjs` - Direct API testing
- `test-daily-schedule-api.mjs` - Daily schedule API testing
- `validate-jules-improvements.js` - Jules improvements validation

### **📚 Documentation**
- `deployment-strategy-guide.md` - Deployment strategy documentation
- `migration-checklist.md` - Migration checklist
- `pre-merge-checklist.md` - Pre-merge validation checklist

## 🗂️ **Archived Items**

The following TypeScript migration-related scripts have been moved to `archive/typescript-migration-attempts/scripts-archive/`:
- All TypeScript migration attempts and related tooling
- Automated fix scripts that were part of the failed migration efforts

## 🧹 **Cleanup Status**

✅ **Completed (September 9, 2025)**
- TypeScript migration scripts archived
- Directory organized by function
- Documentation added

## 📝 **Usage Guidelines**

### **For Development**
- Use `setup-local-db.js` for local development setup
- Use `verify-setup.js` to check development environment
- Use `comprehensive-system-test.ts` for integration testing

### **For Deployment**  
- Follow deployment scripts in order for production releases
- Use emergency scripts only when needed
- Always verify deployments with verification scripts

### **For Maintenance**
- Use database scripts for data corrections
- Use scheduling scripts for game schedule management
- Use utility scripts for debugging and analysis

---

**Last Updated**: September 9, 2025  
**Status**: Organized and cleaned up, TypeScript migration scripts archived