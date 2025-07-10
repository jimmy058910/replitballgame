// Test script to verify profanity filtering works with @2toad/profanity
import { TeamNameValidator } from './server/services/teamNameValidation.js';

async function testProfanityFilter() {
  console.log('🧪 Testing Profanity Filter Implementation');
  console.log('==========================================');
  
  // Test cases for profanity filtering
  const testCases = [
    // Should be rejected (profane)
    { name: 'DamnTeam', expected: false, reason: 'Contains profanity' },
    { name: 'FuckingLions', expected: false, reason: 'Contains profanity' },
    { name: 'ShitHawks', expected: false, reason: 'Contains profanity' },
    { name: 'BitchPirates', expected: false, reason: 'Contains profanity' },
    { name: 'AssKickers', expected: false, reason: 'Contains profanity' },
    
    // Should be accepted (clean)
    { name: 'CleanTeam', expected: true, reason: 'Clean name' },
    { name: 'Lightning Bolts', expected: true, reason: 'Clean name' },
    { name: 'Fire Dragons', expected: true, reason: 'Clean name' },
    { name: 'Steel Warriors', expected: true, reason: 'Clean name' },
    { name: 'Golden Eagles', expected: true, reason: 'Clean name' },
    
    // Edge cases
    { name: 'Arsenal', expected: true, reason: 'Should allow legitimate team name' },
    { name: 'Scunthorpe', expected: true, reason: 'Should allow legitimate place name' },
    { name: 'Test', expected: false, reason: 'Should reject test names' },
    
    // Should be rejected (reserved)
    { name: 'Admin', expected: false, reason: 'Reserved name' },
    { name: 'Lakers', expected: false, reason: 'Reserved name' },
    
    // Should be rejected (too short/long)
    { name: 'AB', expected: false, reason: 'Too short' },
    { name: 'SuperLongTeamNameThatExceedsLimit', expected: false, reason: 'Too long' },
    
    // Should be rejected (invalid characters)
    { name: 'Team@Name', expected: false, reason: 'Invalid characters' },
    { name: 'Team$$$', expected: false, reason: 'Invalid characters' },
  ];
  
  console.log('\n📋 Running Test Cases:');
  console.log('----------------------');
  
  let passCount = 0;
  let failCount = 0;
  
  for (const testCase of testCases) {
    try {
      const result = await TeamNameValidator.validateTeamName(testCase.name);
      const passed = result.isValid === testCase.expected;
      
      if (passed) {
        console.log(`✅ "${testCase.name}" - ${testCase.reason}`);
        passCount++;
      } else {
        console.log(`❌ "${testCase.name}" - Expected ${testCase.expected ? 'VALID' : 'INVALID'}, got ${result.isValid ? 'VALID' : 'INVALID'}`);
        console.log(`   Reason: ${testCase.reason}`);
        console.log(`   Error: ${result.error || 'No error message'}`);
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