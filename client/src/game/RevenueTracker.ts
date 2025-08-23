/**
 * Revenue Tracker for Real-Time Match Revenue Calculation
 * Tracks ticket sales, concessions, parking, VIP, and merchandise revenue during matches
 */

import { RevenueSnapshot } from '../../../shared/types/LiveMatchState';

export class RevenueTracker {
  private revenueHistory: RevenueSnapshot[] = [];
  private totalRevenue: number = 0;
  
  // Revenue categories
  private ticketRevenue: number = 0;
  private concessionRevenue: number = 0;
  private parkingRevenue: number = 0;
  private vipRevenue: number = 0;
  private merchRevenue: number = 0;

  constructor() {
    this.reset();
  }

  /**
   * Update revenue with new snapshot data
   */
  updateRevenue(snapshots: RevenueSnapshot[]) {
    this.revenueHistory = [...snapshots];
    this.calculateTotals();
  }

  /**
   * Calculate total revenue from all snapshots
   */
  private calculateTotals() {
    this.totalRevenue = 0;
    this.ticketRevenue = 0;
    this.concessionRevenue = 0;
    this.parkingRevenue = 0;
    this.vipRevenue = 0;
    this.merchRevenue = 0;

    this.revenueHistory.forEach(snapshot => {
      this.totalRevenue += snapshot.totalRevenue;
      this.ticketRevenue += snapshot.ticketRevenue;
      this.concessionRevenue += snapshot.concessionRevenue;
      this.parkingRevenue += snapshot.parkingRevenue;
      this.vipRevenue += snapshot.vipRevenue;
      this.merchRevenue += snapshot.merchRevenue;
    });
  }

  /**
   * Get total revenue across all categories
   */
  getTotalRevenue(): number {
    return Math.round(this.totalRevenue);
  }

  /**
   * Get ticket revenue
   */
  getTicketRevenue(): number {
    return Math.round(this.ticketRevenue);
  }

  /**
   * Get concession revenue
   */
  getConcessionRevenue(): number {
    return Math.round(this.concessionRevenue);
  }

  /**
   * Get parking revenue
   */
  getParkingRevenue(): number {
    return Math.round(this.parkingRevenue);
  }

  /**
   * Get VIP suite revenue
   */
  getVIPRevenue(): number {
    return Math.round(this.vipRevenue);
  }

  /**
   * Get merchandise revenue
   */
  getMerchandiseRevenue(): number {
    return Math.round(this.merchRevenue);
  }

  /**
   * Get revenue breakdown by category
   */
  getRevenueBreakdown(): {
    tickets: number;
    concessions: number;
    parking: number;
    vip: number;
    merchandise: number;
    total: number;
  } {
    return {
      tickets: this.getTicketRevenue(),
      concessions: this.getConcessionRevenue(),
      parking: this.getParkingRevenue(),
      vip: this.getVIPRevenue(),
      merchandise: this.getMerchandiseRevenue(),
      total: this.getTotalRevenue()
    };
  }

  /**
   * Get revenue trend data for visualization
   */
  getRevenueTrend(): Array<{ tick: number; amount: number }> {
    return this.revenueHistory.map(snapshot => ({
      tick: snapshot.tick,
      amount: snapshot.totalRevenue
    }));
  }

  /**
   * Get current revenue rate (per tick)
   */
  getCurrentRevenueRate(): number {
    if (this.revenueHistory.length < 2) return 0;
    
    const latest = this.revenueHistory[this.revenueHistory.length - 1];
    const previous = this.revenueHistory[this.revenueHistory.length - 2];
    
    return latest.totalRevenue - previous.totalRevenue;
  }

  /**
   * Get projected final revenue based on current rate
   */
  getProjectedFinalRevenue(currentTick: number, maxTicks: number): number {
    const currentRate = this.getCurrentRevenueRate();
    const remainingTicks = maxTicks - currentTick;
    
    return this.getTotalRevenue() + (currentRate * remainingTicks);
  }

  /**
   * Get revenue efficiency metrics
   */
  getEfficiencyMetrics(attendance: number, capacity: number): {
    revenuePerAttendee: number;
    capacityUtilization: number;
    revenuePerCapacity: number;
  } {
    const total = this.getTotalRevenue();
    
    return {
      revenuePerAttendee: attendance > 0 ? total / attendance : 0,
      capacityUtilization: capacity > 0 ? (attendance / capacity) * 100 : 0,
      revenuePerCapacity: capacity > 0 ? total / capacity : 0
    };
  }

