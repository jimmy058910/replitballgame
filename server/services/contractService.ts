import { db } from "../db";
import { players, staff, teams, type Player, type Staff, type Team } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface ContractCalculation {
  baseSalary: number;
  marketValue: number;
  minimumOffer: number;
  attributeValue: number;
  potentialValue: number;
  ageModifier: number;
  age: number;
  breakdown: {
    attributeSum: number;
    potentialRating: number;
    ageCategory: string;
  };
}

export interface NegotiationResult {
  accepted: boolean;
  response: "Happy" | "Considering" | "Demanding" | "Rejecting";
  counterOffer?: {
    salary: number;
    bonus: number;
  };
  message: string;
}

export class ContractService {
  /**
   * Universal Value Formula (UVF) for both players and staff
   * Base Salary = (AttributeValue + PotentialValue) * AgeModifier
   */
  static calculateContractValue(individual: Player | Staff): ContractCalculation {
    const age = individual.age;
    const isPlayer = 'speed' in individual; // Check if it's a player
    
    // Calculate AttributeValue
    let attributeValue: number;
    let attributeSum: number;
    
    if (isPlayer) {
      const player = individual as Player;
      // Players: Sum of all 8 attributes * 50₡
      attributeSum = player.speed + player.power + player.throwing + player.catching + 
                    player.kicking + player.stamina + player.leadership + player.agility;
      attributeValue = attributeSum * 50;
    } else {
      const staffMember = individual as Staff;
      // Staff: Sum of all staff attributes * 150₡
      attributeSum = (staffMember.offenseRating || 0) + (staffMember.defenseRating || 0) + 
                    (staffMember.physicalRating || 0) + (staffMember.scoutingRating || 0) + 
                    (staffMember.recruitingRating || 0) + (staffMember.recoveryRating || 0) + 
                    (staffMember.coachingRating || 0);
      attributeValue = attributeSum * 150;
    }
    
    // Calculate PotentialValue
    let potentialValue: number;
    let potentialRating: number;
    
    if (isPlayer) {
      const player = individual as Player;
      // Player's overallPotentialStars * 1000₡
      potentialRating = parseFloat(player.overallPotentialStars?.toString() || '0');
      potentialValue = potentialRating * 1000;
    } else {
      // Staff don't have potential ratings - use level as proxy
      const staffMember = individual as Staff;
      potentialRating = staffMember.level || 1;
      potentialValue = potentialRating * 500; // Staff potential is worth less
    }
    
    // Calculate AgeModifier
    const ageModifier = this.getAgeModifier(age);
    const ageCategory = this.getAgeCategory(age);
    
    // Calculate Base Salary using UVF
    const baseSalary = Math.round((attributeValue + potentialValue) * ageModifier);
    
    // Market Value is the same as Base Salary (replaces player.salary * 1.1)
    const marketValue = baseSalary;
    
    // Minimum offer is 70% of Market Value
    const minimumOffer = Math.round(marketValue * 0.7);
    
    return {
      baseSalary,
      marketValue,
      minimumOffer,
      attributeValue,
      potentialValue,
      ageModifier,
      age,
      breakdown: {
        attributeSum,
        potentialRating,
        ageCategory
      }
    };
  }
  
  /**
   * Get age modifier based on career stage
   */
  private static getAgeModifier(age: number): number {
    if (age >= 16 && age <= 23) return 0.8;  // Youth - talented but unproven
    if (age >= 24 && age <= 30) return 1.2;  // Prime - peak value
    if (age >= 31 && age <= 34) return 1.0;  // Veteran - still valuable
    if (age >= 35) return 0.7;               // Declining - higher risk
    return 1.0; // Fallback
  }
  
  /**
   * Get age category description
   */
  private static getAgeCategory(age: number): string {
    if (age >= 16 && age <= 23) return "Youth";
    if (age >= 24 && age <= 30) return "Prime";
    if (age >= 31 && age <= 34) return "Veteran";
    if (age >= 35) return "Declining";
    return "Unknown";
  }
  
