// Simple Node.js script to fix database directly
const { execSync } = require('child_process');

console.log('🔍 Checking matches for Oakland Cougars on Aug 21...');

try {
  // Use a simple query to see what's in the database
  const query = `
    curl -s "http://localhost:5000/api/teams/my-schedule/comprehensive" | 
    jq '.[] | select(.gameDate | contains("2025-08-21")) | {id: .id, homeTeam: .homeTeam.name, awayTeam: .awayTeam.name, gameDate: .gameDate, status: .status}'
  `;
  
  const result = execSync(query, { encoding: 'utf8' });
  console.log('Current matches:', result);
  
  // If there are still multiple matches, we know which ones to target
  console.log('\n📋 Manual instructions to fix:');
  console.log('1. Keep match with Storm Breakers 346 at 8:30 PM EDT');
  console.log('2. Delete match with Shadow Runners 197 at wrong time');
  
} catch (error) {
  console.error('Error:', error.message);
}