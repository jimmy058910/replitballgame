# Repository Organization

This repository has been systematically organized for clarity and maintainability.

## 📁 Directory Structure

### **Root Directory (Production Files Only)**
- `server-step7-unified.js` - Current production server
- `Dockerfile.step7-unified` - Current production Docker configuration
- `firebase.json` - Current hosting configuration
- `package.json`, `package-lock.json` - Package management
- Configuration files: `eslint.config.js`, `components.json`

### **Application Code**
- `client/` - React frontend application
- `server/` - Express backend source code
- `shared/` - Shared types and schemas
- `prisma/` - Database schemas and migrations
- `config/` - Game configuration files

### **Documentation & Guides**
- `docs/` - Comprehensive project documentation
- `README.md` - Main project documentation
- `replit.md` - Project architecture and deployment journey

### **Development & Testing**
- `tests/` - All test files and testing resources
- `scripts/` - Build scripts, utilities, and tools
- `deployment/` - Deployment configurations and debug files
- `temp/` - Temporary analysis and debug files
- `archive/` - Historical files and references

### **CI/CD & Workflows**
- `.github/workflows/` - GitHub Actions deployment pipelines
  - `deploy-step7-unified.yml` - Active production deployment
  - `review.yml` - Dependabot QA pipeline
  - `dependabot.yml` - Dependency management

### **Build & Distribution**
- `dist/` - Built application files
- `generated/` - Generated code and assets
- `node_modules/` - Dependencies (git-ignored)

## 🎯 Organization Benefits

1. **Clean Root**: Only essential production files in root directory
2. **Logical Grouping**: Related files organized by purpose
3. **Easy Navigation**: Clear separation between development and production
4. **Maintainable**: Easy to find and manage specific file types
5. **Professional**: Industry-standard project structure

## 🔧 File Movement Summary

**Moved to `temp/`**: All `temp_*.txt` debugging files
**Moved to `tests/`**: All test files (`test-*.*`)
**Moved to `scripts/`**: Build scripts and utilities
**Moved to `deployment/`**: Old deployment configs and debug files
**Moved to `archive/`**: Historical reference files

## ✅ Current Status

Repository now contains only production-essential files in the root directory while maintaining complete development capabilities and comprehensive file organization.