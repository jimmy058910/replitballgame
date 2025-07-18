#!/usr/bin/env node

/**
 * Test Runner Script
 * Runs comprehensive test suite with detailed reporting
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test categories and their descriptions
const testCategories = {
  automated: {
    name: 'Automated Systems',
    description: 'Daily progression, tournaments, match simulation',
    pattern: './tests/automated/**/*.test.js',
  },
  manual: {
    name: 'Manual Functions',
    description: 'Formation management, exhibition matches, trading',
    pattern: './tests/manual/**/*.test.js',
  },
  api: {
    name: 'API Routes',
    description: 'Endpoint validation and response testing',
    pattern: './tests/api/**/*.test.js',
  },
  services: {
    name: 'Services',
    description: 'Business logic and data processing',
    pattern: './tests/services/**/*.test.js',
  },
  database: {
    name: 'Database',
    description: 'Storage operations and data integrity',
    pattern: './tests/database/**/*.test.js',
  },
  integration: {
    name: 'Integration',
    description: 'End-to-end workflows and system integration',
    pattern: './tests/integration/**/*.test.js',
  },
};

// Parse command line arguments
const args = process.argv.slice(2);
const category = args[0];
const verbose = args.includes('--verbose') || args.includes('-v');
const coverage = args.includes('--coverage') || args.includes('-c');
const watch = args.includes('--watch') || args.includes('-w');

console.log('🏆 Realm Rivalry Test Suite');
console.log('=' * 60);

if (category && !testCategories[category]) {
  console.error(`❌ Invalid test category: ${category}`);
  console.log('\nAvailable categories:');
  Object.entries(testCategories).forEach(([key, value]) => {
    console.log(`  ${key.padEnd(12)} - ${value.description}`);
  });
  process.exit(1);
}

// Build Jest command
const jestArgs = [];

if (category) {
  jestArgs.push('--testPathPattern', testCategories[category].pattern);
  console.log(`🎯 Running ${testCategories[category].name} tests`);
  console.log(`📝 ${testCategories[category].description}\n`);
} else {
  console.log('🎯 Running all test categories\n');
}

if (coverage) {
  jestArgs.push('--coverage');
}

if (watch) {
  jestArgs.push('--watch');
}

if (verbose) {
  jestArgs.push('--verbose');
}

// Add configuration
jestArgs.push('--config', './tests/jest.config.js');

// Run Jest
const jest = spawn('npx', ['jest', ...jestArgs], {
  stdio: 'inherit',
  cwd: process.cwd(),
});

jest.on('close', (code) => {
  console.log(`\n🏁 Test run completed with exit code: ${code}`);
  
  if (code === 0) {
    console.log('✅ All tests passed!');
  } else {
    console.log('❌ Some tests failed. Check output above for details.');
  }
  
  process.exit(code);
});

jest.on('error', (error) => {
  console.error('❌ Error running tests:', error);
  process.exit(1);
});