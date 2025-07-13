// Debug script to understand @2toad/profanity behavior
import { profanity } from '@2toad/profanity';

console.log('🔍 Debugging @2toad/profanity Package');
console.log('=====================================');

// Test individual words
const wordsToTest = [
  'damn', 'fuck', 'shit', 'bitch', 'ass', 'hell', 'crap',
  'DamnTeam', 'FuckingLions', 'ShitHawks', 'BitchPirates',
  'clean', 'team', 'nice', 'good'
];

console.log('\n🧪 Testing Individual Words:');
console.log('---------------------------');

for (const word of wordsToTest) {
  const isProfane = profanity.exists(word);
  console.log(`"${word}" -> ${isProfane ? '🚫 PROFANE' : '✅ CLEAN'}`);
}

console.log('\n📋 Testing Different Methods:');
console.log('-----------------------------');

// Test different methods
const testPhrase = 'DamnTeam';
console.log(`Testing phrase: "${testPhrase}"`);
console.log(`profanity.exists(): ${profanity.exists(testPhrase)}`);
console.log(`profanity.censor(): "${profanity.censor(testPhrase)}"`);

// Check if we can get the word list
console.log('\n📚 Checking Available Configuration:');
console.log('-----------------------------------');
console.log('Available profanity methods:', Object.getOwnPropertyNames(profanity));
console.log('Available profanity properties:', Object.keys(profanity));

// Test with custom words
console.log('\n🔧 Testing Custom Word Addition:');
console.log('--------------------------------');
profanity.addWords(['testbad', 'customword']);
console.log(`"testbad" after adding: ${profanity.exists('testbad')}`);
console.log(`"customword" after adding: ${profanity.exists('customword')}`);