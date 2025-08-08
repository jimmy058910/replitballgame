import { prisma } from '../../db.js';
import { Logger } from '../core/logger.js';
import { NotFoundError } from '../core/errors.js';
import { UserProfile } from './schemas.js';

export class AuthService {
  static async getUserProfile(userId: string): Promise<UserProfile> {
    try {
      const user = await prisma.userProfile.findUnique({
        where: { userId }
      });

      if (!user) {
        throw new NotFoundError('User profile');
      }

      return {
        id: Number(user.id),
        userId: user.userId,
        email: user.email || '',
        username: user.firstName || undefined,
        avatar: user.profileImageUrl || undefined,
        isAdmin: user.userId === "44010914",
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
    } catch (error) {
      Logger.logError('Failed to get user profile', error as Error, { userId });
      throw error;
    }
  }

  static async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const user = await prisma.userProfile.update({
        where: { userId },
        data: {
          ...(updates.username && { username: updates.username }),
          ...(updates.avatar && { avatar: updates.avatar })
        }
      });

      return this.getUserProfile(userId);
    } catch (error) {
      Logger.logError('Failed to update user profile', error as Error, { userId });
      throw error;
    }
  }

  static async createUserProfile(googleProfile: any): Promise<UserProfile> {
    try {
      Logger.logInfo('Creating new user profile from Google OAuth', { 
        googleId: googleProfile.id, 
        email: googleProfile.emails?.[0]?.value,
        displayName: googleProfile.displayName,
        name: googleProfile.name
      });

      // Test database connection first
      try {
        await prisma.$connect();
        Logger.logInfo('Database connection successful for user creation');
      } catch (dbError) {
        Logger.logError('Database connection failed during user creation', dbError as Error);
        throw new Error('Database connection failed');
      }

      const existingUser = await prisma.userProfile.findUnique({
        where: { userId: googleProfile.id }
      });

      if (existingUser) {
        Logger.logInfo('User profile already exists', { userId: googleProfile.id });
        return this.getUserProfile(googleProfile.id);
      }

      const newUser = await prisma.userProfile.create({
        data: {
          userId: googleProfile.id,
          email: googleProfile.emails?.[0]?.value || '',
          firstName: googleProfile.displayName || googleProfile.name?.givenName,
          profileImageUrl: googleProfile.photos?.[0]?.value
        }
      });

      Logger.logInfo('User profile created successfully', { userId: newUser.userId });

      return {
        id: Number(newUser.id),
        userId: newUser.userId,
        email: newUser.email || '',
        username: newUser.firstName || undefined,
        avatar: newUser.profileImageUrl || undefined,
        isAdmin: newUser.userId === "44010914",
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt
      };
    } catch (error) {
      Logger.logError('Failed to create user profile', error as Error, { googleProfile });
      throw error;
    }
  }

  static async promoteToAdmin(email: string): Promise<void> {
    try {
      Logger.logInfo('Admin promotion requested', { email });
      
      // In development, we could implement auto-promotion logic
      if (process.env.NODE_ENV === 'development') {
        Logger.logInfo('Admin promotion skipped - development mode', { email });
      }
    } catch (error) {
      Logger.logError('Failed to promote user to admin', error as Error, { email });
      throw error;
    }
  }
}