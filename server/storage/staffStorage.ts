import { db } from "../db";
import { staff, type Staff, type InsertStaff } from "@shared/schema";
import { eq, asc, and, inArray } from "drizzle-orm"; // Added 'and' and 'inArray'

export class StaffStorage {
  async createStaff(staffMemberData: InsertStaff): Promise<Staff> {
    // Ensure all required fields for InsertStaff are provided or have defaults in schema
    const dataToInsert = {
        ...staffMemberData,
        // Ensure defaults for any non-nullable fields not in staffMemberData
        // Example: abilities: staffMemberData.abilities || JSON.stringify([]),
    };
    const [newStaffMember] = await db.insert(staff).values(dataToInsert).returning();
    return newStaffMember;
  }

  async getStaffById(id: string): Promise<Staff | undefined> {
    const [staffMember] = await db.select().from(staff).where(eq(staff.id, id)).limit(1);
    return staffMember;
  }

  async getStaffByTeamId(teamId: string): Promise<Staff[]> {
    return await db
      .select()
      .from(staff)
      .where(eq(staff.teamId, teamId))
      .orderBy(asc(staff.type)); // Example ordering
  }

  async updateStaff(id: string, updates: Partial<InsertStaff>): Promise<Staff | undefined> {
    // Check if staff member exists before updating
    const existingStaff = await this.getStaffById(id);
    if (!existingStaff) {
        console.warn(`Staff member with ID ${id} not found for update.`);
        return undefined;
    }

    const [updatedStaffMember] = await db
      .update(staff)
      .set({ ...updates, updatedAt: new Date() }) // Assuming 'updatedAt' is part of your Staff schema
      .where(eq(staff.id, id))
      .returning();
    return updatedStaffMember;
  }

  async deleteStaff(id: string): Promise<boolean> {
    const result = await db.delete(staff).where(eq(staff.id, id)).returning({ id: staff.id });
    return result.length > 0;
  }

  // Specific query examples (if needed)
  async getMedicalStaffByTeam(teamId: string): Promise<Staff[]> {
    const medicalTypes = ["recovery_specialist", "trainer_physical", "doctor", "physiotherapist", "trainer"]; // 'trainer' might cover physical
    return await db
      .select()
      .from(staff)
      .where(and(eq(staff.teamId, teamId), inArray(staff.type, medicalTypes)))
      .orderBy(asc(staff.type));
  }
}

export const staffStorage = new StaffStorage();
