#!/usr/bin/env node

/**
 * TEST PROPER DATABASE INITIALIZATION METHOD
 */

console.log('🧪 TESTING PROPER DATABASE INITIALIZATION...');

async function testProperDatabaseAccess() {
  try {
    console.log('✅ Using proper async getPrismaClient() method...');
    
    const { getPrismaClient } = await import('./dist/server/database.js');
    const prisma = await getPrismaClient();
    
    console.log('✅ Database client initialized successfully');
    
    // Test actual database query
    const result = await prisma.$queryRaw`SELECT NOW() as current_time`;
    console.log('✅ DATABASE QUERY SUCCESSFUL');
    console.log(`   Server time: ${result[0].current_time}`);
    
    // Test a typical startup query
    const userCount = await prisma.userProfile.count();
    console.log(`✅ Typical query works - ${userCount} users in database`);
    
    return true;
  } catch (error) {
    console.log('❌ PROPER DATABASE ACCESS FAILED');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

testProperDatabaseAccess().then(success => {
  if (success) {
    console.log('\n🎉 DATABASE ACCESS WORKS WITH PROPER INITIALIZATION');
    console.log('   Problem: Routes using wrong import method');
    console.log('   Solution: Update routes to use getPrismaClient()');
  } else {
    console.log('\n💥 DATABASE STILL NOT WORKING');
  }
  process.exit(success ? 0 : 1);
});