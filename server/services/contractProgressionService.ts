import { getPrismaClient } from "../database.js";
import { logInfo } from './errorService.js';
import type { Player, Team, Staff, Contract } from '@shared/types/models';


export interface ContractProgressionResult {
  contractsProcessed: number;
  salariesPaid: number;
  totalSalaryPaid: bigint;
  contractsExpired: number;
  playersToMarketplace: number;
  staffToMarketplace: number;
  freeAgentsGenerated: number;
  teamsProcessed: number;
  errors: string[];
}

export interface TeamContractSummary {
  teamId: number;
  teamName: string;
  playersWithContracts: number;
  staffWithContracts: number;
  totalSalaryPaid: bigint;
  contractsExpired: number;
  playersBelow12: boolean;
  freeAgentsGenerated: number;
}

export class ContractProgressionService {
  
  /**
   * COMPREHENSIVE CONTRACT PROGRESSION SYSTEM
   * Handles all contract advancement during Day 17→Day 1 season rollover
   */
  static async processSeasonalContractProgression(): Promise<ContractProgressionResult> {
    logInfo('🏈 Starting comprehensive contract progression system...');
    const startTime = Date.now();
    
    const result: ContractProgressionResult = {
      contractsProcessed: 0,
      salariesPaid: 0,
      totalSalaryPaid: Number(0),
      contractsExpired: 0,
      playersToMarketplace: 0,
      staffToMarketplace: 0,
      freeAgentsGenerated: 0,
      teamsProcessed: 0,
      errors: []
    };

    try {
      const prisma = await getPrismaClient();
      
      // Get all teams for processing
      const allTeams = await prisma.team.findMany({
        include: {
          players: {
            include: { contract: true }
          },
          staff: {
            include: { contract: true }
          },
          finances: true
        }
      });

      logInfo(`📊 Processing contracts for ${allTeams.length} teams...`);

      // Process each team's contracts
      for (const team of allTeams) {
        try {
          const teamResult = await this.processTeamContracts(team);
          
          // Aggregate results
          result.contractsProcessed += teamResult?.playersWithContracts + teamResult.staffWithContracts;
          result.salariesPaid += teamResult?.playersWithContracts + teamResult.staffWithContracts;
          result.totalSalaryPaid += teamResult.totalSalaryPaid;
          result.contractsExpired += teamResult.contractsExpired;
          result.freeAgentsGenerated += teamResult.freeAgentsGenerated;
          result.teamsProcessed++;
          
          logInfo(`✅ Team ${team.name}: ${teamResult?.playersWithContracts + teamResult.staffWithContracts} contracts processed, ${teamResult.totalSalaryPaid.toString()}₡ paid`);
          
        } catch (error) {
          const errorMsg = `Failed to process contracts for team ${team.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          console.error(`[CONTRACT PROGRESSION] ${errorMsg}`);
        }
      }

      // Process expired contracts marketplace placement
      const marketplaceResult = await this.processExpiredContractsToMarketplace();
      result?.playersToMarketplace = marketplaceResult?.playersToMarketplace;
      result.staffToMarketplace = marketplaceResult.staffToMarketplace;

      const duration = Date.now() - startTime;
      logInfo(`🎉 Contract progression completed in ${duration}ms`, {
        contractsProcessed: result.contractsProcessed,
        totalSalaryPaid: result.totalSalaryPaid.toString(),
        contractsExpired: result.contractsExpired,
        playersToMarketplace: result?.playersToMarketplace,
        freeAgentsGenerated: result.freeAgentsGenerated,
        teamsProcessed: result.teamsProcessed,
        errors: result.errors.length
      });

      return result;

    } catch (error) {
      console.error('[CONTRACT PROGRESSION] Fatal error in contract progression:', error);
      throw error;
    }
  }

  /**
   * Process all contracts for a single team
   */
  static async processTeamContracts(team: any): Promise<TeamContractSummary> {
    const prisma = await getPrismaClient();
    
    const summary: TeamContractSummary = {
      teamId: team.id,
      teamName: team.name,
      playersWithContracts: 0,
      staffWithContracts: 0,
      totalSalaryPaid: Number(0),
      contractsExpired: 0,
      playersBelow12: false,
      freeAgentsGenerated: 0
    };

    let totalSalaryToPay = Number(0);

    // Process player contracts
    for (const player of team?.players) {
      if (player.contract) {
        const contractResult = await this.processPlayerContract(player);
        summary?.playersWithContracts++;
        totalSalaryToPay += Number(contractResult.salaryPaid);
        
        if (contractResult.expired) {
          summary.contractsExpired++;
        }
      }
    }

    // Process staff contracts  
    for (const staffMember of team.staff) {
      if (staffMember.contract) {
        const contractResult = await this.processStaffContract(staffMember);
        summary.staffWithContracts++;
        totalSalaryToPay += Number(contractResult.salaryPaid);
        
        if (contractResult.expired) {
          summary.contractsExpired++;
        }
      }
    }

    // Pay all salaries from team finances (even if it goes negative)
    if (totalSalaryToPay > 0) {
      await this.deductTeamSalaries(team.id, totalSalaryToPay);
      summary.totalSalaryPaid = totalSalaryToPay;
    }

    // Check if team needs free agents after contract expirations
    const remainingPlayers = await prisma.player.count({
      where: {
        teamId: team.id,
        isRetired: false,
        isOnMarket: false
      }
    });

    if (remainingPlayers < 12) {
      summary?.playersBelow12 = true;
      const freeAgentsNeeded = 12 - remainingPlayers;
      summary.freeAgentsGenerated = await this.generateFreeAgentsForTeam(team.id, freeAgentsNeeded);
      
      logInfo(`🆘 Team ${team.name} below 12 players (${remainingPlayers}). Generated ${summary.freeAgentsGenerated} free agents.`);
    }

    return summary;
  }

  /**
   * Process individual player contract
   */
  static async processPlayerContract(player: any): Promise<{ salaryPaid: number; expired: boolean }> {
    const prisma = await getPrismaClient();
    
    if (!player.contract) {
      return { salaryPaid: 0, expired: false };
    }

    const currentLength = player.contract.length;
    const salary = player.contract.salary;
    
    // Decrement contract length by 1
    const newLength = currentLength - 1;
    
    if (newLength <= 0) {
      // Contract expired - delete contract and mark player for marketplace
      await prisma.contract.delete({
        where: { id: player.contract.id }
      });
      
      // Mark player for marketplace (will be processed separately)
      await prisma.player.update({
        where: { id: player.id },
        data: { isOnMarket: true }
      });
      
      logInfo(`📋 Player ${player.firstName} ${player.lastName} contract expired - moving to marketplace`);
      return { salaryPaid: salary, expired: true };
    } else {
      // Update contract length
      await prisma.contract.update({
        where: { id: player.contract.id },
        data: { length: newLength }
      });
      
      return { salaryPaid: salary, expired: false };
    }
  }

  /**
   * Process individual staff contract
   */
  static async processStaffContract(staffMember: any): Promise<{ salaryPaid: number; expired: boolean }> {
    const prisma = await getPrismaClient();
    
    if (!staffMember.contract) {
      return { salaryPaid: 0, expired: false };
    }

    const currentLength = staffMember.contract.length;
    const salary = staffMember.contract.salary;
    
    // Decrement contract length by 1
    const newLength = currentLength - 1;
    
    if (newLength <= 0) {
      // Contract expired - delete contract and remove staff member
      await prisma.contract.delete({
        where: { id: staffMember.contract.id }
      });
      
      // Remove staff member from team (staff don't go to marketplace like players)
      await prisma.staff.delete({
        where: { id: staffMember.id }
      });
      
      logInfo(`👔 Staff ${staffMember.name} contract expired - removed from team`);
      return { salaryPaid: salary, expired: true };
    } else {
      // Update contract length
      await prisma.contract.update({
        where: { id: staffMember.contract.id },
        data: { length: newLength }
      });
      
      return { salaryPaid: salary, expired: false };
    }
  }

  /**
   * Deduct total salaries from team finances
   */
  static async deductTeamSalaries(teamId: number, totalSalary: bigint): Promise<void> {
    const prisma = await getPrismaClient();
    
    // Get current team finances
    const teamFinances = await prisma.teamFinances.findUnique({
      where: { teamId }
    });

    if (!teamFinances) {
      console.error(`Team finances not found for team ${teamId}`);
      return;
    }

    // Deduct salary (can go negative)
    const newCredits = teamFinances.credits - totalSalary;
    
    await prisma.teamFinances.update({
      where: { teamId },
      data: {
        credits: newCredits,
        lastSeasonExpenses: teamFinances.lastSeasonExpenses + totalSalary
      }
    });

    logInfo(`💰 Team ${teamId}: Paid ${totalSalary.toString()}₡ in salaries (New balance: ${newCredits.toString()}₡)`);
  }

  /**
   * Process all expired contracts to marketplace (72-hour listing)
   */
  static async processExpiredContractsToMarketplace(): Promise<{ playersToMarketplace: number; staffToMarketplace: number }> {
    const prisma = await getPrismaClient();
    
    // Find all players marked for marketplace (isOnMarket = true) without active contracts
    const expiredPlayers = await prisma.player.findMany({
      where: {
        isOnMarket: true,
        contract: null,
        isRetired: false
      },
      include: { team: true }
    });

    let playersToMarketplace = 0;

    // Create 72-hour marketplace listings for expired contract players
    for (const player of expiredPlayers) {
      try {
        // Calculate basic market price for expired contract players
        const marketPrice = this.calculateExpiredContractMarketPrice(player);
        
        // Create marketplace listing with 72-hour duration
        const listingEndTime = new Date();
        listingEndTime.setHours(listingEndTime.getHours() + 72); // 72 hours from now
        
        await prisma.marketplaceListing.create({
          data: {
            playerId: player.id,
            sellerTeamId: player.teamId,
            startBid: Number(Math.floor(marketPrice * 0.5)), // Start at 50% of market value
            buyNowPrice: Number(marketPrice),
            currentBid: Number(Math.floor(marketPrice * 0.5)),
            expiryTimestamp: listingEndTime,
            originalExpiryTimestamp: listingEndTime,
            minBuyNowPrice: Number(marketPrice),
            listingStatus: 'ACTIVE',
            isActive: true,
            listingFee: Number(0) // No fee for expired contracts
          }
        });

        playersToMarketplace++;
        logInfo(`📝 Created 72-hour marketplace listing for expired contract player: ${player.firstName} ${player.lastName}`);
        
      } catch (error) {
        console.error(`Failed to create marketplace listing for player ${player.firstName} ${player.lastName}:`, error);
      }
    }

    // Staff contracts don't go to marketplace - they're simply removed
    return { playersToMarketplace, staffToMarketplace: 0 };
  }

  /**
   * Calculate market price for expired contract players
   */
  static calculateExpiredContractMarketPrice(player: any): number {
    // Use enhanced marketplace service calculation if available
    try {
      const { EnhancedMarketplaceService } = require('./enhancedMarketplaceService.js');
      return EnhancedMarketplaceService.calculateMinimumBuyNowPrice(player);
    } catch (error) {
      // Fallback calculation
      const car = (player.speed + player.power + player.agility + player.throwing + player.catching + player.kicking) / 6;
      const potentialStars = player.potentialRating || 0;
      return Math.max(Math.floor((car * 1000) + (potentialStars * 2000)), 5000);
    }
  }

  /**
   * Generate free agents for teams below 12 players
   */
  static async generateFreeAgentsForTeam(teamId: number, playersNeeded: number): Promise<number> {
    const prisma = await getPrismaClient();
    
    if (playersNeeded <= 0) return 0;

    const { AgingService } = await import('./agingService.js');
    let playersGenerated = 0;

    for (let i = 0; i < playersNeeded; i++) {
      try {
        // Generate basic free agent player
        const races = ['HUMAN', 'SYLVAN', 'GRYLL', 'LUMINA', 'UMBRA'];
        const roles = ['PASSER', 'RUNNER', 'BLOCKER'];
        
        const newPlayer = await prisma.player.create({
          data: {
            teamId,
            firstName: this.generateRandomFirstName(),
            lastName: this.generateRandomLastName(),
            race: races[Math.floor(Math.random() * races.length)] as any,
            age: AgingService.generatePlayerAge('freeAgent'),
            role: roles[Math.floor(Math.random() * roles.length)] as any,
            speed: Math.floor(Math.random() * 3) + 3, // 3-5 (basic stats)
            power: Math.floor(Math.random() * 3) + 3,
            throwing: Math.floor(Math.random() * 3) + 3,
            catching: Math.floor(Math.random() * 3) + 3,
            kicking: Math.floor(Math.random() * 3) + 3,
            staminaAttribute: Math.floor(Math.random() * 3) + 3,
            leadership: Math.floor(Math.random() * 3) + 3,
            agility: Math.floor(Math.random() * 3) + 3,
            potentialRating: Math.random() * 2 + 1, // 1-3 stars potential
            isOnMarket: false,
            isRetired: false
          }
        });

        // Create basic 1-year contract for generated player
        await prisma.contract.create({
          data: {
            playerId: newPlayer.id,
            salary: 15000, // Basic salary for generated players
            length: 1, // 1-year contracts
            signingBonus: 0
          }
        });

        playersGenerated++;
        logInfo(`🔄 Generated free agent: ${newPlayer.firstName} ${newPlayer.lastName} for team ${teamId}`);
        
      } catch (error) {
        console.error(`Failed to generate free agent for team ${teamId}:`, error);
      }
    }

    return playersGenerated;
  }

  /**
   * Generate random first names for free agents
   */
  static generateRandomFirstName(): string {
    const names = [
      'Alex', 'Jordan', 'Casey', 'Riley', 'Blake', 'Quinn', 'Sage', 'River',
      'Phoenix', 'Rowan', 'Skyler', 'Avery', 'Cameron', 'Drew', 'Finley',
      'Harper', 'Justice', 'Kendall', 'Logan', 'Morgan', 'Parker', 'Reese'
    ];
    return names[Math.floor(Math.random() * names.length)];
  }

  /**
   * Generate random last names for free agents
   */
  static generateRandomLastName(): string {
    const names = [
      'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
      'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
      'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'
    ];
    return names[Math.floor(Math.random() * names.length)];
  }

  /**
   * Get contract progression statistics
   */
  static async getContractStatistics(): Promise<{
    totalActiveContracts: number;
    expiringContracts: number;
    averageContractLength: number;
    totalSalaryCommitments: bigint;
    contractsByLength: Record<number, number>;
  }> {
    const prisma = await getPrismaClient();
    
    // Use efficient aggregation queries instead of loading all contracts
    const totalActiveContracts = await prisma.contract.count();
    const expiringContracts = await prisma.contract.count({ where: { length: 1 } });
    
    // Calculate average using aggregation
    const lengthSum = await prisma.contract.aggregate({
      _sum: { length: true }
    });
    const averageContractLength = totalActiveContracts > 0 ? (lengthSum._sum.length || 0) / totalActiveContracts : 0;
    
    // Calculate total salary commitments using aggregation
    const salarySum = await prisma.contract.aggregate({
      _sum: { salary: true }
    });
    const totalSalaryCommitments = salarySum._sum.salary || 0;
    
    // Get contract length distribution efficiently
    const contractsByLength: Record<number, number> = {};
    const lengthDistribution = await prisma.contract.groupBy({
      by: ['length'],
      _count: { length: true }
    });
    
    lengthDistribution.forEach(group => {
      contractsByLength[group.length] = group._count.length;
    });

    return {
      totalActiveContracts,
      expiringContracts,
      averageContractLength: Math.round(averageContractLength * 10) / 10,
      totalSalaryCommitments,
      contractsByLength
    };
  }
}