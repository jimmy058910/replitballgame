import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

import { PrismaClient } from '../prisma/generated/client/index.js';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🎯 FORCE FIXING season start date to September 1st, 2025...');
    
    // Check current season
    const currentSeason = await prisma.season.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('📊 Current season start date:', currentSeason?.startDate);
    
    // Force update to September 1st at midnight UTC
    const result = await prisma.$executeRaw`
      UPDATE "Season" 
      SET "startDate" = '2025-09-01T00:00:00.000Z'::timestamp
    `;
    
    console.log('✅ Updated season start date, affected rows:', result);
    
    // Verify the fix
    const updatedSeason = await prisma.season.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('✅ Verified new start date:', updatedSeason?.startDate);
    console.log('🎉 Season start date fix complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();