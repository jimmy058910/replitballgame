import { getPrismaClient } from "../database.js";
import { Player } from "@prisma/client";
import { ContractService } from './contractService.js';

export class PlayerContractInitializer {
  /**
   * Assigns initial contracts to all players on a team who don't have active contracts
   */
  static async assignInitialContracts(teamId: number): Promise<void> {
    console.log(`[PlayerContractInitializer] Assigning initial contracts for team ${teamId}`);
    
    // Get all players on the team
    const prisma = await getPrismaClient();
    const players = await prisma.player.findMany({
      where: { teamId: teamId }
    });
    
    console.log(`[PlayerContractInitializer] Found ${players.length} players on team ${teamId}`);
    
    // Get existing active contracts for these players
    const existingContracts = await prisma.contract.findMany({
      where: {
        playerId: { in: players.map((p: any) => p.id) }
      }
    });
    
    const playersWithContracts = existingContracts.map((c: any) => c.playerId);
    const playersWithoutContracts = players.filter((p: any) => !playersWithContracts.includes(p.id));
    
    console.log(`[PlayerContractInitializer] Players without contracts: ${playersWithoutContracts.length}`);
    
    // Assign initial contracts to players without contracts
    for (const player of playersWithoutContracts) {
      try {
        await this.assignInitialContract(player);
        console.log(`[PlayerContractInitializer] Assigned contract to ${player.firstName} ${player.lastName}`);
      } catch (error) {
        console.error(`[PlayerContractInitializer] Failed to assign contract to ${player.firstName} ${player.lastName}:`, error);
      }
    }
    
    console.log(`[PlayerContractInitializer] Completed initial contract assignment for team ${teamId}`);
  }
  
  /**
   * Assigns an initial contract to a single player
   */
  static async assignInitialContract(player: Player): Promise<void> {
    // Calculate contract value using UVF
    const contractCalc = ContractService.calculateContractValue(player);
    
    if (!contractCalc.baseSalary || contractCalc.baseSalary <= 0) {
      console.warn(`[PlayerContractInitializer] Invalid salary calculated for ${player.firstName} ${player.lastName}: ${contractCalc.baseSalary}`);
      return;
    }
    
    // Use base salary as the initial contract (fair value)
    const initialSalary = contractCalc.baseSalary;
    const initialDuration = 3; // 3-year initial contracts
    
    // Create the contract using the ContractService
    const updatedPlayer = await ContractService.updatePlayerContract(
      player.id,
      initialSalary,
      initialDuration
    );
    
    if (!updatedPlayer) {
      throw new Error(`Failed to create initial contract for player ${player.id}`);
    }
    
    console.log(`[PlayerContractInitializer] Created initial contract: ${player.firstName} ${player.lastName} - ₡${initialSalary.toLocaleString()}/year for ${initialDuration} years`);
  }
  
  /**
   * Assigns initial contracts to all teams that don't have player contracts
   */
  static async assignInitialContractsToAllTeams(): Promise<void> {
    console.log(`[PlayerContractInitializer] Starting global initial contract assignment`);
    
    // Get all teams
    const prisma = await getPrismaClient();
    const teams = await prisma.team.findMany({
      select: { id: true, name: true }
    });
    
    console.log(`[PlayerContractInitializer] Found ${teams.length} teams`);
    
    for (const team of teams) {
      try {
        await this.assignInitialContracts(team.id);
        console.log(`[PlayerContractInitializer] Completed contracts for team: ${team.name}`);
      } catch (error) {
        console.error(`[PlayerContractInitializer] Failed to assign contracts for team ${team.name}:`, error);
      }
    }
    
    console.log(`[PlayerContractInitializer] Completed global initial contract assignment`);
  }
}