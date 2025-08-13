import { getPrismaClient } from '../database.js';
import { PrismaClient, UserProfile } from "@prisma/client";

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
    // Fetches a user profile by their Replit User ID (claims.sub)
    if (!userId) {
      return null;
    }
    
    const prisma = await getPrismaClient();
    return prisma.userProfile.findUnique({
      where: { userId: userId },
    });
  }

  async acceptNDA(userId: string, ndaVersion: string = "1.0"): Promise<UserProfile> {
    // Records NDA acceptance for a user
    const prisma = await getPrismaClient();
    return prisma.userProfile.update({
      where: { userId: userId },
      data: {
        ndaAccepted: true,
        ndaAcceptedAt: new Date(),
        ndaVersion: ndaVersion,
      },
    });
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

  async upsertUser(userData: PrismaUpsertUserData): Promise<UserProfile> {
    // userData.userId is the Replit User ID (claims.sub)
    const createData = {
      userId: userData.userId,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      profileImageUrl: userData.profileImageUrl,
      // bio will be null by default unless explicitly set elsewhere
    };

    const updateData: {
      email?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      profileImageUrl?: string | null;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (userData.email !== undefined) updateData.email = userData.email;
    if (userData.firstName !== undefined) updateData.firstName = userData.firstName;
    if (userData.lastName !== undefined) updateData.lastName = userData.lastName;
    if (userData.profileImageUrl !== undefined) updateData.profileImageUrl = userData.profileImageUrl;

    const prisma = await getPrismaClient();
    
    // Add detailed logging for debugging
    console.log('🔍 UpsertUser Debug:', {
      userId: userData.userId,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName
    });
    
    // Check if user already exists by userId OR email
    const existingUserByUserId = await prisma.userProfile.findUnique({
      where: { userId: userData.userId }
    });
    console.log('🔍 Existing user by userId:', existingUserByUserId ? 'FOUND' : 'NOT FOUND');
    
    const existingUserByEmail = userData.email ? await prisma.userProfile.findUnique({
      where: { email: userData.email }
    }) : null;
    console.log('🔍 Existing user by email:', existingUserByEmail ? 'FOUND' : 'NOT FOUND');
    
    // If user exists by userId, update them
    if (existingUserByUserId) {
      console.log('✅ Updating existing user by userId');
      return prisma.userProfile.update({
        where: { userId: userData.userId },
        data: updateData
      });
    }
    
    // If user exists by email but different userId, this is a conflict
    if (existingUserByEmail && existingUserByEmail.userId !== userData.userId) {
      console.warn(`⚠️ Email ${userData.email} already exists for different userId: ${existingUserByEmail.userId}`);
      // For now, update the existing record with new userId to resolve conflict
      console.log('✅ Resolving email conflict by updating existing record');
      return prisma.userProfile.update({
        where: { email: userData.email },
        data: {
          userId: userData.userId,
          ...updateData
        }
      });
    }
    
    // Create new user (no conflicts)
    console.log('✅ Creating new user - no conflicts detected');
    return prisma.userProfile.create({
      data: {
        userId: userData.userId,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        profileImageUrl: userData.profileImageUrl
      }
    });
    
    /* OLD UPSERT CODE - CAUSING CONSTRAINT ISSUES - REMOVED */
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