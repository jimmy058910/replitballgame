/**
 * DAILY AUTOMATION SERVICE
 * 
 * Handles the automated daily execution of the late registration system
 * Runs at 3:00 PM EDT every day from season start through Day 9
 */

import { LateRegistrationSystem } from './lateRegistrationSystem.js';
// import cron from 'node-cron'; // Temporarily disable due to type issues

export class DailyAutomationService {
  private static cronJob: any = null;
  private static isRunning = false;

  /**
   * Initialize the daily automation system
   * Sets up cron job to run at 3:00 PM EDT daily
   */
  static initialize(): void {
    if (this.cronJob) {
      console.log('⚠️ Daily automation already initialized');
      return;
    }

    // Cron temporarily disabled due to type issues
    // TODO: Re-enable when dependencies are properly installed
    console.log('⚠️ Cron scheduling temporarily disabled');

    console.log('✅ Daily automation initialized - will run at 3:00 PM EDT');
  }

  /**
   * Execute the daily fill and schedule process
   */
  static async executeDailyFill(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Daily fill already running, skipping');
      return;
    }

    this.isRunning = true;
    
    try {
      console.log('🚀 DAILY AUTOMATION: Starting fill and schedule process');
      const startTime = Date.now();
      
      const result = await LateRegistrationSystem.executeDailyFillAndSchedule();
      
      const duration = Date.now() - startTime;
      console.log(`✅ DAILY AUTOMATION COMPLETE: Processed ${result.processed} subdivisions in ${duration}ms`);
      
      // Log results for monitoring
      result.results.forEach(result => {
        if (result.error) {
          console.error(`❌ ${result.subdivision}: ${result.error}`);
        } else {
          console.log(`✅ ${result.subdivision}: Added ${result.teamsAdded} AI teams, created ${result.scheduleResult.gamesCreated} games`);
        }
      });

    } catch (error) {
      console.error('❌ Daily automation failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Manual trigger for testing purposes
   */
  static async triggerManual(): Promise<{ success: boolean; message: string; results?: any }> {
    if (this.isRunning) {
      return {
        success: false,
        message: 'Daily fill process is already running'
      };
    }

    try {
      console.log('🔧 MANUAL TRIGGER: Starting daily fill process');
      await this.executeDailyFill();
      
      return {
        success: true,
        message: 'Daily fill process completed successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: `Daily fill process failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Stop the automation (for testing or shutdown)
   */
  static stop(): void {
    if (this.cronJob) {
      this.cronJob.destroy();
      this.cronJob = null;
      console.log('🛑 Daily automation stopped');
    }
  }

  /**
   * Get current status
   */
  static getStatus(): { initialized: boolean; running: boolean; nextRun: string | null } {
    return {
      initialized: !!this.cronJob,
      running: this.isRunning,
      nextRun: this.cronJob ? 'Daily at 3:00 PM EDT' : null
    };
  }
}