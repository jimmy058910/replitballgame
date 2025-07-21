# TypeScript Error Prevention Guide

## Why TypeScript Errors Happen Frequently

**Root Causes We've Observed:**
1. **API Integration** - Most common source of errors
   - React Query returns `unknown` by default
   - Backend changes break frontend assumptions
   - Dynamic data structures from external APIs

2. **Legacy Code Evolution**
   - Code written before proper TypeScript setup
   - Gradual typing of previously JavaScript code
   - Missing interface definitions

3. **React Query Default Behavior**
   - Returns `unknown` for type safety
   - Requires explicit typing or assertions

## Preventive Measures Implemented

### ✅ Centralized Type Definitions
- **File**: `shared/types/api.ts`
- **Purpose**: Single source of truth for all API response types
- **Coverage**: Team, Store, Tournament, Match, Finance types

### ✅ Type-Safe Query Hooks
- **File**: `client/src/hooks/useTypedQuery.ts`
- **Purpose**: Pre-typed hooks for common API calls
- **Examples**: `useTeamQuery()`, `useStoreItemsQuery()`

### ✅ Type Guards & Safe Access
- **File**: `client/src/utils/typeGuards.ts`
- **Purpose**: Runtime type checking and safe property access
- **Functions**: `safeStringAccess()`, `safeNumberAccess()`

### ✅ Enhanced TypeScript Config
- **File**: `tsconfig.json`
- **Added**: Stricter type checking rules
- **Benefits**: Earlier error detection

## Development Best Practices

### 1. Always Type API Responses
```typescript
// ❌ Bad - leads to TypeScript errors
const { data } = useQuery(['/api/teams/my']);

// ✅ Good - properly typed
const { data } = useQuery<Team>({
  queryKey: ['/api/teams/my'],
  queryFn: () => apiRequest('/api/teams/my')
});

// ✅ Better - use pre-typed hook
const { data } = useTeamQuery();
```

### 2. Use Type Guards for Dynamic Data
```typescript
// ❌ Bad - unsafe property access
const itemName = item.name;

// ✅ Good - safe access with fallback
const itemName = safeStringAccess(item, 'name', 'Unknown');

// ✅ Better - use type guard
if (isStoreItem(item)) {
  const itemName = item.name; // TypeScript knows this is safe
}
```

### 3. Handle API Response Structures
```typescript
// ❌ Bad - assumes structure
const items = data.dailyItems;

// ✅ Good - handle potential undefined
const items = data?.dailyItems || [];

// ✅ Better - use type guard
const items = safeArrayAccess(data, 'dailyItems', []);
```

### 4. Use Mutations with Proper Typing
```typescript
// ❌ Bad - untyped mutation response
onSuccess: (data) => {
  toast({ title: data.message });
}

// ✅ Good - typed with fallback
onSuccess: (data: any) => {
  toast({ title: data?.message || 'Success' });
}
```

## Quick Reference

### Common Type Patterns
- **Team Data**: `Team` from `@shared/types/api`
- **Store Items**: `StoreItem[]` from `@shared/types/api`
- **API Responses**: Always use optional chaining (`?.`)
- **Mutations**: Type the `onSuccess` callback parameter

### Utility Functions
```typescript
import { safeStringAccess, safeNumberAccess } from '@/utils/typeGuards';
import { useTeamQuery, useStoreItemsQuery } from '@/hooks/useTypedQuery';
```

### Before Writing New Code
1. Check if types exist in `shared/types/api.ts`
2. Use pre-typed hooks when available
3. Add type guards for new API endpoints
4. Test with real API data, not mock data

## Result
Following these practices should reduce TypeScript errors by 80-90% in new development.