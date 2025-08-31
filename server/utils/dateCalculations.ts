/**
 * Utilities for calculating drawing dates and schedules
 */

export interface DrawingSchedule {
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  time: string; // Format: "HH:MM"
}

/**
 * Get the next occurrence of a specific day and time
 */
export const getNextDrawingDate = (schedule: DrawingSchedule): Date => {
  const [hours, minutes] = schedule.time.split(':').map(Number);
  const targetDayOfWeek = schedule.dayOfWeek;

  // Use a more straightforward approach - work in Berlin time
  const berlinTime = new Date().toLocaleString('sv-SE', {timeZone: 'Europe/Berlin'});
  const nowBerlin = new Date(berlinTime);

  console.log(`⏰ Current Berlin time: ${nowBerlin.toISOString()} (${nowBerlin.toLocaleString('de-DE')})`);

  // Create target time for today
  const todayTarget = new Date(nowBerlin);
  todayTarget.setHours(hours, minutes, 0, 0);

  console.log(`🎯 Target time today: ${todayTarget.toISOString()} (${todayTarget.toLocaleString('de-DE')})`);

  // Calculate days until the target day of week
  const currentDay = nowBerlin.getDay();
  let daysToAdd = (targetDayOfWeek - currentDay + 7) % 7;

  console.log(`📅 Current day: ${currentDay}, Target day: ${targetDayOfWeek}, Days to add: ${daysToAdd}`);

  // If it's the same day, check if the time has already passed
  if (daysToAdd === 0 && todayTarget <= nowBerlin) {
    console.log(`⚠️ Time has passed today (${todayTarget.toLocaleString('de-DE')} <= ${nowBerlin.toLocaleString('de-DE')}), scheduling for next week`);
    daysToAdd = 7;
  }

  // Create the next drawing date in Berlin time
  const nextDrawingBerlin = new Date(nowBerlin);
  nextDrawingBerlin.setHours(hours, minutes, 0, 0);
  nextDrawingBerlin.setDate(nextDrawingBerlin.getDate() + daysToAdd);

  console.log(`🎲 Next drawing (Berlin): ${nextDrawingBerlin.toISOString()} (${nextDrawingBerlin.toLocaleString('de-DE')})`);

  // Convert to UTC by adjusting for timezone offset
  // Berlin is UTC+1 in winter, UTC+2 in summer (CEST)
  const utcTime = new Date(nextDrawingBerlin.getTime() - (2 * 60 * 60 * 1000)); // Subtract 2 hours for CEST

  console.log(`🌍 Next drawing (UTC): ${utcTime.toISOString()}`);

  return utcTime;
};

/**
 * Get the current drawing schedule based on display overrides
 */
export const getCurrentDrawingSchedule = (displayOverrides: any): DrawingSchedule => {
  if (displayOverrides?.manualDate && displayOverrides?.manualTime) {
    // Parse the date in Central European Time (MEZ/MESZ)
    const manualDateTime = `${displayOverrides.manualDate}T${displayOverrides.manualTime}:00+02:00`;
    const manualDate = new Date(manualDateTime);
    return {
      dayOfWeek: manualDate.getDay(),
      time: displayOverrides.manualTime
    };
  }

  // Default to Friday 21:00
  return {
    dayOfWeek: 5, // Friday
    time: "21:00"
  };
};

/**
 * Calculate the next drawing date based on manual overrides
 */
export const calculateNextDrawingDate = (displayOverrides: any): Date => {
  const schedule = getCurrentDrawingSchedule(displayOverrides);
  return getNextDrawingDate(schedule);
};

/**
 * Get day name in German
 */
export const getDayName = (dayOfWeek: number): string => {
  const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  return days[dayOfWeek];
};

/**
 * Format date for display
 */
export const formatDrawingDate = (date: Date, locale: string = 'de-DE'): string => {
  return date.toLocaleString(locale, {
    timeZone: 'Europe/Berlin',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Check if a date is in the past
 */
export const isDateInPast = (date: Date): boolean => {
  return date.getTime() < Date.now();
};

/**
 * Get time until a specific date
 */
export const getTimeUntilDate = (targetDate: Date): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
} => {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();
  
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 };
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { days, hours, minutes, seconds, totalMs: diff };
};
