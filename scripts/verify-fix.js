// Verify the day calculation fix

const seasonStartDate = new Date("2025-09-05T00:00:00.000Z");
const now = new Date();

// Use the same calculation logic from shared/dayCalculation.ts
const easternNow = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
const easternSeasonStart = new Date(seasonStartDate.toLocaleString("en-US", { timeZone: "America/New_York" }));

// If it's before 3AM EDT today, we're still in the previous day
const currentHour = easternNow.getHours();
const adjustedNow = new Date(easternNow);

console.log('🔍 Day Calculation Verification:');
console.log(`Season start: ${seasonStartDate.toISOString()}`);
console.log(`Current time: ${now.toISOString()}`);
console.log(`Eastern time: ${easternNow.toLocaleString()}`);
console.log(`Current hour (EDT): ${currentHour}`);
console.log(`Before 3AM? ${currentHour < 3 ? 'YES' : 'NO'}`);

if (currentHour < 3) {
  // Before 3AM - subtract one day to get the correct day calculation
  adjustedNow.setDate(adjustedNow.getDate() - 1);
  console.log('📅 Adjusted to previous day for calculation');
}

// Calculate days since season start, accounting for 3AM EDT boundaries
const adjustedSeasonStart = new Date(easternSeasonStart);
adjustedSeasonStart.setHours(3, 0, 0, 0); // Season starts at 3AM EDT

const adjustedNowAtThreeAM = new Date(adjustedNow);
adjustedNowAtThreeAM.setHours(3, 0, 0, 0); // Calculate from 3AM boundary

const timeDiff = adjustedNowAtThreeAM.getTime() - adjustedSeasonStart.getTime();
const daysSinceStart = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

const currentDayInCycle = (daysSinceStart % 17) + 1;
const expectedDay = Math.max(1, Math.min(17, currentDayInCycle));

console.log('');
console.log('📊 Calculation Results:');
console.log(`Days since season start: ${daysSinceStart}`);
console.log(`Current day in cycle: ${currentDayInCycle}`);
console.log(`Expected day (final): ${expectedDay}`);
console.log('');

// Also calculate what day 7 would be
console.log('🎯 Target Day Verification:');
if (expectedDay === 7) {
  console.log('✅ SUCCESS: Calculation shows Day 7 (matches expectation)');
} else {
  console.log(`❌ MISMATCH: Expected Day 7, got Day ${expectedDay}`);
  
  // Calculate what start date would give Day 7
  const daysToSubtract = 7 - 1; // Day 7 means 6 days have passed
  const targetStartDate = new Date(adjustedNowAtThreeAM);
  targetStartDate.setDate(targetStartDate.getDate() - daysToSubtract);
  
  console.log(`💡 For Day 7, season should have started: ${targetStartDate.toISOString()}`);
}

// Show database vs calculated difference
console.log('');
console.log('🏗️ Database vs Calculated:');
console.log(`Database currentDay: 5`);
console.log(`Calculated currentDay: ${expectedDay}`);
console.log(`Difference: ${expectedDay - 5} days`);