import moment from 'moment-timezone';

// Eastern Time zone identifier
export const EASTERN_TIMEZONE = 'America/Detroit';

// League game scheduling window (4PM-10PM Eastern)
export const LEAGUE_GAME_START_HOUR = 16; // 4PM
export const LEAGUE_GAME_END_HOUR = 22; // 10PM
export const GAME_DURATION_MINUTES = 20; // 20 minutes per game
export const STAGGER_MINUTES = 5; // 5 minutes between games for viewing

/**
 * Get current Eastern Time
 */
export function getEasternTime(): moment.Moment {
  return moment().tz(EASTERN_TIMEZONE);
}

/**
 * Get Eastern Time for a specific date
 */
export function getEasternTimeForDate(date: Date): moment.Moment {
  return moment(date).tz(EASTERN_TIMEZONE);
}

/**
 * Check if current time is within league game scheduling window (4PM-10PM Eastern)
 */
export function isWithinSchedulingWindow(): boolean {
  const easternTime = getEasternTime();
  const currentHour = easternTime.hour();
  return currentHour >= LEAGUE_GAME_START_HOUR && currentHour < LEAGUE_GAME_END_HOUR;
}

/**
 * Get next available league game slot within scheduling window
 * Returns null if no slots available today
 */
export function getNextLeagueGameSlot(existingGames: Date[] = []): Date | null {
  const easternTime = getEasternTime();
  const today = easternTime.clone().startOf('day');
  
  // Start at 4PM Eastern today
  let slotTime = today.clone().hour(LEAGUE_GAME_START_HOUR).minute(0).second(0);
  
  // If we're past the scheduling window for today, return null
  if (easternTime.hour() >= LEAGUE_GAME_END_HOUR) {
    return null;
  }
  
  // Convert existing games to Eastern Time for comparison
  const existingSlots = existingGames.map(game => 
    getEasternTimeForDate(game).format('YYYY-MM-DD HH:mm')
  );
  
  // Find next available slot
  while (slotTime.hour() < LEAGUE_GAME_END_HOUR) {
    const slotString = slotTime.format('YYYY-MM-DD HH:mm');
    
    // Check if this slot is available
    if (!existingSlots.includes(slotString)) {
      return slotTime.toDate();
    }
    
    // Move to next staggered slot
    slotTime.add(GAME_DURATION_MINUTES + STAGGER_MINUTES, 'minutes');
  }
  
  return null; // No slots available today
}

/**
 * Generate staggered league game schedule for multiple games
 * Returns array of scheduled times within 5PM-10PM Eastern window
 */
export function generateLeagueGameSchedule(numberOfGames: number, startDate?: Date): Date[] {
  const schedule: Date[] = [];
  const easternTime = startDate ? getEasternTimeForDate(startDate) : getEasternTime();
  
  // Start at 4PM Eastern on the specified date
  let currentSlot = easternTime.clone().startOf('day').hour(LEAGUE_GAME_START_HOUR).minute(0).second(0);
  
  // If start date is today and we're past 4PM, start from next available slot
  if (!startDate && easternTime.hour() >= LEAGUE_GAME_START_HOUR) {
    const nextSlot = getNextLeagueGameSlot();
    if (nextSlot) {
      currentSlot = getEasternTimeForDate(nextSlot);
    } else {
      // No slots today, schedule for tomorrow
      currentSlot = easternTime.clone().add(1, 'day').startOf('day').hour(LEAGUE_GAME_START_HOUR).minute(0).second(0);
    }
  }
  
  let gamesScheduled = 0;
  let currentDay = currentSlot.clone().startOf('day');
  
  while (gamesScheduled < numberOfGames) {
    // Reset to start of scheduling window for new day
    if (currentSlot.hour() >= LEAGUE_GAME_END_HOUR) {
      currentDay.add(1, 'day');
      currentSlot = currentDay.clone().hour(LEAGUE_GAME_START_HOUR).minute(0).second(0);
    }
    
    // Add game to schedule
    schedule.push(currentSlot.toDate());
    gamesScheduled++;
    
    // Move to next staggered slot
    currentSlot.add(GAME_DURATION_MINUTES + STAGGER_MINUTES, 'minutes');
  }
  
  return schedule;
}

/**
 * Get formatted Eastern Time string
 */
export function formatEasternTime(date: Date, format: string = 'YYYY-MM-DD HH:mm z'): string {
  return getEasternTimeForDate(date).format(format);
}

