/**
 * ANTI-PAY-TO-WIN VERIFICATION SERVICE
 * Ensures all store items and systems follow fair gameplay principles
 * As per Game Mechanics Doc: "All items that grant permanent stat increases or bypass core game loops are REMOVED"
 */

import { DatabaseService } from '../database/DatabaseService.js';
import { logger } from './loggingService.js';
import storeConfig from '../../config/store_config.json' assert { type: 'json' };

export interface PayToWinViolation {
  itemId: string;
  itemName: string;
  violationType: 'PERMANENT_STAT_BOOST' | 'BYPASS_PROGRESSION' | 'BYPASS_CORE_LOOP' | 'EXCLUSIVE_ADVANTAGE' | 'TIME_SKIP';
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendation: string;
}

export interface AntiPayToWinReport {
  compliant: boolean;
  violations: PayToWinViolation[];
  summary: {
    totalItems: number;
    compliantItems: number;
    violatingItems: number;
    severityCounts: Record<string, number>;
  };
  storeHealthScore: number; // 0-100
}

export interface StoreItemAnalysis {
  itemId: string;
  itemName: string;
  category: string;
  price: number;
  gemsPrice?: number;
  effect: string;
  isCompliant: boolean;
  complianceNotes: string[];
}

/**
 * Anti-Pay-to-Win Service
 */
export class AntiPayToWinService {
  
  /**
   * Prohibited item patterns that violate fair play
   */
  static readonly PROHIBITED_PATTERNS = {
    PERMANENT_STAT_BOOSTS: [
      /permanent.*stat/i,
      /forever.*boost/i,
      /eternal.*enhancement/i,
      /lasting.*increase/i
    ],
    
    PROGRESSION_BYPASSES: [
      /skip.*training/i,
      /instant.*level/i,
      /bypass.*progression/i,
      /accelerate.*development/i
    ],
    
    CORE_LOOP_BYPASSES: [
      /skip.*game/i,
      /instant.*win/i,
      /auto.*play/i,
      /skip.*season/i,
      /instant.*tournament/i
    ],
    
    EXCLUSIVE_ADVANTAGES: [
      /premium.*only.*stat/i,
      /exclusive.*ability/i,
      /vip.*bonus/i,
      /subscriber.*advantage/i
    ]
  };

  /**
   * Allowed item types that maintain fair gameplay
   */
  static readonly ALLOWED_ITEM_TYPES = {
    TEMPORARY_CONSUMABLES: {
      description: 'Items that provide temporary effects (single game/match)',
      examples: ['energy_drink', 'performance_boost', 'recovery_serum'],
      maxDuration: 'single_game'
    },
    
    EQUIPMENT: {
      description: 'Purchasable with credits, cosmetic or minor gameplay effects',
      examples: ['helmets', 'armor', 'gloves'],
      requiresCredits: true
    },
    
    RECOVERY_ITEMS: {
      description: 'Items that speed up natural recovery processes',
      examples: ['medical_kit', 'injury_treatment'],
      replacesTimeNotProgression: true
    },
    
    TOURNAMENT_ENTRIES: {
      description: 'Additional opportunities, not guaranteed wins',
      examples: ['exhibition_entry', 'tournament_ticket'],
      providesOpportunityNotOutcome: true
    },
    
    COSMETICS: {
      description: 'Pure cosmetic items with no gameplay impact',
      examples: ['cosmetic_helms', 'team_colors'],
      gameplayImpact: 'none'
    }
  };

