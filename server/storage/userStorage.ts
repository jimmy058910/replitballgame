import { prisma } from '../db';
import { PrismaClient, UserProfile } from '../../generated/prisma';

export class UserStorage {
  async getUser(userId: string): Promise<UserProfile | null> {
    // Fetches a user profile by their Replit User ID (claims.sub)
    if (!userId) {
      return null;
    }
    
    return prisma.userProfile.findUnique({
      where: { userId: userId },
    });
  }

  async acceptNDA(userId: string, ndaVersion: string = "1.0"): Promise<UserProfile> {
    // Records NDA acceptance for a user
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
    const user = await prisma.userProfile.findUnique({
      where: { userId: userId },
      select: { ndaAccepted: true },
    });
    
    return user?.ndaAccepted || false;
  }

  async getUserByEmail(email: string): Promise<UserProfile | null> {
    if (!email) return null;
    // Fetches a user profile by their email, assuming email is unique as per schema
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

    return prisma.userProfile.upsert({
      where: { userId: userData.userId }, // Use the unique Replit userId for lookup
      update: updateData,
      create: createData,
    });
  }

  async updateUserReferralCode(userId: string, referralCode: string): Promise<UserProfile | null> {
    // Updates a user's referral code
    try {
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
