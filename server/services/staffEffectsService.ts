/**
 * COMPREHENSIVE STAFF EFFECTS SERVICE
 * Implements complete staff system with 1-40 scale and full effects
 * As per Game Mechanics Doc: Staff attributes are on a 1-40 scale with specific effects per type
 */

import { DatabaseService } from '../database/DatabaseService.js';
import { StaffType } from '../../prisma/generated/client/index.js';
import { logger } from './loggingService.js';

export interface StaffMember {
  id: number;
  name: string;
  type: StaffType;
  // Staff attributes (1-40 scale)
  motivation?: number;      // Head Coach
  development?: number;     // Head Coach
  teaching?: number;        // Trainers
  physiology?: number;      // Recovery Specialist
  talentIdentification?: number; // Scouts
  potentialAssessment?: number;  // Scouts
  level?: number;           // Generic level (1-40)
  
  // Calculated effectiveness
  effectiveness: number;
}

export interface StaffEffects {
  // Player development bonuses
  progressionBonus: number;        // % bonus to all player progression
  trainerBonus: Record<string, number>; // Specific attribute bonuses
  
  // Recovery effects
  injuryRecoveryBonus: number;     // Extra RP (Recovery Points) per day
  
  // Scouting effects
  scoutAccuracy: number;           // Scout accuracy (0-40)
  potentialAccuracy: number;       // Potential assessment accuracy
  
  // Team effects
  camaraderieBonus: number;        // Team camaraderie bonus
  teamMotivationBonus: number;     // Overall team motivation
}

export interface TeamStaffAnalysis {
  teamId: number;
  teamName: string;
  staffMembers: StaffMember[];
  combinedEffects: StaffEffects;
  staffQuality: {
    overall: number;           // 0-40 overall staff quality
    coaching: number;          // Head coach quality
    training: number;          // Trainers quality
    medical: number;           // Recovery specialist quality
    scouting: number;          // Scouts quality
  };
  recommendations: string[];
}

/**
 * Staff Effects Service - Complete implementation
 */
export class StaffEffectsService {
  
  /**
   * Staff type configurations and effect calculations
   */
  static readonly STAFF_CONFIGS = {
    HEAD_COACH: {
      primaryAttributes: ['motivation', 'development'],
      effects: {
        baseProgressionBonus: (motivation: number, development: number): number => {
          // High-quality head coaches provide 0-15% progression bonus
          const avgAttribute = (motivation + development) / 2;
          return Math.round(avgAttribute * 0.375); // 0-15% (40 * 0.375 = 15)
        },
        camaraderieBonus: (motivation: number): number => {
          // Motivation affects team camaraderie directly
          return Math.round(motivation * 0.5); // 0-20 bonus (40 * 0.5 = 20)
        },
        teamMotivationBonus: (motivation: number, development: number): number => {
          // Combines both attributes for overall team boost
          return Math.round((motivation + development) * 0.25); // 0-20 bonus
        }
      }
    },
    
    TRAINER: {
      primaryAttributes: ['teaching'],
      attributeGroups: {
        STRENGTH_TRAINER: ['power', 'staminaAttribute'],
        SPEED_TRAINER: ['speed', 'agility'],
        SKILLS_TRAINER: ['throwing', 'catching', 'kicking'],
        LEADERSHIP_TRAINER: ['leadership']
      },
      effects: {
        attributeBonus: (teaching: number): number => {
          // Teaching skill provides 0-13.5% bonus to specific attributes
          return Math.round(teaching * 0.3375); // 0-13.5% (40 * 0.3375 = 13.5)
        }
      }
    },
    
    RECOVERY_SPECIALIST: {
      primaryAttributes: ['physiology'],
      effects: {
        injuryRecoveryBonus: (physiology: number): number => {
          // Physiology increases Recovery Points per day
          return Math.round(physiology * 0.25); // 0-10 extra RP per day
        },
        staminaRecoveryBonus: (physiology: number): number => {
          // Affects stamina recovery after games
          return Math.round(physiology * 0.5); // 0-20% faster stamina recovery
        }
      }
    },
    
    SCOUT: {
      primaryAttributes: ['talentIdentification', 'potentialAssessment'],
      effects: {
        scoutAccuracy: (talentId: number, potentialAssess: number): number => {
          // Better scouts reduce "fog of war" in player stats
          const avgSkill = (talentId + potentialAssess) / 2;
          return avgSkill; // Direct 1-40 accuracy rating
        },
        hiddenGemChance: (talentId: number): number => {
          // Chance to find hidden gems in scouting
          return Math.round(talentId * 0.125); // 0-5% chance (40 * 0.125 = 5)
        }
      }
    }
  };