  /**
   * Comprehensive store analysis for pay-to-win violations
   */
  static analyzeStoreForPayToWin(): AntiPayToWinReport {
    const violations: PayToWinViolation[] = [];
    const itemAnalyses: StoreItemAnalysis[] = [];

    // Analyze equipment items
    if (storeConfig.storeSections.equipment) {
      for (const item of storeConfig.storeSections.equipment) {
        const analysis = this.analyzeEquipmentItem(item);
        itemAnalyses.push(analysis);
        
        if (!analysis.isCompliant) {
          violations.push(this.createViolation(item, analysis.complianceNotes));
        }
      }
    }

    // Analyze consumable items
    if (storeConfig.storeSections.consumables) {
      for (const item of storeConfig.storeSections.consumables) {
        const analysis = this.analyzeConsumableItem(item);
        itemAnalyses.push(analysis);
        
        if (!analysis.isCompliant) {
          violations.push(this.createViolation(item, analysis.complianceNotes));
        }
      }
    }

    // Analyze gem packages
    if (storeConfig.storeSections.gemPackages) {
      for (const item of storeConfig.storeSections.gemPackages) {
        const analysis = this.analyzeGemPackage(item);
        itemAnalyses.push(analysis);
        
        if (!analysis.isCompliant) {
          violations.push(this.createViolation(item, analysis.complianceNotes));
        }
      }
    }

    // Calculate summary
    const totalItems = itemAnalyses.length;
    const compliantItems = itemAnalyses.filter(i => i.isCompliant).length;
    const violatingItems = violations.length;

    const severityCounts = {
      LOW: violations.filter(v => v.severity === 'LOW').length,
      MEDIUM: violations.filter(v => v.severity === 'MEDIUM').length,
      HIGH: violations.filter(v => v.severity === 'HIGH').length,
      CRITICAL: violations.filter(v => v.severity === 'CRITICAL').length
    };

    // Calculate health score (0-100)
    const baseScore = (compliantItems / Math.max(totalItems, 1)) * 100;
    const severityPenalty = (severityCounts.CRITICAL * 25) + (severityCounts.HIGH * 15) + (severityCounts.MEDIUM * 10) + (severityCounts.LOW * 5);
    const storeHealthScore = Math.max(0, Math.round(baseScore - severityPenalty));

    return {
      compliant: violations.length === 0,
      violations,
      summary: {
        totalItems,
        compliantItems,
        violatingItems,
        severityCounts
      },
      storeHealthScore
    };
  }

  /**
   * Analyze equipment item for compliance
   */
  private static analyzeEquipmentItem(item: any): StoreItemAnalysis {
    const complianceNotes: string[] = [];
    let isCompliant = true;

    // Check if available for credits (required for equipment)
    if (!item.price || item.price === 0) {
      if (!item.priceGems || item.priceGems === 0) {
        complianceNotes.push('❌ Equipment must be purchasable with credits');
        isCompliant = false;
      } else if (item.price === 0) {
        complianceNotes.push('⚠️ Equipment should be purchasable with credits, not only gems');
        // This is medium severity - cosmetic items can be gem-only
      }
    } else {
      complianceNotes.push('✅ Available for credits');
    }

    // Check stat boosts are reasonable (not permanent mega-boosts)
    if (item.statBoosts) {
      const maxBoost = Math.max(...Object.values(item.statBoosts as Record<string, number>));
      if (maxBoost > 15) {
        complianceNotes.push('❌ Stat boost too high (>15 points)');
        isCompliant = false;
      } else if (maxBoost > 10) {
        complianceNotes.push('⚠️ High stat boost - ensure it\'s for high-tier equipment');
      } else {
        complianceNotes.push('✅ Reasonable stat boost');
      }
    }

    // Check for race restrictions (these are fine)
    if (item.raceRestriction && item.raceRestriction !== 'universal') {
      complianceNotes.push('ℹ️ Race-restricted (acceptable for gameplay variety)');
    }

    return {
      itemId: item.id,
      itemName: item.name,
      category: item.category || 'equipment',
      price: item.price || 0,
      gemsPrice: item.priceGems,
      effect: this.describeEquipmentEffect(item),
      isCompliant,
      complianceNotes
    };
  }

  /**
   * Analyze consumable item for compliance
   */
  private static analyzeConsumableItem(item: any): StoreItemAnalysis {
    const complianceNotes: string[] = [];
    let isCompliant = true;

    // Check if available for credits
    if (!item.price || item.price === 0) {
      complianceNotes.push('❌ Consumables must be purchasable with credits');
      isCompliant = false;
    } else {
      complianceNotes.push('✅ Available for credits');
    }

    // Check effect type
    if (item.effect) {
      if (item.effect.includes('team_') && !item.effect.includes('permanent')) {
        complianceNotes.push('✅ Temporary team effect (single game)');
      } else if (item.effect.includes('restore_')) {
        complianceNotes.push('✅ Recovery effect (accelerates natural healing)');
      } else if (item.effect.includes('reduce_injury')) {
        complianceNotes.push('✅ Injury recovery (accelerates natural healing)');
      } else if (item.effect.includes('permanent') || item.effect.includes('forever')) {
        complianceNotes.push('❌ Permanent effect violates fair play');
        isCompliant = false;
      } else {
        complianceNotes.push('ℹ️ Effect type unclear - manual review needed');
      }
    }

    // Check pricing is reasonable
    if (item.priceGems && item.priceGems > 100) {
      complianceNotes.push('⚠️ High gem price - ensure consumable is appropriately valuable');
    }

    return {
      itemId: item.id,
      itemName: item.name,
      category: item.category || 'consumable',
      price: item.price || 0,
      gemsPrice: item.priceGems,
      effect: item.effect || 'unknown',
      isCompliant,
      complianceNotes
    };
  }

