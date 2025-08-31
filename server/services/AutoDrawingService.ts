import { performIntelligentDrawing, getCurrentDrawing, getGlobalDisplayOverrides } from '../data/lottery';
import { calculateNextDrawingDate, getCurrentDrawingSchedule, getDayName } from '../utils/dateCalculations';

interface AutoDrawingConfig {
  enabled: boolean;
  nextScheduledTime: Date | null;
  dayOfWeek: number; // 5 = Friday
  hour: number; // 23 = 11 PM
  minute: number; // 0
}

class AutoDrawingService {
  private config: AutoDrawingConfig = {
    enabled: false, // Automatischen Timer ausgeschaltet
    nextScheduledTime: null,
    dayOfWeek: 5, // Friday
    hour: 21, // 9 PM (21:00)
    minute: 0
  };
  
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    // Always calculate next drawing time for display purposes
    this.calculateNextDrawingTime();
    // Only start scheduler if auto-drawing is enabled
    if (this.config.enabled) {
      this.startScheduler();
    }
  }

  public setAutoDrawingEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    console.log(`🎲 Auto-drawing ${enabled ? 'enabled' : 'disabled'}`);

    if (enabled) {
      this.calculateNextDrawingTime();
      this.startScheduler();
    } else {
      // Keep calculating next drawing time for display, but stop scheduler
      this.calculateNextDrawingTime(); // Keep timer visible
      this.stopScheduler();
    }
  }

  public getConfig(): AutoDrawingConfig {
    return { ...this.config };
  }

  public getNextDrawingTime(): Date | null {
    return this.config.nextScheduledTime;
  }

  public triggerManualDrawing(): boolean {
    if (!getCurrentDrawing()) {
      console.log('❌ No current drawing available for manual trigger');
      return false;
    }

    console.log('🎲 Manual drawing triggered by admin');
    this.performDrawing();
    return true;
  }

  public recalculateNextDrawingTime(): void {
    console.log('🎲 Recalculating next drawing time due to external changes');
    this.calculateNextDrawingTime();
  }

  private calculateNextDrawingTime(): void {
    // Check if there are manual display overrides for date/time
    const displayOverrides = getGlobalDisplayOverrides();

    // Calculate next drawing date using the improved logic
    const nextDrawingDate = calculateNextDrawingDate(displayOverrides);
    const schedule = getCurrentDrawingSchedule(displayOverrides);

    this.config.nextScheduledTime = nextDrawingDate;
    this.config.dayOfWeek = schedule.dayOfWeek;
    this.config.hour = parseInt(schedule.time.split(':')[0]);

    // Debug info
    const now = new Date();
    console.log(`🎲 Current time: ${now.toLocaleString('de-DE', {timeZone: 'Europe/Berlin'})}`);
    console.log(`🎲 Next auto-drawing scheduled for: ${this.config.nextScheduledTime.toLocaleString('de-DE', {timeZone: 'Europe/Berlin'})} (every ${getDayName(schedule.dayOfWeek)} at ${schedule.time})`);
    console.log(`🎲 Time until drawing: ${Math.ceil((this.config.nextScheduledTime.getTime() - now.getTime()) / (1000 * 60))} minutes`);
  }


  private startScheduler(): void {
    this.stopScheduler(); // Clear any existing interval
    
    if (!this.config.enabled) return;

    // Check every minute if it's time for a drawing
    this.intervalId = setInterval(() => {
      this.checkForScheduledDrawing();
    }, 60000); // Check every minute

    console.log('🎲 Auto-drawing scheduler started');
  }

  private stopScheduler(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🎲 Auto-drawing scheduler stopped');
    }
  }

  private checkForScheduledDrawing(): void {
    if (!this.config.enabled || !this.config.nextScheduledTime) return;

    const now = new Date();
    
    // Check if it's time for the scheduled drawing (within 1 minute window)
    if (now >= this.config.nextScheduledTime) {
      console.log('🎲 Scheduled drawing time reached!');
      this.performDrawing();
      this.calculateNextDrawingTime(); // Schedule next drawing
    }
  }

  private async performDrawing(): Promise<void> {
    try {
      console.log('🎲 Starting automatic drawing...');
      
      const result = performIntelligentDrawing();
      
      if (result) {
        console.log('🎲 Automatic drawing completed successfully');
        console.log(`🎲 Drawn numbers - Main: ${result.mainNumbers}, World: ${result.worldNumbers}`);
      } else {
        console.log('❌ Automatic drawing failed - no current drawing available');
      }
    } catch (error) {
      console.error('❌ Error during automatic drawing:', error);
    }
  }

  public getTimeUntilNextDrawing(): {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalMs: number;
  } {
    if (!this.config.nextScheduledTime) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 };
    }

    const now = new Date();
    const diff = this.config.nextScheduledTime.getTime() - now.getTime();

    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, totalMs: diff };
  }
}

// Export singleton instance
export const autoDrawingService = new AutoDrawingService();
