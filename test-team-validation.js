// Test script to verify team name validation works properly
import { TeamNameValidator } from './server/services/teamNameValidation.js';

async function testTeamValidation() {
  console.log('🧪 Testing Complete Team Name Validation');
  console.log('========================================');
  
  // Test cases for complete validation
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
    
    // Should be rejected (reserved)
    { name: 'Admin', expected: false, reason: 'Reserved name' },
    { name: 'Lakers', expected: false, reason: 'Reserved name' },
    
    // Should be rejected (too short/long)
    { name: 'AB', expected: false, reason: 'Too short' },
    { name: 'SuperLongTeamNameThatExceedsLimit', expected: false, reason: 'Too long' },
    
    // Should be rejected (invalid characters)
    { name: 'Team@Name', expected: false, reason: 'Invalid characters' },
    { name: 'Team$$$', expected: false, reason: 'Invalid characters' },
    
    // Should be rejected (test names)
    { name: 'Test', expected: false, reason: 'Test name' },
    { name: 'Testing', expected: false, reason: 'Test name' },
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
    console.log('\n🎉 All tests passed! Team name validation is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the implementation.');
  }
}

// Run the test
testTeamValidation().catch(console.error);