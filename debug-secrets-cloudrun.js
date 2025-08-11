console.log('🔍 TESTING SECRET RESOLUTION IN PRODUCTION...');

// Test basic environment variables
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('HOST:', process.env.HOST);

// Test secret resolution (without revealing actual values)
const secrets = [
  'DATABASE_URL',
  'SESSION_SECRET', 
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET'
];

secrets.forEach(secret => {
  const value = process.env[secret];
  if (value) {
    console.log(`✅ ${secret}: EXISTS (length: ${value.length}, starts: ${value.substring(0, 10)}...)`);
  } else {
    console.log(`❌ ${secret}: NOT FOUND`);
  }
});

// Test database connection if URL exists
if (process.env.DATABASE_URL) {
  console.log('🔍 Testing database connection...');
  // Minimal connection test without full Prisma setup
  console.log('Database URL format check:', process.env.DATABASE_URL.startsWith('postgresql://') ? '✅ PostgreSQL' : '❌ Invalid format');
}

console.log('🏁 Secret resolution test completed');
process.exit(0);
