# LOGGING MIGRATION PLAN
## Systematic console.log to LoggingService Migration

### **Phase 1: Critical Routes (Priority 1 - Complete)**
- ✅ **adminRoutes.ts** - Started migration (3 endpoints completed)

### **Phase 2: Security & Auth Routes (Priority 2 - Next)**
- **authRoutes.ts** - Authentication flows
- **rbacRoutes.ts** - Role-based access control
- **firebaseAuth.ts** middleware - Authentication middleware

### **Phase 3: Core Game Services (Priority 3)**
- **matchSimulationService.ts** - Game simulation logic
- **seasonTimingAutomationService.ts** - Season management
- **tournamentAutomation.ts** - Tournament systems
- **contractProgressionService.ts** - Contract management

### **Phase 4: API Routes (Priority 4)**
- **enhancedInventoryRoutes.ts** - Inventory management
- **enhancedMarketplaceRoutes.ts** - Marketplace operations  
- **teamRoutes.ts** - Team management
- **playerRoutes.ts** - Player operations

### **Phase 5: Utility Services (Priority 5)**
- **errorService.ts** - Error handling
- **emailService.ts** - Email operations
- **cacheService.ts** - Caching operations

### **Migration Pattern**
```typescript
// BEFORE
console.log('🎮 Starting match simulation...');
console.error('❌ Match simulation failed:', error);

// AFTER  
logger.info('MATCH_SIM', 'Starting match simulation', { matchId, teams });
logger.error('MATCH_SIM', 'Match simulation failed', error, { matchId, teams });
```

### **Automation Strategy**
1. **Search & Replace Patterns** - Use regex to find common patterns
2. **Component-Based Migration** - One service/route file at a time
3. **Context Addition** - Add meaningful context objects during migration
4. **Testing** - Verify logging output in development after each migration

### **Estimated Timeline**
- **Phase 2**: 2-3 files (1 session)
- **Phase 3**: 4 files (1-2 sessions) 
- **Phase 4**: 4 files (1-2 sessions)
- **Phase 5**: 3 files (1 session)

Total: ~5-7 development sessions for complete migration