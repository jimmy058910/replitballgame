#!/usr/bin/env node
/**
 * TypeScript Migration Cleanup & Reset
 * Archives failed attempts and sets up proper incremental migration
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧹 TypeScript Migration Cleanup & Reset\n');

// Step 1: Archive all fix scripts
console.log('📦 Archiving fix scripts...');
const scriptsDir = path.join(process.cwd(), 'scripts', 'typescript-fixes');
const archiveDir = path.join(process.cwd(), 'scripts', 'archived-typescript-attempts');

if (fs.existsSync(scriptsDir)) {
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }
  
  // Move with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const archivePath = path.join(archiveDir, `attempt-${timestamp}`);
  fs.renameSync(scriptsDir, archivePath);
  console.log(`  ✅ Archived ${fs.readdirSync(archivePath).length} scripts to ${path.relative(process.cwd(), archivePath)}`);
}

// Step 2: Create migration config
console.log('\n📝 Creating tsconfig.migration.json...');
const migrationConfig = {
  extends: "./tsconfig.json",
  compilerOptions: {
    strict: false,
    skipLibCheck: true,
    noImplicitAny: false,
    noUnusedLocals: false,
    noUnusedParameters: false,
    strictNullChecks: false,
    strictFunctionTypes: false,
    strictBindCallApply: false,
    strictPropertyInitialization: false,
    noImplicitThis: false,
    alwaysStrict: false
  }
};

fs.writeFileSync(
  path.join(process.cwd(), 'tsconfig.migration.json'),
  JSON.stringify(migrationConfig, null, 2)
);
console.log('  ✅ Created relaxed migration config');

// Step 3: Show current error counts
console.log('\n📊 Current TypeScript Status:');

console.log('\n  With STRICT config (tsconfig.json):');
try {
  const strictErrors = execSync('npx tsc --noEmit 2>&1 | grep "error TS" | wc -l', {
    encoding: 'utf8'
  }).trim();
  console.log(`    Errors: ${strictErrors}`);
} catch (e) {
  if (e.stdout) {
    console.log(`    Errors: ${e.stdout.trim()}`);
  }
}

console.log('\n  With MIGRATION config (tsconfig.migration.json):');
try {
  const migrationErrors = execSync('npx tsc --project tsconfig.migration.json --noEmit 2>&1 | grep "error TS" | wc -l', {
    encoding: 'utf8'
  }).trim();
  console.log(`    Errors: ${migrationErrors}`);
} catch (e) {
  if (e.stdout) {
    console.log(`    Errors: ${e.stdout.trim()}`);
  }
}

// Step 4: Update package.json scripts
console.log('\n📋 Recommended package.json scripts:');
console.log(`
  "scripts": {
    "check": "tsc --project tsconfig.migration.json --noEmit",
    "check:strict": "tsc --noEmit",
    "check:watch": "tsc --project tsconfig.migration.json --noEmit --watch",
    ...
  }
`);

console.log('\n✅ Cleanup Complete!');
console.log('\n📚 Next Steps:');
console.log('  1. Use "npm run check" for daily development (relaxed checks)');
console.log('  2. Use "npm run check:strict" weekly to measure progress');
console.log('  3. Fix types incrementally, focusing on:');
console.log('     - Core types in shared/types/models.ts');
console.log('     - API response types');
console.log('     - Component props');
console.log('  4. Track your progress in TYPESCRIPT_MIGRATION_GUIDE.md');

// Create baseline tracking file
const baselineFile = path.join(process.cwd(), 'typescript-baseline.json');
const baseline = {
  date: new Date().toISOString(),
  strictErrors: 0,
  migrationErrors: 0
};

try {
  baseline.strictErrors = parseInt(execSync('npx tsc --noEmit 2>&1 | grep "error TS" | wc -l', {
    encoding: 'utf8'
  }).trim());
} catch (e) {
  if (e.stdout) {
    baseline.strictErrors = parseInt(e.stdout.trim());
  }
}

try {
  baseline.migrationErrors = parseInt(execSync('npx tsc --project tsconfig.migration.json --noEmit 2>&1 | grep "error TS" | wc -l', {
    encoding: 'utf8'
  }).trim());
} catch (e) {
  if (e.stdout) {
    baseline.migrationErrors = parseInt(e.stdout.trim());
  }
}

fs.writeFileSync(baselineFile, JSON.stringify(baseline, null, 2));
console.log(`\n📈 Baseline saved to typescript-baseline.json`);
console.log(`   Strict: ${baseline.strictErrors} errors`);
console.log(`   Migration: ${baseline.migrationErrors} errors`);