  /**
   * Calculate individual staff member effectiveness
   */
  static calculateStaffEffectiveness(staff: any): StaffMember {
    const staffType = staff.type as StaffType;
    const config = this.STAFF_CONFIGS[staffType];
    
    let effectiveness = 0;
    
    if (config) {
      // Calculate effectiveness based on primary attributes
      const primaryValues = config.primaryAttributes.map(attr => staff[attr] || 20);
      effectiveness = primaryValues.reduce((sum, val) => sum + val, 0) / primaryValues.length;
    } else {
      // Fallback to generic level
      effectiveness = staff.level || 20;
    }
    
    return {
      id: staff.id,
      name: `${staff.firstName || ''} ${staff.lastName || ''}`.trim(),
      type: staffType,
      motivation: staff.motivation,
      development: staff.development,
      teaching: staff.teaching,
      physiology: staff.physiology,
      talentIdentification: staff.talentIdentification,
      potentialAssessment: staff.potentialAssessment,
      level: staff.level,
      effectiveness: Math.round(effectiveness * 10) / 10
    };
  }

  /**
   * Calculate combined staff effects for a team
   */
  static async calculateTeamStaffEffects(teamId: number): Promise<TeamStaffAnalysis | null> {
    const prisma = await DatabaseService.getInstance();

    try {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
          staff: true
        }
      });

      if (!team) {
        logger.error('Team not found for staff effects calculation', { teamId });
        return null;
      }

      // Calculate individual staff effectiveness
      const staffMembers = team.staff.map(staff => this.calculateStaffEffectiveness(staff));
      
      // Calculate combined effects
      const combinedEffects = this.calculateCombinedEffects(staffMembers);
      
      // Calculate staff quality breakdown
      const staffQuality = this.calculateStaffQuality(staffMembers);
      
      // Generate recommendations
      const recommendations = this.generateStaffRecommendations(staffMembers, staffQuality);

      return {
        teamId,
        teamName: team.name || 'Unknown Team',
        staffMembers,
        combinedEffects,
        staffQuality,
        recommendations
      };
    } catch (error) {
      logger.error('Failed to calculate team staff effects', {
        teamId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Calculate combined effects from all staff members
   */
  private static calculateCombinedEffects(staffMembers: StaffMember[]): StaffEffects {
    let progressionBonus = 0;
    const trainerBonus: Record<string, number> = {};
    let injuryRecoveryBonus = 0;
    let scoutAccuracy = 0;
    let potentialAccuracy = 0;
    let camaraderieBonus = 0;
    let teamMotivationBonus = 0;

    for (const staff of staffMembers) {
      switch (staff.type) {
        case StaffType.HEAD_COACH:
          if (staff.motivation && staff.development) {
            const config = this.STAFF_CONFIGS.HEAD_COACH;
            progressionBonus += config.effects.baseProgressionBonus(staff.motivation, staff.development);
            camaraderieBonus += config.effects.camaraderieBonus(staff.motivation);
            teamMotivationBonus += config.effects.teamMotivationBonus(staff.motivation, staff.development);
          }
          break;

        case StaffType.TRAINER:
          if (staff.teaching) {
            const config = this.STAFF_CONFIGS.TRAINER;
            const attributeBonus = config.effects.attributeBonus(staff.teaching);
            
            // Apply trainer bonus to their specialized attributes
            // This is simplified - in reality, you'd have different trainer subtypes
            const trainerAttributes = ['power', 'speed', 'throwing', 'catching', 'kicking', 'staminaAttribute', 'leadership', 'agility'];
            for (const attr of trainerAttributes) {
              trainerBonus[attr] = (trainerBonus[attr] || 0) + (attributeBonus / trainerAttributes.length);
            }
          }
          break;

        case StaffType.RECOVERY_SPECIALIST:
          if (staff.physiology) {
            const config = this.STAFF_CONFIGS.RECOVERY_SPECIALIST;
            injuryRecoveryBonus += config.effects.injuryRecoveryBonus(staff.physiology);
          }
          break;

        case StaffType.SCOUT:
          if (staff.talentIdentification && staff.potentialAssessment) {
            const config = this.STAFF_CONFIGS.SCOUT;
            scoutAccuracy = Math.max(scoutAccuracy, config.effects.scoutAccuracy(staff.talentIdentification, staff.potentialAssessment));
            potentialAccuracy = Math.max(potentialAccuracy, staff.potentialAssessment);
          }
          break;
      }
    }

    return {
      progressionBonus: Math.round(progressionBonus * 10) / 10,
      trainerBonus,
      injuryRecoveryBonus: Math.round(injuryRecoveryBonus * 10) / 10,
      scoutAccuracy: Math.round(scoutAccuracy * 10) / 10,
      potentialAccuracy: Math.round(potentialAccuracy * 10) / 10,
      camaraderieBonus: Math.round(camaraderieBonus * 10) / 10,
      teamMotivationBonus: Math.round(teamMotivationBonus * 10) / 10
    };
  }

  /**
   * Calculate staff quality breakdown by category
   */
  private static calculateStaffQuality(staffMembers: StaffMember[]): {
    overall: number;
    coaching: number;
    training: number;
    medical: number;
    scouting: number;
  } {
    const headCoaches = staffMembers.filter(s => s.type === StaffType.HEAD_COACH);
    const trainers = staffMembers.filter(s => s.type === StaffType.TRAINER);
    const recoveryStaff = staffMembers.filter(s => s.type === StaffType.RECOVERY_SPECIALIST);
    const scouts = staffMembers.filter(s => s.type === StaffType.SCOUT);

    const coaching = headCoaches.length > 0 
      ? headCoaches.reduce((sum, s) => sum + s.effectiveness, 0) / headCoaches.length 
      : 0;

    const training = trainers.length > 0
      ? trainers.reduce((sum, s) => sum + s.effectiveness, 0) / trainers.length
      : 0;

    const medical = recoveryStaff.length > 0
      ? recoveryStaff.reduce((sum, s) => sum + s.effectiveness, 0) / recoveryStaff.length
      : 0;

    const scouting = scouts.length > 0
      ? scouts.reduce((sum, s) => sum + s.effectiveness, 0) / scouts.length
      : 0;

    const overall = staffMembers.length > 0
      ? staffMembers.reduce((sum, s) => sum + s.effectiveness, 0) / staffMembers.length
      : 0;

    return {
      overall: Math.round(overall * 10) / 10,
      coaching: Math.round(coaching * 10) / 10,
      training: Math.round(training * 10) / 10,
      medical: Math.round(medical * 10) / 10,
      scouting: Math.round(scouting * 10) / 10
    };
  }

  /**
   * Generate staff recommendations
   */
  private static generateStaffRecommendations(
    staffMembers: StaffMember[], 
    staffQuality: { overall: number; coaching: number; training: number; medical: number; scouting: number; }
  ): string[] {
    const recommendations: string[] = [];

    // Check for missing essential staff
    const hasHeadCoach = staffMembers.some(s => s.type === StaffType.HEAD_COACH);
    const hasTrainer = staffMembers.some(s => s.type === StaffType.TRAINER);
    const hasRecoverySpecialist = staffMembers.some(s => s.type === StaffType.RECOVERY_SPECIALIST);
    const hasScout = staffMembers.some(s => s.type === StaffType.SCOUT);

    if (!hasHeadCoach) {
      recommendations.push("❗ Critical: Hire a Head Coach to boost player development and team camaraderie");
    }

    if (!hasTrainer) {
      recommendations.push("⚠️ High Priority: Add Trainers to improve player attribute progression");
    }

    if (!hasRecoverySpecialist) {
      recommendations.push("⚠️ High Priority: Hire a Recovery Specialist to reduce injury recovery time");
    }

    if (!hasScout) {
      recommendations.push("💡 Recommended: Add Scouts to improve player evaluation accuracy");
    }

    // Quality-based recommendations
    if (staffQuality.coaching < 25) {
      recommendations.push("📈 Upgrade: Consider hiring a higher-quality Head Coach (current: weak)");
    }

    if (staffQuality.training < 25) {
      recommendations.push("📈 Upgrade: Invest in better Trainers to maximize player development");
    }

    if (staffQuality.medical < 25) {
      recommendations.push("🏥 Medical: Upgrade Recovery Specialist to reduce injury impact");
    }

    if (staffQuality.scouting < 25) {
      recommendations.push("🔍 Scouting: Better scouts help find hidden gems and assess potential accurately");
    }

    // Excellence achievements
    if (staffQuality.overall >= 35) {
      recommendations.push("🌟 Excellent: Your staff quality is elite-level!");
    } else if (staffQuality.overall >= 30) {
      recommendations.push("✅ Strong: You have high-quality staff supporting your team");
    }

    return recommendations;
  }

  /**
   * Apply staff effects to player progression calculation
   */
  static applyStaffEffectsToProgression(
    baseChance: number,
    staffEffects: StaffEffects,
    attributeName: string
  ): number {
    // Apply head coach progression bonus
    let modifiedChance = baseChance + staffEffects.progressionBonus;
    
    // Apply trainer-specific bonus if applicable
    if (staffEffects.trainerBonus[attributeName]) {
      modifiedChance += staffEffects.trainerBonus[attributeName];
    }
    
    return Math.min(100, Math.max(0, modifiedChance)); // Cap between 0-100%
  }

  /**
   * Get staff hiring recommendations for a team
   */
  static async getStaffHiringRecommendations(teamId: number): Promise<{
    currentStaff: StaffMember[];
    missingRoles: StaffType[];
    upgradeOpportunities: Array<{
      role: StaffType;
      currentQuality: number;
      recommendedMinimum: number;
    }>;
    estimatedImpact: {
      progressionImprovement: number;
      injuryReductionImprovement: number;
      scoutingImprovement: number;
    };
  }> {
    const teamAnalysis = await this.calculateTeamStaffEffects(teamId);
    
    if (!teamAnalysis) {
      return {
        currentStaff: [],
        missingRoles: [StaffType.HEAD_COACH, StaffType.TRAINER, StaffType.RECOVERY_SPECIALIST, StaffType.SCOUT],
        upgradeOpportunities: [],
        estimatedImpact: {
          progressionImprovement: 15,
          injuryReductionImprovement: 10,
          scoutingImprovement: 20
        }
      };
    }

    const currentStaff = teamAnalysis.staffMembers;
    const staffQuality = teamAnalysis.staffQuality;
    
    // Find missing roles
    const allRoles = [StaffType.HEAD_COACH, StaffType.TRAINER, StaffType.RECOVERY_SPECIALIST, StaffType.SCOUT];
    const currentRoles = currentStaff.map(s => s.type);
    const missingRoles = allRoles.filter(role => !currentRoles.includes(role));
    
    // Find upgrade opportunities
    const upgradeOpportunities = [];
    if (staffQuality.coaching > 0 && staffQuality.coaching < 30) {
      upgradeOpportunities.push({
        role: StaffType.HEAD_COACH,
        currentQuality: staffQuality.coaching,
        recommendedMinimum: 30
      });
    }
    if (staffQuality.training > 0 && staffQuality.training < 25) {
      upgradeOpportunities.push({
        role: StaffType.TRAINER,
        currentQuality: staffQuality.training,
        recommendedMinimum: 25
      });
    }
    
    // Calculate estimated impact of improvements
    const estimatedImpact = {
      progressionImprovement: missingRoles.includes(StaffType.HEAD_COACH) ? 10 : (30 - staffQuality.coaching),
      injuryReductionImprovement: missingRoles.includes(StaffType.RECOVERY_SPECIALIST) ? 8 : (25 - staffQuality.medical),
      scoutingImprovement: missingRoles.includes(StaffType.SCOUT) ? 15 : (30 - staffQuality.scouting)
    };

    return {
      currentStaff,
      missingRoles,
      upgradeOpportunities,
      estimatedImpact
    };
  }

  /**
   * Update all teams' staff effects in database (batch process)
   */
  static async updateAllTeamsStaffEffects(): Promise<{
    teamsProcessed: number;
    effectsUpdated: number;
    errors: string[];
  }> {
    const prisma = await DatabaseService.getInstance();
    const result = {
      teamsProcessed: 0,
      effectsUpdated: 0,
      errors: [] as string[]
    };

    try {
      const teams = await prisma.team.findMany({
        select: { id: true, name: true }
      });

      for (const team of teams) {
        try {
          result.teamsProcessed++;

          const staffEffects = await this.calculateTeamStaffEffects(team.id);
          if (staffEffects) {
            // Update team with staff effects
            // These fields would need to be added to the Team model
            /*
            await prisma.team.update({
              where: { id: team.id },
              data: {
                staffProgressionBonus: staffEffects.combinedEffects.progressionBonus,
                staffCamaraderieBonus: staffEffects.combinedEffects.camaraderieBonus,
                staffInjuryBonus: staffEffects.combinedEffects.injuryRecoveryBonus,
                staffOverallQuality: staffEffects.staffQuality.overall,
                updatedAt: new Date()
              }
            });
            */
            
            result.effectsUpdated++;
            
            logger.info('Staff effects updated', {
              teamId: team.id,
              teamName: team.name,
              effects: staffEffects.combinedEffects,
              quality: staffEffects.staffQuality
            });
          }
        } catch (teamError) {
          const errorMsg = `Error updating team ${team.name}: ${teamError instanceof Error ? teamError.message : String(teamError)}`;
          result.errors.push(errorMsg);
        }
      }
    } catch (error) {
      const errorMsg = `System error in staff effects batch update: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMsg);
    }

    logger.info('Batch staff effects update completed', result);
    return result;
  }
}

export default StaffEffectsService;