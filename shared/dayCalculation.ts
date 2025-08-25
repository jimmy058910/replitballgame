/**
 * PRODUCTION-READY DAY CALCULATION UTILITY
 * 
 * Implements proper 3AM EDT boundary logic for season day advancement.
 * Days only advance at 3AM EDT, not midnight.
 * 
 * Example:
 * - Day 9: Aug 24th 3AM EDT to Aug 25th 3AM EDT
 * - Day 10: Aug 25th 3AM EDT to Aug 26th 3AM EDT
 */

/**
 * Calculate the current season day using proper 3AM EDT boundaries
 * @param seasonStartDate - The season start date
 * @returns Current day number (1-17)
 */
export function calculateCurrentSeasonDay(seasonStartDate: Date): number {
  const now = new Date();
  
  // Convert to Eastern Time for proper 3AM boundary calculation
  const easternNow = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const easternSeasonStart = new Date(seasonStartDate.toLocaleString("en-US", { timeZone: "America/New_York" }));
  
  // If it's before 3AM EDT today, we're still in the previous day
  const currentHour = easternNow.getHours();
  const adjustedNow = new Date(easternNow);
  
  if (currentHour < 3) {
    // Before 3AM - subtract one day to get the correct day calculation
    adjustedNow.setDate(adjustedNow.getDate() - 1);
  }
  
  // Calculate days since season start, accounting for 3AM EDT boundaries
  const adjustedSeasonStart = new Date(easternSeasonStart);
  adjustedSeasonStart.setHours(3, 0, 0, 0); // Season starts at 3AM EDT
  
  const adjustedNowAtThreeAM = new Date(adjustedNow);
  adjustedNowAtThreeAM.setHours(3, 0, 0, 0); // Calculate from 3AM boundary
  
  const timeDiff = adjustedNowAtThreeAM.getTime() - adjustedSeasonStart.getTime();
  const daysSinceStart = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  
  const currentDayInCycle = (daysSinceStart % 17) + 1;
  
  console.log(`📅 [DAY CALC] Season start: ${seasonStartDate.toISOString()}, Current EDT: ${easternNow.toLocaleString()}, Day: ${currentDayInCycle}`);
  
  return Math.max(1, Math.min(17, currentDayInCycle));
}

/**
 * Calculate the current season number
 * @param seasonStartDate - The season start date
 * @returns Current season number
 */
export function calculateCurrentSeasonNumber(seasonStartDate: Date): number {
  const now = new Date();
  const easternNow = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const easternSeasonStart = new Date(seasonStartDate.toLocaleString("en-US", { timeZone: "America/New_York" }));
  
  const currentHour = easternNow.getHours();
  const adjustedNow = new Date(easternNow);
  
  if (currentHour < 3) {
    adjustedNow.setDate(adjustedNow.getDate() - 1);
  }
  
  const adjustedSeasonStart = new Date(easternSeasonStart);
  adjustedSeasonStart.setHours(3, 0, 0, 0);
  
  const adjustedNowAtThreeAM = new Date(adjustedNow);
  adjustedNowAtThreeAM.setHours(3, 0, 0, 0);
  
  const timeDiff = adjustedNowAtThreeAM.getTime() - adjustedSeasonStart.getTime();
  const daysSinceStart = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  
  return Math.floor(daysSinceStart / 17) + 1;
}

/**
 * Get season info using proper 3AM EDT calculation
 * @param seasonStartDate - The season start date  
 * @returns Object with currentDayInCycle and seasonNumber
 */
export function getCurrentSeasonInfo(seasonStartDate: Date): { currentDayInCycle: number; seasonNumber: number } {
  return {
    currentDayInCycle: calculateCurrentSeasonDay(seasonStartDate),
    seasonNumber: calculateCurrentSeasonNumber(seasonStartDate)
  };
}