/**
 * URGENT: Investigate multiple database connections
 * Frontend shows different data than our scripts - likely using different databases
 */

console.log('🔍 MULTIPLE DATABASE INVESTIGATION:');
console.log('\n📊 ALL DATABASE-RELATED ENVIRONMENT VARIABLES:');

// Get all env vars related to databases
const dbEnvVars = Object.keys(process.env)
  .filter(key => key.toLowerCase().includes('database') || key.startsWith('PG'))
  .sort();

dbEnvVars.forEach(key => {
  const value = process.env[key];
  if (value && value.includes('postgresql://')) {
    console.log(`${key}: ${value.substring(0, 80)}...`);
  } else {
    console.log(`${key}: ${value}`);
  }
});

console.log('\n🔍 ANALYZING DATABASE CONNECTIONS:');
console.log('1. Script Database (Cloud SQL):', process.env.DATABASE_URL?.includes('cloudsql') ? 'YES' : 'NO');
console.log('2. Neon Database detected:', process.env.PGHOST?.includes('neon.tech') ? 'YES' : 'NO');

// Check if frontend might be using different connection
console.log('\n⚠️  POTENTIAL ISSUE: Frontend and backend may be using different databases!');
console.log('This would explain why script updates don\'t appear in frontend.');

// Check server startup logs for database connection
console.log('\n📋 RECOMMENDED FIXES:');
console.log('1. Check which database the Express server actually connects to');
console.log('2. Ensure both script and server use same DATABASE_URL');
console.log('3. Verify Prisma client configuration');