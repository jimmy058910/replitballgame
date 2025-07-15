import { PrismaClient } from '../generated/prisma';

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const prisma = new PrismaClient();

// Legacy export for backward compatibility during transition
export const db = prisma;