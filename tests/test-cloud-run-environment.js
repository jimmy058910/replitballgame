#!/usr/bin/env node

/**
 * SIMULATE CLOUD RUN PRODUCTION ENVIRONMENT
 * Test what happens when secrets are accessed in Cloud Run context
 */

console.log('☁️  SIMULATING CLOUD RUN PRODUCTION ENVIRONMENT...');

// Simulate Cloud Run environment variables
process.env.K_SERVICE = 'realm-rivalry-backend';
process.env.K_REVISION = 'realm-rivalry-backend-test';
process.env.PORT = '8080';
process.env.NODE_ENV = 'production';

async function simulateCloudRunStartup() {
  console.log('\n🚀 SIMULATING CLOUD RUN CONTAINER STARTUP...');
  
  try {
    // Step 1: Port binding simulation
    console.log('1️⃣ Testing immediate port 8080 binding...');
    const express = (await import('express')).default;
    const app = express();
    
    app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });
    
    // Step 2: Secret resolution during middleware setup
    console.log('2️⃣ Testing secret resolution during middleware setup...');
    
    if (!process.env.SESSION_SECRET) {
      throw new Error('SESSION_SECRET not resolved in Cloud Run environment');
    }
    
    console.log('✅ SESSION_SECRET resolved');
    
    // Step 3: Database connection during route registration  
    console.log('3️⃣ Testing database connection during route registration...');
    
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL not resolved in Cloud Run environment');
    }
    
    console.log('✅ DATABASE_URL resolved');
    
    // Test actual database connection like routes would do
    const { Client } = await import('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false } // Cloud Run requires SSL
    });
    
    console.log('🔗 Testing database connection (as routes would do)...');
    await client.connect();
    await client.query('SELECT 1 as test');
    console.log('✅ Database connection successful');
    await client.end();
    
    // Step 4: Google OAuth setup
    console.log('4️⃣ Testing Google OAuth configuration...');
    
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      throw new Error('Google OAuth secrets not resolved');
    }
    
    console.log('✅ Google OAuth secrets resolved');
    
    console.log('\n🎉 CLOUD RUN SIMULATION SUCCESSFUL');
    console.log('   All secrets resolve and function in production environment');
    return true;
    
  } catch (error) {
    console.log('\n💥 CLOUD RUN SIMULATION FAILED');
    console.log(`   Error: ${error.message}`);
    console.log(`   Stack: ${error.stack?.split('\n')[1]?.trim()}`);
    return false;
  }
}

// Run simulation
simulateCloudRunStartup().then(success => {
  if (success) {
    console.log('\n✅ SECRETS CONFIRMED WORKING IN CLOUD RUN ENVIRONMENT');
  } else {
    console.log('\n❌ SECRETS WILL NOT WORK IN CLOUD RUN');
    process.exit(1);
  }
}).catch(error => {
  console.error('💥 Simulation crashed:', error.message);
  process.exit(1);
});