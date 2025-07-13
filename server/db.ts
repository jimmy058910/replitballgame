import { PrismaClient } from '../generated/prisma';

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use Prisma Client instead of Drizzle
export const prisma = new PrismaClient();

// Legacy export for backward compatibility during transition
export const db = prisma;