  /**
   * Analyze gem package for compliance
   */
  private static analyzeGemPackage(item: any): StoreItemAnalysis {
    const complianceNotes: string[] = [];
    let isCompliant = true;

    // Gem packages themselves are fine, but check bonus ratios
    if (item.bonusGems && item.gems) {
      const bonusPercentage = (item.bonusGems / item.gems) * 100;
      
      if (bonusPercentage > 100) {
        complianceNotes.push('⚠️ Very high bonus percentage - may encourage excessive spending');
      } else if (bonusPercentage > 50) {
        complianceNotes.push('ℹ️ High bonus percentage - acceptable for value packs');
      } else {
        complianceNotes.push('✅ Reasonable bonus percentage');
      }
    }

    // Check price points are reasonable
    if (item.price > 100) {
      complianceNotes.push('⚠️ Very high price point - ensure appropriate for whales only');
    } else {
      complianceNotes.push('✅ Reasonable price point');
    }

    complianceNotes.push('✅ Gem packages are acceptable (currency conversion)');

    return {
      itemId: item.id,
      itemName: item.name,
      category: 'gem_package',
      price: item.price || 0,
      gemsPrice: 0,
      effect: `${item.gems + (item.bonusGems || 0)} gems for $${item.price}`,
      isCompliant,
      complianceNotes
    };
  }

  /**
   * Create violation object
   */
  private static createViolation(item: any, complianceNotes: string[]): PayToWinViolation {
    const criticalNotes = complianceNotes.filter(n => n.startsWith('❌'));
    const warningNotes = complianceNotes.filter(n => n.startsWith('⚠️'));

    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    let violationType: PayToWinViolation['violationType'] = 'EXCLUSIVE_ADVANTAGE';
    
    if (criticalNotes.length > 0) {
      severity = 'CRITICAL';
      
      // Determine violation type based on notes
      const combinedNotes = criticalNotes.join(' ').toLowerCase();
      if (combinedNotes.includes('permanent')) {
        violationType = 'PERMANENT_STAT_BOOST';
      } else if (combinedNotes.includes('bypass') || combinedNotes.includes('skip')) {
        violationType = 'BYPASS_CORE_LOOP';
      } else if (combinedNotes.includes('progression')) {
        violationType = 'BYPASS_PROGRESSION';
      }
    } else if (warningNotes.length > 0) {
      severity = 'MEDIUM';
    }

    return {
      itemId: item.id,
      itemName: item.name,
      violationType,
      description: criticalNotes.concat(warningNotes).join(', '),
      severity,
      recommendation: this.getRecommendation(violationType, severity)
    };
  }

  /**
   * Get recommendation for violation type
   */
  private static getRecommendation(type: PayToWinViolation['violationType'], severity: string): string {
    switch (type) {
      case 'PERMANENT_STAT_BOOST':
        return 'Remove permanent stat increases. Replace with temporary single-game boosts or equipment with reasonable stats.';
      case 'BYPASS_PROGRESSION':
        return 'Remove progression shortcuts. Players should earn development through gameplay.';
      case 'BYPASS_CORE_LOOP':
        return 'Remove core gameplay bypasses. All players should engage with core game mechanics.';
      case 'EXCLUSIVE_ADVANTAGE':
        return 'Make items available for credits or reduce to cosmetic-only effects.';
      case 'TIME_SKIP':
        return 'Replace time skips with items that accelerate natural recovery/healing processes.';
      default:
        if (severity === 'CRITICAL') {
          return 'Remove this item completely as it violates fair play principles.';
        } else {
          return 'Review item pricing and availability to ensure fairness.';
        }
    }
  }

  /**
   * Describe equipment effect
   */
  private static describeEquipmentEffect(item: any): string {
    if (item.statBoosts) {
      const boosts = Object.entries(item.statBoosts as Record<string, number>)
        .map(([stat, value]) => `${stat}:${value > 0 ? '+' : ''}${value}`)
        .join(', ');
      return `Stat boosts: ${boosts}`;
    }
    return 'Equipment with unspecified effects';
  }

