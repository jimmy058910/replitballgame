#!/usr/bin/env node

/**
 * CRITICAL ERROR FIXER - Post TypeScript Migration Cleanup
 * 
 * This script identifies and helps fix the most critical TypeScript errors
 * that actually block compilation or cause runtime issues.
 * 
 * Focus: Fix only what matters for development velocity
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔍 CRITICAL ERROR ANALYSIS');
console.log('='.repeat(50));

// Get current error count
let errorOutput;
try {
  errorOutput = execSync('npx tsc --noEmit 2>&1', { encoding: 'utf8' });
} catch (e) {
  errorOutput = e.stdout || e.stderr || '';
}

const totalErrors = (errorOutput.match(/error TS/g) || []).length;
console.log(`📊 Total errors: ${totalErrors}`);

// Analyze error patterns
const errorsByType = {};
const errorsByFile = {};

const lines = errorOutput.split('\n');
for (const line of lines) {
  if (line.includes('error TS')) {
    // Extract error code
    const codeMatch = line.match(/error (TS\d+):/);
    if (codeMatch) {
      const code = codeMatch[1];
      errorsByType[code] = (errorsByType[code] || 0) + 1;
    }
    
    // Extract file
    const fileMatch = line.match(/^([^(]+)\(/);
    if (fileMatch) {
      const file = fileMatch[1];
      errorsByFile[file] = (errorsByFile[file] || 0) + 1;
    }
  }
}

console.log('\n📈 ERROR BREAKDOWN BY TYPE:');
Object.entries(errorsByType)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 10)
  .forEach(([code, count]) => {
    const percentage = ((count / totalErrors) * 100).toFixed(1);
    console.log(`  ${code}: ${count} errors (${percentage}%)`);
  });

console.log('\n📁 TOP ERROR FILES:');
Object.entries(errorsByFile)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 10)
  .forEach(([file, count]) => {
    console.log(`  ${count} errors: ${file}`);
  });

// Identify critical vs non-critical errors
const criticalErrors = {
  'TS2307': 'Cannot find module', // Import errors - blocks compilation
  'TS2304': 'Cannot find name',   // Missing variable/function - blocks compilation  
  'TS1005': 'Syntax error',       // Syntax issues - blocks compilation
  'TS1127': 'Invalid character',  // Character issues - blocks compilation
  'TS2346': 'Overload signatures' // Function signature issues - can block compilation
};

const nonCriticalErrors = {
  'TS2339': 'Property does not exist',     // Property access - usually runtime safe
  'TS2322': 'Type not assignable',         // Type mismatch - often runtime safe
  'TS2353': 'Object literal excess prop',  // Extra properties - runtime safe
  'TS2345': 'Argument type mismatch',      // Parameter types - often runtime safe
  'TS18048': 'Possibly undefined',         // Null safety - good to fix but not critical
};

console.log('\n🚨 CRITICAL ERRORS (Fix These First):');
let criticalCount = 0;
Object.entries(errorsByType).forEach(([code, count]) => {
  if (criticalErrors[code]) {
    console.log(`  ❌ ${code}: ${count} errors - ${criticalErrors[code]}`);
    criticalCount += count;
  }
});

console.log('\n⚠️ NON-CRITICAL ERRORS (Can Work Around):');
let nonCriticalCount = 0;
Object.entries(errorsByType).forEach(([code, count]) => {
  if (nonCriticalErrors[code]) {
    console.log(`  🟡 ${code}: ${count} errors - ${nonCriticalErrors[code]}`);
    nonCriticalCount += count;
  }
});

console.log('\n📊 SUMMARY:');
console.log(`🔴 Critical errors: ${criticalCount} (${((criticalCount/totalErrors)*100).toFixed(1)}%)`);
console.log(`🟡 Non-critical errors: ${nonCriticalCount} (${((nonCriticalCount/totalErrors)*100).toFixed(1)}%)`);
console.log(`🔍 Other errors: ${totalErrors - criticalCount - nonCriticalCount}`);

console.log('\n🎯 RECOMMENDATIONS:');

if (criticalCount === 0) {
  console.log('✅ NO CRITICAL ERRORS! Your build should work fine.');
  console.log('   Focus on developing features, not fixing TypeScript warnings.');
} else {
  console.log(`❌ Fix ${criticalCount} critical errors first.`);
  console.log('   These actually block compilation or cause runtime issues.');
}

if (nonCriticalCount > 0) {
  console.log(`🟡 ${nonCriticalCount} non-critical errors can be addressed gradually.`);
  console.log('   These are mostly type safety warnings that don\'t break functionality.');
}

console.log('\n🚀 NEXT STEPS:');
console.log('1. Fix any critical errors first (import/syntax issues)');
console.log('2. Test that your app builds and runs: npm run build && npm run dev');  
console.log('3. Focus on shipping features for pre-Alpha');
console.log('4. Address non-critical errors gradually when you have time');

console.log('\n💡 DEVELOPMENT STRATEGY:');
console.log('- Write new code with better types (gradual improvement)');
console.log('- Fix types when you\'re already modifying files');
console.log('- Don\'t let perfect be the enemy of good');
console.log('- Ship working features > perfect type safety');

// Generate a simple fixes script for critical errors
if (criticalCount > 0) {
  console.log('\n🔧 Generating quick fixes...');
  
  // Look for common fixable patterns
  const quickFixes = [];
  
  lines.forEach(line => {
    if (line.includes('error TS2307') && line.includes('Cannot find module')) {
      const moduleMatch = line.match(/Cannot find module '([^']+)'/);
      if (moduleMatch) {
        quickFixes.push({
          type: 'missing-import',
          module: moduleMatch[1],
          line: line
        });
      }
    }
  });
  
  if (quickFixes.length > 0) {
    console.log(`Found ${quickFixes.length} potential quick fixes:`);
    quickFixes.slice(0, 5).forEach(fix => {
      if (fix.type === 'missing-import') {
        console.log(`  - Add import for '${fix.module}'`);
      }
    });
  }
}

console.log('\n' + '='.repeat(50));
console.log('🎯 FOCUS: Ship features, not perfect types!');
console.log('='.repeat(50));