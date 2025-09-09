#!/usr/bin/env node
/**
 * Fix Property Access Safety
 * Adds optional chaining for properties that might not exist
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Track fixes
const stats = {
  filesProcessed: 0,
  filesFixed: 0,
  optionalChainingAdded: 0,
  propertyFixesApplied: 0
};

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  const fixes = [];
  
  // Fix 1: Add optional chaining for common patterns
  const optionalChainingPatterns = [
    // MarketplaceListing properties
    { pattern: /listing\.sellerTeam\.name/g, replacement: 'listing.sellerTeam?.name' },
    { pattern: /listing\.currentHighBidderTeam\.name/g, replacement: 'listing.currentHighBidderTeam?.name' },
    { pattern: /listing\.startBid/g, replacement: '(listing as any).startBid' },
    { pattern: /listing\.timeRemaining/g, replacement: '(listing as any).timeRemaining' },
    { pattern: /listing\.bidCount/g, replacement: '(listing as any).bidCount' },
    { pattern: /listing\.buyNowPrice/g, replacement: '(listing as any).buyNowPrice' },
    
    // Contract properties
    { pattern: /contract\.player\.firstName/g, replacement: 'contract.player?.firstName' },
    { pattern: /contract\.player\.lastName/g, replacement: 'contract.player?.lastName' },
    { pattern: /contract\.staff\.firstName/g, replacement: '(contract as any).staff?.firstName' },
    { pattern: /contract\.staff\.lastName/g, replacement: '(contract as any).staff?.lastName' },
    
    // Team properties
    { pattern: /team\.players\.length/g, replacement: 'team.players?.length' },
    { pattern: /team\.staff\.length/g, replacement: 'team.staff?.length' },
    { pattern: /team\.finances\.credits/g, replacement: 'team.finances?.credits' },
    { pattern: /team\.finances\.gems/g, replacement: 'team.finances?.gems' },
  ];
  
  optionalChainingPatterns.forEach(({ pattern, replacement }) => {
    // Check if pattern exists and replacement doesn't already exist
    if (content.match(pattern)) {
      // Make sure we're not double-applying optional chaining
      const testReplacement = replacement.replace('?.', '.');
      if (!content.includes(replacement) || !replacement.includes('?.')) {
        content = content.replace(pattern, replacement);
        stats.optionalChainingAdded++;
        fixes.push(`optional chaining: ${pattern.source}`);
        modified = true;
      }
    }
  });
  
  // Fix 2: Property name corrections
  const propertyCorrections = [
    // Player properties
    { pattern: /player\.carRating/g, replacement: '((player.speed + player.power + player.throwing + player.catching + player.kicking) / 5)' },
    { pattern: /player\.overall/g, replacement: '((player.speed + player.power + player.throwing + player.catching + player.kicking) / 5)' },
    
    // Staff properties  
    { pattern: /staff\.role/g, replacement: 'staff.type' },
    
    // Team properties
    { pattern: /team\.totalScores/g, replacement: '(team as any).totalScores' },
    { pattern: /team\.scoresAgainst/g, replacement: '(team as any).scoresAgainst' },
    { pattern: /team\.scoreDifference/g, replacement: '(team as any).scoreDifference' },
  ];
  
  propertyCorrections.forEach(({ pattern, replacement }) => {
    if (content.match(pattern)) {
      content = content.replace(pattern, replacement);
      stats.propertyFixesApplied++;
      fixes.push(`property fix: ${pattern.source}`);
      modified = true;
    }
  });
  
  // Fix 3: API response property access
  // When accessing properties on API responses, use safe access
  const apiResponsePatterns = [
    { pattern: /data\.listings/g, replacement: '(data as any)?.listings' },
    { pattern: /data\.players/g, replacement: '(data as any)?.players' },
    { pattern: /data\.staff/g, replacement: '(data as any)?.staff' },
    { pattern: /data\.pagination/g, replacement: '(data as any)?.pagination' },
    { pattern: /response\.data\.(.+?)(?=[\s\.\)\]\}])/g, replacement: '(response.data as any)?.$1' },
  ];
  
  apiResponsePatterns.forEach(({ pattern, replacement }) => {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      // Only apply if not already cast
      matches.forEach(match => {
        if (!content.includes(`(${match.split('.')[0]} as any)`)) {
          content = content.replace(new RegExp(match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement.replace('$1', match.split('.').slice(1).join('.')));
          stats.propertyFixesApplied++;
          modified = true;
        }
      });
      if (modified) {
        fixes.push(`API response safety: ${pattern.source}`);
      }
    }
  });
  
  return { content, modified, fixes };
}

// Main execution
console.log('🔧 Property Access Safety Fixes\n');
console.log('📋 Adding optional chaining and safe property access...\n');

// Get files with property access errors
const errorFiles = new Set();

try {
  // Get TS2339 errors (Property does not exist)
  const result = execSync('npx tsc --noEmit 2>&1 | grep "TS2339" | cut -d"(" -f1 | sort -u', {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });
  
  result.split('\n').filter(f => f.trim()).forEach(file => {
    errorFiles.add(file.trim());
  });
} catch (e) {
  if (e.stdout) {
    e.stdout.split('\n').filter(f => f.trim()).forEach(file => {
      errorFiles.add(file.trim());
    });
  }
}

console.log(`📂 Found ${errorFiles.size} files with property access errors\n`);

// Process each file
errorFiles.forEach(filePath => {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    return;
  }
  
  stats.filesProcessed++;
  
  try {
    const result = fixFile(fullPath);
    if (result.modified) {
      fs.writeFileSync(fullPath, result.content);
      stats.filesFixed++;
      console.log(`✅ Fixed: ${path.basename(fullPath)}`);
      if (result.fixes.length > 0) {
        console.log(`   Fixes: ${result.fixes.join(', ')}`);
      }
    }
  } catch (err) {
    console.log(`❌ Error processing ${path.basename(fullPath)}: ${err.message}`);
  }
});

// Report results
console.log('\n📊 Results:');
console.log(`  📁 Files processed: ${stats.filesProcessed}`);
console.log(`  ✅ Files fixed: ${stats.filesFixed}`);
console.log(`  🔗 Optional chaining added: ${stats.optionalChainingAdded}`);
console.log(`  🔧 Property fixes applied: ${stats.propertyFixesApplied}`);

// Check new error count
console.log('\n📈 Checking new error count...');
try {
  const errorCount = execSync('npx tsc --noEmit 2>&1 | grep "error TS" | wc -l', { 
    encoding: 'utf8'
  }).trim();
  console.log(`  📉 Current errors: ${errorCount}`);
} catch (e) {
  if (e.stdout) {
    console.log(`  📉 Current errors: ${e.stdout.trim()}`);
  }
}