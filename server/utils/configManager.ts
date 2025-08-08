/**
 * Configuration Manager for Stadium Systems
 * Loads and caches configuration from JSON files
 */

import * as fs from 'fs.js';
import * as path from 'path.js';

interface ConfigCache {
  [key: string]: any;
}

class ConfigManager {
  private cache: ConfigCache = {};
  private configDir: string;

  constructor() {
    this.configDir = path.join(process.cwd(), 'config');
  }

  /**
   * Load configuration from JSON file with caching
   */
  private loadConfig(filename: string): any {
    const cacheKey = filename;
    
    if (this.cache[cacheKey]) {
      return this.cache[cacheKey];
    }

    try {
      const configPath = path.join(this.configDir, filename);
      const configData = fs.readFileSync(configPath, 'utf8');
      const parsedConfig = JSON.parse(configData);
      
      // Cache the configuration
      this.cache[cacheKey] = parsedConfig;
      
      console.log(`✓ Loaded configuration from ${filename}`);
      console.log(`  Version: ${parsedConfig.version || 'Unknown'}`);
      console.log(`  Last updated: ${parsedConfig.lastUpdated || 'Unknown'}`);
      
      return parsedConfig;
    } catch (error) {
      console.error(`Failed to load config ${filename}:`, error);
      throw new Error(`Configuration file ${filename} could not be loaded`);
    }
  }

  /**
   * Get stadium configuration
   */
  getStadium(): any {
    return this.loadConfig('stadium_config.json');
  }

  /**
   * Get balance configuration (if exists)
   */
  getBalance(): any {
    try {
      return this.loadConfig('balance.yml');
    } catch (error) {
      console.warn('Balance config not found, using defaults');
      return {};
    }
  }

  /**
   * Reload configuration (clear cache)
   */
  reload(): void {
    this.cache = {};
    console.log('Configuration cache cleared');
  }

  /**
   * Get specific facility configuration
   */
  getFacilityConfig(facilityName: string): any {
    const stadiumConfig = this.getStadium();
    return stadiumConfig.facilities?.[facilityName] || null;
  }

  /**
   * Get upgrade cost for facility level
   */
  getFacilityUpgradeCost(facilityName: string, currentLevel: number): number {
    const facilityConfig = this.getFacilityConfig(facilityName);
    if (!facilityConfig) return 0;

    const nextLevel = currentLevel + 1;
    if (nextLevel > facilityConfig.max_level) return 0;

    // Check if upgrade_costs array exists
    if (facilityConfig.upgrade_costs) {
      const levelCost = facilityConfig.upgrade_costs.find((cost: any) => cost.level === nextLevel);
      return levelCost?.cost || 0;
    }

    // Fallback to formula-based calculation
    const baseCost = facilityConfig.base_cost || 10000;
    const multiplier = facilityConfig.cost_multiplier || 1.25;
    return Math.floor(baseCost * Math.pow(multiplier, currentLevel));
  }

  /**
   * Get maintenance cost calculation
   */
  getMaintenanceCost(stadium: any): number {
    const config = this.getStadium();
    const maintenanceConfig = config.maintenance;

    let totalCost = maintenanceConfig.base_daily_cost || 5000;
    
    // Add capacity-based costs
    const capacityCost = Math.floor((stadium.capacity || 5000) / 1000) * (maintenanceConfig.cost_per_1000_capacity || 500);
    totalCost += capacityCost;

    // Add facility-specific maintenance
    const facilityMultipliers = maintenanceConfig.facility_maintenance_multiplier || {};
    
    Object.keys(facilityMultipliers).forEach(facility => {
      const level = stadium[`${facility}Level`] || 0;
      const multiplier = facilityMultipliers[facility] || 0;
      totalCost += level * multiplier;
    });

    return Math.floor(totalCost);
  }

  /**
   * Get capacity expansion cost
   */
  getCapacityExpansionCost(currentCapacity: number, targetCapacity: number): number {
    const config = this.getStadium();
    const expansionConfig = config.capacity_expansion;

    const targetTier = expansionConfig.tiers.find((tier: any) => tier.capacity === targetCapacity);
    return targetTier?.cost || 0;
  }
}

// Export singleton instance
export const configManager = new ConfigManager();