#!/usr/bin/env node

/**
 * REALM RIVALRY - DEVELOPMENT SETUP VERIFICATION
 * 
 * This script verifies that your local development environment is properly configured
 */

import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎮 Realm Rivalry - Setup Verification');
console.log('====================================\n');

const checks = [
  {
    name: '📁 Environment Configuration',
    check: () => existsSync(path.join(__dirname, '..', '.env.local')),
    fix: 'Copy .env.local.example to .env.local and configure your settings'
  },
  {
    name: '🗄️ Prisma Generated Client',
    check: () => existsSync(path.join(__dirname, '..', 'prisma', 'generated')),
    fix: 'Run: npm run db:generate'
  },
  {
    name: '⚙️ VSCode Configuration',
    check: () => existsSync(path.join(__dirname, '..', '.vscode', 'settings.json')),
    fix: 'VSCode settings should be automatically created'
  },
  {
    name: '📦 Node Modules',
    check: () => existsSync(path.join(__dirname, '..', 'node_modules')),
    fix: 'Run: npm install'
  },
  {
    name: '🔧 Development Dependencies', 
    check: () => {
      try {
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json')));
        return pkg.devDependencies.concurrently && pkg.devDependencies.dotenv && pkg.devDependencies.serve;
      } catch {
        return false;
      }
    },
    fix: 'Run: npm install concurrently dotenv serve --save-dev'
  }
];

let allPassed = true;

for (const test of checks) {
  try {
    const passed = test.check();
    console.log(passed ? '✅' : '❌', test.name);
    
    if (!passed) {
      console.log('   💡', test.fix);
      allPassed = false;
    }
  } catch (error) {
    console.log('❌', test.name);
    console.log('   ⚠️ Error:', error.message);
    allPassed = false;
  }
}

console.log('\n' + '='.repeat(40));

if (allPassed) {
  console.log('🎉 Setup Complete! Your development environment is ready.');
  console.log('\n🚀 Next Steps:');
  console.log('   1. Run: npm run dev:local');
  console.log('   2. Open browser to http://localhost:5173');
  console.log('   3. Start coding with live preview!');
} else {
  console.log('⚠️  Setup Issues Found');
  console.log('   Please fix the issues above and run this script again.');
}

console.log('\n📚 Full documentation: LOCAL_DEVELOPMENT.md');