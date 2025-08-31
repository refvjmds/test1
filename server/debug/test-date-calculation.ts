import { calculateNextDrawingDate, getCurrentDrawingSchedule } from '../utils/dateCalculations';

// Test current date calculation
console.log('=== Testing Date Calculation ===');
console.log('Current time:', new Date().toLocaleString('de-DE', {timeZone: 'Europe/Berlin'}));
console.log('Current day of week:', new Date().getDay()); // 0=Sunday, 6=Saturday

const testOverrides = {
  manualDate: "2025-08-16", // Saturday
  manualTime: "20:00" // Current setting from display overrides
};

console.log('Test overrides:', testOverrides);

const schedule = getCurrentDrawingSchedule(testOverrides);
console.log('Schedule:', schedule);

const nextDate = calculateNextDrawingDate(testOverrides);
console.log('Next drawing date:', nextDate);
console.log('Next drawing date (formatted):', nextDate.toLocaleString('de-DE', {timeZone: 'Europe/Berlin'}));
console.log('Current time in ms:', Date.now());
console.log('Next drawing time in ms:', nextDate.getTime());
console.log('Difference in ms:', nextDate.getTime() - Date.now());
console.log('Is next date in future?', nextDate.getTime() > Date.now());

// Let's debug the logic step by step
const [hours, minutes] = testOverrides.manualTime.split(':').map(Number);
const testNext = new Date();
testNext.setHours(hours, minutes, 0, 0);
console.log('Test time today:', testNext.toLocaleString('de-DE', {timeZone: 'Europe/Berlin'}));
console.log('Is test time <= now?', testNext <= new Date());

// Test with no overrides
const noOverrides = {};
const scheduleDefault = getCurrentDrawingSchedule(noOverrides);
console.log('Default schedule:', scheduleDefault);

const nextDateDefault = calculateNextDrawingDate(noOverrides);
console.log('Next drawing date (default):', nextDateDefault.toLocaleString('de-DE', {timeZone: 'Europe/Berlin'}));
