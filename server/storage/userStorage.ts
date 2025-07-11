import { PrismaClient, UserProfile } from '../../generated/prisma';

const prisma = new PrismaClient();

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
    return prisma.userProfile.findUnique({
      where: { userId: userId },
    });
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
}

export const userStorage = new UserStorage();