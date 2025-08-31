import { ApiResponse, DisplayOverrides } from '@shared/types';

// Cache for drawing day to avoid repeated API calls
let cachedDrawingDay: string | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 30000; // 30 seconds

export interface DrawingDayInfo {
  dayName: string;
  dayNameFriendly: string; // e.g., "am Samstag" instead of "Samstag"
}

const getDayNames = (language: string): Record<string, DrawingDayInfo> => {
  switch (language) {
    case 'en':
      return {
        '0': { dayName: 'Sunday', dayNameFriendly: 'on Sunday' },
        '1': { dayName: 'Monday', dayNameFriendly: 'on Monday' },
        '2': { dayName: 'Tuesday', dayNameFriendly: 'on Tuesday' },
        '3': { dayName: 'Wednesday', dayNameFriendly: 'on Wednesday' },
        '4': { dayName: 'Thursday', dayNameFriendly: 'on Thursday' },
        '5': { dayName: 'Friday', dayNameFriendly: 'on Friday' },
        '6': { dayName: 'Saturday', dayNameFriendly: 'on Saturday' },
      };
    case 'fr':
      return {
        '0': { dayName: 'Dimanche', dayNameFriendly: 'le dimanche' },
        '1': { dayName: 'Lundi', dayNameFriendly: 'le lundi' },
        '2': { dayName: 'Mardi', dayNameFriendly: 'le mardi' },
        '3': { dayName: 'Mercredi', dayNameFriendly: 'le mercredi' },
        '4': { dayName: 'Jeudi', dayNameFriendly: 'le jeudi' },
        '5': { dayName: 'Vendredi', dayNameFriendly: 'le vendredi' },
        '6': { dayName: 'Samedi', dayNameFriendly: 'le samedi' },
      };
    case 'es':
      return {
        '0': { dayName: 'Domingo', dayNameFriendly: 'el domingo' },
        '1': { dayName: 'Lunes', dayNameFriendly: 'el lunes' },
        '2': { dayName: 'Martes', dayNameFriendly: 'el martes' },
        '3': { dayName: 'Miércoles', dayNameFriendly: 'el miércoles' },
        '4': { dayName: 'Jueves', dayNameFriendly: 'el jueves' },
        '5': { dayName: 'Viernes', dayNameFriendly: 'el viernes' },
        '6': { dayName: 'Sábado', dayNameFriendly: 'el sábado' },
      };
    case 'it':
      return {
        '0': { dayName: 'Domenica', dayNameFriendly: 'la domenica' },
        '1': { dayName: 'Lunedì', dayNameFriendly: 'il lunedì' },
        '2': { dayName: 'Martedì', dayNameFriendly: 'il martedì' },
        '3': { dayName: 'Mercoledì', dayNameFriendly: 'il mercoledì' },
        '4': { dayName: 'Giovedì', dayNameFriendly: 'il giovedì' },
        '5': { dayName: 'Venerdì', dayNameFriendly: 'il venerdì' },
        '6': { dayName: 'Sabato', dayNameFriendly: 'il sabato' },
      };
    default: // German
      return {
        '0': { dayName: 'Sonntag', dayNameFriendly: 'am Sonntag' },
        '1': { dayName: 'Montag', dayNameFriendly: 'am Montag' },
        '2': { dayName: 'Dienstag', dayNameFriendly: 'am Dienstag' },
        '3': { dayName: 'Mittwoch', dayNameFriendly: 'am Mittwoch' },
        '4': { dayName: 'Donnerstag', dayNameFriendly: 'am Donnerstag' },
        '5': { dayName: 'Freitag', dayNameFriendly: 'am Freitag' },
        '6': { dayName: 'Samstag', dayNameFriendly: 'am Samstag' },
      };
  }
};

export const getCurrentDrawingDay = async (language: string = 'de'): Promise<DrawingDayInfo> => {
  const now = Date.now();
  
  // Check cache first
  if (cachedDrawingDay && (now - cacheTimestamp < CACHE_DURATION)) {
    const dayNames = getDayNames(language);
    return dayNames[cachedDrawingDay] || dayNames['5']; // Default to Friday
  }

  try {
    // Fetch display overrides to get the manual date/time
    const response = await fetch('/api/display-overrides');
    const data: ApiResponse<DisplayOverrides> = await response.json();
    
    if (data.success && data.data) {
      const overrides = data.data;
      
      if (overrides.manualDate && overrides.manualTime) {
        // Parse the manual date to get the day of week
        const manualDate = new Date(`${overrides.manualDate}T${overrides.manualTime}:00.000+02:00`);
        const dayOfWeek = manualDate.getDay().toString(); // 0=Sunday, 1=Monday, etc.
        
        // Cache the result
        cachedDrawingDay = dayOfWeek;
        cacheTimestamp = now;
        
        const dayNames = getDayNames(language);
        return dayNames[dayOfWeek] || dayNames['5']; // Default to Friday
      }
    }
  } catch (error) {
    console.error('Error fetching drawing day:', error);
  }

  // Default to Friday if no manual override or error
  cachedDrawingDay = '5';
  cacheTimestamp = now;
  
  const dayNames = getDayNames(language);
  return dayNames['5']; // Friday
};

// Function to clear cache when drawing time is updated
export const clearDrawingDayCache = (): void => {
  cachedDrawingDay = null;
  cacheTimestamp = 0;
};

// Listen for display override updates
if (typeof window !== 'undefined') {
  window.addEventListener('displayOverridesUpdated', clearDrawingDayCache);
}
