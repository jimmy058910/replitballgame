#!/usr/bin/env node

/**
 * LOCAL AGENT SIMULATION
 * Runs key agent checks locally to identify deployment issues
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🤖 RUNNING LOCAL AGENT SIMULATION');
console.log('==================================');
console.log('🗓️ Date:', new Date().toISOString());
console.log('');

let totalIssues = 0;
let criticalIssues = 0;

// Helper function to run commands safely
function runCommand(cmd, description) {
  try {
    console.log(`🔄 ${description}...`);
    const result = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
    console.log(`✅ ${description} - SUCCESS`);
    return { success: true, output: result };
  } catch (error) {
    console.log(`❌ ${description} - FAILED`);
    console.log(`   Error: ${error.message.split('\n')[0]}`);
    return { success: false, output: error.stdout || error.message };
  }
}

// 1. TYPESCRIPT GUARDIAN SIMULATION
console.log('🛡️ TYPESCRIPT GUARDIAN CHECKS');
console.log('------------------------------');

// Check server compilation
const serverCompile = runCommand('npm run build:server', 'Server TypeScript Compilation');
if (!serverCompile.success) {
  criticalIssues++;
  console.log('🚨 CRITICAL: Server compilation failed - deployment impossible');
}

// Check for missing prisma initialization
try {
  const prismaUsageFiles = execSync('find server/ -name "*.ts" -exec grep -l "prisma\\." {} \\;', { encoding: 'utf8' }).split('\n').filter(f => f);
  let missingInit = 0;
  
  prismaUsageFiles.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      if (!content.includes('getPrismaClient') && !content.includes('const prisma = await')) {
        missingInit++;
      }
    } catch (e) {}
  });
  
  console.log(`📊 Prisma initialization check: ${missingInit} files need attention`);
  totalIssues += missingInit;
} catch (e) {
  console.log('⚠️ Could not check prisma initialization patterns');
}

console.log('');

// 2. PRISMA GUARDIAN SIMULATION
console.log('🗄️ PRISMA GUARDIAN CHECKS');
console.log('--------------------------');

// Check schema validation
const schemaValidation = runCommand('npx prisma validate', 'Prisma Schema Validation');
if (!schemaValidation.success) {
  criticalIssues++;
}

// Check client generation
const clientGeneration = runCommand('npx prisma generate', 'Prisma Client Generation');
if (!clientGeneration.success) {
  criticalIssues++;
}

// Check critical database files
const criticalDbFiles = [
  'server/database.ts',
  'server/db.ts',
  'prisma/schema.prisma'
];

criticalDbFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ Critical file present: ${file}`);
  } else {
    console.log(`❌ Critical file missing: ${file}`);
    criticalIssues++;
  }
});

console.log('');

// 3. DEPLOYMENT READINESS SIMULATION
console.log('🚀 DEPLOYMENT READINESS CHECKS');
console.log('-------------------------------');

// Check critical deployment files
const deploymentFiles = [
  'Dockerfile.step7-unified',
  'package.json',
  '.github/workflows/deploy-step7-unified.yml'
];

let missingDeployFiles = 0;
deploymentFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ Deployment file present: ${file}`);
  } else {
    console.log(`❌ Deployment file missing: ${file}`);
    missingDeployFiles++;
    criticalIssues++;
  }
});

// Check client build
const clientBuild = runCommand('npm run build', 'Client Production Build');
if (!clientBuild.success) {
  totalIssues++;
  console.log('⚠️ Client build issues may affect frontend');
}

console.log('');

// 4. CODE QUALITY QUICK CHECK
console.log('🔍 CODE QUALITY QUICK CHECK');
console.log('---------------------------');

try {
  // Count TypeScript errors
  const tsErrors = execSync('npm run build:server 2>&1 | grep -c "error TS" || echo "0"', { encoding: 'utf8' }).trim();
  console.log(`📊 TypeScript errors: ${tsErrors}`);
  totalIssues += parseInt(tsErrors);
  
  // Count console.log statements
  const consoleLogs = execSync('grep -r "console\\." server/ --include="*.ts" | grep -v "console.error\\|console.warn" | wc -l || echo "0"', { encoding: 'utf8' }).trim();
  console.log(`📊 Console.log statements: ${consoleLogs}`);
  
  // Check for TODO comments
  const todoComments = execSync('grep -r "TODO\\|FIXME" server/ --include="*.ts" | wc -l || echo "0"', { encoding: 'utf8' }).trim();
  console.log(`📊 TODO/FIXME comments: ${todoComments}`);
  
} catch (e) {
  console.log('⚠️ Could not complete code quality analysis');
}

console.log('');

// FINAL REPORT
console.log('🎯 AGENT SIMULATION SUMMARY');
console.log('===========================');
console.log(`🔴 Critical Issues: ${criticalIssues}`);
console.log(`🟡 Total Issues: ${totalIssues}`);
console.log('');

if (criticalIssues === 0) {
  if (totalIssues < 10) {
    console.log('🎉 STATUS: DEPLOYMENT READY');
    console.log('✅ No critical issues detected');
    console.log('✅ Minimal issues found');
    console.log('🚀 RECOMMENDATION: Proceed with deployment');
  } else {
    console.log('⚠️ STATUS: DEPLOYMENT VIABLE WITH CAUTION');
    console.log('✅ No critical blockers');
    console.log('🔧 Multiple minor issues detected');
    console.log('🚀 RECOMMENDATION: Address issues then deploy');
  }
} else {
  console.log('❌ STATUS: DEPLOYMENT BLOCKED');
  console.log('🚨 Critical issues must be resolved');
  console.log('🔧 Fix critical issues before deployment');
  console.log('🚀 RECOMMENDATION: Run fixes, then re-test');
}

console.log('');
console.log('🤖 GitHub Actions agents will provide detailed analysis');
console.log('📋 Check workflow runs for comprehensive reports');
console.log('===========================');

process.exit(criticalIssues > 0 ? 1 : 0);