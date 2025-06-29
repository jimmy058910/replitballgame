import { db } from "../db";
import { users, type User, type UpsertUser } from "@shared/schema";
import { eq } from "drizzle-orm";

export class UserStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!email) return undefined;
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id, // Assuming 'id' is the conflict target for upsert
        set: {
          ...userData,
          email: userData.email, // Ensure email is updated on conflict if it can change
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          stripeCustomerId: userData.stripeCustomerId,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Add other user-specific storage methods if any were in the original storage.ts
  // For example, if there were methods like 'updateUserProfile', 'deleteUser', etc.
}

export const userStorage = new UserStorage();