  /**
   * Handle player contract negotiation with new UVF system
   */
  static async negotiatePlayerContract(
    playerId: string, 
    offerSalary: number, 
    offerSeasons: number
  ): Promise<NegotiationResult> {
    const player = await db.query.players.findFirst({
      where: eq(players.id, playerId)
    });
    
    if (!player) {
      throw new Error("Player not found");
    }
    
    const contractCalc = this.calculateContractValue(player);
    
    // Check if offer meets minimum threshold
    if (offerSalary < contractCalc.minimumOffer) {
      return {
        accepted: false,
        response: "Rejecting",
        message: `Offer too low! Minimum acceptable offer is ${contractCalc.minimumOffer.toLocaleString()}₡`
      };
    }
    
    // Calculate offer quality based on market value
    const offerQuality = offerSalary / contractCalc.marketValue;
    
    // Apply camaraderie adjustment (existing logic)
    const camaraderieAdjustment = (player.camaraderie - 50) * 0.002; // -0.1 to +0.1
    const adjustedQuality = offerQuality + camaraderieAdjustment;
    
    // Determine response based on adjusted quality
    if (adjustedQuality >= 1.1) {
      return {
        accepted: true,
        response: "Happy",
        message: "Excellent offer! I'm thrilled to accept this contract."
      };
    } else if (adjustedQuality >= 0.95) {
      return {
        accepted: true,
        response: "Considering",
        message: "Fair offer. I'll accept this contract."
      };
    } else if (adjustedQuality >= 0.8) {
      // Generate counter-offer
      const counterSalary = Math.round(contractCalc.marketValue * (1.05 + Math.random() * 0.1));
      const counterBonus = Math.round(counterSalary * (0.1 + Math.random() * 0.1));
      
      return {
        accepted: false,
        response: "Demanding",
        counterOffer: {
          salary: counterSalary,
          bonus: counterBonus
        },
        message: `I need a better offer. How about ${counterSalary.toLocaleString()}₡ per season with a ${counterBonus.toLocaleString()}₡ signing bonus?`
      };
    } else {
      return {
        accepted: false,
        response: "Rejecting",
        message: "This offer doesn't reflect my value. I'll need a significantly better proposal."
      };
    }
  }
  
  /**
   * Handle staff contract negotiation (simpler than players)
   */
  static async negotiateStaffContract(
    staffId: string, 
    offerSalary: number
  ): Promise<NegotiationResult> {
    const staffMember = await db.query.staff.findFirst({
      where: eq(staff.id, staffId)
    });
    
    if (!staffMember) {
      throw new Error("Staff member not found");
    }
    
    const contractCalc = this.calculateContractValue(staffMember);
    
    // Staff have simpler negotiation - accept >= 95% of market value
    const acceptanceThreshold = contractCalc.marketValue * 0.95;
    
    if (offerSalary >= acceptanceThreshold) {
      return {
        accepted: true,
        response: "Happy",
        message: "I accept this contract offer."
      };
    } else {
      return {
        accepted: false,
        response: "Rejecting",
        message: `I need at least ${Math.round(acceptanceThreshold).toLocaleString()}₡ to accept this position.`
      };
    }
  }
  
  /**
   * Update player contract after successful negotiation
   */
  static async updatePlayerContract(
    playerId: string, 
    salary: number, 
    seasons: number
  ): Promise<Player | null> {
    const [updatedPlayer] = await db
      .update(players)
      .set({
        salary: salary,
        contractSeasons: seasons,
        contractValue: salary * seasons,
        updatedAt: new Date()
      })
      .where(eq(players.id, playerId))
      .returning();
    
    return updatedPlayer || null;
  }
  
  /**
   * Update staff contract after successful negotiation
   */
  static async updateStaffContract(
    staffId: string, 
    salary: number
  ): Promise<Staff | null> {
    const [updatedStaff] = await db
      .update(staff)
      .set({
        salary: salary,
        updatedAt: new Date()
      })
      .where(eq(staff.id, staffId))
      .returning();
    
    return updatedStaff || null;
  }
  
  /**
   * Get contract recommendations for a player
   */
  static getContractRecommendations(contractCalc: ContractCalculation): {
    fair: number;
    good: number;
    excellent: number;
  } {
    return {
      fair: Math.round(contractCalc.marketValue * 0.95),
      good: Math.round(contractCalc.marketValue * 1.05),
      excellent: Math.round(contractCalc.marketValue * 1.15)
    };
  }
}