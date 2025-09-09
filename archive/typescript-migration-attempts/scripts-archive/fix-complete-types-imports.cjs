#!/usr/bin/env node

/**
 * Fix Complete Types Import Errors
 * Removes non-existent model imports from shared/types/complete.ts
 */

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔧 Cleaning up non-existent Prisma model imports...');

const COMPLETE_TYPES_FILE = 'shared/types/complete.ts';

// Models that don't exist in current Prisma schema - need to be removed
const NON_EXISTENT_MODELS = [
  'PlayerContract',
  'Equipment', 
  'TradeOffer',
  'Division',
  'Consumable',
  'TeamConsumable', 
  'ConsumableEffect',
  'NewsItem',
  'Trophy',
  'TeamTrophy',
  'AchievementProgress',
  'DailyChallenge',
  'PlayerInjury',
  'TradingCard',
  'TradingCardCollection',
  'StadiumUpgrade',
  'TeamStadiumUpgrade',
  'SponsorshipDeal',
  'TeamSponsorship',
  'DraftPick',
  'ScoutingReport',
  'TrainingSession',
  'PlayerTraining',
  'ListingStatus',
  'BidStatus',
  'TradeStatus',
  'InjuryType',
  'ConsumableType',
  'EffectType',
  'TrophyType'
];

if (!fs.existsSync(COMPLETE_TYPES_FILE)) {
  console.log(`⚠️  File not found: ${COMPLETE_TYPES_FILE}`);
  return;
}

let content = fs.readFileSync(COMPLETE_TYPES_FILE, 'utf-8');
let totalRemovals = 0;

// Remove import lines for non-existent models
NON_EXISTENT_MODELS.forEach(model => {
  // Remove from import statement
  const importPattern = new RegExp(`\\s*${model} as Prisma${model},?\\n?`, 'g');
  const beforeContent = content;
  content = content.replace(importPattern, '');
  
  if (content !== beforeContent) {
    totalRemovals++;
    console.log(`✅ Removed import for non-existent model: ${model}`);
  }

  // Remove any export type definitions that reference these models
  const exportPattern = new RegExp(`export type ${model}[^;]*;\\n?`, 'g');
  content = content.replace(exportPattern, '');
  
  // Remove any interface extensions that reference these models
  const interfacePattern = new RegExp(`\\s*${model.toLowerCase()}\\??: ${model}[;,]?\\n?`, 'g');
  content = content.replace(interfacePattern, '');
});

// Clean up any trailing commas in import statements
content = content.replace(/,(\s*}\s*from)/g, '$1');

// Clean up any empty lines left by removals
content = content.replace(/\n\n\n+/g, '\n\n');

fs.writeFileSync(COMPLETE_TYPES_FILE, content);

console.log(`\n🎯 Removed ${totalRemovals} non-existent model imports`);

// Check improvement  
try {
  const finalOutput = execSync('npx tsc --noEmit 2>&1 | grep "error TS" | wc -l', { encoding: 'utf-8' }).trim();
  console.log(`📊 TypeScript error count after cleanup: ${finalOutput}`);
} catch (error) {
  console.log('⚠️  Could not check final error count');
}