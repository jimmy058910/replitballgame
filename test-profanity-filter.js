// Test script to verify profanity filtering works with @2toad/profanity
import { profanity } from '@2toad/profanity';

async function testProfanityFilter() {
  console.log('🧪 Testing Profanity Filter Implementation');
  console.log('==========================================');
  
  // Test cases for profanity filtering
  const testCases = [
    // Should be rejected (profane)
    { name: 'DamnTeam', expected: true, reason: 'Contains profanity' },
    { name: 'FuckingLions', expected: true, reason: 'Contains profanity' },
    { name: 'ShitHawks', expected: true, reason: 'Contains profanity' },
    { name: 'BitchPirates', expected: true, reason: 'Contains profanity' },
    { name: 'AssKickers', expected: true, reason: 'Contains profanity' },
    
    // Should be accepted (clean)
    { name: 'CleanTeam', expected: false, reason: 'Clean name' },
    { name: 'Lightning Bolts', expected: false, reason: 'Clean name' },
    { name: 'Fire Dragons', expected: false, reason: 'Clean name' },
    { name: 'Steel Warriors', expected: false, reason: 'Clean name' },
    { name: 'Golden Eagles', expected: false, reason: 'Clean name' },
    
    // Edge cases
    { name: 'Arsenal', expected: false, reason: 'Should allow legitimate team name' },
    { name: 'Scunthorpe', expected: false, reason: 'Should allow legitimate place name' },
  ];
  
  console.log('\n📋 Running Test Cases:');
  console.log('----------------------');
  
  let passCount = 0;
  let failCount = 0;
  
  for (const testCase of testCases) {
    try {
      const result = profanity.exists(testCase.name);
      const passed = result === testCase.expected;
      
      if (passed) {
        console.log(`✅ "${testCase.name}" - ${testCase.reason}`);
        passCount++;
      } else {
        console.log(`❌ "${testCase.name}" - Expected ${testCase.expected ? 'PROFANE' : 'CLEAN'}, got ${result ? 'PROFANE' : 'CLEAN'}`);
        console.log(`   Reason: ${testCase.reason}`);
        failCount++;
      }
    } catch (error) {
      console.log(`💥 "${testCase.name}" - Test failed with error: ${error.message}`);
      failCount++;
    }
  }
  
  console.log('\n📊 Test Results:');
  console.log('================');
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📈 Success Rate: ${Math.round((passCount / (passCount + failCount)) * 100)}%`);
  
  if (failCount === 0) {
    console.log('\n🎉 All tests passed! Profanity filter is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the implementation.');
  }
}

// Run the test
testProfanityFilter().catch(console.error);