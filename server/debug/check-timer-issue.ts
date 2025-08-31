import { autoDrawingService } from '../services/AutoDrawingService';
import { getGlobalDisplayOverrides } from '../data/lottery';

console.log('=== DEBUG TIMER ISSUE ===');

// Check current time
const now = new Date();
console.log('Current server time:', now.toISOString());
console.log('Current local time (Berlin):', now.toLocaleString('de-DE', {timeZone: 'Europe/Berlin'}));

// Check display overrides
const overrides = getGlobalDisplayOverrides();
console.log('Current display overrides:', overrides);

// Check auto drawing config
const config = autoDrawingService.getConfig();
console.log('Auto drawing config:', {
  enabled: config.enabled,
  nextScheduledTime: config.nextScheduledTime,
  dayOfWeek: config.dayOfWeek,
  hour: config.hour
});

// Check countdown
const countdown = autoDrawingService.getTimeUntilNextDrawing();
console.log('Countdown:', countdown);

// Manual calculation check
if (overrides.manualDate && overrides.manualTime) {
  const manualDateTime = `${overrides.manualDate}T${overrides.manualTime}:00.000+02:00`;
  const scheduledTime = new Date(manualDateTime);
  console.log('Manual scheduled time:', scheduledTime.toISOString());
  console.log('Manual scheduled time (Berlin):', scheduledTime.toLocaleString('de-DE', {timeZone: 'Europe/Berlin'}));
  
  const diff = scheduledTime.getTime() - now.getTime();
  console.log('Time difference (ms):', diff);
  console.log('Time difference (hours):', diff / (1000 * 60 * 60));
  console.log('Time difference (minutes):', diff / (1000 * 60));
  
  console.log('Is scheduled time in the past?', scheduledTime <= now);
}
