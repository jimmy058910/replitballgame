/**
 * Match Speed Controller for Priority-Based Playback
 * Implements Critical=1x, Important=2x, Standard=visuals off, Downtime=fast forward
 */

import { MatchEvent, EventPriority, EVENT_PRIORITIES } from '../../../shared/types/LiveMatchState';

export class MatchSpeedController {
  private currentSpeed: number = 1.0;
  private isVisualsEnabled: boolean = true;
  private manualSpeedOverride: number | null = null;
  private eventQueue: MatchEvent[] = [];
  
  // Callbacks for UI updates
  public onSpeedChange?: (speed: number) => void;
  public onVisualsToggle?: (enabled: boolean) => void;

  constructor() {
    this.currentSpeed = 1.0;
    this.isVisualsEnabled = true;
  }

  /**
   * Process a new match event and determine appropriate speed/visuals
   */
  processEvent(event: MatchEvent) {
    // Add to event queue for priority analysis
    this.eventQueue.unshift(event);
    
    // Keep only last 3 events for priority analysis
    if (this.eventQueue.length > 3) {
      this.eventQueue = this.eventQueue.slice(0, 3);
    }

    // Determine speed based on highest priority in queue
    this.updateSpeedFromQueue();
  }

  /**
   * Update speed based on event queue priorities
   */
  private updateSpeedFromQueue() {
    if (this.manualSpeedOverride !== null) {
      return; // Manual override active
    }

    if (this.eventQueue.length === 0) {
      this.setSpeed(1.0, true);
      return;
    }

    // Find highest priority event in queue
    const highestPriority = Math.min(...this.eventQueue.map(e => e.priority.priority));
    
    // Check if critical event is approaching (within 3 seconds)
    const criticalEventApproaching = this.eventQueue.some(e => 
      e.priority.priority === 1 && 
      Math.abs(e.timestamp - Date.now() / 1000) <= 3
    );

    if (criticalEventApproaching) {
      // Ramp down to 1x speed smoothly
      this.setSpeed(1.0, true);
    } else {
      // Set speed based on priority
      switch (highestPriority) {
        case 1: // Critical
          this.setSpeed(1.0, true);
          break;
        case 2: // Important  
          this.setSpeed(2.0, true);
          break;
        case 3: // Standard
          this.setSpeed(8.0, false);
          break;
        case 4: // Downtime
          this.setSpeed(8.0, false);
          break;
        default:
          this.setSpeed(1.0, true);
      }
    }
  }

  /**
   * Set speed and visuals state
   */
  private setSpeed(speed: number, visualsEnabled: boolean) {
    if (this.currentSpeed !== speed) {
      this.currentSpeed = speed;
      this.onSpeedChange?.(speed);
    }

    if (this.isVisualsEnabled !== visualsEnabled) {
      this.isVisualsEnabled = visualsEnabled;
      this.onVisualsToggle?.(visualsEnabled);
    }
  }

  /**
   * Set manual speed override (from user controls)
   */
  setManualSpeed(speed: number) {
    this.manualSpeedOverride = speed;
    
    if (speed === 8) {
      // Fast forward mode
      this.setSpeed(8.0, false);
    } else {
      this.setSpeed(speed, true);
    }
  }

  /**
   * Clear manual speed override and return to automatic
   */
  clearManualOverride() {
    this.manualSpeedOverride = null;
    this.updateSpeedFromQueue();
  }

  /**
   * Toggle visuals on/off
   */
  toggleVisuals() {
    if (this.isVisualsEnabled) {
      this.setManualSpeed(8); // Fast forward with visuals off
    } else {
      this.setManualSpeed(1); // Normal speed with visuals on
    }
  }

  /**
   * Get current speed
   */
  getCurrentSpeed(): number {
    return this.currentSpeed;
  }

  /**
   * Get current visuals state
   */
  getVisualsEnabled(): boolean {
    return this.isVisualsEnabled;
  }

  /**
   * Calculate event priority based on type
   */
  static calculateEventPriority(eventType: string): EventPriority {
    const upperType = eventType.toUpperCase();
    
    // Critical events (1x speed)
    if (['SCORE', 'INJURY', 'MAJOR_TACKLE', 'INTERCEPTION', 'SCORE_ATTEMPT', 'HALFTIME', 'FINAL_WHISTLE'].includes(upperType)) {
      return EVENT_PRIORITIES.CRITICAL;
    }
    
    // Important events (2x speed)
    if (['SUCCESSFUL_PASS_SCORING', 'DEFENSIVE_STOP', 'PASS_ATTEMPT', 'SCRUM', 'SUBSTITUTION'].includes(upperType)) {
      return EVENT_PRIORITIES.IMPORTANT;
    }
    
    // Standard events (visuals off)
    if (['ROUTINE_PLAY', 'REGULAR_PASS', 'STANDARD_MOVEMENT'].includes(upperType)) {
      return EVENT_PRIORITIES.STANDARD;
    }
    
    // Downtime events (visuals off)
    return EVENT_PRIORITIES.DOWNTIME;
  }

  /**
   * Reset controller state
   */
  reset() {
    this.currentSpeed = 1.0;
    this.isVisualsEnabled = true;
    this.manualSpeedOverride = null;
    this.eventQueue = [];
  }
}