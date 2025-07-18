/**
 * Configuration Manager
 * Loads and manages YAML configuration files
 * Provides type-safe access to balance parameters
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';

interface SimulationConfig {
  injury_rates: {
    base_tackle: number;
    power_tackle_multiplier: number;
    trainer_reduction: number;
    morale_factor: number;
  };
  stamina: {
    depletion_rate: number;
    recovery_multiplier: number;
    attribute_bonus: number;
    minimum_loss: number;
  };
  contested_balls: {
    forced_rate: number;
    unforced_rate: number;
    recovery_bonus: number;
  };
  interceptions: {
    base_rate: number;
    coverage_bonus: number;
    pressure_bonus: number;
  };
  power_tackles: {
    threshold: number;
    bonus_damage: number;
    anything_goes_chance: number;
  };
}

interface CommentaryConfig {
  prompt_weights: {
    neutral: number;
    race_flavor: number;
    skill_flavor: number;
    contextual: number;
    late_game: number;
  };
  race_commentary_chance: number;
}

interface StadiumConfig {
  home_field: {
    base_advantage: number;
    max_advantage: number;
    capacity_factor: number;
    loyalty_multiplier: number;
  };
  crowd_effects: {
    noise_penalty: number;
    intimidation_bonus: number;
    morale_boost: number;
  };
  atmosphere: {
    attendance_loyalty_factor: number;
    max_attendance_rate: number;
    min_attendance_rate: number;
  };
}

interface PlayerProgressionConfig {
  daily_progression: {
    base_chance: number;
    age_modifier: number;
    usage_bonus: number;
  };
  season_progression: {
    base_chance: number;
    potential_multiplier: number;
    trainer_bonus: number;
  };
  aging: {
    decline_start_age: number;
    decline_rate: number;
    retirement_age: number;
  };
}

interface EconomyConfig {
  marketplace: {
    listing_fee: number;
    max_listings: number;
    anti_snipe_time: number;
  };
  stadium_revenue: {
    ticket_price: number;
    concession_multiplier: number;
    parking_rate: number;
    parking_price: number;
  };
}

export interface GameConfig {
  simulation: SimulationConfig;
  commentary: CommentaryConfig;
  stadium: StadiumConfig;
  player_progression: PlayerProgressionConfig;
  economy: EconomyConfig;
  version: string;
  last_updated: string;
}

class ConfigManager {
  private config: GameConfig | null = null;
  private configPath: string;

  constructor(configPath: string = 'config/balance.yml') {
    this.configPath = configPath;
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      const fullPath = join(process.cwd(), this.configPath);
      
      if (!existsSync(fullPath)) {
        console.warn(`Config file not found at ${fullPath}, using defaults`);
        this.config = this.getDefaultConfig();
        return;
      }

      const fileContents = readFileSync(fullPath, 'utf8');
      this.config = yaml.load(fileContents) as GameConfig;
      
      console.log(`✓ Loaded configuration from ${this.configPath}`);
      console.log(`  Version: ${this.config.version}`);
      console.log(`  Last updated: ${this.config.last_updated}`);
      
    } catch (error) {
      console.error(`Error loading config file: ${error}`);
      this.config = this.getDefaultConfig();
    }
  }

  private getDefaultConfig(): GameConfig {
    return {
      simulation: {
        injury_rates: {
          base_tackle: 0.03,
          power_tackle_multiplier: 1.5,
          trainer_reduction: 0.15,
          morale_factor: 0.1
        },
        stamina: {
          depletion_rate: 0.8,
          recovery_multiplier: 1.2,
          attribute_bonus: 0.3,
          minimum_loss: 5
        },
        contested_balls: {
          forced_rate: 0.12,
          unforced_rate: 0.05,
          recovery_bonus: 0.2
        },
        interceptions: {
          base_rate: 0.018,
          coverage_bonus: 0.01,
          pressure_bonus: 0.005
        },
        power_tackles: {
          threshold: 30,
          bonus_damage: 0.5,
          anything_goes_chance: 0.1
        }
      },
      commentary: {
        prompt_weights: {
          neutral: 1.0,
          race_flavor: 0.6,
          skill_flavor: 0.8,
          contextual: 1.2,
          late_game: 1.5
        },
        race_commentary_chance: 0.15
      },
      stadium: {
        home_field: {
          base_advantage: 0.03,
          max_advantage: 0.09,
          capacity_factor: 0.0001,
          loyalty_multiplier: 0.8
        },
        crowd_effects: {
          noise_penalty: 0.02,
          intimidation_bonus: 0.01,
          morale_boost: 0.15
        },
        atmosphere: {
          attendance_loyalty_factor: 0.7,
          max_attendance_rate: 0.95,
          min_attendance_rate: 0.35
        }
      },
      player_progression: {
        daily_progression: {
          base_chance: 0.01,
          age_modifier: 0.001,
          usage_bonus: 0.005
        },
        season_progression: {
          base_chance: 0.3,
          potential_multiplier: 0.1,
          trainer_bonus: 0.05
        },
        aging: {
          decline_start_age: 31,
          decline_rate: 0.025,
          retirement_age: 45
        }
      },
      economy: {
        marketplace: {
          listing_fee: 0.02,
          max_listings: 3,
          anti_snipe_time: 300
        },
        stadium_revenue: {
          ticket_price: 25,
          concession_multiplier: 8,
          parking_rate: 0.3,
          parking_price: 10
        }
      },
      version: "1.0.0",
      last_updated: "2025-07-18"
    };
  }

  public getConfig(): GameConfig {
    if (!this.config) {
      this.loadConfig();
    }
    return this.config!;
  }

  public reloadConfig(): void {
    this.loadConfig();
  }

  // Convenience methods for accessing specific config sections
  public getSimulation(): SimulationConfig {
    return this.getConfig().simulation;
  }

  public getCommentary(): CommentaryConfig {
    return this.getConfig().commentary;
  }

  public getStadium(): StadiumConfig {
    return this.getConfig().stadium;
  }

  public getPlayerProgression(): PlayerProgressionConfig {
    return this.getConfig().player_progression;
  }

  public getEconomy(): EconomyConfig {
    return this.getConfig().economy;
  }
}

// Export singleton instance
export const configManager = new ConfigManager();
export default configManager;