/**
 * Check if a time is within league game hours (5PM-10PM Eastern)
 */
export function isLeagueGameTime(date: Date): boolean {
  const easternTime = getEasternTimeForDate(date);
  const hour = easternTime.hour();
  return hour >= LEAGUE_GAME_START_HOUR && hour < LEAGUE_GAME_END_HOUR;
}

/**
 * Get time until next league game window opens
 */
export function getTimeUntilNextLeagueWindow(): { hours: number; minutes: number } {
  const easternTime = getEasternTime();
  const currentHour = easternTime.hour();
  
  if (currentHour < LEAGUE_GAME_START_HOUR) {
    // Before 4PM today
    const nextWindow = easternTime.clone().hour(LEAGUE_GAME_START_HOUR).minute(0).second(0);
    const diff = nextWindow.diff(easternTime, 'minutes');
    return {
      hours: Math.floor(diff / 60),
      minutes: diff % 60
    };
  } else if (currentHour >= LEAGUE_GAME_END_HOUR) {
    // After 10PM today, next window is 4PM tomorrow
    const nextWindow = easternTime.clone().add(1, 'day').hour(LEAGUE_GAME_START_HOUR).minute(0).second(0);
    const diff = nextWindow.diff(easternTime, 'minutes');
    return {
      hours: Math.floor(diff / 60),
      minutes: diff % 60
    };
  } else {
    // Currently within window
    return { hours: 0, minutes: 0 };
  }
}

/**
 * Get time until next game day reset (3AM Eastern)
 */
export function getTimeUntilNextGameDayReset(): { hours: number; minutes: number } {
  const easternTime = getEasternTime();
  const currentHour = easternTime.hour();
  
  let nextReset;
  if (currentHour < 3) {
    // Before 3AM today, next reset is today at 3AM
    nextReset = easternTime.clone().hour(3).minute(0).second(0);
  } else {
    // After 3AM today, next reset is tomorrow at 3AM
    nextReset = easternTime.clone().add(1, 'day').hour(3).minute(0).second(0);
  }
  
  const diff = nextReset.diff(easternTime, 'minutes');
  return {
    hours: Math.floor(diff / 60),
    minutes: diff % 60
  };
}

/**
 * Get current server time info
 */
export function getServerTimeInfo() {
  const easternTime = getEasternTime();
  const isSchedulingTime = isWithinSchedulingWindow();
  const timeUntilGameDayReset = getTimeUntilNextGameDayReset();
  
  return {
    currentTime: easternTime.toDate(),
    formattedTime: easternTime.format('YYYY-MM-DD HH:mm:ss z'),
    timezone: EASTERN_TIMEZONE,
    isSchedulingWindow: isSchedulingTime,
    schedulingWindow: `${LEAGUE_GAME_START_HOUR}:00-${LEAGUE_GAME_END_HOUR}:00 Eastern`,
    timeUntilNextWindow: timeUntilGameDayReset
  };
}

/**
 * Generate 4 daily game times with 75-minute intervals within 4-10PM window
 * Ensures proper 4PM-10PM EDT distribution
 */
export function generateDailyGameTimes(day: number): Date[] {
  const easternTime = getEasternTime();
  
  // Fixed 4-game schedule within 4PM-10PM window (6 hour span = 360 minutes / 4 games = 90 minutes apart)
  // Start times vary by day: 4:00PM, 4:30PM, 5:00PM, 5:30PM, 6:00PM, 6:30PM, 7:00PM
  const startVariations = [
    { hour: 16, minute: 0 },  // 4:00PM
    { hour: 16, minute: 30 }, // 4:30PM
    { hour: 17, minute: 0 },  // 5:00PM
    { hour: 17, minute: 30 }, // 5:30PM
    { hour: 18, minute: 0 },  // 6:00PM
    { hour: 18, minute: 30 }, // 6:30PM
    { hour: 19, minute: 0 },  // 7:00PM
  ];
  
  const dayIndex = (day - 1) % startVariations.length;
  const { hour, minute } = startVariations[dayIndex];
  
  const gameTimes: Date[] = [];
  
  for (let i = 0; i < 4; i++) {
    const gameTime = easternTime.clone().hour(hour).minute(minute + (i * 75)).second(0);
    gameTimes.push(gameTime.toDate());
  }
  
  return gameTimes;
}