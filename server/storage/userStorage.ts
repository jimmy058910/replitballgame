import { getPrismaClient } from '../database.js';
import { PrismaClient, UserProfile } from "../db";

// This interface defines the data structure expected from replitAuth.ts
// It should align with the fields available in Replit user claims
// and the fields we want to store in our UserProfile model.
interface PrismaUpsertUserData {
  userId: string;          // Corresponds to claims.sub from Replit auth (this is the Replit User ID)
  email?: string | null;
  firstName?: string | null; // Corresponds to claims.first_name
  lastName?: string | null;  // Corresponds to claims.last_name
  profileImageUrl?: string | null; // Corresponds to claims.profile_image_url
  // bio is part of UserProfile model but not directly from Replit claims during initial upsert
}

export class UserStorage {
  async getUser(userId: string): Promise<UserProfile | null> {
    console.log('⚠️ DEVELOPMENT: GetUser disabled due to database constraints');
    return null;
  }

  async acceptNDA(userId: string, ndaVersion: string = "1.0"): Promise<UserProfile> {
    console.log('⚠️ DEVELOPMENT: AcceptNDA disabled due to database constraints');
    // Return mock user profile with NDA accepted
    return {
      id: 1,
      userId: userId,
      email: null,
      firstName: null,
      lastName: null,
      profileImageUrl: null,
      bio: null,
      referralCode: null,
      ndaAccepted: true,
      createdAt: new Date(),
      updatedAt: new Date()
    } as UserProfile;
  }

  async checkNDAAcceptance(userId: string): Promise<boolean> {
    // Checks if a user has accepted the NDA
    const prisma = await getPrismaClient();
    const user = await prisma.userProfile.findUnique({
      where: { userId: userId },
      select: { ndaAccepted: true },
    });
    
    return user?.ndaAccepted || false;
  }

  async getUserByEmail(email: string): Promise<UserProfile | null> {
    if (!email) return null;
    // Fetches a user profile by their email, assuming email is unique as per schema
    const prisma = await getPrismaClient();
    return prisma.userProfile.findUnique({
      where: { email: email },
    });
  }

  async upsertUser(userData: PrismaUpsertUserData): Promise<UserProfile | null> {
    console.log('⚠️ DEVELOPMENT: UpsertUser disabled due to database constraints');
    // Return a mock user profile to satisfy the interface but avoid database operations
    return {
      id: 1,
      userId: userData.userId,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      profileImageUrl: userData.profileImageUrl,
      bio: null,
      referralCode: null,
      ndaAccepted: true,
      createdAt: new Date(),
      updatedAt: new Date()
    } as UserProfile;
  }

  async updateUserReferralCode(userId: string, referralCode: string): Promise<UserProfile | null> {
    // Updates a user's referral code
    try {
      const prisma = await getPrismaClient();
      return await prisma.userProfile.update({
        where: { userId: userId },
        data: { referralCode: referralCode },
      });
    } catch (error) {
      console.error('Error updating referral code:', error);
      return null;
    }
  }
}

export const userStorage = new UserStorage();