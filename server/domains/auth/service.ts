import { prisma } from '../../db';
import { Logger } from '../core/logger';
import { NotFoundError } from '../core/errors';
import { UserProfile } from './schemas';

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
        email: user.email,
        username: user.username || undefined,
        avatar: user.avatar || undefined,
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