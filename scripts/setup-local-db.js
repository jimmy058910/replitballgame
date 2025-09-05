#!/usr/bin/env node

/**
 * REALM RIVALRY - LOCAL DATABASE SETUP SCRIPT
 * 
 * This script helps set up local database connection for development
 * Replicates the seamless Replit database experience
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎮 Realm Rivalry - Local Database Setup');
console.log('=====================================\n');

// Check if .env.local exists
const envPath = path.join(__dirname, '..', '.env.local');
if (!existsSync(envPath)) {
  console.log('❌ Missing .env.local file');
  console.log('📋 Please copy .env.local.example to .env.local and configure your settings');
  console.log('💡 Required: DATABASE_URL, FIREBASE_PROJECT_ID, and other secrets\n');
  process.exit(1);
}

console.log('✅ Found .env.local configuration');

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: envPath });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.log('❌ DATABASE_URL not configured in .env.local');
  console.log('💡 Please add your Cloud SQL connection string');
  process.exit(1);
}

console.log('✅ Database URL configured');
console.log('🔍 Database host:', databaseUrl.split('@')[1]?.split('/')[0] || 'unknown');

// Check if Cloud SQL Auth Proxy is needed
if (databaseUrl.includes('localhost:5432')) {
  console.log('\n🔗 Setting up Cloud SQL Auth Proxy...');
  console.log('💡 This allows secure connection to Cloud SQL from localhost');
  
  // Extract project and instance from DATABASE_URL or environment
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  const instance = process.env.CLOUD_SQL_INSTANCE;
  
  if (!project || !instance) {
    console.log('⚠️  Cloud SQL Auth Proxy requires:');
    console.log('   - GOOGLE_CLOUD_PROJECT');
    console.log('   - CLOUD_SQL_INSTANCE');
    console.log('   Add these to your .env.local file');
  } else {
    console.log(`🚀 Starting proxy for ${project}:us-central1:${instance}`);
    
    const proxy = spawn('cloud-sql-proxy', [
      `${project}:us-central1:${instance}`,
      '--port=5432',
      '--auto-iam-authn'
    ], {
      stdio: 'inherit'
    });
    
    proxy.on('error', (err) => {
      console.log('❌ Failed to start Cloud SQL Auth Proxy');
      console.log('💡 Install it with: gcloud components install cloud-sql-proxy');
      console.log('💡 Or download from: https://cloud.google.com/sql/docs/mysql/connect-auth-proxy');
    });
    
    // Keep proxy running
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping Cloud SQL Auth Proxy...');
      proxy.kill();
      process.exit(0);
    });
  }
}

// Test database connection
console.log('\n🧪 Testing database connection...');

async function testConnection() {
  try {
    const { PrismaClient } = await import('../prisma/generated/client/index.js');
    const prisma = new PrismaClient();
    
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database connection successful!');
    
    // Show some basic stats
    const teamCount = await prisma.team.count();
    const playerCount = await prisma.player.count();
    
    console.log(`📊 Database Stats:`);
    console.log(`   Teams: ${teamCount}`);
    console.log(`   Players: ${playerCount}`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.log('❌ Database connection failed:');
    console.log('   ', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check your DATABASE_URL in .env.local');
    console.log('   2. Ensure Cloud SQL Auth Proxy is running');
    console.log('   3. Verify your GCP credentials are set up');
  }
}

testConnection();