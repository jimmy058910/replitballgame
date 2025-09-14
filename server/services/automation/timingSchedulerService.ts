/**
 * TIMING SCHEDULER SERVICE
 * Handles timing schedules and automated job scheduling  
 * Extracted from seasonTimingAutomationService.ts
 */

export class TimingSchedulerService {
  private static timers: Map<string, NodeJS.Timeout> = new Map();
  private static isRunning = false;

  /**
   * Start timing scheduler service
   */
  static async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Timing scheduler service already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting timing scheduler service...');

    // Initialize core scheduling systems
    await this.initializeCoreSchedules();
    
    console.log('✅ Timing scheduler service started');
  }

  /**
   * Stop timing scheduler service
   */
  static async stop(): Promise<void> {
    // Clear all active timers
    for (const [name, timer] of this.timers.entries()) {
      clearTimeout(timer);
      console.log(`⏹️ Cleared timer: ${name}`);
    }
    this.timers.clear();
    
    this.isRunning = false;
    console.log('Timing scheduler service stopped');
  }

  /**
   * Schedule automation with precise timing
   */
  static async scheduleAutomation(name: string, executionTime: Date, callback: () => Promise<void>): Promise<void> {
    try {
      const now = new Date();
      const timeUntilExecution = executionTime.getTime() - now.getTime();

      if (timeUntilExecution <= 0) {
        console.log(`⚡ [SCHEDULER] Immediate execution: ${name}`);
        await callback();
        return;
      }

      // Clear existing timer if it exists
      if (this.timers.has(name)) {
        clearTimeout(this.timers.get(name)!);
      }

      // Schedule new execution
      const timer = setTimeout(async () => {
        console.log(`⏰ [SCHEDULER] Executing scheduled task: ${name}`);
        try {
          await callback();
          console.log(`✅ [SCHEDULER] Completed: ${name}`);
        } catch (error) {
          console.error(`❌ [SCHEDULER] Error in ${name}:`, error);
        } finally {
          this.timers.delete(name);
        }
      }, timeUntilExecution);

      this.timers.set(name, timer);

      const executionTimeStr = executionTime.toLocaleString('en-US', { 
        timeZone: 'America/New_York',
        dateStyle: 'short',
        timeStyle: 'medium'
      });

      console.log(`📅 [SCHEDULER] Scheduled "${name}" for ${executionTimeStr} EDT (${Math.round(timeUntilExecution / 60000)} minutes from now)`);

    } catch (error) {
      console.error(`❌ [SCHEDULER] Error scheduling ${name}:`, error);
    }
  }

  /**
   * Schedule recurring automation
   */
  static async scheduleRecurring(name: string, intervalMs: number, callback: () => Promise<void>): Promise<void> {
    try {
      // Clear existing timer if it exists
      if (this.timers.has(name)) {
        clearInterval(this.timers.get(name)!);
      }

      const timer = setInterval(async () => {
        console.log(`🔄 [SCHEDULER] Executing recurring task: ${name}`);
        try {
          await callback();
        } catch (error) {
          console.error(`❌ [SCHEDULER] Error in recurring ${name}:`, error);
        }
      }, intervalMs);

      this.timers.set(name, timer);

      const intervalMinutes = Math.round(intervalMs / 60000);
      console.log(`🔁 [SCHEDULER] Scheduled recurring "${name}" every ${intervalMinutes} minutes`);

    } catch (error) {
      console.error(`❌ [SCHEDULER] Error scheduling recurring ${name}:`, error);
    }
  }

  /**
   * Get next execution time for given hour/minute in EDT
   */
  static getNextExecutionTime(hour: number, minute: number = 0): Date {
    const now = new Date();
    const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    
    let nextExecution = new Date();
    nextExecution.setHours(hour, minute, 0, 0);
    
    // Convert to EDT
    const offset = easternTime.getTime() - now.getTime();
    nextExecution = new Date(nextExecution.getTime() + offset);
    
    // If time has passed today, schedule for tomorrow
    if (nextExecution <= now) {
      nextExecution.setDate(nextExecution.getDate() + 1);
    }
    
    return nextExecution;
  }

  /**
   * Schedule daily execution at specific EDT time
   */
  static async scheduleDailyEDT(name: string, hour: number, minute: number = 0, callback: () => Promise<void>): Promise<void> {
    const executeAndReschedule = async () => {
      // Execute the callback
      await callback();
      
      // Schedule next execution
      const nextExecution = this.getNextExecutionTime(hour, minute);
      await this.scheduleAutomation(name, nextExecution, executeAndReschedule);
    };

    // Schedule first execution
    const nextExecution = this.getNextExecutionTime(hour, minute);
    await this.scheduleAutomation(name, nextExecution, executeAndReschedule);
  }

  /**
   * Cancel scheduled automation
   */
  static cancelAutomation(name: string): boolean {
    const timer = this.timers.get(name);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(name);
      console.log(`❌ [SCHEDULER] Cancelled: ${name}`);
      return true;
    }
    return false;
  }

  /**
   * Get status of all scheduled automations
   */
  static getScheduleStatus(): { [key: string]: { type: string; active: boolean } } {
    const status: { [key: string]: { type: string; active: boolean } } = {};
    
    for (const [name] of this.timers.entries()) {
      status[name] = {
        type: 'scheduled',
        active: true
      };
    }
    
    return status;
  }

  /**
   * Initialize core scheduling systems
   */
  private static async initializeCoreSchedules(): Promise<void> {
    try {
      // Schedule system health check every 15 minutes
      await this.scheduleRecurring('system-health-check', 15 * 60 * 1000, async () => {
        await this.performSystemHealthCheck();
      });

      // Schedule missed automation detection every 30 minutes
      await this.scheduleRecurring('missed-automation-detection', 30 * 60 * 1000, async () => {
        await this.checkForMissedAutomations();
      });

      // Schedule timer cleanup every hour
      await this.scheduleRecurring('timer-cleanup', 60 * 60 * 1000, async () => {
        await this.cleanupExpiredTimers();
      });

      console.log('✅ [SCHEDULER] Core scheduling systems initialized');

    } catch (error) {
      console.error('❌ [SCHEDULER] Error initializing core schedules:', error);
    }
  }

  /**
   * Perform system health check
   */
  private static async performSystemHealthCheck(): Promise<void> {
    try {
      const activeTimers = this.timers.size;
      const memoryUsage = process.memoryUsage();
      const uptime = Math.round(process.uptime() / 60); // minutes

      console.log(`💓 [HEALTH CHECK] System Status - Active Timers: ${activeTimers}, Uptime: ${uptime}m, Memory: ${Math.round(memoryUsage.rss / 1024 / 1024)}MB`);

      // Log memory warning if usage is high
      if (memoryUsage.rss > 512 * 1024 * 1024) { // 512MB
        console.warn(`⚠️ [HEALTH CHECK] High memory usage detected: ${Math.round(memoryUsage.rss / 1024 / 1024)}MB`);
      }

    } catch (error) {
      console.error('❌ [HEALTH CHECK] System health check failed:', error);
    }
  }

  /**
   * Check for missed automations based on expected schedules
   */
  private static async checkForMissedAutomations(): Promise<void> {
    try {
      const now = new Date();
      const estTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
      
      // Check if daily progression should have run (3:00 AM EDT)
      if (estTime.getHours() > 3 && estTime.getMinutes() > 30) {
        const { storage } = await import('../../storage/index.js');
        const lastProgression = await storage.seasons.getLastProgressionTime();
        
        if (lastProgression) {
          const timeSinceLastProgression = now.getTime() - lastProgression.getTime();
          const hoursSinceLastProgression = timeSinceLastProgression / (1000 * 60 * 60);
          
          if (hoursSinceLastProgression > 25) { // More than 25 hours = missed a day
            console.warn(`⚠️ [MISSED AUTOMATION] Daily progression may have been missed - ${hoursSinceLastProgression.toFixed(1)} hours since last run`);
          }
        }
      }

    } catch (error) {
      console.error('❌ [MISSED AUTOMATION] Error checking for missed automations:', error);
    }
  }

  /**
   * Clean up expired or orphaned timers
   */
  private static async cleanupExpiredTimers(): Promise<void> {
    try {
      let cleanedCount = 0;
      
      // This would implement logic to identify and clean orphaned timers
      // For now, just log the current timer count
      console.log(`🧹 [CLEANUP] Timer cleanup completed - ${this.timers.size} active timers maintained`);

      if (cleanedCount > 0) {
        console.log(`🧹 [CLEANUP] Cleaned up ${cleanedCount} expired timers`);
      }

    } catch (error) {
      console.error('❌ [CLEANUP] Timer cleanup failed:', error);
    }
  }
}

console.log('📝 [Automation/TimingScheduler] Service placeholder - methods to be extracted');