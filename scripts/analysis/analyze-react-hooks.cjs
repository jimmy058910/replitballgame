#!/usr/bin/env node

/**
 * React Hook Analysis Tool
 * Identifies components with excessive hooks for optimization
 */

const fs = require('fs');
const path = require('path');

const COMPONENT_DIR = 'client/src/components';
const PAGES_DIR = 'client/src/pages';

// Hook patterns to detect
const HOOK_PATTERNS = [
  /useState\(/g,
  /useEffect\(/g,
  /useQuery\(/g,
  /useMutation\(/g,
  /useQueryClient\(/g,
  /useCallback\(/g,
  /useMemo\(/g,
  /useRef\(/g,
  /useContext\(/g,
  /useReducer\(/g,
  /useToast\(/g,
  /useNavigate\(/g,
  /useLocation\(/g,
  /useParams\(/g,
  /use[A-Z]\w*\(/g  // Custom hooks
];

// Console.log patterns
const CONSOLE_PATTERNS = [
  /console\.(log|warn|error|info|debug)\(/g
];

function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    let hookCount = 0;
    let consoleCount = 0;
    const hooks = [];
    const consoleLogs = [];
    
    // Count hooks
    HOOK_PATTERNS.forEach(pattern => {
      const matches = content.match(pattern) || [];
      hookCount += matches.length;
      if (matches.length > 0) {
        hooks.push(`${pattern.toString().replace('/g', '')}: ${matches.length}`);
      }
    });
    
    // Count console statements
    CONSOLE_PATTERNS.forEach(pattern => {
      const matches = content.match(pattern) || [];
      consoleCount += matches.length;
      if (matches.length > 0) {
        // Find line numbers
        lines.forEach((line, index) => {
          if (pattern.test(line)) {
            consoleLogs.push(`Line ${index + 1}: ${line.trim().substring(0, 100)}`);
          }
        });
      }
    });
    
    return {
      filePath,
      fileName: path.basename(filePath),
      lineCount: lines.length,
      hookCount,
      consoleCount,
      hooks,
      consoleLogs,
      ratio: hookCount / lines.length * 100 // hooks per 100 lines
    };
  } catch (error) {
    return null;
  }
}

function analyzeDirectory(dirPath) {
  const results = [];
  
  try {
    const files = fs.readdirSync(dirPath);
    
    files.forEach(file => {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        const filePath = path.join(dirPath, file);
        const analysis = analyzeFile(filePath);
        if (analysis) {
          results.push(analysis);
        }
      }
    });
  } catch (error) {
    console.error(`Error analyzing directory ${dirPath}:`, error.message);
  }
  
  return results;
}

function generateReport() {
  console.log('🔍 React Hook Analysis Tool - Performance Optimization Report\n');
  console.log('=' .repeat(80));
  
  // Analyze components and pages
  const componentResults = analyzeDirectory(COMPONENT_DIR);
  const pageResults = analyzeDirectory(PAGES_DIR);
  const allResults = [...componentResults, ...pageResults];
  
  if (allResults.length === 0) {
    console.log('No React files found for analysis.');
    return;
  }
  
  // Sort by hook count (descending)
  allResults.sort((a, b) => b.hookCount - a.hookCount);
  
  // Report: High Hook Usage Components
  console.log('\n📊 COMPONENTS WITH >15 HOOKS (Optimization Priority):');
  console.log('-'.repeat(80));
  
  const highHookComponents = allResults.filter(r => r.hookCount > 15);
  
  if (highHookComponents.length === 0) {
    console.log('✅ No components found with >15 hooks');
  } else {
    highHookComponents.forEach((result, index) => {
      console.log(`${index + 1}. ${result.fileName}`);
      console.log(`   File: ${result.filePath}`);
      console.log(`   Lines: ${result.lineCount} | Hooks: ${result.hookCount} | Ratio: ${result.ratio.toFixed(2)} hooks/100 lines`);
      console.log(`   Hook breakdown: ${result.hooks.join(', ')}`);
      console.log('');
    });
  }
  
  // Report: Top 10 Hook Usage
  console.log('\n🏆 TOP 10 COMPONENTS BY HOOK COUNT:');
  console.log('-'.repeat(80));
  
  allResults.slice(0, 10).forEach((result, index) => {
    console.log(`${index + 1}. ${result.fileName}: ${result.hookCount} hooks (${result.lineCount} lines)`);
  });
  
  // Report: Console.log Usage
  console.log('\n🔧 CONSOLE.LOG STATEMENTS THAT NEED REPLACEMENT:');
  console.log('-'.repeat(80));
  
  const consoleResults = allResults.filter(r => r.consoleCount > 0);
  consoleResults.sort((a, b) => b.consoleCount - a.consoleCount);
  
  let totalConsoleStatements = 0;
  
  if (consoleResults.length === 0) {
    console.log('✅ No console.log statements found');
  } else {
    console.log(`Found ${consoleResults.length} files with console statements:\n`);
    
    consoleResults.forEach((result, index) => {
      totalConsoleStatements += result.consoleCount;
      console.log(`${index + 1}. ${result.fileName}: ${result.consoleCount} console statements`);
      
      if (result.consoleCount > 10) {
        console.log('   ⚠️ HIGH PRIORITY - Many console statements');
      }
      
      if (result.consoleLogs.length > 0) {
        console.log('   Sample locations:');
        result.consoleLogs.slice(0, 3).forEach(log => {
          console.log(`     ${log}`);
        });
        if (result.consoleLogs.length > 3) {
          console.log(`     ... and ${result.consoleLogs.length - 3} more`);
        }
      }
      console.log('');
    });
  }
  
  // Summary Statistics
  console.log('\n📈 SUMMARY STATISTICS:');
  console.log('-'.repeat(80));
  console.log(`Total files analyzed: ${allResults.length}`);
  console.log(`Files with >15 hooks: ${highHookComponents.length}`);
  console.log(`Files with console statements: ${consoleResults.length}`);
  console.log(`Total console statements: ${totalConsoleStatements}`);
  console.log(`Average hooks per component: ${(allResults.reduce((sum, r) => sum + r.hookCount, 0) / allResults.length).toFixed(1)}`);
  
  // Optimization Recommendations
  console.log('\n💡 OPTIMIZATION RECOMMENDATIONS:');
  console.log('-'.repeat(80));
  
  if (highHookComponents.length > 0) {
    console.log('1. 🎯 HIGH PRIORITY: Optimize components with >15 hooks');
    console.log('   - Extract custom hooks for related state logic');
    console.log('   - Use useQueries for multiple API calls');
    console.log('   - Implement proper memoization patterns');
    console.log('');
  }
  
  if (totalConsoleStatements > 0) {
    console.log('2. 📝 LOGGING OPTIMIZATION: Replace console statements');
    console.log(`   - Replace ${totalConsoleStatements} console.log statements with structured logging`);
    console.log('   - Use client-side logger for debugging');
    console.log('   - Add performance tracking integration');
    console.log('');
  }
  
  // Find useQueries opportunities
  const multiQueryComponents = allResults.filter(r => 
    r.hooks.some(h => h.includes('useQuery')) && 
    parseInt(r.hooks.find(h => h.includes('useQuery'))?.match(/\d+/)?.[0] || '0') >= 3
  );
  
  if (multiQueryComponents.length > 0) {
    console.log('3. ⚡ useQueries OPTIMIZATION: Components with multiple queries');
    multiQueryComponents.forEach(result => {
      const queryCount = parseInt(result.hooks.find(h => h.includes('useQuery'))?.match(/\d+/)?.[0] || '0');
      console.log(`   - ${result.fileName}: ${queryCount} useQuery calls → consolidate with useQueries`);
    });
    console.log('');
  }
  
  console.log('4. 📊 PERFORMANCE MONITORING:');
  console.log('   - Add component render tracking');
  console.log('   - Implement memory usage monitoring');
  console.log('   - Track API response times');
  console.log('');
  
  console.log('✅ Analysis complete. Focus on high-priority items for maximum impact.');
}

// Run the analysis
generateReport();