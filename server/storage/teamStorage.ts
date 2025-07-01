import { db } from "../db";
import { teams, type Team, type InsertTeam } from "@shared/schema";
import { eq, desc } from "drizzle-orm"; // Removed unused imports gte, lte, and
import { staffStorage } from "./staffStorage"; // Correct import
import { teamFinancesStorage } from "./teamFinancesStorage"; // Correct import
import type { InsertStaff, Staff } from "@shared/schema"; // Added Staff type
import type { InsertTeamFinances, TeamFinances } from "@shared/schema"; // Added TeamFinances type
import gameConfig from "../config/game_config.json";


export class TeamStorage {
  // Load default staff from configuration
  private getDefaultStaffMembers(): Omit<InsertStaff, 'id' | 'teamId' | 'createdAt' | 'updatedAt' | 'abilities'>[] {
    return gameConfig.gameParameters.staffSettings.defaultStaff.map(staff => ({
      name: staff.name,
      type: staff.type as any,
      level: staff.level,
      salary: staff.salary,
      recoveryRating: staff.recoveryRating || 0,
      coachingRating: staff.coachingRating || 0,
      offenseRating: staff.offenseRating || 0,
      defenseRating: staff.defenseRating || 0,
      physicalRating: staff.physicalRating || 0,
      scoutingRating: staff.scoutingRating || 0,
      recruitingRating: staff.recruitingRating || 0
    }));
  }

  async createTeam(teamData: InsertTeam): Promise<Team> {
    const [newTeam] = await db.insert(teams).values(teamData).returning();

    // Create default staff and finances after team creation
    await this.createDefaultStaffForTeam(newTeam.id);
    await this.createDefaultFinancesForTeam(newTeam.id);

    return newTeam;
  }

  async getTeamByUserId(userId: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.userId, userId)).limit(1);
    return team;
  }

  async getTeamById(id: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id)).limit(1);
    return team;
  }

  async updateTeam(id: string, updates: Partial<InsertTeam>): Promise<Team | undefined> {
    // Ensure team exists before update
    const existingTeam = await this.getTeamById(id);
    if (!existingTeam) {
        console.warn(`Team with ID ${id} not found for update.`);
        return undefined;
    }
    const [team] = await db
      .update(teams)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(teams.id, id))
      .returning();
    return team;
  }

  async getTeams(): Promise<Team[]> {
    return await db.select().from(teams);
  }

  async getTeamsByDivision(division: number): Promise<Team[]> {
    return await db
      .select()
      .from(teams)
      .where(eq(teams.division, division))
      .orderBy(desc(teams.points), desc(teams.wins));
  }

  private async createDefaultStaffForTeam(teamId: string): Promise<void> {
    const defaultStaffMembers = this.getDefaultStaffMembers();
    console.log(`Creating ${defaultStaffMembers.length} staff members for team ${teamId}`);
    for (const staffMember of defaultStaffMembers) {
      console.log(`Creating staff member: ${staffMember.name} (${staffMember.type})`);
      // Explicitly construct the InsertStaff object to ensure all fields are covered
      const staffToCreate: InsertStaff = {
        ...staffMember,
        teamId,
        abilities: JSON.stringify([]), // Default empty abilities
        // id, createdAt, updatedAt will be handled by Drizzle/DB
      };
      try {
        const createdStaff = await staffStorage.createStaff(staffToCreate);
        console.log(`Successfully created staff: ${createdStaff.name}`);
      } catch (error) {
        console.error(`Failed to create staff ${staffMember.name}:`, error);
      }
    }
    console.log(`Finished creating staff for team ${teamId}`);
  }

  private async createDefaultFinancesForTeam(teamId: string): Promise<void> {
    const defaultFinances: Omit<InsertTeamFinances, 'id' | 'teamId' | 'createdAt' | 'updatedAt'> = {
      season: 1,
      ticketSales: 250000,
      concessionSales: 75000,
      jerseySales: 50000,
      sponsorships: 100000,
      playerSalaries: 0, // Player salaries start at 0, updated as players are signed
      staffSalaries: 317000, // Sum of default staff: 60+45+50+50+40+42+80 = 367k (Corrected: 60+45+50+50+40+42+80 = 367000)
      // staffSalaries: 367000, // Corrected sum
      facilities: 50000,
      credits: 50000, // Standard starting credits
      totalIncome: 475000,
      totalExpenses: 417000, // staff + facilities (player salaries TBD)
      // totalExpenses: 417000, // Corrected sum
      netIncome: 58000, // Corrected
      // netIncome: 58000,
      premiumCurrency: 50,
    };
     // Recalculate staffSalaries based on the actual list
    const defaultStaffMembers = this.getDefaultStaffMembers();
    const actualStaffSalaries = defaultStaffMembers.reduce((sum: number, s: any) => sum + s.salary, 0);
    defaultFinances.staffSalaries = actualStaffSalaries;
    defaultFinances.totalExpenses = actualStaffSalaries + (defaultFinances.facilities || 0) + (defaultFinances.playerSalaries || 0);
    defaultFinances.netIncome = (defaultFinances.totalIncome || 0) - defaultFinances.totalExpenses;
    // Ensure credits are reasonable after these defaults
    defaultFinances.credits = (defaultFinances.credits || 50000) + defaultFinances.netIncome;


    await teamFinancesStorage.createTeamFinances({
        ...defaultFinances,
        teamId
    } as InsertTeamFinances);
  }
}

export const teamStorage = new TeamStorage();