  /**
   * Get detailed revenue timeline for specific category
   */
  getCategoryTimeline(category: 'tickets' | 'concessions' | 'parking' | 'vip' | 'merchandise'): Array<{ tick: number; amount: number }> {
    return this.revenueHistory.map(snapshot => {
      let amount = 0;
      switch (category) {
        case 'tickets':
          amount = snapshot.ticketRevenue;
          break;
        case 'concessions':
          amount = snapshot.concessionRevenue;
          break;
        case 'parking':
          amount = snapshot.parkingRevenue;
          break;
        case 'vip':
          amount = snapshot.vipRevenue;
          break;
        case 'merchandise':
          amount = snapshot.merchRevenue;
          break;
      }
      
      return {
        tick: snapshot.tick,
        amount
      };
    });
  }

  /**
   * Format revenue amount for display
   */
  formatRevenue(amount: number): string {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M₡`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K₡`;
    } else {
      return `${Math.round(amount)}₡`;
    }
  }

  /**
   * Get revenue statistics summary
   */
  getRevenueSummary(): {
    total: string;
    breakdown: Array<{ category: string; amount: string; percentage: number }>;
    efficiency: {
      revenuePerAttendee: string;
      capacityUtilization: string;
    };
  } {
    const total = this.getTotalRevenue();
    const breakdown = [
      { category: 'Tickets', amount: this.formatRevenue(this.getTicketRevenue()), percentage: total > 0 ? (this.getTicketRevenue() / total) * 100 : 0 },
      { category: 'Concessions', amount: this.formatRevenue(this.getConcessionRevenue()), percentage: total > 0 ? (this.getConcessionRevenue() / total) * 100 : 0 },
      { category: 'VIP Suites', amount: this.formatRevenue(this.getVIPRevenue()), percentage: total > 0 ? (this.getVIPRevenue() / total) * 100 : 0 },
      { category: 'Parking', amount: this.formatRevenue(this.getParkingRevenue()), percentage: total > 0 ? (this.getParkingRevenue() / total) * 100 : 0 },
      { category: 'Merchandise', amount: this.formatRevenue(this.getMerchandiseRevenue()), percentage: total > 0 ? (this.getMerchandiseRevenue() / total) * 100 : 0 }
    ].sort((a, b) => b.percentage - a.percentage);

    return {
      total: this.formatRevenue(total),
      breakdown,
      efficiency: {
        revenuePerAttendee: this.formatRevenue(0), // Would need attendance data
        capacityUtilization: '0%' // Would need capacity data
      }
    };
  }

  /**
   * Check if revenue is meeting expectations
   */
  isPerformingWell(expectedRevenue: number): {
    isPerforming: boolean;
    variance: number;
    status: 'excellent' | 'good' | 'average' | 'poor';
  } {
    const actual = this.getTotalRevenue();
    const variance = ((actual - expectedRevenue) / expectedRevenue) * 100;
    
    let status: 'excellent' | 'good' | 'average' | 'poor';
    if (variance >= 20) status = 'excellent';
    else if (variance >= 10) status = 'good';
    else if (variance >= -10) status = 'average';
    else status = 'poor';

    return {
      isPerforming: variance >= 0,
      variance,
      status
    };
  }

  /**
   * Reset revenue tracking
   */
  reset() {
    this.revenueHistory = [];
    this.totalRevenue = 0;
    this.ticketRevenue = 0;
    this.concessionRevenue = 0;
    this.parkingRevenue = 0;
    this.vipRevenue = 0;
    this.merchRevenue = 0;
  }

  /**
   * Export revenue data for analysis
   */
  exportData(): {
    history: RevenueSnapshot[];
    totals: {
      total: number;
      tickets: number;
      concessions: number;
      parking: number;
      vip: number;
      merchandise: number;
    };
    metrics: {
      averagePerTick: number;
      peakTick: number;
      peakAmount: number;
    };
  } {
    const averagePerTick = this.revenueHistory.length > 0 ? 
      this.totalRevenue / this.revenueHistory.length : 0;
    
    const peakSnapshot = this.revenueHistory.reduce((max, current) => 
      current.totalRevenue > max.totalRevenue ? current : max, 
      { totalRevenue: 0, tick: 0 } as RevenueSnapshot
    );

    return {
      history: this.revenueHistory,
      totals: {
        total: this.getTotalRevenue(),
        tickets: this.getTicketRevenue(),
        concessions: this.getConcessionRevenue(),
        parking: this.getParkingRevenue(),
        vip: this.getVIPRevenue(),
        merchandise: this.getMerchandiseRevenue()
      },
      metrics: {
        averagePerTick,
        peakTick: peakSnapshot.tick,
        peakAmount: peakSnapshot.totalRevenue
      }
    };
  }
}