  /**
   * Verify gem exchange rates are anti-pay-to-win
   */
  static verifyGemExchangeRates(): {
    compliant: boolean;
    analysis: string[];
    exchangeRates: Array<{ gems: number; credits: number; ratio: string; assessment: string; }>;
  } {
    const analysis: string[] = [];
    const exchangeRates = [];

    if (storeConfig.gemExchangeRates) {
      for (const rate of storeConfig.gemExchangeRates) {
        const ratio = rate.credits / rate.gems;
        let assessment = '';

        if (ratio > 500) {
          assessment = '❌ CRITICAL: Exchange rate too generous - promotes pay-to-win';
        } else if (ratio > 350) {
          assessment = '⚠️ HIGH: Exchange rate very generous - monitor for pay-to-win impact';
        } else if (ratio > 200) {
          assessment = '✅ GOOD: Reasonable exchange rate - anti-pay-to-win compliant';
        } else {
          assessment = 'ℹ️ LOW: Conservative exchange rate - very anti-pay-to-win';
        }

        exchangeRates.push({
          gems: rate.gems,
          credits: rate.credits,
          ratio: `1:${ratio}`,
          assessment
        });

        analysis.push(`${rate.gems} gems → ${rate.credits.toLocaleString()} credits (${assessment})`);
      }
    }

    const criticalIssues = exchangeRates.filter(r => r.assessment.startsWith('❌'));
    const compliant = criticalIssues.length === 0;

    if (compliant) {
      analysis.unshift('✅ OVERALL: Exchange rates are anti-pay-to-win compliant');
    } else {
      analysis.unshift('❌ OVERALL: Exchange rates have pay-to-win violations');
    }

    return {
      compliant,
      analysis,
      exchangeRates
    };
  }

  /**
   * Generate comprehensive anti-pay-to-win report
   */
  static generateComprehensiveReport(): {
    storeAnalysis: AntiPayToWinReport;
    exchangeRateAnalysis: ReturnType<typeof AntiPayToWinService.verifyGemExchangeRates>;
    overallCompliance: boolean;
    recommendations: string[];
  } {
    const storeAnalysis = this.analyzeStoreForPayToWin();
    const exchangeRateAnalysis = this.verifyGemExchangeRates();

    const overallCompliance = storeAnalysis.compliant && exchangeRateAnalysis.compliant;

    const recommendations: string[] = [];

    if (!storeAnalysis.compliant) {
      recommendations.push('🛒 STORE: Address store item violations listed in detailed analysis');
      
      const criticalViolations = storeAnalysis.violations.filter(v => v.severity === 'CRITICAL');
      if (criticalViolations.length > 0) {
        recommendations.push(`🚨 URGENT: ${criticalViolations.length} critical pay-to-win violations must be fixed immediately`);
      }
    }

    if (!exchangeRateAnalysis.compliant) {
      recommendations.push('💎 EXCHANGE: Reduce gem-to-credit exchange rates to prevent pay-to-win advantages');
    }

    if (overallCompliance) {
      recommendations.push('🌟 EXCELLENT: Your store maintains fair play principles and prevents pay-to-win mechanics');
      recommendations.push('💡 MAINTAIN: Continue monitoring new items and features for pay-to-win compliance');
    }

    // Add monitoring recommendations
    recommendations.push('📊 MONITORING: Regularly analyze player spending patterns to ensure balance');
    recommendations.push('🔄 REVIEW: Quarterly review of all store items and pricing for continued compliance');

    return {
      storeAnalysis,
      exchangeRateAnalysis,
      overallCompliance,
      recommendations
    };
  }

  /**
   * Log compliance report to system
   */
  static async logComplianceReport(): Promise<void> {
    const report = this.generateComprehensiveReport();
    
    logger.info('Anti-Pay-to-Win Compliance Report', {
      overallCompliance: report.overallCompliance,
      storeHealthScore: report.storeAnalysis.storeHealthScore,
      violationCount: report.storeAnalysis.violations.length,
      criticalViolations: report.storeAnalysis.violations.filter(v => v.severity === 'CRITICAL').length,
      exchangeRateCompliance: report.exchangeRateAnalysis.compliant
    });

    // Log critical violations separately
    const criticalViolations = report.storeAnalysis.violations.filter(v => v.severity === 'CRITICAL');
    if (criticalViolations.length > 0) {
      logger.error('Critical Pay-to-Win Violations Detected', {
        violations: criticalViolations.map(v => ({
          item: v.itemName,
          type: v.violationType,
          description: v.description
        }))
      });
    }
  }
}

export default AntiPayToWinService;