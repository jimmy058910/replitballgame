#!/usr/bin/env node

/**
 * STEP 7 UNIFIED APPLICATION - LOCAL TESTING SCRIPT
 * Comprehensive testing of the unified application before deployment
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 STEP 7 UNIFIED APPLICATION - LOCAL TESTING');
console.log('==============================================');

// Test configuration
const TEST_PORT = 5001; // Use different port to avoid conflicts
const TEST_URL = `http://localhost:${TEST_PORT}`;

// Set test environment
process.env.NODE_ENV = 'development';
process.env.PORT = TEST_PORT.toString();

console.log(`🔍 Test Environment Configuration:`);
console.log(`   Port: ${TEST_PORT}`);
console.log(`   URL: ${TEST_URL}`);
console.log(`   Node Environment: ${process.env.NODE_ENV}`);

// Start the unified server for testing
const serverProcess = spawn('node', ['server-step7-unified.js'], {
  stdio: 'inherit',
  env: { ...process.env }
});

// Wait for server to start
console.log('⏳ Starting unified server for testing...');
setTimeout(async () => {
  await runTests();
}, 5000);

async function runTests() {
  console.log('\n🧪 RUNNING COMPREHENSIVE TESTS');
  console.log('================================');
  
  const tests = [
    testHealthEndpoint,
    testDatabaseEndpoint,
    testAuthEndpoint,
    testDivisionsAPI,
    testPlayersAPI,
    testTeamsAPI,
    testStatisticsAPI,
    testWebSocketEndpoint
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      await test();
      passed++;
    } catch (error) {
      console.error(`❌ Test failed: ${error.message}`);
      failed++;
    }
  }
  
  console.log('\n📊 TEST RESULTS SUMMARY');
  console.log('========================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Unified application ready for deployment.');
  } else {
    console.log('\n⚠️ Some tests failed. Please review before deployment.');
  }
  
  // Clean up
  serverProcess.kill();
  process.exit(failed > 0 ? 1 : 0);
}

async function testHealthEndpoint() {
  console.log('🏥 Testing health endpoint...');
  
  const response = await fetch(`${TEST_URL}/health`);
  const data = await response.json();
  
  if (response.status !== 200) {
    throw new Error(`Health endpoint returned ${response.status}`);
  }
  
  if (!data.status || data.status !== 'healthy') {
    throw new Error('Health endpoint returned unhealthy status');
  }
  
  if (!data.features || !Array.isArray(data.features)) {
    throw new Error('Health endpoint missing features array');
  }
  
  console.log('  ✅ Health endpoint responding correctly');
  console.log(`  📋 Features: ${data.features.length} enabled`);
}

async function testDatabaseEndpoint() {
  console.log('🗃️ Testing database integration...');
  
  const response = await fetch(`${TEST_URL}/api/db-test`);
  const data = await response.json();
  
  if (response.status !== 200) {
    throw new Error(`Database endpoint returned ${response.status}`);
  }
  
  if (!data.status || data.status !== 'database-ready') {
    throw new Error('Database endpoint returned unexpected status');
  }
  
  console.log('  ✅ Database integration endpoint responding');
}

async function testAuthEndpoint() {
  console.log('🔐 Testing authentication system...');
  
  const response = await fetch(`${TEST_URL}/api/auth/status`);
  const data = await response.json();
  
  if (response.status !== 200) {
    throw new Error(`Auth endpoint returned ${response.status}`);
  }
  
  if (!data.status || data.status !== 'auth-ready') {
    throw new Error('Auth endpoint returned unexpected status');
  }
  
  console.log('  ✅ Authentication system endpoint responding');
}

async function testDivisionsAPI() {
  console.log('📊 Testing divisions API (8-tier system)...');
  
  const response = await fetch(`${TEST_URL}/api/divisions`);
  const data = await response.json();
  
  if (response.status !== 200) {
    throw new Error(`Divisions API returned ${response.status}`);
  }
  
  if (!data.success || !data.divisions || !Array.isArray(data.divisions)) {
    throw new Error('Divisions API returned invalid structure');
  }
  
  if (data.divisions.length < 8) {
    throw new Error('Divisions API returned insufficient divisions');
  }
  
  // Check for Copper League subdivisions
  const copperSubdivisions = data.divisions.filter(d => d.tier === 8 && d.subdivision);
  if (copperSubdivisions.length < 4) {
    throw new Error('Missing Copper League subdivisions');
  }
  
  console.log(`  ✅ Divisions API responding with ${data.divisions.length} divisions`);
  console.log(`  🥉 Copper subdivisions: ${copperSubdivisions.length}`);
}

async function testPlayersAPI() {
  console.log('👥 Testing players API (race and role systems)...');
  
  const response = await fetch(`${TEST_URL}/api/players?limit=10`);
  const data = await response.json();
  
  if (response.status !== 200) {
    throw new Error(`Players API returned ${response.status}`);
  }
  
  if (!data.success || !data.players || !Array.isArray(data.players)) {
    throw new Error('Players API returned invalid structure');
  }
  
  if (data.players.length === 0) {
    throw new Error('Players API returned no players');
  }
  
  // Check for required player fields
  const player = data.players[0];
  const requiredFields = ['id', 'race', 'raceDisplay', 'role', 'displayName'];
  for (const field of requiredFields) {
    if (!player[field]) {
      throw new Error(`Player missing required field: ${field}`);
    }
  }
  
  console.log(`  ✅ Players API responding with ${data.players.length} players`);
  console.log(`  🧬 Sample race: ${player.raceDisplay}, role: ${player.role}`);
}

async function testTeamsAPI() {
  console.log('🏆 Testing teams API...');
  
  const response = await fetch(`${TEST_URL}/api/teams?limit=5`);
  const data = await response.json();
  
  if (response.status !== 200) {
    throw new Error(`Teams API returned ${response.status}`);
  }
  
  if (!data.success || !data.teams || !Array.isArray(data.teams)) {
    throw new Error('Teams API returned invalid structure');
  }
  
  if (data.teams.length === 0) {
    throw new Error('Teams API returned no teams');
  }
  
  // Check for required team fields
  const team = data.teams[0];
  const requiredFields = ['id', 'name', 'division', 'divisionName'];
  for (const field of requiredFields) {
    if (!team[field]) {
      throw new Error(`Team missing required field: ${field}`);
    }
  }
  
  console.log(`  ✅ Teams API responding with ${data.teams.length} teams`);
  console.log(`  🏟️ Sample team: ${team.name} in ${team.divisionName}`);
}

async function testStatisticsAPI() {
  console.log('📈 Testing statistics API...');
  
  const response = await fetch(`${TEST_URL}/api/stats/overview`);
  const data = await response.json();
  
  if (response.status !== 200) {
    throw new Error(`Statistics API returned ${response.status}`);
  }
  
  if (!data.success || !data.statistics) {
    throw new Error('Statistics API returned invalid structure');
  }
  
  const stats = data.statistics;
  const requiredFields = ['totalPlayers', 'totalTeams', 'totalDivisions', 'establishedSystems'];
  for (const field of requiredFields) {
    if (!stats[field]) {
      throw new Error(`Statistics missing required field: ${field}`);
    }
  }
  
  console.log(`  ✅ Statistics API responding correctly`);
  console.log(`  📊 Total players: ${stats.totalPlayers}, teams: ${stats.totalTeams}`);
}

async function testWebSocketEndpoint() {
  console.log('🔌 Testing WebSocket endpoint availability...');
  
  const response = await fetch(`${TEST_URL}/ws/`);
  
  // WebSocket endpoint should return 400 for regular HTTP requests
  if (response.status !== 400) {
    throw new Error(`WebSocket endpoint returned unexpected status: ${response.status}`);
  }
  
  console.log('  ✅ WebSocket endpoint accessible (expected 400 for HTTP request)');
}

// Handle process cleanup
process.on('SIGINT', () => {
  console.log('\n📛 Test interrupted, cleaning up...');
  serverProcess.kill();
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n📛 Test terminated, cleaning up...');
  serverProcess.kill();
  process.exit(1);
});