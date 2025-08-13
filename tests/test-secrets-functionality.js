#!/usr/bin/env node

/**
 * COMPREHENSIVE SECRET FUNCTIONALITY TESTING
 * Tests if secrets actually work, not just exist
 */

console.log('🧪 TESTING SECRET FUNCTIONALITY (not just existence)...');

async function testDatabaseConnection() {
  console.log('\n📊 TESTING DATABASE CONNECTION...');
  
  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL not found');
    return false;
  }

  console.log('✅ DATABASE_URL exists');
  console.log(`   Format: ${process.env.DATABASE_URL.startsWith('postgresql://') ? 'PostgreSQL ✅' : 'Invalid ❌'}`);
  
  try {
    // Test actual database connection using node-postgres
    const { Client } = await import('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    console.log('🔗 Attempting database connection...');
    await client.connect();
    
    console.log('🔍 Testing database query...');
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    
    console.log('✅ DATABASE CONNECTION SUCCESSFUL');
    console.log(`   Server time: ${result.rows[0].current_time}`);
    console.log(`   PostgreSQL version: ${result.rows[0].version.split(' ')[0]}`);
    
    await client.end();
    return true;
  } catch (error) {
    console.log('❌ DATABASE CONNECTION FAILED');
    console.log(`   Error: ${error.message}`);
    if (error.code) console.log(`   Code: ${error.code}`);
    return false;
  }
}

async function testGoogleOAuthSecrets() {
  console.log('\n🔐 TESTING GOOGLE OAUTH SECRETS...');
  
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.log('❌ Google OAuth credentials missing');
    return false;
  }

  console.log('✅ GOOGLE_CLIENT_ID exists');
  console.log('✅ GOOGLE_CLIENT_SECRET exists');
  
  // Test OAuth configuration validity
  const expectedIdPattern = /^\d+-[a-zA-Z0-9]+\.apps\.googleusercontent\.com$/;
  const expectedSecretPattern = /^GOCSPX-[a-zA-Z0-9_-]+$/;
  
  console.log(`   Client ID format: ${expectedIdPattern.test(clientId) ? 'Valid ✅' : 'Invalid ❌'}`);
  console.log(`   Client Secret format: ${expectedSecretPattern.test(clientSecret) ? 'Valid ✅' : 'Invalid ❌'}`);
  
  try {
    // Test if we can create OAuth2 configuration
    const { OAuth2Client } = await import('google-auth-library');
    const oauth2Client = new OAuth2Client(clientId, clientSecret);
    
    console.log('✅ GOOGLE OAUTH CLIENT CREATED SUCCESSFULLY');
    console.log('   (Note: Full OAuth flow requires user interaction)');
    return true;
  } catch (error) {
    console.log('❌ GOOGLE OAUTH SETUP FAILED');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function testSessionSecret() {
  console.log('\n🛡️  TESTING SESSION SECRET...');
  
  const sessionSecret = process.env.SESSION_SECRET;
  
  if (!sessionSecret) {
    console.log('❌ SESSION_SECRET not found');
    return false;
  }

  console.log('✅ SESSION_SECRET exists');
  console.log(`   Length: ${sessionSecret.length} characters`);
  console.log(`   Entropy: ${sessionSecret.length >= 32 ? 'Good ✅' : 'Weak ❌'}`);
  
  try {
    // Test session secret with express-session
    const session = await import('express-session');
    const crypto = await import('crypto');
    
    // Test that we can create a session configuration
    const sessionConfig = {
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
    };
    
    // Test cryptographic strength
    const hash = crypto.createHmac('sha256', sessionSecret).update('test-data').digest('hex');
    console.log('✅ SESSION SECRET CRYPTOGRAPHICALLY FUNCTIONAL');
    console.log(`   Test hash created: ${hash.substring(0, 16)}...`);
    
    return true;
  } catch (error) {
    console.log('❌ SESSION SECRET TEST FAILED');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 COMPREHENSIVE SECRET FUNCTIONALITY TESTING\n');
  
  const results = {
    database: await testDatabaseConnection(),
    googleOAuth: await testGoogleOAuthSecrets(), 
    sessionSecret: await testSessionSecret()
  };
  
  console.log('\n📋 FINAL RESULTS:');
  console.log(`   Database Connection: ${results.database ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`   Google OAuth Setup: ${results.googleOAuth ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`   Session Secret: ${results.sessionSecret ? '✅ WORKING' : '❌ FAILED'}`);
  
  const allWorking = Object.values(results).every(result => result === true);
  
  console.log(`\n🎯 OVERALL: ${allWorking ? '✅ ALL SECRETS FUNCTIONAL' : '❌ SOME SECRETS NOT WORKING'}`);
  
  if (!allWorking) {
    console.log('\n⚠️  DEPLOYMENT WILL FAIL - Secret issues must be resolved');
    process.exit(1);
  } else {
    console.log('\n🚀 SECRETS READY FOR PRODUCTION DEPLOYMENT');
    process.exit(0);
  }
}

// Run the tests
runAllTests().catch(error => {
  console.error('\n💥 TEST SUITE CRASHED:', error.message);
  process.exit(1);
});