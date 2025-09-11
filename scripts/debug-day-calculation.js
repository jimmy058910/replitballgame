// Debug the day calculation to find the actual issue

// Current fallback calculation from seasonRoutes.ts (line 107)
const fallbackStartDate = new Date("2025-07-13");
const now = new Date();
const daysSinceStart = Math.floor((now.getTime() - fallbackStartDate.getTime()) / (1000 * 60 * 60 * 24));
const fallbackDay = (daysSinceStart % 17) + 1;

console.log('🔍 Day Calculation Debug:');
console.log(`Current date: ${now.toISOString()}`);
console.log(`Fallback start date: ${fallbackStartDate.toISOString()}`);
console.log(`Days since fallback start: ${daysSinceStart}`);
console.log(`Fallback calculated day: ${fallbackDay}`);
console.log('');

// Let's calculate what it would be if season started recently
const recentSeasonStart = new Date("2025-09-05");  // Example recent start
const daysSinceRecent = Math.floor((now.getTime() - recentSeasonStart.getTime()) / (1000 * 60 * 60 * 24));
const recentDay = (daysSinceRecent % 17) + 1;

console.log(`Recent season start example: ${recentSeasonStart.toISOString()}`);
console.log(`Days since recent start: ${daysSinceRecent}`);
console.log(`Recent calculated day: ${recentDay}`);
console.log('');

// Calculate what start date would give us Day 7
const targetDay = 7;
const daysToSubtract = targetDay - 1; // Day 7 means 6 days have passed
const correctStartDate = new Date(now);
correctStartDate.setDate(correctStartDate.getDate() - daysToSubtract);

console.log(`Target day: ${targetDay}`);
console.log(`Correct start date for Day ${targetDay}: ${correctStartDate.toISOString()}`);

// Show what day it is with 3AM EDT logic (from shared/dayCalculation.ts)
const easternNow = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
const currentHour = easternNow.getHours();
console.log('');
console.log('🕒 3AM EDT Logic:');
console.log(`Current Eastern Time: ${easternNow.toLocaleString()}`);
console.log(`Current hour (EDT): ${currentHour}`);
console.log(`Before 3AM today? ${currentHour < 3 ? 'YES' : 'NO'}`);

if (currentHour < 3) {
    console.log('Since it is before 3AM EDT, we are still in the previous day cycle');
}