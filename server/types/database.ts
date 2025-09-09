/**
 * Database Types - Single Source of Truth
 * Re-exports all Prisma generated types
 */

export * from '@prisma/client';
export { Prisma, PrismaClient } from '@prisma/client';

// Type helpers
export type AsyncReturnType<T extends (...args: any) => Promise<any>> = 
  T extends (...args: any) => Promise<infer R> ? R : any;
