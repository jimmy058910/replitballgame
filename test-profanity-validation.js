// Test the profanity validation directly through the service
import { TeamNameValidator } from './server/services/teamNameValidation.js';

async function testProfanityValidation() {
  console.log('🧪 Testing Professional Profanity Filter Validation');
  console.log('==================================================');
  
  const testCases = [
    // Should be rejected (contains profanity)
    { name: 'DamnTeam', expected: false, reason: 'Contains embedded profanity' },
    { name: 'FuckingLions', expected: false, reason: 'Contains embedded profanity' },
    { name: 'ShitHawks', expected: false, reason: 'Contains embedded profanity' },
    { name: 'BitchPirates', expected: false, reason: 'Contains embedded profanity' },
    { name: 'AssKickers', expected: false, reason: 'Contains embedded profanity' },
    { name: 'Damn Eagles', expected: false, reason: 'Contains profanity as separate word' },
    { name: 'Hell Warriors', expected: false, reason: 'Contains profanity as separate word' },
    
    // Should be accepted (clean names)
    { name: 'Thunder Bolts', expected: true, reason: 'Clean professional name' },
    { name: 'Fire Dragons', expected: true, reason: 'Clean professional name' },
    { name: 'Steel Warriors', expected: true, reason: 'Clean professional name' },
    { name: 'Golden Eagles', expected: true, reason: 'Clean professional name' },
    { name: 'Lightning Hawks', expected: true, reason: 'Clean professional name' },
    { name: 'Iron Wolves', expected: true, reason: 'Clean professional name' },
    
    // Edge cases that should be accepted
    { name: 'Arsenal', expected: true, reason: 'Legitimate team name' },
    { name: 'Scunthorpe', expected: true, reason: 'Legitimate place name' },
    { name: 'Classic', expected: true, reason: 'Common word' },
    
    // Should be rejected (other validation rules)
    { name: 'AB', expected: false, reason: 'Too short' },
    { name: 'SuperExtremelyLongTeamName', expected: false, reason: 'Too long' },
    { name: 'Team@Name', expected: false, reason: 'Invalid characters' },
    { name: 'Test', expected: false, reason: 'Reserved test name' },
    { name: 'Admin', expected: false, reason: 'Reserved admin name' },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    try {
      const result = await TeamNameValidator.validateTeamName(testCase.name);
      const success = result.isValid === testCase.expected;
      
      if (success) {
        console.log(`✅ "${testCase.name}" - ${testCase.reason}`);
        passed++;
      } else {
        console.log(`❌ "${testCase.name}" - Expected ${testCase.expected ? 'VALID' : 'INVALID'}, got ${result.isValid ? 'VALID' : 'INVALID'}`);
        console.log(`   Reason: ${testCase.reason}`);
        console.log(`   Error: ${result.error || 'No error message'}`);
        failed++;
      }
    } catch (error) {
      console.log(`💥 "${testCase.name}" - Error: ${error.message}`);
      failed++;
    }
  }
  
  console.log('\n📊 Test Results:');
  console.log('================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Professional profanity filter is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Review the implementation.');
  }
}

testProfanityValidation().catch(console.error);