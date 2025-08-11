#!/usr/bin/env node

/**
 * TEST ACTUAL DATABASE CONNECTION USING PROJECT'S METHOD
 */

console.log('🧪 TESTING DATABASE CONNECTION WITH PROJECT SETUP...');

async function testPrismaConnection() {
  console.log('\n📊 TESTING PRISMA DATABASE CONNECTION...');
  
  try {
    // Use the same import as our server code
    const { prisma } = await import('./dist/server/db.js');
    
    console.log('✅ Prisma client imported successfully');
    
    // Test basic connection
    console.log('🔗 Testing Prisma connection...');
    const result = await prisma.$queryRaw`SELECT NOW() as current_time`;
    
    console.log('✅ PRISMA DATABASE CONNECTION SUCCESSFUL');
    console.log(`   Server time: ${result[0].current_time}`);
    
    // Test a simple query that might be used during startup
    console.log('🔍 Testing typical startup query...');
    const userCount = await prisma.userProfile.count();
    console.log(`✅ Query successful - ${userCount} users in database`);
    
    return true;
  } catch (error) {
    console.log('❌ PRISMA DATABASE CONNECTION FAILED');
    console.log(`   Error: ${error.message}`);
    if (error.code) console.log(`   Code: ${error.code}`);
    
    // Check if it's a connection issue vs import issue
    if (error.message.includes('Cannot find module')) {
      console.log('   ⚠️  Import issue - db module not built correctly');
    } else if (error.message.includes('connect')) {
      console.log('   ⚠️  Connection issue - DATABASE_URL might be wrong');  
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('   ⚠️  DNS issue - database host not reachable');
    }
    
    return false;
  }
}

async function testDatabaseURLFormat() {
  console.log('\n🔍 ANALYZING DATABASE_URL FORMAT...');
  
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log('❌ DATABASE_URL not found');
    return false;
  }
  
  console.log('✅ DATABASE_URL exists');
  
  try {
    const url = new URL(dbUrl);
    console.log(`   Protocol: ${url.protocol}`);
    console.log(`   Host: ${url.hostname}`);
    console.log(`   Port: ${url.port || 'default'}`);
    console.log(`   Database: ${url.pathname.substring(1)}`);
    console.log(`   Username: ${url.username ? 'present' : 'missing'}`);
    console.log(`   Password: ${url.password ? 'present' : 'missing'}`);
    
    // Check for Cloud SQL specific format
    if (url.hostname.includes('google') || url.hostname.includes('cloud-sql')) {
      console.log('   🎯 Google Cloud SQL detected');
    }
    
    return true;
  } catch (error) {
    console.log('❌ Invalid DATABASE_URL format');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function runDatabaseTests() {
  console.log('🧪 COMPREHENSIVE DATABASE FUNCTIONALITY TESTING\n');
  
  const formatOk = await testDatabaseURLFormat();
  const connectionOk = await testPrismaConnection();
  
  console.log('\n📋 DATABASE TEST RESULTS:');
  console.log(`   URL Format: ${formatOk ? '✅ VALID' : '❌ INVALID'}`);
  console.log(`   Prisma Connection: ${connectionOk ? '✅ WORKING' : '❌ FAILED'}`);
  
  if (formatOk && connectionOk) {
    console.log('\n🎯 DATABASE: ✅ FULLY FUNCTIONAL');
    console.log('   Ready for Cloud Run deployment');
  } else {
    console.log('\n🎯 DATABASE: ❌ NOT WORKING');
    console.log('   This explains Cloud Run deployment failure');
    
    if (!formatOk) {
      console.log('   Fix: Check DATABASE_URL secret in Google Secret Manager');
    }
    if (!connectionOk) {
      console.log('   Fix: Verify network connectivity and credentials');
    }
  }
  
  return formatOk && connectionOk;
}

// Run the tests
runDatabaseTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('\n💥 TEST SUITE CRASHED:', error.message);
  process.exit(1);
});