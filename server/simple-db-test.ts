// Simple database test to debug the issue
import { PrismaClient } from "./db";

const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

console.log('🔍 Simple test - Prisma client type:', typeof testPrisma);
console.log('🔍 Simple test - Has $queryRaw:', typeof testPrisma.$queryRaw);

export { testPrisma };