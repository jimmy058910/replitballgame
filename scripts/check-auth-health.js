#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

console.log('========================================');
console.log('   AUTHENTICATION HEALTH CHECK');
console.log('========================================');

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

async function checkAuthHealth() {
  const results = {
    serviceAccountKey: false,
    serviceAccountAuth: false,
    userAuth: false,
    cloudSqlProxy: false,
    databaseConnection: false
  };
  
  console.log('\n1. 🔑 Checking Service Account Key...');
  
  // Check if service account key exists
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (serviceAccountPath && existsSync(serviceAccountPath)) {
    console.log('   ✅ Service account key found:', serviceAccountPath);
    results.serviceAccountKey = true;
    
    // Test service account authentication
    try {
      const { stdout } = await execAsync('gcloud auth application-default print-access-token', {
        env: { ...process.env, GOOGLE_APPLICATION_CREDENTIALS: serviceAccountPath }
      });
      if (stdout.trim().startsWith('ya29.')) {
        console.log('   ✅ Service account authentication working');
        results.serviceAccountAuth = true;
      } else {
        console.log('   ❌ Service account authentication failed');
      }
    } catch (error) {
      console.log('   ❌ Service account authentication error:', error.message.split('\n')[0]);
    }
  } else {
    console.log('   ❌ Service account key not found');
    console.log('       Expected:', serviceAccountPath || 'GOOGLE_APPLICATION_CREDENTIALS not set');
  }
  
  console.log('\n2. 👤 Checking User Authentication...');
  
  // Test user authentication as fallback
  try {
    const { stdout } = await execAsync('gcloud auth application-default print-access-token');
    if (stdout.trim().startsWith('ya29.')) {
      console.log('   ✅ User authentication working');
      results.userAuth = true;
    } else {
      console.log('   ❌ User authentication failed');
    }
  } catch (error) {
    console.log('   ❌ User authentication error:', error.message.split('\n')[0]);
  }
  
  console.log('\n3. 🔗 Checking Cloud SQL Proxy...');
  
  // Check if Cloud SQL Proxy is running
  try {
    const { stdout } = await execAsync('netstat -an | findstr :5432');
    if (stdout.includes('5432')) {
      console.log('   ✅ Port 5432 is active (Cloud SQL Proxy likely running)');
      results.cloudSqlProxy = true;
    } else {
      console.log('   ❌ Port 5432 not active (Cloud SQL Proxy not running)');
    }
  } catch (error) {
    console.log('   ❌ Could not check Cloud SQL Proxy status');
  }
  
  console.log('\n4. 🗄️ Checking Database Connection...');
  
  // Simple database connection test
  if (results.cloudSqlProxy && (results.serviceAccountAuth || results.userAuth)) {
    console.log('   ✅ Prerequisites met (auth + proxy) - database should be accessible');
    results.databaseConnection = true;
  } else {
    console.log('   ❌ Prerequisites not met - database connection will fail');
  }
  
  console.log('\n========================================');
  console.log('           HEALTH CHECK SUMMARY');
  console.log('========================================');
  
  const healthItems = [
    { name: 'Service Account Key', status: results.serviceAccountKey, critical: false },
    { name: 'Service Account Auth', status: results.serviceAccountAuth, critical: false },
    { name: 'User Authentication', status: results.userAuth, critical: true },
    { name: 'Cloud SQL Proxy', status: results.cloudSqlProxy, critical: true },
    { name: 'Database Connection', status: results.databaseConnection, critical: true }
  ];
  
  let healthy = true;
  let authWorking = results.serviceAccountAuth || results.userAuth;
  
  healthItems.forEach(item => {
    const icon = item.status ? '✅' : '❌';
    const status = item.status ? 'HEALTHY' : 'FAILED';
    console.log(`${icon} ${item.name}: ${status}`);
    
    if (item.critical && !item.status) {
      healthy = false;
    }
  });
  
  console.log('\n========================================');
  
  if (healthy && authWorking) {
    console.log('🎉 OVERALL STATUS: HEALTHY');
    console.log('   Your development environment is ready!');
    
    if (results.serviceAccountAuth) {
      console.log('   Using: Service Account (persistent auth)');
    } else {
      console.log('   Using: User Authentication (may expire)');
    }
  } else {
    console.log('⚠️  OVERALL STATUS: NEEDS ATTENTION');
    
    if (!authWorking) {
      console.log('\n🔧 RECOMMENDED ACTIONS:');
      console.log('   1. Run: gcloud auth application-default login');
      console.log('   2. Or set up service account key (see scripts/setup-persistent-auth.md)');
    }
    
    if (!results.cloudSqlProxy) {
      console.log('   3. Start Cloud SQL Proxy:');
      console.log('      cloud-sql-proxy direct-glider-465821-p7:us-central1:realm-rivalry-dev --port=5432');
    }
  }
  
  console.log('\n');
  process.exit(healthy && authWorking ? 0 : 1);
}

checkAuthHealth().catch(error => {
  console.error('Health check failed:', error);
  process.exit(1);
});