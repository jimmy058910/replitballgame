#!/usr/bin/env node

/**
 * Rapid JSX and TypeScript Syntax Fix
 * Targets the most common remaining error patterns
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Rapid JSX and TypeScript fix starting...');

// Fix common JSX comment issues
function fixJSXComments(content) {
  // Fix JSX fragments broken by comment removal
  content = content.replace(/\{\s*\/\*[^}]*\*\/\s*\}/g, '');
  
  // Fix empty JSX expressions
  content = content.replace(/\{\s*\}/g, '');
  
  // Fix broken JSX lines from comment removal
  content = content.replace(/^\s*\*\/[^<\n]*</gm, '');
  content = content.replace(/^\s*\/\*[^>]*>\s*$/gm, '');
  
  return content;
}

// Fix TypeScript syntax issues
function fixTypeScriptSyntax(content) {
  // Fix incomplete statements
  content = content.replace(/^\s*\*\/\s*$/gm, '');
  content = content.replace(/^\s*\/\*\*\s*$/gm, '');
  
  // Remove orphaned comment fragments
  content = content.replace(/^\s*\*[^/\n]*$/gm, '');
  
  return content;
}

// Process files
const clientDir = path.join(__dirname, 'client', 'src');

function processFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const originalLength = content.length;
  
  let fixed = content;
  
  if (filePath.endsWith('.tsx')) {
    fixed = fixJSXComments(fixed);
  }
  
  fixed = fixTypeScriptSyntax(fixed);
  
  if (fixed !== content) {
    fs.writeFileSync(filePath, fixed);
    console.log(`✅ Fixed ${path.relative(__dirname, filePath)}`);
    return 1;
  }
  
  return 0;
}

// Find and process all TypeScript files
function processDirectory(dir) {
  let fixedCount = 0;
  
  if (!fs.existsSync(dir)) return fixedCount;
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      fixedCount += processDirectory(fullPath);
    } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
      fixedCount += processFile(fullPath);
    }
  }
  
  return fixedCount;
}

const fixedFiles = processDirectory(clientDir);
console.log(`🎯 Fixed ${fixedFiles} files`);

// Check improvement
try {
  const afterCount = execSync('npx tsc --noEmit 2>&1 | grep "error TS" | wc -l', { encoding: 'utf-8' }).trim();
  console.log(`📊 TypeScript errors after JSX fixes: ${afterCount}`);
} catch (error) {
  console.log('⚠️ Could not check error count');
}